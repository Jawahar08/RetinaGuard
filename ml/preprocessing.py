"""
Retinal Image Preprocessing Module.
Handles crop black borders, CLAHE contrast enhancement, resizing, and normalization.
"""
import json
from pathlib import Path
from typing import Tuple, Any
import numpy as np
import cv2

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

CONFIG_PATH = Path(__file__).resolve().parent.parent / "configs" / "dataset_config.json"


class RetinalPreprocessor:
    def __init__(self, config_path: Path = CONFIG_PATH):
        if config_path.exists():
            with open(config_path, "r") as f:
                cfg = json.load(f).get("preprocessing", {})
        else:
            cfg = {
                "image_size": [224, 224],
                "normalize_mean": [0.485, 0.456, 0.406],
                "normalize_std": [0.229, 0.224, 0.225],
                "clahe_enabled": True,
                "clahe_clip_limit": 2.0,
                "clahe_tile_grid": [8, 8],
                "crop_black_borders": True
            }

        self.target_size = tuple(cfg.get("image_size", [224, 224]))
        self.mean = np.array(cfg.get("normalize_mean", [0.485, 0.456, 0.406]), dtype=np.float32)
        self.std = np.array(cfg.get("normalize_std", [0.229, 0.224, 0.225]), dtype=np.float32)
        self.clahe_enabled = cfg.get("clahe_enabled", True)
        self.clip_limit = cfg.get("clahe_clip_limit", 2.0)
        self.tile_grid = tuple(cfg.get("clahe_tile_grid", [8, 8]))
        self.crop_black_borders = cfg.get("crop_black_borders", True)

    def crop_retinal_fov(self, img_rgb: np.ndarray) -> np.ndarray:
        """Crops outer black background from retinal fundus photograph."""
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        _, mask = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return img_rgb
            
        c = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(c)
        if w > 20 and h > 20:
            return img_rgb[y:y+h, x:x+w]
        return img_rgb

    def apply_clahe(self, img_rgb: np.ndarray) -> np.ndarray:
        """Applies CLAHE on LAB L-channel."""
        lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=self.clip_limit, tileGridSize=self.tile_grid)
        l_clahe = clahe.apply(l)
        lab_clahe = cv2.merge((l_clahe, a, b))
        return cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2RGB)

    def preprocess(self, img_rgb: np.ndarray) -> Tuple[np.ndarray, Any]:
        """
        Executes crop, CLAHE, resize, and returns:
        1. Preprocessed RGB image (H, W, C) numpy array uint8
        2. Normalized Tensor or numpy array (1, C, H, W)
        """
        out = img_rgb.copy()
        if self.crop_black_borders:
            out = self.crop_retinal_fov(out)

        if self.clahe_enabled:
            out = self.apply_clahe(out)

        out = cv2.resize(out, self.target_size, interpolation=cv2.INTER_AREA)

        # Normalize for (C, H, W)
        normalized = (out.astype(np.float32) / 255.0 - self.mean) / self.std
        chw = np.transpose(normalized, (2, 0, 1))[np.newaxis, ...]  # (1, C, H, W)

        if HAS_TORCH:
            tensor = torch.tensor(chw, dtype=torch.float32)
            return out, tensor
        return out, chw
