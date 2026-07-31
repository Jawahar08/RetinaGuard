"""
Image Quality and Out-of-Distribution (OOD) Gate.
Filters corrupt, non-retinal, blurry, over/underexposed, or malformed images
before disease prediction.
"""
import json
from pathlib import Path
import numpy as np
import cv2
from ml.schemas import QualityGateResult

CONFIG_PATH = Path(__file__).resolve().parent.parent / "configs" / "dataset_config.json"


class ImageQualityGate:
    def __init__(self, config_path: Path = CONFIG_PATH):
        if config_path.exists():
            with open(config_path, "r") as f:
                cfg = json.load(f)
                self.qcfg = cfg.get("quality_gate", {})
        else:
            self.qcfg = {
                "min_resolution": [100, 100],
                "max_aspect_ratio": 2.5,
                "min_laplacian_var": 15.0,
                "min_fov_ratio": 0.25,
                "max_brightness": 245.0,
                "min_brightness": 10.0
            }

    def evaluate(self, image_np: np.ndarray) -> QualityGateResult:
        """
        Evaluates numpy image (H, W, C) in BGR or RGB format.
        """
        if image_np is None or image_np.size == 0:
            return QualityGateResult(
                passed=False,
                quality_score=0.0,
                rejection_reason="Unreadable or corrupt image file.",
                flags=["corrupt_file"],
                blur_score=0.0,
                fov_ratio=0.0,
                mean_brightness=0.0
            )

        h, w = image_np.shape[:2]
        flags = []
        
        # 1. Resolution Check
        min_h, min_w = self.qcfg["min_resolution"]
        if h < min_h or w < min_w:
            flags.append("low_resolution")

        # 2. Aspect Ratio Check
        aspect_ratio = max(h, w) / max(1, min(h, w))
        if aspect_ratio > self.qcfg["max_aspect_ratio"]:
            flags.append("extreme_aspect_ratio")

        # Convert to Grayscale for image statistics
        if len(image_np.shape) == 3 and image_np.shape[2] == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        elif len(image_np.shape) == 2:
            gray = image_np
        else:
            return QualityGateResult(
                passed=False,
                quality_score=0.0,
                rejection_reason="Invalid image channel dimension.",
                flags=["invalid_channels"],
                blur_score=0.0,
                fov_ratio=0.0,
                mean_brightness=0.0
            )

        # 3. Field of View Coverage Check (retinal disk presence)
        _, mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        fov_ratio = float(np.count_nonzero(mask) / (h * w))
        if fov_ratio < self.qcfg.get("min_fov_ratio", 0.15):
            flags.append("poor_field_of_view")

        # 4. Blur Detection (Laplacian Variance inside retinal FOV)
        lap_map = cv2.Laplacian(gray, cv2.CV_64F)
        if np.count_nonzero(mask) > 0:
            laplacian_var = float(lap_map[mask > 0].var())
        else:
            laplacian_var = float(lap_map.var())

        if laplacian_var < self.qcfg.get("min_laplacian_var", 3.0):
            flags.append("severe_blur")

        # 5. Brightness / Exposure Check
        mean_brightness = float(np.mean(gray))
        if mean_brightness < self.qcfg.get("min_brightness", 10.0):
            flags.append("extremely_dark")
        elif mean_brightness > self.qcfg.get("max_brightness", 245.0):
            flags.append("overexposed")

        # Score calculation (0.0 to 1.0)
        penalty = len(flags) * 0.25
        quality_score = max(0.0, min(1.0, 1.0 - penalty))
        passed = len(flags) == 0

        rejection_reason = None
        if not passed:
            rejection_reason = f"Image failed quality check due to: {', '.join(flags)}."

        return QualityGateResult(
            passed=passed,
            quality_score=quality_score,
            rejection_reason=rejection_reason,
            flags=flags,
            blur_score=laplacian_var,
            fov_ratio=fov_ratio,
            mean_brightness=mean_brightness
        )
