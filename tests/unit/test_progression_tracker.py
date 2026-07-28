"""
Unit tests for Feature 5: Multi-Image Longitudinal Disease Progression Tracker.
Tests biomarker delta calculation, trajectory classification, structural difference map generation,
and POST /progression-analysis API endpoint.
"""
import io
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from ml.progression_tracker import (
    ProgressionTracker,
    compute_biomarker_deltas,
    classify_trajectory,
    generate_change_difference_map,
)
from ml.schemas import ProgressionAnalysisResult
from backend.app.main import app

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic Image Factories
# ─────────────────────────────────────────────────────────────────────────────

def _fundus_image(intensity: int = 120, size: int = 128) -> np.ndarray:
    img = np.full((size, size, 3), intensity, dtype=np.uint8)
    cy, cx, r = size // 2, size // 2, size // 3
    Y, X = np.ogrid[:size, :size]
    mask = (X - cx) ** 2 + (Y - cy) ** 2 <= r ** 2
    img[mask] = [180, 80, 25]
    return img


def _image_bytes(intensity: int = 120, size: int = 128) -> bytes:
    arr = _fundus_image(intensity, size)
    pil = Image.fromarray(arr)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# Trajectory Classification Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_classify_trajectory_improving_significant():
    traj, color, badge = classify_trajectory(-20.0)
    assert traj == "Significant Improvement"
    assert color == "#22c55e"
    assert "IMPROVING" in badge


def test_classify_trajectory_improving_slight():
    traj, color, badge = classify_trajectory(-10.0)
    assert traj == "Slight Improvement"


def test_classify_trajectory_stable():
    traj, color, badge = classify_trajectory(2.0)
    assert traj == "Stable / Unchanged"
    assert badge == "STABLE"


def test_classify_trajectory_progressing_mild():
    traj, color, badge = classify_trajectory(10.0)
    assert traj == "Mild Progression"


def test_classify_trajectory_progressing_rapid():
    traj, color, badge = classify_trajectory(25.0)
    assert traj == "Rapid Progression"
    assert color == "#ef4444"


# ─────────────────────────────────────────────────────────────────────────────
# Biomarker Deltas Computation Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_compute_biomarker_deltas():
    bio1 = {"vessel_density_index": 0.10, "microaneurysm_candidate_count": 2, "exudate_candidate_count": 1, "exudate_area_ratio": 0.001}
    bio2 = {"vessel_density_index": 0.15, "microaneurysm_candidate_count": 8, "exudate_candidate_count": 4, "exudate_area_ratio": 0.010}
    risk1 = {"risk_score": 20.0, "severity_grade": "Mild NPDR"}
    risk2 = {"risk_score": 45.0, "severity_grade": "Moderate NPDR"}

    deltas = compute_biomarker_deltas(bio1, bio2, risk1, risk2)

    assert deltas["delta_microaneurysm_count"] == 6
    assert deltas["delta_exudate_count"] == 3
    assert deltas["delta_risk_score"] == 25.0
    assert deltas["trajectory"] == "Rapid Progression"


# ─────────────────────────────────────────────────────────────────────────────
# Structural Difference Map Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_generate_change_difference_map():
    img1 = _fundus_image(100)
    img2 = _fundus_image(150)
    diff_b64 = generate_change_difference_map(img1, img2)
    assert isinstance(diff_b64, str)
    assert len(diff_b64) > 100


# ─────────────────────────────────────────────────────────────────────────────
# ProgressionTracker Unit Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_progression_tracker_analyze():
    tracker = ProgressionTracker()
    img1 = _fundus_image(120)
    img2 = _fundus_image(130)
    res = tracker.analyze(img1, img2)

    assert "deltas" in res
    assert "baseline_biomarkers" in res
    assert "followup_biomarkers" in res
    assert "baseline_risk" in res
    assert "followup_risk" in res
    assert "difference_map_base64" in res
    assert "recommendations" in res


# ─────────────────────────────────────────────────────────────────────────────
# API Endpoint Tests — POST /progression-analysis
# ─────────────────────────────────────────────────────────────────────────────

def test_progression_endpoint_returns_200():
    b_bytes = _image_bytes(100)
    f_bytes = _image_bytes(130)

    response = client.post(
        "/progression-analysis",
        files={
            "baseline_file": ("baseline.png", b_bytes, "image/png"),
            "followup_file": ("followup.png", f_bytes, "image/png"),
        }
    )
    assert response.status_code == 200


def test_progression_endpoint_schema():
    b_bytes = _image_bytes(100)
    f_bytes = _image_bytes(130)

    response = client.post(
        "/progression-analysis",
        files={
            "baseline_file": ("baseline.png", b_bytes, "image/png"),
            "followup_file": ("followup.png", f_bytes, "image/png"),
        }
    )
    data = response.json()
    assert "deltas" in data
    assert "baseline_biomarkers" in data
    assert "followup_biomarkers" in data
    assert "baseline_risk" in data
    assert "followup_risk" in data
    assert "difference_map_base64" in data
    assert "recommendations" in data
    assert "trajectory" in data["deltas"]
