"""
Unit Tests for RetinaGuard++ Hybrid AI + Classical DIP Fusion Engine & Biomarker Extractors.
"""
import pytest
import numpy as np
from PIL import Image

from ml.dip_features import RetinalDIPExtractor
from ml.dip.vessel_analysis import extract_vessel_tortuosity_and_caliber
from ml.dip.branching_analysis import extract_branching_angles
from ml.dip.artery_vein_classifier import classify_arteries_and_veins
from ml.dip.optic_cup import segment_optic_cup_and_disc
from ml.dip.lesion_density import compute_lesion_density_and_clusters
from ml.dip.hemorrhage import segment_hemorrhages
from ml.dip.cotton_wool import detect_cotton_wool_spots
from ml.dip.fractal_dimension import compute_vascular_fractal_dimension
from ml.dip.regional_density import compute_regional_vessel_density
from ml.dip.fusion_engine import ClinicalFusionEngine, extract_clinical_biomarker_vector


@pytest.fixture
def sample_fundus_image():
    """Generates synthetic 256x256 fundus image for unit testing."""
    arr = np.zeros((256, 256, 3), dtype=np.uint8)
    arr[:, :, 0] = 180  # Red fundus background
    arr[:, :, 1] = 90   # Green channel
    arr[:, :, 2] = 20   # Blue channel
    
    # Add synthetic optic disc (bright region)
    y, x = np.ogrid[:256, :256]
    disc_mask = (x - 180) ** 2 + (y - 128) ** 2 <= 25 ** 2
    arr[disc_mask] = [255, 230, 150]
    
    # Add synthetic vessel lines
    arr[120:136, 40:220] = [60, 20, 10]
    arr[40:220, 180:196] = [60, 20, 10]
    return arr


def test_vessel_tortuosity_and_caliber(sample_fundus_image):
    vessel_mask = (sample_fundus_image[:, :, 1] < 50).astype(np.uint8) * 255
    res = extract_vessel_tortuosity_and_caliber(vessel_mask, sample_fundus_image)
    
    assert "vessel_tortuosity_index" in res
    assert res["vessel_tortuosity_index"] >= 1.0
    assert "average_vessel_width" in res
    assert res["average_vessel_width"] > 0.0


def test_artery_vein_classification(sample_fundus_image):
    vessel_mask = (sample_fundus_image[:, :, 1] < 50).astype(np.uint8) * 255
    res = classify_arteries_and_veins(vessel_mask, sample_fundus_image)
    
    assert "artery_vein_ratio" in res
    assert 0.3 <= res["artery_vein_ratio"] <= 1.2
    assert len(res["av_overlay_b64"]) > 0


def test_optic_cup_and_disc(sample_fundus_image):
    disc_bbox = [155, 103, 50, 50]
    res = segment_optic_cup_and_disc(sample_fundus_image, disc_bbox)
    
    assert "cup_disc_ratio" in res
    assert 0.1 <= res["cup_disc_ratio"] <= 1.0


def test_fractal_dimension(sample_fundus_image):
    vessel_mask = (sample_fundus_image[:, :, 1] < 50).astype(np.uint8) * 255
    res = compute_vascular_fractal_dimension(vessel_mask)
    
    assert "vascular_fractal_dimension" in res
    assert 1.0 <= res["vascular_fractal_dimension"] <= 1.8


def test_clinical_biomarker_vector():
    mock_biomarkers = {
        "vessel_density_index": 0.08,
        "vessel_tortuosity_index": 1.15,
        "average_branch_angle": 75.0,
        "average_vessel_width": 3.5,
        "artery_vein_ratio": 0.67,
        "cup_disc_ratio": 0.40,
        "microaneurysm_count": 5,
        "hemorrhage_ratio": 0.001,
        "exudate_area_ratio": 0.002,
        "cotton_wool_spot_count": 0,
        "lesion_density": 1.2,
        "vascular_fractal_dimension": 1.42,
        "regional_vessel_density": {"superior": 0.09}
    }
    
    vector = extract_clinical_biomarker_vector(mock_biomarkers)
    assert len(vector) == 13
    assert not np.isnan(vector).any()


def test_retinal_dip_extractor_integration(sample_fundus_image):
    extractor = RetinalDIPExtractor()
    result = extractor.analyze(sample_fundus_image)
    
    assert result.vessel_density_index >= 0.0
    assert result.vessel_tortuosity_index >= 1.0
    assert result.artery_vein_ratio > 0.0
    assert result.cup_disc_ratio > 0.0
    assert len(result.biomarker_vector_13d) == 13
    assert result.clinical_evidence is not None
    assert len(result.clinical_evidence) > 0
