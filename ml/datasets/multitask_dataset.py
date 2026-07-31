"""
Multi-Task Retinal Dataset for RetinaGuard++.
Loads fundus images with multi-disease labels, APTOS DR severity grades,
quality assessment scores, and classical DIP pseudo-label targets.
"""
from typing import Dict, Any, List, Optional, Tuple
import os
import numpy as np
from PIL import Image

try:
    import torch
    from torch.utils.data import Dataset
    import torchvision.transforms as T
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    class Dataset:
        pass


class MultiTaskRetinalDataset(Dataset):
    """
    Dataset wrapper supporting multi-task target extraction and image transforms.
    """
    def __init__(
        self,
        records: List[Dict[str, Any]],
        image_dir: str = "",
        target_size: Tuple[int, int] = (512, 512),
        is_training: bool = False,
        transform: Optional[Any] = None
    ):
        self.records = records
        self.image_dir = image_dir
        self.target_size = target_size
        self.is_training = is_training
        self.transform = transform

        if HAS_TORCH and self.transform is None:
            if is_training:
                self.transform = T.Compose([
                    T.Resize(target_size),
                    T.RandomHorizontalFlip(),
                    T.RandomVerticalFlip(),
                    T.RandomRotation(15),
                    T.ColorJitter(brightness=0.15, contrast=0.15),
                    T.ToTensor(),
                    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])
            else:
                self.transform = T.Compose([
                    T.Resize(target_size),
                    T.ToTensor(),
                    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, idx: int) -> Tuple[Any, Dict[str, Any], Dict[str, Any]]:
        record = self.records[idx]
        image_path = record.get("image_path", "")
        if self.image_dir and not os.path.isabs(image_path):
            image_path = os.path.join(self.image_dir, image_path)

        # Load image or generate synthetic fundus tensor
        if os.path.exists(image_path):
            pil_img = Image.open(image_path).convert("RGB")
        else:
            pil_img = Image.fromarray(np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8))

        if HAS_TORCH and self.transform:
            image_tensor = self.transform(pil_img)
        else:
            image_tensor = np.array(pil_img).astype(np.float32)

        # 1. Multi-disease target (8 binary values)
        disease_target = np.array(record.get("disease_labels", [0]*8), dtype=np.float32)
        has_disease_label = 1.0 if "disease_labels" in record else 0.0

        # 2. DR Grade target (0-4)
        dr_grade = record.get("dr_grade", 0)
        has_dr_label = 1.0 if "dr_grade" in record else 0.0

        # 3. Quality Assessment (6 targets: blur, exposure, illumination, focus, overall, pass)
        quality_target = np.array(record.get("quality", [0.9, 0.9, 0.9, 0.9, 0.9, 1.0]), dtype=np.float32)
        has_quality_label = 1.0 if "quality" in record else 0.0

        # 4. Biomarkers (6 targets: VDI, microaneurysms, exudate ratio, CDR, tortuosity, OD radius)
        biomarker_target = np.array(record.get("biomarkers", [0.12, 5.0, 0.01, 0.35, 1.1, 45.0]), dtype=np.float32)
        has_biomarker_label = 1.0 if "biomarkers" in record else 0.0

        # 5. Risk score (0-100)
        risk_target = float(record.get("risk_score", 25.0))
        has_risk_label = 1.0 if "risk_score" in record else 0.0

        targets = {
            "disease": torch.tensor(disease_target) if HAS_TORCH else disease_target,
            "dr_grade": torch.tensor(dr_grade) if HAS_TORCH else dr_grade,
            "quality": torch.tensor(quality_target) if HAS_TORCH else quality_target,
            "biomarker": torch.tensor(biomarker_target) if HAS_TORCH else biomarker_target,
            "risk": torch.tensor(risk_target, dtype=torch.float32) if HAS_TORCH else risk_target
        }

        masks = {
            "disease": torch.tensor(has_disease_label) if HAS_TORCH else has_disease_label,
            "dr_grade": torch.tensor(has_dr_label) if HAS_TORCH else has_dr_label,
            "quality": torch.tensor(has_quality_label) if HAS_TORCH else has_quality_label,
            "biomarker": torch.tensor(has_biomarker_label) if HAS_TORCH else has_biomarker_label,
            "risk": torch.tensor(has_risk_label) if HAS_TORCH else has_risk_label
        }

        return image_tensor, targets, masks
