"""
Unit tests for Lesion Grounding Composer (ml/lesion_grounding.py).
Tests score computation, label assignment, and safety warnings.
"""
import numpy as np
import pytest

from ml.lesion_grounding import LesionGroundingComposer
from ml.schemas import LesionInstance, LesionSpatialMask


def test_composer_initialization():
    composer = LesionGroundingComposer()
    assert composer.version is not None


def test_composer_zero_lesions_warning():
    composer = LesionGroundingComposer()
    attn = np.zeros((100, 100), dtype=np.float32)
    attn[45:55, 45:55] = 1.0

    res = composer.compute(
        attention_map=attn,
        lesion_mask_arrays={},
        lesion_spatial_masks=[],
        prediction_confidence=0.90,
        predicted_disease="Diabetic Retinopathy"
    )

    assert res.score == 0.0
    assert res.label == "Insufficient evidence"
    assert any("NO_LESION_CANDIDATES" in w for w in res.warnings)


def test_composer_high_confidence_low_grounding_warning():
    composer = LesionGroundingComposer()
    attn = np.zeros((100, 100), dtype=np.float32)
    attn[0:10, 0:10] = 1.0  # High attention in top-left

    # Lesion mask far away in bottom-right
    ma_mask = np.zeros((100, 100), dtype=np.uint8)
    ma_mask[90:95, 90:95] = 255
    spatial_ma = LesionSpatialMask(
        lesion_class="microaneurysm",
        source="classical_dip",
        mask_shape=[100, 100],
        instance_count=1,
        instances=[LesionInstance(centroid_x=92, centroid_y=92, bbox=[90,90,5,5], pixel_area=25, detection_confidence=0.0)],
        total_pixel_area=25,
        area_ratio=0.0025,
        detection_note="Test MA"
    )

    res = composer.compute(
        attention_map=attn,
        lesion_mask_arrays={"microaneurysm": ma_mask},
        lesion_spatial_masks=[spatial_ma],
        prediction_confidence=0.95,  # High confidence
        predicted_disease="Diabetic Retinopathy"
    )

    assert any("HIGH_CONFIDENCE_LOW_GROUNDING" in w for w in res.warnings)


def test_composer_border_attention_warning():
    composer = LesionGroundingComposer()
    attn = np.zeros((100, 100), dtype=np.float32)
    attn[:15, :] = 1.0  # Border attention

    res = composer.compute(
        attention_map=attn,
        lesion_mask_arrays={},
        lesion_spatial_masks=[],
        prediction_confidence=0.50,
        predicted_disease="Diabetic Retinopathy"
    )

    assert any("BORDER_ATTENTION_SHORTCUT" in w for w in res.warnings)
