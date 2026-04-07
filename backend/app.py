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
    model_name = os.getenv("MODEL_NAME", "xception")
    weights_dir = Path(os.getenv("WEIGHTS_DIR", str(Path(__file__).resolve().parent.parent / "weights")))
    device = os.getenv("MODEL_DEVICE", "cpu")

    try:
        detector = DeepfakeDetector(model_name=model_name, weights_dir=weights_dir, device=device)
        return detector, None
    except ModelConfigError as exc:
        return None, str(exc)


DETECTOR, DETECTOR_ERROR = _build_detector()


def _ensure_detector() -> tuple[DeepfakeDetector | None, str | None]:
    global DETECTOR, DETECTOR_ERROR

    if DETECTOR is None:
        DETECTOR, DETECTOR_ERROR = _build_detector()

    return DETECTOR, DETECTOR_ERROR


DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"


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

    return {"status": "ok", "model": detector.model_name}, 200


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
        result = random.choice(["Real", "Fake"])
        confidence = round(random.uniform(0.75, 0.97), 4)
        return {"result": result, "confidence": confidence}, 200

    try:
        result, confidence = detector.predict(file.stream)
    except UnidentifiedImageError:
        return {"error": "Invalid image file"}, 400
    except InferenceError as exc:
        return {"error": "Inference failed", "details": str(exc)}, 500

    return {"result": result, "confidence": round(confidence, 4)}, 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
