"""
Unit tests for Feature 3: DIP-Guided Clinical Risk Score & Severity Grading.
Tests ClinicalRiskScorer, sub-risk functions, severity grading, recommendations,
enhanced PDF report, and POST /risk-score API endpoint.
"""
import io
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from ml.risk_score import (
    ClinicalRiskScorer,
    _vdi_risk, _lesion_risk, _exudate_risk,
    _ml_confidence_risk, _anatomy_risk,
)
from ml.pdf_report import generate_html_report
from ml.schemas import ClinicalRiskResult
from backend.app.main import app

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _synthetic_fundus(size: int = 128) -> np.ndarray:
    img = np.full((size, size, 3), 120, dtype=np.uint8)
    cy, cx, r = size // 2, size // 2, size // 3
    Y, X = np.ogrid[:size, :size]
    mask = (X - cx) ** 2 + (Y - cy) ** 2 <= r ** 2
    img[mask] = [180, 80, 25]
    return img


def _image_bytes(size: int = 128) -> bytes:
    arr = _synthetic_fundus(size)
    pil = Image.fromarray(arr)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# Sub-risk function tests
# ─────────────────────────────────────────────────────────────────────────────

def test_vdi_risk_normal():
    risk, note = _vdi_risk(0.10)
    assert risk == 0.1
    assert "Normal" in note


def test_vdi_risk_low():
    risk, note = _vdi_risk(0.02)
    assert risk == 0.8
    assert "low" in note.lower()


def test_vdi_risk_high():
    risk, note = _vdi_risk(0.35)
    assert risk == 0.7
    assert "High" in note


def test_lesion_risk_zero():
    risk, note = _lesion_risk(0)
    assert risk == 0.0
    assert "clear" in note.lower()


def test_lesion_risk_mild():
    risk, note = _lesion_risk(3)
    assert risk == 0.3
    assert "mild" in note.lower()


def test_lesion_risk_severe():
    risk, note = _lesion_risk(20)
    assert risk == 0.9
    assert "severe" in note.lower()


def test_exudate_risk_none():
    risk, note = _exudate_risk(0.0, 0)
    assert risk == 0.0


def test_exudate_risk_csme():
    risk, note = _exudate_risk(0.06, 15)
    assert risk == 0.85
    assert "CSME" in note


def test_ml_confidence_normal_high():
    risk, note = _ml_confidence_risk(0.95, "Normal")
    assert risk == 0.05
    assert "low disease risk" in note.lower()


def test_ml_confidence_disease_high():
    risk, note = _ml_confidence_risk(0.9, "Diabetic Retinopathy")
    assert risk == 0.9
    assert "strong" in note.lower()


def test_ml_confidence_disease_low():
    risk, note = _ml_confidence_risk(0.3, "Glaucoma")
    assert risk == 0.35
    assert "inconclusive" in note.lower()


def test_anatomy_risk_all_found():
    risk, note = _anatomy_risk(True, [100, 100])
    assert risk == 0.0


def test_anatomy_risk_no_od():
    risk, note = _anatomy_risk(False, None)
    assert risk == 0.35


# ─────────────────────────────────────────────────────────────────────────────
# ClinicalRiskScorer tests
# ─────────────────────────────────────────────────────────────────────────────

def test_scorer_returns_required_keys():
    scorer = ClinicalRiskScorer()
    result = scorer.compute(
        vessel_density_index=0.10,
        microaneurysm_count=0,
        exudate_count=0,
        exudate_area_ratio=0.0,
        ml_confidence=0.9,
        top_prediction="Normal",
        optic_disc_found=True,
        macula_center=[100, 100],
    )
    for key in ["risk_score", "severity_grade", "risk_level", "risk_color",
                "sub_scores", "interpretations", "recommendations"]:
        assert key in result


def test_scorer_healthy_low_risk():
    scorer = ClinicalRiskScorer()
    result = scorer.compute(
        vessel_density_index=0.12,
        microaneurysm_count=0,
        exudate_count=0,
        exudate_area_ratio=0.0,
        ml_confidence=0.95,
        top_prediction="Normal",
        optic_disc_found=True,
        macula_center=[100, 100],
    )
    assert result["risk_score"] <= 15
    assert result["risk_level"] == "Low Risk"


def test_scorer_severe_high_risk():
    scorer = ClinicalRiskScorer()
    result = scorer.compute(
        vessel_density_index=0.35,
        microaneurysm_count=25,
        exudate_count=20,
        exudate_area_ratio=0.08,
        ml_confidence=0.92,
        top_prediction="Diabetic Retinopathy",
        optic_disc_found=False,
        macula_center=None,
    )
    assert result["risk_score"] >= 60
    assert "High" in result["risk_level"] or "Critical" in result["risk_level"]


def test_scorer_risk_score_range():
    scorer = ClinicalRiskScorer()
    result = scorer.compute()
    assert 0.0 <= result["risk_score"] <= 100.0


def test_scorer_has_recommendations():
    scorer = ClinicalRiskScorer()
    result = scorer.compute(microaneurysm_count=12, ml_confidence=0.8, top_prediction="DR")
    assert len(result["recommendations"]) >= 1


def test_scorer_has_interpretations():
    scorer = ClinicalRiskScorer()
    result = scorer.compute()
    assert len(result["interpretations"]) == 5  # one per sub-risk


def test_scorer_custom_weights():
    scorer = ClinicalRiskScorer(weights={
        "vdi": 0.5, "lesion": 0.1, "exudate": 0.1,
        "ml_confidence": 0.2, "anatomy": 0.1,
    })
    result = scorer.compute(vessel_density_index=0.01)
    assert result["risk_score"] > 0


# ─────────────────────────────────────────────────────────────────────────────
# Enhanced PDF report tests
# ─────────────────────────────────────────────────────────────────────────────

def test_pdf_report_includes_risk_section():
    pred = {
        "request_id": "test-123456789012",
        "task": "odir",
        "model_name": "TestModel",
        "top_prediction": "Diabetic Retinopathy",
        "calibrated_confidence": 0.85,
        "quality_gate": {"quality_score": 0.9, "passed": True},
        "predictions": [{"label": "DR", "probability": 0.85, "is_positive": True}],
    }
    risk = {
        "risk_score": 62.5,
        "severity_grade": "Severe NPDR",
        "risk_level": "High Risk",
        "risk_color": "#ef4444",
        "sub_scores": {
            "vessel_density_risk": 40.0,
            "lesion_risk": 90.0,
            "exudate_risk": 55.0,
            "ml_confidence_risk": 90.0,
            "anatomy_risk": 0.0,
        },
        "interpretations": ["Test interpretation"],
        "recommendations": ["Test recommendation"],
    }
    html = generate_html_report(pred, risk_result=risk)
    assert "Clinical Risk Assessment" in html
    assert "62" in html  # risk score
    assert "Severe NPDR" in html
    assert "Test interpretation" in html
    assert "Test recommendation" in html


def test_pdf_report_includes_dip_section():
    pred = {
        "request_id": "test-123456789012",
        "task": "odir",
        "model_name": "TestModel",
        "top_prediction": "Normal",
        "calibrated_confidence": 0.9,
        "quality_gate": {"quality_score": 1.0, "passed": True},
        "predictions": [],
    }
    dip = {
        "vessel_density_index": 0.1234,
        "microaneurysm_candidate_count": 5,
        "exudate_candidate_count": 2,
        "exudate_area_ratio": 0.0050,
        "optic_disc_found": True,
        "optic_disc_bbox": [10, 20, 50, 50],
        "macula_center": [120, 130],
    }
    html = generate_html_report(pred, dip_biomarkers=dip)
    assert "DIP Structural Biomarker" in html
    assert "0.1234" in html
    assert "Detected" in html


# ─────────────────────────────────────────────────────────────────────────────
# API endpoint tests — POST /risk-score
# ─────────────────────────────────────────────────────────────────────────────

def test_risk_score_endpoint_returns_200():
    img_bytes = _image_bytes()
    response = client.post(
        "/risk-score",
        files={"file": ("fundus.png", img_bytes, "image/png")}
    )
    assert response.status_code == 200


def test_risk_score_endpoint_schema():
    img_bytes = _image_bytes()
    response = client.post(
        "/risk-score",
        files={"file": ("fundus.png", img_bytes, "image/png")}
    )
    data = response.json()
    assert "risk_score" in data
    assert "severity_grade" in data
    assert "risk_level" in data
    assert "risk_color" in data
    assert "sub_scores" in data
    assert "interpretations" in data
    assert "recommendations" in data
    assert 0.0 <= data["risk_score"] <= 100.0
