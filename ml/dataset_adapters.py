"""
Dataset Adapters for ODIR (Multi-Label) and APTOS (5-Class DR Severity).
Ensures dataset identity, separate label spaces, and grouped metadata tracking.
"""
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
import numpy as np
import pandas as pd
from PIL import Image

try:
    import torch
    from torch.utils.data import Dataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    class Dataset:
        pass

from ml.preprocessing import RetinalPreprocessor


class ODIRDatasetAdapter(Dataset if HAS_TORCH else object):
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

    def __getitem__(self, idx: int) -> Tuple[Union[np.ndarray, Any], Union[np.ndarray, Any], Dict]:
        row = self.df.iloc[idx]
        img_name = row.get("filename", row.get("id"))
        img_path = self.img_dir / img_name

        if img_path.exists():
            pil_img = Image.open(img_path).convert("RGB")
            img_np = np.array(pil_img)
        else:
            img_np = np.zeros((224, 224, 3), dtype=np.uint8)

        _, tensor_or_arr = self.preprocessor.preprocess(img_np)
        if len(tensor_or_arr.shape) == 4:
            tensor_or_arr = tensor_or_arr[0]

        labels_vec = np.array([float(row.get(lbl, 0)) for lbl in self.LABELS], dtype=np.float32)

        if HAS_TORCH:
            labels_tensor = torch.tensor(labels_vec, dtype=torch.float32)
            return tensor_or_arr, labels_tensor, {"id": str(row.get("id", idx)), "filename": str(img_name)}

        return tensor_or_arr, labels_vec, {"id": str(row.get("id", idx)), "filename": str(img_name)}


class APTOSDatasetAdapter(Dataset if HAS_TORCH else object):
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

    def __getitem__(self, idx: int) -> Tuple[Union[np.ndarray, Any], Union[int, Any], Dict]:
        row = self.df.iloc[idx]
        img_name = row.get("filename", f"{row.get('id_code', idx)}.png")
        img_path = self.img_dir / img_name

        if not img_path.exists():
            img_path = self.img_dir / f"{row.get('id_code', idx)}.png"

        if img_path.exists():
            pil_img = Image.open(img_path).convert("RGB")
            img_np = np.array(pil_img)
        else:
            img_np = np.zeros((224, 224, 3), dtype=np.uint8)

        _, tensor_or_arr = self.preprocessor.preprocess(img_np)
        if len(tensor_or_arr.shape) == 4:
            tensor_or_arr = tensor_or_arr[0]

        diagnosis = int(row.get("diagnosis", 0))

        if HAS_TORCH:
            label_tensor = torch.tensor(diagnosis, dtype=torch.long)
            return tensor_or_arr, label_tensor, {"id": str(row.get("id_code", idx)), "filename": str(img_name)}

        return tensor_or_arr, diagnosis, {"id": str(row.get("id_code", idx)), "filename": str(img_name)}
