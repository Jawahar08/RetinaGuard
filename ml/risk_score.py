"""
Feature 3: DIP-Guided Clinical Risk Score & Severity Grading Engine
====================================================================
Aggregates DIP biomarkers (Feature 1) + ML prediction confidence into a
unified, weighted clinical risk score with automated severity grading.

Risk Formula (Gonzalez & Woods inspired — weighted biomarker fusion):

    RiskScore = w1 * VDI_risk + w2 * Lesion_risk + w3 * Exudate_risk
              + w4 * ML_confidence_risk + w5 * Anatomy_risk

    where each sub-risk is normalized to [0.0, 1.0].

Severity Grading (ICDR / ETDRS inspired):
    0–15:   No Apparent DR          → Low Risk
    16–35:  Mild NPDR               → Moderate Risk
    36–55:  Moderate NPDR           → Elevated Risk
    56–75:  Severe NPDR             → High Risk
    76–100: Proliferative DR Risk   → Critical Risk

Clinical Interpretation:
    Each biomarker produces a human-readable clinical interpretation
    sentence that can be embedded in the PDF diagnostic report.
"""
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("retinal-risk")


# ─────────────────────────────────────────────────────────────────────────────
# Severity grading constants
# ─────────────────────────────────────────────────────────────────────────────

SEVERITY_GRADES = [
    (15,  "No Apparent DR",         "Low Risk",      "#22c55e"),  # green
    (35,  "Mild NPDR",              "Moderate Risk",  "#eab308"),  # yellow
    (55,  "Moderate NPDR",          "Elevated Risk",  "#f97316"),  # orange
    (75,  "Severe NPDR",            "High Risk",      "#ef4444"),  # red
    (100, "Proliferative DR Risk",  "Critical Risk",  "#991b1b"),  # dark red
]


# ─────────────────────────────────────────────────────────────────────────────
# Sub-risk scoring functions
# ─────────────────────────────────────────────────────────────────────────────

def _vdi_risk(vessel_density_index: float) -> Tuple[float, str]:
    """
    Vessel Density Index risk.
    Normal VDI ≈ 0.05–0.20. Very low (<0.03) suggests vascular dropout.
    Very high (>0.30) may suggest neovascularization.
    """
    if vessel_density_index < 0.03:
        risk = 0.8
        note = f"Very low vessel density ({vessel_density_index:.3f}) — possible vascular dropout or poor image quality."
    elif vessel_density_index < 0.05:
        risk = 0.5
        note = f"Below-normal vessel density ({vessel_density_index:.3f}) — warrants clinical review."
    elif vessel_density_index <= 0.20:
        risk = 0.1
        note = f"Normal vessel density ({vessel_density_index:.3f}) — healthy vascular tree pattern."
    elif vessel_density_index <= 0.30:
        risk = 0.4
        note = f"Elevated vessel density ({vessel_density_index:.3f}) — possible vascular dilation or early neovascularization."
    else:
        risk = 0.7
        note = f"High vessel density ({vessel_density_index:.3f}) — possible neovascularization or artifact."
    return risk, note


def _lesion_risk(microaneurysm_count: int) -> Tuple[float, str]:
    """
    Microaneurysm / haemorrhage candidate risk.
    0 = clear, 1–5 = mild, 6–15 = moderate, 16+ = severe.
    """
    if microaneurysm_count == 0:
        risk = 0.0
        note = "No microaneurysm candidates detected — retina appears clear of haemorrhagic lesions."
    elif microaneurysm_count <= 5:
        risk = 0.3
        note = f"{microaneurysm_count} microaneurysm candidate(s) detected — consistent with mild NPDR."
    elif microaneurysm_count <= 15:
        risk = 0.6
        note = f"{microaneurysm_count} microaneurysm candidates detected — consistent with moderate NPDR."
    else:
        risk = 0.9
        note = f"{microaneurysm_count} microaneurysm candidates detected — suggests severe retinopathy."
    return risk, note


def _exudate_risk(exudate_area_ratio: float, exudate_count: int) -> Tuple[float, str]:
    """
    Exudate area & count risk.
    High exudate area ratio suggests clinically significant macular edema (CSME).
    """
    if exudate_count == 0 and exudate_area_ratio < 0.001:
        risk = 0.0
        note = "No exudate candidates detected — no signs of lipid leakage."
    elif exudate_area_ratio < 0.01:
        risk = 0.25
        note = f"{exudate_count} exudate candidate(s), area ratio {exudate_area_ratio:.4f} — mild exudation."
    elif exudate_area_ratio < 0.05:
        risk = 0.55
        note = f"{exudate_count} exudate candidate(s), area ratio {exudate_area_ratio:.4f} — moderate exudation, possible CSME."
    else:
        risk = 0.85
        note = f"{exudate_count} exudate candidate(s), area ratio {exudate_area_ratio:.4f} — significant exudation, CSME likely."
    return risk, note


def _ml_confidence_risk(confidence: float, top_prediction: str) -> Tuple[float, str]:
    """
    ML model confidence contribution to risk.
    High confidence in disease prediction → high risk.
    High confidence in Normal → low risk.
    Low confidence → uncertainty penalty.
    """
    normal_labels = {"Normal", "No DR", "no_dr"}

    if top_prediction in normal_labels:
        if confidence >= 0.8:
            risk = 0.05
            note = f"ML model predicts Normal with high confidence ({confidence:.1%}) — low disease risk."
        elif confidence >= 0.5:
            risk = 0.2
            note = f"ML model predicts Normal with moderate confidence ({confidence:.1%}) — clinical verification suggested."
        else:
            risk = 0.4
            note = f"ML model predicts Normal but with low confidence ({confidence:.1%}) — uncertain; review recommended."
    else:
        if confidence >= 0.8:
            risk = 0.9
            note = f"ML model predicts {top_prediction} with high confidence ({confidence:.1%}) — strong disease indicator."
        elif confidence >= 0.5:
            risk = 0.6
            note = f"ML model predicts {top_prediction} with moderate confidence ({confidence:.1%}) — possible pathology."
        else:
            risk = 0.35
            note = f"ML model predicts {top_prediction} but with low confidence ({confidence:.1%}) — inconclusive."
    return risk, note


def _anatomy_risk(optic_disc_found: bool, macula_center: Optional[list]) -> Tuple[float, str]:
    """
    Anatomical structure detection risk.
    Missing OD or macula may indicate poor image quality or severe pathology
    obscuring normal anatomy.
    """
    if optic_disc_found and macula_center is not None:
        risk = 0.0
        note = "Optic disc and macula successfully localized — normal anatomical landmarks."
    elif optic_disc_found:
        risk = 0.15
        note = "Optic disc detected but macula center could not be estimated — partial anatomy visibility."
    else:
        risk = 0.35
        note = "Optic disc not detected — possible image quality issue or extensive pathology obscuring anatomy."
    return risk, note


# ─────────────────────────────────────────────────────────────────────────────
# Main Risk Score Engine
# ─────────────────────────────────────────────────────────────────────────────

class ClinicalRiskScorer:
    """
    Computes a unified clinical risk score (0–100) by fusing DIP biomarkers
    with ML prediction confidence using weighted aggregation.
    """

    # Default weights (sum = 1.0)
    DEFAULT_WEIGHTS = {
        "vdi": 0.15,
        "lesion": 0.25,
        "exudate": 0.20,
        "ml_confidence": 0.30,
        "anatomy": 0.10,
    }

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or self.DEFAULT_WEIGHTS

    def compute(
        self,
        vessel_density_index: float = 0.0,
        microaneurysm_count: int = 0,
        exudate_count: int = 0,
        exudate_area_ratio: float = 0.0,
        ml_confidence: float = 0.0,
        top_prediction: str = "Normal",
        optic_disc_found: bool = False,
        macula_center: Optional[list] = None,
    ) -> Dict:
        """
        Compute clinical risk score and generate interpretation.

        Returns:
            dict with keys:
              - risk_score: float (0.0 – 100.0)
              - severity_grade: str
              - risk_level: str
              - risk_color: str (hex color for UI)
              - sub_scores: Dict[str, float]
              - interpretations: List[str]
              - recommendations: List[str]
        """
        # Compute sub-risks
        vdi_r, vdi_note = _vdi_risk(vessel_density_index)
        les_r, les_note = _lesion_risk(microaneurysm_count)
        exu_r, exu_note = _exudate_risk(exudate_area_ratio, exudate_count)
        ml_r, ml_note = _ml_confidence_risk(ml_confidence, top_prediction)
        ana_r, ana_note = _anatomy_risk(optic_disc_found, macula_center)

        # Weighted fusion → 0.0–1.0
        w = self.weights
        raw_score = (
            w["vdi"] * vdi_r
            + w["lesion"] * les_r
            + w["exudate"] * exu_r
            + w["ml_confidence"] * ml_r
            + w["anatomy"] * ana_r
        )

        # Scale to 0–100
        risk_score = round(min(100.0, max(0.0, raw_score * 100.0)), 1)

        # Determine severity grade
        severity_grade, risk_level, risk_color = self._grade(risk_score)

        # Clinical interpretations
        interpretations = [vdi_note, les_note, exu_note, ml_note, ana_note]

        # Recommendations
        recommendations = self._generate_recommendations(
            risk_score, severity_grade, microaneurysm_count, exudate_area_ratio
        )

        # Expected Next Check-up Date Calculation
        next_checkup_date, followup_interval, followup_days = self._compute_next_checkup(risk_score)

        return {
            "risk_score": risk_score,
            "severity_grade": severity_grade,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "next_checkup_date": next_checkup_date,
            "followup_interval": followup_interval,
            "followup_days": followup_days,
            "sub_scores": {
                "vessel_density_risk": round(vdi_r * 100, 1),
                "lesion_risk": round(les_r * 100, 1),
                "exudate_risk": round(exu_r * 100, 1),
                "ml_confidence_risk": round(ml_r * 100, 1),
                "anatomy_risk": round(ana_r * 100, 1),
            },
            "interpretations": interpretations,
            "recommendations": recommendations,
        }

    def _compute_next_checkup(self, score: float) -> Tuple[str, str, int]:
        """Computes expected next checkup date based on risk score severity."""
        from datetime import datetime, timedelta
        now = datetime.now()
        if score <= 15:
            days = 365
            interval = "12 Months (Annual Routine Screening)"
        elif score <= 35:
            days = 180
            interval = "6 Months (Follow-up Examination)"
        elif score <= 55:
            days = 90
            interval = "3 Months (Ophthalmologist Review & OCT)"
        elif score <= 75:
            days = 30
            interval = "1 Month (Urgent Retinal Specialist Referral)"
        else:
            days = 14
            interval = "2 Weeks (Immediate Vitreoretinal Consultation)"

        next_date = now + timedelta(days=days)
        next_date_str = next_date.strftime("%B %d, %Y")
        return next_date_str, interval, days

    def _grade(self, score: float) -> Tuple[str, str, str]:
        """Map risk score to severity grade."""
        for threshold, grade, level, color in SEVERITY_GRADES:
            if score <= threshold:
                return grade, level, color
        return SEVERITY_GRADES[-1][1], SEVERITY_GRADES[-1][2], SEVERITY_GRADES[-1][3]

    def _generate_recommendations(
        self, score: float, grade: str, lesion_count: int, exudate_ratio: float
    ) -> List[str]:
        """Generate clinical action recommendations based on risk."""
        recs = []

        if score <= 15:
            recs.append("Routine screening — no immediate referral required.")
            recs.append("Follow-up in 12 months for diabetic patients.")
        elif score <= 35:
            recs.append("Schedule follow-up retinal examination within 6–9 months.")
            recs.append("Monitor blood glucose and HbA1c levels.")
        elif score <= 55:
            recs.append("Refer to ophthalmologist for comprehensive dilated eye exam.")
            recs.append("Consider fluorescein angiography if exudates confirmed.")
            recs.append("Optimize glycemic and blood pressure control.")
        elif score <= 75:
            recs.append("URGENT: Refer to retinal specialist within 2–4 weeks.")
            recs.append("Optical coherence tomography (OCT) recommended for macular assessment.")
            recs.append("Assess for clinically significant macular edema (CSME).")
        else:
            recs.append("CRITICAL: Immediate referral to vitreoretinal specialist.")
            recs.append("Pan-retinal photocoagulation (PRP) or anti-VEGF therapy may be indicated.")
            recs.append("Rule out vitreous haemorrhage and tractional retinal detachment.")

        if lesion_count > 10:
            recs.append(f"High microaneurysm count ({lesion_count}) — consider 4-2-1 rule assessment for severe NPDR.")

        if exudate_ratio > 0.03:
            recs.append("Significant exudate load detected — evaluate for diabetic macular edema (DME).")

        return recs
