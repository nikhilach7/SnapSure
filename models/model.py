from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

import timm
import torch
from PIL import Image, UnidentifiedImageError
from torchvision import transforms


class ModelConfigError(Exception):
    """Raised when model configuration or weights are invalid."""


class InferenceError(Exception):
    """Raised when inference cannot be completed."""


@dataclass(frozen=True)
class ModelSettings:
    architecture: str
    weights_filename: str
    input_size: int


MODEL_REGISTRY: dict[str, ModelSettings] = {
    "xception": ModelSettings(
        architecture="xception",
        weights_filename="xception_deepfake.pth",
        input_size=299,
    ),
    "efficientnet_b4": ModelSettings(
        architecture="efficientnet_b4",
        weights_filename="efficientnet_b4_deepfake.pth",
        input_size=380,
    ),
}

CLASS_NAMES = {0: "Real", 1: "Fake"}


class DeepfakeDetector:
    def __init__(self, model_name: str, weights_dir: Path, device: str = "cpu") -> None:
        self.model_name = model_name.lower().strip()
        if self.model_name not in MODEL_REGISTRY:
            available = ", ".join(MODEL_REGISTRY)
            raise ModelConfigError(f"Unknown model '{model_name}'. Available models: {available}")

        self.settings = MODEL_REGISTRY[self.model_name]
        self.device = self._resolve_device(device)
        self.weights_path = (weights_dir / self.settings.weights_filename).resolve()

        if not self.weights_path.exists():
            raise ModelConfigError(
                f"Weights not found at {self.weights_path}. Place pretrained checkpoint there."
            )

        self.model = self._load_model()
        self.transform = transforms.Compose(
            [
                transforms.Resize((self.settings.input_size, self.settings.input_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    @staticmethod
    def _resolve_device(requested_device: str) -> torch.device:
        requested = requested_device.lower().strip()
        if requested == "cuda" and torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")

    def _load_model(self) -> torch.nn.Module:
        model = timm.create_model(
            self.settings.architecture,
            pretrained=False,
            num_classes=2,
        )

        try:
            checkpoint = torch.load(self.weights_path, map_location=self.device, weights_only=False)
        except Exception as exc:
            raise ModelConfigError(f"Failed to load weights from {self.weights_path}: {exc}") from exc

        state_dict = checkpoint.get("state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint

        if not isinstance(state_dict, dict):
            raise ModelConfigError("Checkpoint format is invalid. Expected state dict or dict with state_dict.")

        cleaned_state_dict = {key.replace("module.", "", 1): value for key, value in state_dict.items()}
        model.load_state_dict(cleaned_state_dict, strict=False)

        model.to(self.device)
        model.eval()
        return model

    def predict(self, image_stream: BinaryIO) -> tuple[str, float]:
        try:
            image = Image.open(image_stream).convert("RGB")
        except UnidentifiedImageError:
            raise
        except Exception as exc:  # pragma: no cover
            raise InferenceError(f"Unable to read image: {exc}") from exc

        try:
            tensor = self.transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                logits = self.model(tensor)
                probabilities = torch.softmax(logits, dim=1)[0]

            predicted_index = int(torch.argmax(probabilities).item())
            confidence = float(probabilities[predicted_index].item())
            return CLASS_NAMES.get(predicted_index, "Fake"), confidence
        except Exception as exc:  # pragma: no cover
            raise InferenceError(f"Model inference failed: {exc}") from exc
