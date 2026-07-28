"""
Unit tests for Classical DIP Structural Biomarker Extraction (Feature 1).
Tests direct RetinalDIPExtractor usage and POST /dip-analysis API endpoint.
"""
import io
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from ml.dip_features import RetinalDIPExtractor
from ml.schemas import DIPBiomarkerResult
from backend.app.main import app

client = TestClient(app)


def _synthetic_fundus(size: int = 256) -> np.ndarray:
    """Synthetic retinal fundus image: orange disk, bright optic disc, dark vessels."""
    img = np.zeros((size, size, 3), dtype=np.uint8)
    cx, cy, r = size // 2, size // 2, int(size * 0.43)
    Y, X = np.ogrid[:size, :size]
    fov = (X - cx) ** 2 + (Y - cy) ** 2 <= r ** 2
    img[fov] = [180, 80, 20]  # orange-red fundus background

    # Bright optic disc (left of center)
    disc_cx, disc_cy, disc_r = cx - r // 2, cy, int(size * 0.08)
    disc = (X - disc_cx) ** 2 + (Y - disc_cy) ** 2 <= disc_r ** 2
    img[disc] = [255, 230, 150]

    # Dark vessel lines
    for i in range(5):
        y_line = cy + i * (size // 20)
        if y_line + 1 < size:
            img[y_line: y_line + 2, disc_cx: cx + r // 2] = [20, 10, 5]

    return img


# ---------------------------------------------------------------------------
# Direct extractor tests
# ---------------------------------------------------------------------------

def test_dip_extractor_returns_correct_schema():
    img = _synthetic_fundus(256)
    extractor = RetinalDIPExtractor(target_size=(256, 256))
    result = extractor.analyze(img)

    assert isinstance(result, DIPBiomarkerResult)


def test_vessel_density_index_in_range():
    img = _synthetic_fundus(256)
    extractor = RetinalDIPExtractor(target_size=(256, 256))
    result = extractor.analyze(img)

    assert 0.0 <= result.vessel_density_index <= 1.0


def test_exudate_ratio_in_range():
    img = _synthetic_fundus(256)
    extractor = RetinalDIPExtractor(target_size=(256, 256))
    result = extractor.analyze(img)

    assert 0.0 <= result.exudate_area_ratio <= 1.0


def test_microaneurysm_count_non_negative():
    img = _synthetic_fundus(256)
    extractor = RetinalDIPExtractor(target_size=(256, 256))
    result = extractor.analyze(img)

    assert result.microaneurysm_candidate_count >= 0


def test_optic_disc_found():
    img = _synthetic_fundus(256)
    extractor = RetinalDIPExtractor(target_size=(256, 256))
    result = extractor.analyze(img)

    assert result.optic_disc_found is True
    assert result.optic_disc_bbox is not None
    assert len(result.optic_disc_bbox) == 4


def test_overlay_base64_strings_present():
    img = _synthetic_fundus(256)
    extractor = RetinalDIPExtractor(target_size=(256, 256))
    result = extractor.analyze(img)

    assert result.anatomy_overlay_base64 is not None and len(result.anatomy_overlay_base64) > 100
    assert result.vessel_mask_base64 is not None and len(result.vessel_mask_base64) > 100
    assert result.lesion_mask_base64 is not None and len(result.lesion_mask_base64) > 100


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

def _image_bytes(size: int = 128) -> bytes:
    img_arr = _synthetic_fundus(size)
    pil = Image.fromarray(img_arr)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def test_dip_analysis_endpoint_returns_200():
    img_bytes = _image_bytes()
    response = client.post(
        "/dip-analysis",
        files={"file": ("fundus.png", img_bytes, "image/png")}
    )
    assert response.status_code == 200


def test_dip_analysis_endpoint_schema():
    img_bytes = _image_bytes()
    response = client.post(
        "/dip-analysis",
        files={"file": ("fundus.png", img_bytes, "image/png")}
    )
    data = response.json()
    assert "vessel_density_index" in data
    assert "microaneurysm_candidate_count" in data
    assert "exudate_area_ratio" in data
    assert "optic_disc_found" in data
