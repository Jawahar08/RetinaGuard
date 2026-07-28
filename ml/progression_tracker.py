"""
Feature 5: Multi-Image Longitudinal Disease Progression Tracker & Serial Analysis
===================================================================================
Compares sequential retinal fundus photographs taken at different visits (Baseline vs. Follow-up)
to measure biomarker deltas, classify disease trajectory, and generate lesion change overlays.

Key Metrics Computed:
  - Delta Vessel Density Index (Δ VDI): vascular tree dropout or neovascularization
  - Delta Microaneurysm Count (Δ MA): proliferation or regression of haemorrhages
  - Delta Exudate Area Ratio (Δ EAR): macular edema progression or absorption
  - Delta Clinical Risk Score (Δ Risk): composite trajectory classification

Trajectory Categories:
  - Significant Improvement (Δ Risk <= -15)
  - Slight Improvement      (-15 < Δ Risk <= -5)
  - Stable / Unchanged       (-5 < Δ Risk <= +5)
  - Mild Progression        (+5 < Δ Risk <= +15)
  - Rapid Progression       (Δ Risk > +15)
"""
import base64
import io
import logging
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from ml.dip_features import RetinalDIPExtractor
from ml.risk_score import ClinicalRiskScorer

logger = logging.getLogger("retinal-progression")


def compute_biomarker_deltas(
    baseline_biomarkers: Dict,
    followup_biomarkers: Dict,
    baseline_risk: Dict,
    followup_risk: Dict,
) -> Dict:
    """
    Computes absolute and percentage changes between baseline and follow-up DIP biomarkers.
    """
    vdi_base = baseline_biomarkers.get("vessel_density_index", 0.0)
    vdi_follow = followup_biomarkers.get("vessel_density_index", 0.0)
    delta_vdi = round(vdi_follow - vdi_base, 4)

    ma_base = baseline_biomarkers.get("microaneurysm_candidate_count", 0)
    ma_follow = followup_biomarkers.get("microaneurysm_candidate_count", 0)
    delta_ma = ma_follow - ma_base

    exu_base = baseline_biomarkers.get("exudate_candidate_count", 0)
    exu_follow = followup_biomarkers.get("exudate_candidate_count", 0)
    delta_exu = exu_follow - exu_base

    ear_base = baseline_biomarkers.get("exudate_area_ratio", 0.0)
    ear_follow = followup_biomarkers.get("exudate_area_ratio", 0.0)
    delta_ear = round(ear_follow - ear_base, 4)

    risk_base = baseline_risk.get("risk_score", 0.0)
    risk_follow = followup_risk.get("risk_score", 0.0)
    delta_risk = round(risk_follow - risk_base, 1)

    # Classify overall trajectory
    trajectory, trajectory_color, badge_text = classify_trajectory(delta_risk)

    return {
        "delta_vessel_density_index": delta_vdi,
        "delta_microaneurysm_count": delta_ma,
        "delta_exudate_count": delta_exu,
        "delta_exudate_area_ratio": delta_ear,
        "delta_risk_score": delta_risk,
        "trajectory": trajectory,
        "trajectory_color": trajectory_color,
        "badge_text": badge_text,
        "baseline_risk_score": risk_base,
        "followup_risk_score": risk_follow,
        "baseline_severity": baseline_risk.get("severity_grade", "Unknown"),
        "followup_severity": followup_risk.get("severity_grade", "Unknown"),
    }


def classify_trajectory(delta_risk: float) -> Tuple[str, str, str]:
    """Classifies disease progression trajectory based on risk score delta."""
    if delta_risk <= -15.0:
        return "Significant Improvement", "#22c55e", "IMPROVING (SIGNIFICANT)"
    elif delta_risk <= -5.0:
        return "Slight Improvement", "#84cc16", "IMPROVING (SLIGHT)"
    elif delta_risk <= 5.0:
        return "Stable / Unchanged", "#3b82f6", "STABLE"
    elif delta_risk <= 15.0:
        return "Mild Progression", "#f97316", "PROGRESSING (MILD)"
    else:
        return "Rapid Progression", "#ef4444", "PROGRESSING (RAPID)"


def generate_change_difference_map(img1_rgb: np.ndarray, img2_rgb: np.ndarray) -> str:
    """
    Generates a color-coded difference map showing structural change:
      - Green pixels: Resolved / cleared areas
      - Red pixels: Newly appeared lesion / exudate candidates
      - Yellow / Grey: Static retina
    """
    # Resize img2 to match img1 if needed
    h, w = img1_rgb.shape[:2]
    img2_resized = cv2.resize(img2_rgb, (w, h))

    # Convert both to grayscale
    g1 = cv2.cvtColor(img1_rgb, cv2.COLOR_RGB2GRAY).astype(float)
    g2 = cv2.cvtColor(img2_rgb, cv2.COLOR_RGB2GRAY).astype(float)

    # Compute absolute signed difference
    diff = g2 - g1  # Positive = brighter in follow-up; Negative = darker

    # Create RGB difference visualization
    diff_map = np.zeros((h, w, 3), dtype=np.uint8)

    # Red channel for newly appeared bright/dark anomalies
    new_lesions = np.clip(diff, 0, 255).astype(np.uint8)
    resolved_lesions = np.clip(-diff, 0, 255).astype(np.uint8)

    # Blend with grayscale background
    bg = (g2 * 0.5).astype(np.uint8)
    diff_map[:, :, 0] = cv2.add(bg, new_lesions)       # Red = new features
    diff_map[:, :, 1] = cv2.add(bg, resolved_lesions)  # Green = resolved features
    diff_map[:, :, 2] = bg                             # Blue = structural background

    # Convert to base64 PNG
    pil_img = Image.fromarray(diff_map)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


class ProgressionTracker:
    """
    Orchestrates longitudinal comparison between baseline and follow-up retinal scans.
    """

    def __init__(self, dip_extractor: Optional[RetinalDIPExtractor] = None, risk_scorer: Optional[ClinicalRiskScorer] = None):
        self.dip_extractor = dip_extractor or RetinalDIPExtractor(target_size=(512, 512))
        self.risk_scorer = risk_scorer or ClinicalRiskScorer()

    def analyze(self, baseline_rgb: np.ndarray, followup_rgb: np.ndarray) -> Dict:
        """
        Runs serial analysis on baseline vs follow-up images.
        """
        # Run DIP extraction on baseline
        dip1 = self.dip_extractor.analyze(baseline_rgb)
        risk1 = self.risk_scorer.compute(
            vessel_density_index=dip1.vessel_density_index,
            microaneurysm_count=dip1.microaneurysm_candidate_count,
            exudate_count=dip1.exudate_candidate_count,
            exudate_area_ratio=dip1.exudate_area_ratio,
            optic_disc_found=dip1.optic_disc_found,
            macula_center=dip1.macula_center,
        )

        # Run DIP extraction on follow-up
        dip2 = self.dip_extractor.analyze(followup_rgb)
        risk2 = self.risk_scorer.compute(
            vessel_density_index=dip2.vessel_density_index,
            microaneurysm_count=dip2.microaneurysm_candidate_count,
            exudate_count=dip2.exudate_candidate_count,
            exudate_area_ratio=dip2.exudate_area_ratio,
            optic_disc_found=dip2.optic_disc_found,
            macula_center=dip2.macula_center,
        )

        # Compute deltas
        deltas = compute_biomarker_deltas(
            baseline_biomarkers=dip1.model_dump() if hasattr(dip1, 'model_dump') else dip1.__dict__,
            followup_biomarkers=dip2.model_dump() if hasattr(dip2, 'model_dump') else dip2.__dict__,
            baseline_risk=risk1,
            followup_risk=risk2,
        )

        # Generate difference map
        diff_b64 = generate_change_difference_map(baseline_rgb, followup_rgb)

        # Summary recommendations
        recommendations = self._generate_progression_recommendations(deltas)

        return {
            "deltas": deltas,
            "baseline_biomarkers": dip1,
            "followup_biomarkers": dip2,
            "baseline_risk": risk1,
            "followup_risk": risk2,
            "difference_map_base64": diff_b64,
            "recommendations": recommendations,
        }

    def _generate_progression_recommendations(self, deltas: Dict) -> List[str]:
        recs = []
        traj = deltas.get("trajectory", "")
        d_risk = deltas.get("delta_risk_score", 0.0)

        if "Improvement" in traj:
            recs.append("Positive therapeutic response observed — current treatment regimen is effective.")
            recs.append("Continue current management plan and schedule routine follow-up in 12 months.")
        elif "Stable" in traj:
            recs.append("Retinal condition is stable — no evidence of significant disease progression.")
            recs.append("Maintain glycemic and blood pressure targets; re-evaluate in 6–12 months.")
        elif "Mild" in traj:
            recs.append(f"Mild disease progression detected (Δ Risk: +{d_risk}). Shorten follow-up interval to 3–6 months.")
            recs.append("Review glycemic control (HbA1c) and cardiovascular risk factors with primary care physician.")
        else:
            recs.append(f"URGENT: Rapid disease progression detected (Δ Risk: +{d_risk}). Expedited ophthalmology referral required.")
            recs.append("Assess for developing macular edema or neovascularization requiring immediate intervention.")

        return recs
