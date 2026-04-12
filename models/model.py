from __future__ import annotations

from typing import BinaryIO, IO, Any

import torch
from facenet_pytorch import MTCNN
from PIL import Image, UnidentifiedImageError
from transformers import AutoImageProcessor, AutoModelForImageClassification


class ModelConfigError(Exception):
    """Raised when model configuration or weights are invalid."""


class InferenceError(Exception):
    """Raised when inference cannot be completed."""


class DeepfakeDetector:
    _instance: DeepfakeDetector | None = None
    _initialized: bool = False

    def __new__(cls, device: str = "cpu") -> "DeepfakeDetector":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, device: str = "cpu") -> None:
        if self._initialized:
            return

        self.device = self._resolve_device(device)
        self.model1_name = "Wvolf/ViT_Deepfake_Detection"
        self.model2_name = "dima806/deepfake_vs_real_image_detection"

        try:
            self.processor1 = AutoImageProcessor.from_pretrained(self.model1_name)
            self.model1 = AutoModelForImageClassification.from_pretrained(self.model1_name)
            self.model1.to(self.device)
            self.model1.eval()

            self.processor2 = AutoImageProcessor.from_pretrained(self.model2_name)
            self.model2 = AutoModelForImageClassification.from_pretrained(self.model2_name)
            self.model2.to(self.device)
            self.model2.eval()

            self.mtcnn = MTCNN(keep_all=True, device=self.device)
        except Exception as exc:
            raise ModelConfigError(f"Failed to load models: {exc}") from exc

        self._initialized = True

    @staticmethod
    def _resolve_device(requested_device: str) -> torch.device:
        requested = requested_device.lower().strip()
        if requested == "cuda" and torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")

    def _extract_fake_probability(self, model, processor, image: Image.Image) -> float:
        inputs = processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)[0]

        id2label = model.config.id2label
        fake_index = None
        for idx, label in id2label.items():
            if label.lower() in ["fake", "deepfake"]:
                fake_index = idx
                break

        if fake_index is None:
            fake_index = 1 if len(probabilities) == 2 else 0

        return float(probabilities[fake_index].item())

    def _detect_faces(self, image: Image.Image) -> tuple[int, list[Image.Image]]:
        try:
            boxes, _ = self.mtcnn.detect(image)
            if boxes is None:
                return 0, []

            faces = []
            for box in boxes:
                x1, y1, x2, y2 = [int(coord) for coord in box]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(image.width, x2), min(image.height, y2)
                if x2 > x1 and y2 > y1:
                    face = image.crop((x1, y1, x2, y2))
                    faces.append(face)

            return len(faces), faces
        except Exception:
            return 0, []

    def predict(self, image_stream: BinaryIO | IO[bytes] | Any, return_faces: bool = False) -> dict:
        try:
            image = Image.open(image_stream).convert("RGB")
        except UnidentifiedImageError:
            raise
        except Exception as exc:
            raise InferenceError(f"Unable to read image: {exc}") from exc

        try:
            score1 = self._extract_fake_probability(self.model1, self.processor1, image)
            score2 = self._extract_fake_probability(self.model2, self.processor2, image)

            avg_fake_score = (score1 + score2) / 2.0
            avg_fake_score_rounded = round(avg_fake_score, 4)

            if avg_fake_score_rounded >= 0.5:
                overall_label = "FAKE"
                overall_confidence = avg_fake_score_rounded
            else:
                overall_label = "REAL"
                overall_confidence = round(1.0 - avg_fake_score_rounded, 4)

            num_faces, faces = self._detect_faces(image)

            return {
                "overall_label": overall_label,
                "overall_confidence": overall_confidence,
                "fake_score": avg_fake_score_rounded,
                "num_faces": num_faces,
                "faces": faces if return_faces else [],
            }
        except Exception as exc:
            raise InferenceError(f"Model inference failed: {exc}") from exc
