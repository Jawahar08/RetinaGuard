"""
Dataset Adapters for ODIR (Multi-Label) and APTOS (5-Class DR Severity).
Ensures dataset identity, separate label spaces, and grouped metadata tracking.
"""
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from PIL import Image

from ml.preprocessing import RetinalPreprocessor


class ODIRDatasetAdapter(Dataset):
    """
    ODIR Multi-Label Dataset Adapter.
    Labels: Normal, Diabetic Retinopathy, Glaucoma, Cataract, AMD.
    Output: Multi-label binary vector (5,).
    """
    LABELS = ["Normal", "Diabetic Retinopathy", "Glaucoma", "Cataract", "AMD"]

    def __init__(
        self,
        metadata_df: pd.DataFrame,
        img_dir: Path,
        preprocessor: Optional[RetinalPreprocessor] = None,
        is_training: bool = False
    ):
        self.df = metadata_df.reset_index(drop=True)
        self.img_dir = Path(img_dir)
        self.preprocessor = preprocessor or RetinalPreprocessor()
        self.is_training = is_training

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, Dict]:
        row = self.df.iloc[idx]
        img_name = row.get("filename", row.get("id"))
        img_path = self.img_dir / img_name

        if img_path.exists():
            pil_img = Image.open(img_path).convert("RGB")
            img_np = np.array(pil_img)
        else:
            # Fallback synthetic array if file missing in test
            img_np = np.zeros((224, 224, 3), dtype=np.uint8)

        _, tensor = self.preprocessor.preprocess(img_np)
        tensor = tensor.squeeze(0)  # (3, H, W)

        # Multi-label vector
        labels_vec = np.array([float(row.get(lbl, 0)) for lbl in self.LABELS], dtype=np.float32)
        labels_tensor = torch.tensor(labels_vec, dtype=torch.float32)

        meta = {
            "id": str(row.get("id", idx)),
            "filename": str(img_name),
            "split": str(row.get("split", "train"))
        }

        return tensor, labels_tensor, meta


class APTOSDatasetAdapter(Dataset):
    """
    APTOS 2019 Blindness Detection Adapter.
    Labels: 0 - No DR, 1 - Mild, 2 - Moderate, 3 - Severe, 4 - Proliferative DR.
    Output: Single-label integer index (0-4).
    """
    LABELS = ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]

    def __init__(
        self,
        metadata_df: pd.DataFrame,
        img_dir: Path,
        preprocessor: Optional[RetinalPreprocessor] = None,
        is_training: bool = False
    ):
        self.df = metadata_df.reset_index(drop=True)
        self.img_dir = Path(img_dir)
        self.preprocessor = preprocessor or RetinalPreprocessor()
        self.is_training = is_training

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, Dict]:
        row = self.df.iloc[idx]
        img_name = row.get("filename", f"{row.get('id_code', idx)}.png")
        img_path = self.img_dir / img_name

        if img_path.exists():
            pil_img = Image.open(img_path).convert("RGB")
            img_np = np.array(pil_img)
        else:
            img_np = np.zeros((224, 224, 3), dtype=np.uint8)

        _, tensor = self.preprocessor.preprocess(img_np)
        tensor = tensor.squeeze(0)  # (3, H, W)

        diagnosis = int(row.get("diagnosis", 0))
        label_tensor = torch.tensor(diagnosis, dtype=torch.long)

        meta = {
            "id": str(row.get("id_code", idx)),
            "filename": str(img_name),
            "split": str(row.get("split", "train"))
        }

        return tensor, label_tensor, meta
