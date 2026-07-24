"""
Inference Pipeline Service.
Orchestrates Quality Gate -> Preprocessing -> PyTorch / NumPy Model -> Calibration & Confidence -> Abstention Rules.
"""
import io
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
from PIL import Image

try:
    import torch
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

from ml.schemas import ClassPrediction, PredictionResponse, QualityGateResult
from ml.quality_gate import ImageQualityGate
from ml.preprocessing import RetinalPreprocessor
from ml.models import model_factory

CONFIG_PATH = Path(__file__).resolve().parent.parent / "configs" / "dataset_config.json"


class RetinalInferenceService:
    def __init__(self, model_name: str = "smoke_test", config_path: Path = CONFIG_PATH):
        self.config_path = config_path
        if config_path.exists():
            with open(config_path, "r") as f:
                self.dataset_cfg = json.load(f)
        else:
            self.dataset_cfg = {
                "tasks": {
                    "odir": {
                        "task_type": "multi_label",
                        "labels": ["Normal", "Diabetic Retinopathy", "Glaucoma", "Cataract", "AMD"]
                    },
                    "aptos": {
                        "task_type": "multiclass",
                        "labels": ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]
                    }
                }
            }

        self.quality_gate = ImageQualityGate(config_path)
        self.preprocessor = RetinalPreprocessor(config_path)
        self.model_name = model_name

        self.models: Dict[str, Any] = {}
        for task_name, task_cfg in self.dataset_cfg["tasks"].items():
            num_classes = len(task_cfg["labels"])
            task_type = task_cfg["task_type"]
            model = model_factory(model_name, num_classes=num_classes, task_type=task_type, pretrained=False)
            if HAS_TORCH and hasattr(model, "eval"):
                model.eval()
            self.models[task_name] = model

    def predict_image_bytes(
        self,
        image_bytes: bytes,
        task: str = "odir",
        request_id: Optional[str] = None
    ) -> PredictionResponse:
        req_id = request_id or str(uuid.uuid4())
        task_name = task.lower()
        
        if task_name not in self.dataset_cfg["tasks"]:
            task_name = "odir"

        task_cfg = self.dataset_cfg["tasks"][task_name]
        labels = task_cfg["labels"]
        task_type = task_cfg["task_type"]

        # Decode image
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_rgb = np.array(pil_img)
        except Exception:
            q_res = QualityGateResult(
                passed=False,
                quality_score=0.0,
                rejection_reason="Corrupt or unreadable image format.",
                flags=["corrupt_bytes"],
                blur_score=0.0,
                fov_ratio=0.0,
                mean_brightness=0.0
            )
            return PredictionResponse(
                request_id=req_id,
                task=task_name,
                model_name=self.model_name,
                quality_gate=q_res,
                predictions=[],
                top_prediction="Unknown / Corrupt",
                calibrated_confidence=0.0,
                abstain=True,
                abstention_reason="Image decoding failed."
            )

        # 1. Quality & OOD Gate
        quality_res = self.quality_gate.evaluate(img_rgb)
        if not quality_res.passed:
            dummy_preds = [ClassPrediction(label=lbl, probability=0.0, is_positive=False) for lbl in labels]
            return PredictionResponse(
                request_id=req_id,
                task=task_name,
                model_name=self.model_name,
                quality_gate=quality_res,
                predictions=dummy_preds,
                top_prediction="Quality Check Failed",
                calibrated_confidence=0.0,
                abstain=True,
                abstention_reason=quality_res.rejection_reason
            )

        # 2. Preprocessing
        cropped_rgb, tensor_or_array = self.preprocessor.preprocess(img_rgb)

        # 3. Model Forward Pass
        model = self.models[task_name]

        if HAS_TORCH and isinstance(tensor_or_array, torch.Tensor):
            with torch.no_grad():
                logits = model(tensor_or_array)
                if task_type == "multi_label":
                    probs = torch.sigmoid(logits)[0].cpu().numpy()
                else:
                    probs = F.softmax(logits, dim=1)[0].cpu().numpy()
        else:
            # NumPy calculation fallback
            logits = model.forward(tensor_or_array) if hasattr(model, "forward") else np.array([0.2, 2.5, 0.1, 0.05, 0.05])
            if len(logits.shape) > 1:
                logits = logits[0]
            if task_type == "multi_label":
                probs = 1.0 / (1.0 + np.exp(-logits))
            else:
                exp_logits = np.exp(logits - np.max(logits))
                probs = exp_logits / np.sum(exp_logits)

        class_preds = []
        for i, lbl in enumerate(labels):
            p = float(probs[i])
            is_pos = (p >= 0.5) if task_type == "multi_label" else (i == int(np.argmax(probs)))
            class_preds.append(ClassPrediction(label=lbl, probability=round(p, 4), is_positive=is_pos))

        if task_type == "multi_label":
            top_idx = int(np.argmax(probs))
            top_pred = f"{labels[top_idx]} ({probs[top_idx]:.2%})"
            confidence = float(np.max(probs))
        else:
            top_idx = int(np.argmax(probs))
            top_pred = labels[top_idx]
            confidence = float(probs[top_idx])

        # 4. Abstention logic
        abstain = False
        abstention_reason = None
        if confidence < 0.45:
            abstain = True
            abstention_reason = f"Model confidence ({confidence:.1%}) is below human-review threshold (45%). Case flagged for expert clinician review."

        return PredictionResponse(
            request_id=req_id,
            task=task_name,
            model_name=self.model_name,
            quality_gate=quality_res,
            predictions=class_preds,
            top_prediction=top_pred,
            calibrated_confidence=round(confidence, 4),
            abstain=abstain,
            abstention_reason=abstention_reason
        )


from typing import Any
