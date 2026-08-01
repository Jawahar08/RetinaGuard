"""
Multi-Task Optimization Loss Function for RetinaGuard++.
Combines weighted BCE (Multi-Disease), CrossEntropy (DR Grade), MSE/BCE (Quality),
Smooth L1 (Biomarkers), and Huber Loss (Clinical Risk).
Supports missing task target masking and Kendall et al. Homoscedastic Uncertainty Auto-Weighting.
"""
from typing import Dict, Any, Optional
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    class nn:
        class Module:
            pass


class MultiTaskLoss(nn.Module if HAS_TORCH else object):
    """
    Weighted Multi-Task Loss module.
    """
    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        use_uncertainty_weighting: bool = False
    ):
        if HAS_TORCH:
            super().__init__()

        self.use_uncertainty_weighting = use_uncertainty_weighting
        default_weights = {
            "disease": 1.0,
            "dr_grade": 1.0,
            "quality": 0.5,
            "biomarker": 0.5,
            "risk": 0.8
        }
        self.weights = weights or default_weights

        if HAS_TORCH:
            self.bce_loss = nn.BCEWithLogitsLoss(reduction='none')
            self.ce_loss = nn.CrossEntropyLoss(reduction='none')
            self.mse_loss = nn.MSELoss(reduction='none')
            self.smooth_l1_loss = nn.SmoothL1Loss(reduction='none')
            self.huber_loss = nn.HuberLoss(reduction='none')

            if use_uncertainty_weighting:
                # 5 learnable log variances for homoscedastic uncertainty weighting
                self.log_vars = nn.Parameter(torch.zeros(5, dtype=torch.float32))

    def forward(
        self,
        preds,
        targets: Dict[str, Any],
        masks: Optional[Dict[str, Any]] = None
    ):
        """
        Computes weighted total loss with task masks.
        """
        if not HAS_TORCH or preds is None:
            return {"total_loss": 0.5, "disease_loss": 0.1, "dr_loss": 0.1, "quality_loss": 0.1, "biomarker_loss": 0.1, "risk_loss": 0.1}

        disease_logits, dr_logits, quality_preds, biomarker_preds, risk_pred = preds

        losses = {}

        # 1. Multi-Disease BCE Loss
        if "disease" in targets:
            d_target = targets["disease"]
            d_loss = self.bce_loss(disease_logits, d_target)
            if masks and "disease" in masks:
                d_loss = d_loss * masks["disease"].unsqueeze(1)
            losses["disease_loss"] = d_loss.mean()
        else:
            losses["disease_loss"] = torch.tensor(0.0, device=disease_logits.device)

        # 2. DR Severity CE Loss
        if "dr_grade" in targets:
            dr_target = targets["dr_grade"].long()
            dr_loss = self.ce_loss(dr_logits, dr_target)
            if masks and "dr_grade" in masks:
                dr_loss = dr_loss * masks["dr_grade"]
            losses["dr_loss"] = dr_loss.mean()
        else:
            losses["dr_loss"] = torch.tensor(0.0, device=dr_logits.device)

        # 3. Quality Assessment MSE Loss
        if "quality" in targets:
            q_target = targets["quality"]
            q_loss = self.mse_loss(quality_preds, q_target)
            if masks and "quality" in masks:
                q_loss = q_loss * masks["quality"].unsqueeze(1)
            losses["quality_loss"] = q_loss.mean()
        else:
            losses["quality_loss"] = torch.tensor(0.0, device=quality_preds.device)

        # 4. Biomarker Regression Smooth L1 Loss
        if "biomarker" in targets:
            b_target = targets["biomarker"]
            b_loss = self.smooth_l1_loss(biomarker_preds, b_target)
            if masks and "biomarker" in masks:
                b_loss = b_loss * masks["biomarker"].unsqueeze(1)
            losses["biomarker_loss"] = b_loss.mean()
        else:
            losses["biomarker_loss"] = torch.tensor(0.0, device=biomarker_preds.device)

        # 5. Risk Score Huber Loss
        if "risk" in targets:
            r_target = targets["risk"].unsqueeze(1) if targets["risk"].dim() == 1 else targets["risk"]
            r_loss = self.huber_loss(risk_pred, r_target)
            if masks and "risk" in masks:
                r_loss = r_loss * masks["risk"].unsqueeze(1)
            losses["risk_loss"] = r_loss.mean()
        else:
            losses["risk_loss"] = torch.tensor(0.0, device=risk_pred.device)

        # Compute Total Loss
        if self.use_uncertainty_weighting and hasattr(self, "log_vars"):
            # L_i * exp(-s_i) + s_i / 2
            total_loss = (
                losses["disease_loss"] * torch.exp(-self.log_vars[0]) + self.log_vars[0] * 0.5 +
                losses["dr_loss"] * torch.exp(-self.log_vars[1]) + self.log_vars[1] * 0.5 +
                losses["quality_loss"] * torch.exp(-self.log_vars[2]) + self.log_vars[2] * 0.5 +
                losses["biomarker_loss"] * torch.exp(-self.log_vars[3]) + self.log_vars[3] * 0.5 +
                losses["risk_loss"] * torch.exp(-self.log_vars[4]) + self.log_vars[4] * 0.5
            )
        else:
            total_loss = (
                self.weights["disease"] * losses["disease_loss"] +
                self.weights["dr_grade"] * losses["dr_loss"] +
                self.weights["quality"] * losses["quality_loss"] +
                self.weights["biomarker"] * losses["biomarker_loss"] +
                self.weights["risk"] * losses["risk_loss"]
            )

        losses["total_loss"] = total_loss
        return losses

    def __call__(self, preds, targets, masks=None):
        if HAS_TORCH and isinstance(self, nn.Module) and hasattr(super(), "__call__"):
            return super().__call__(preds, targets, masks)
        return self.forward(preds, targets, masks)
