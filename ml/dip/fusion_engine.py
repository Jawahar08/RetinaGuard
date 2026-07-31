"""
Hybrid AI + Classical DIP Clinical Fusion Engine
=================================================
Concatenates Deep Learning CNN 512-d feature vectors with the 13-element quantitative
Clinical Biomarker Vector to power the joint MLP decision head.
"""
from typing import Dict, List, Optional, Tuple, Union

import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


def extract_clinical_biomarker_vector(biomarkers: Dict) -> np.ndarray:
    """
    Constructs normalized 13-element quantitative Clinical Biomarker Vector.
    """
    vdi = float(biomarkers.get("vessel_density_index", 0.08))
    tortuosity = float(biomarkers.get("vessel_tortuosity_index", 1.08))
    norm_tortuosity = (tortuosity - 1.0) / 0.5  # Scale [1.0, 1.5] -> [0, 1]
    
    branch_angle = float(biomarkers.get("average_branch_angle", 75.0)) / 180.0
    vessel_width = float(biomarkers.get("average_vessel_width", 3.5)) / 10.0
    avr = float(biomarkers.get("artery_vein_ratio", 0.67))
    cdr = float(biomarkers.get("cup_disc_ratio", 0.40))
    
    ma_count = np.log1p(float(biomarkers.get("microaneurysm_count", 0))) / 4.0
    hem_ratio = float(biomarkers.get("hemorrhage_ratio", 0.0)) * 100.0
    exudate_ratio = float(biomarkers.get("exudate_area_ratio", 0.0)) * 100.0
    cws_count = np.log1p(float(biomarkers.get("cotton_wool_spot_count", 0))) / 3.0
    
    lesion_density = float(biomarkers.get("lesion_density", 0.0)) / 10.0
    fractal_d = (float(biomarkers.get("vascular_fractal_dimension", 1.42)) - 1.0) / 0.8
    
    regional = biomarkers.get("regional_vessel_density", {})
    sup_density = float(regional.get("superior", vdi))
    
    vector = np.array([
        vdi,
        norm_tortuosity,
        branch_angle,
        vessel_width,
        avr,
        cdr,
        ma_count,
        hem_ratio,
        exudate_ratio,
        cws_count,
        lesion_density,
        fractal_d,
        sup_density
    ], dtype=np.float32)
    
    return np.clip(vector, 0.0, 5.0)


if HAS_TORCH:
    class ClinicalFusionMLP(nn.Module):
        """
        Joint Multi-Layer Perceptron (MLP) Classifier fusing 512-d CNN embeddings + 13-d Biomarker Vector.
        """
        def __init__(self, num_classes: int = 5, task_type: str = "multiclass"):
            super().__init__()
            self.task_type = task_type
            self.num_classes = num_classes
            
            # Input dimension: 512 (CNN feature vector) + 13 (DIP vector) = 525
            self.fc1 = nn.Linear(525, 128)
            self.bn1 = nn.BatchNorm1d(128)
            self.relu = nn.ReLU()
            self.dropout = nn.Dropout(p=0.25)
            self.fc2 = nn.Linear(128, num_classes)
            
        def forward(self, cnn_features: torch.Tensor, dip_vector: torch.Tensor) -> torch.Tensor:
            if cnn_features.dim() == 1:
                cnn_features = cnn_features.unsqueeze(0)
            if dip_vector.dim() == 1:
                dip_vector = dip_vector.unsqueeze(0)
                
            fusion_input = torch.cat([cnn_features, dip_vector], dim=1)
            x = self.fc1(fusion_input)
            if x.size(0) > 1:
                x = self.bn1(x)
            x = self.relu(x)
            x = self.dropout(x)
            logits = self.fc2(x)
            return logits


class ClinicalFusionEngine:
    """
    Orchestrates extraction of 13 structural biomarkers, vector construction, and hybrid prediction.
    """
    def __init__(self):
        self.vector_dim = 13
        if HAS_TORCH:
            self.aptos_fusion_model = ClinicalFusionMLP(num_classes=5, task_type="multiclass").eval()
            self.odir_fusion_model = ClinicalFusionMLP(num_classes=8, task_type="multi_label").eval()
            
    def Fuse(self, cnn_embedding_512: np.ndarray, biomarkers: Dict, task: str = "aptos") -> Dict:
        """
        Fuses CNN embedding with DIP biomarker vector and computes hybrid predictions.
        """
        dip_vector = extract_clinical_biomarker_vector(biomarkers)
        
        if HAS_TORCH:
            cnn_t = torch.tensor(cnn_embedding_512, dtype=torch.float32).unsqueeze(0)
            dip_t = torch.tensor(dip_vector, dtype=torch.float32).unsqueeze(0)
            
            model = self.aptos_fusion_model if task == "aptos" else self.odir_fusion_model
            with torch.no_grad():
                logits = model(cnn_t, dip_t)[0]
                if task == "aptos":
                    probs = F.softmax(logits, dim=0).numpy()
                else:
                    probs = torch.sigmoid(logits).numpy()
        else:
            # Fallback heuristic weighting if PyTorch is unavailable
            base_score = float(np.mean(cnn_embedding_512[:5])) if len(cnn_embedding_512) >= 5 else 0.5
            probs = np.full(5 if task == "aptos" else 8, 0.1)
            probs[0] = float(np.clip(base_score, 0.1, 0.9))
            
        return {
            "biomarker_vector": dip_vector.tolist(),
            "fusion_probs": probs.tolist(),
            "hybrid_feature_dim": 525
        }
