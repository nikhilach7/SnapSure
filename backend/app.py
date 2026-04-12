import os
from pathlib import Path

from flask import Flask, request
from flask_cors import CORS
from PIL import UnidentifiedImageError
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from models.model import DeepfakeDetector, InferenceError, ModelConfigError

load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

app = Flask(__name__)
CORS(app)


def _build_detector() -> tuple[DeepfakeDetector | None, str | None]:
    device = os.getenv("MODEL_DEVICE", "cpu")

    try:
        detector = DeepfakeDetector(device=device)
        return detector, None
    except ModelConfigError as exc:
        return None, str(exc)


DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
DETECTOR, DETECTOR_ERROR = (None, None)

if not DEMO_MODE:
    DETECTOR, DETECTOR_ERROR = _build_detector()


def _ensure_detector() -> tuple[DeepfakeDetector | None, str | None]:
    global DETECTOR, DETECTOR_ERROR

    if DEMO_MODE:
        return None, None

    if DETECTOR is None:
        DETECTOR, DETECTOR_ERROR = _build_detector()

    return DETECTOR, DETECTOR_ERROR


@app.get("/health")
def health() -> tuple[dict, int]:
    detector, detector_error = _ensure_detector()

    if detector is None:
        if DEMO_MODE:
            return {"status": "ok", "model": "demo"}, 200
        return {
            "status": "error",
            "message": "Model failed to initialize",
            "details": detector_error,
        }, 500

    return {"status": "ok", "model": "ensemble"}, 200


@app.post("/predict")
def predict() -> tuple[dict, int]:
    detector, detector_error = _ensure_detector()

    if detector is None and not DEMO_MODE:
        return {
            "error": "Model is unavailable",
            "details": detector_error,
        }, 500

    if "file" not in request.files:
        return {"error": "Missing file field in form-data"}, 400

    file = request.files["file"]
    if not file or not file.filename:
        return {"error": "No file selected"}, 400

    filename = secure_filename(file.filename)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return {
            "error": "Unsupported file type",
            "supported": sorted(ALLOWED_EXTENSIONS),
        }, 400

    if detector is None:
        # Demo mode: return a plausible dummy prediction
        import random
        overall_label = random.choice(["REAL", "FAKE"])
        fake_score = round(random.uniform(0.3, 0.8), 4)
        if overall_label == "FAKE":
            overall_confidence = fake_score
        else:
            overall_confidence = round(1.0 - fake_score, 4)
        return {
            "overall_label": overall_label,
            "overall_confidence": overall_confidence,
            "fake_score": fake_score,
            "num_faces": random.randint(0, 3),
            "faces": [],
        }, 200

    try:
        result = detector.predict(file.stream, return_faces=False)
    except UnidentifiedImageError:
        return {"error": "Invalid image file"}, 400
    except InferenceError as exc:
        return {"error": "Inference failed", "details": str(exc)}, 500

    return result, 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
