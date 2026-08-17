"""
Unit tests for Spatial Metrics (ml/spatial_metrics.py).
Tests pure NumPy metric implementations using synthetic masks and maps.
"""
import numpy as np
import pytest

from ml import spatial_metrics as sm
from ml.schemas import LesionInstance


def test_compute_iou_perfect_overlap():
    arr1 = np.ones((10, 10), dtype=bool)
    arr2 = np.ones((10, 10), dtype=bool)
    iou = sm.compute_iou(arr1, arr2)
    assert iou == 1.0


def test_compute_iou_no_overlap():
    arr1 = np.zeros((10, 10), dtype=bool)
    arr1[:5, :] = True
    arr2 = np.zeros((10, 10), dtype=bool)
    arr2[5:, :] = True
    iou = sm.compute_iou(arr1, arr2)
    assert iou == 0.0


def test_compute_iou_partial_overlap():
    arr1 = np.zeros((10, 10), dtype=bool)
    arr1[:6, :] = True  # 60 pixels
    arr2 = np.zeros((10, 10), dtype=bool)
    arr2[4:, :] = True  # 60 pixels
    # Intersection: lines 4,5 (20 pixels). Union: lines 0..9 (100 pixels)
    iou = sm.compute_iou(arr1, arr2)
    assert abs(iou - 0.2) < 1e-5


def test_compute_dice_perfect_overlap():
    arr1 = np.ones((10, 10), dtype=bool)
    arr2 = np.ones((10, 10), dtype=bool)
    dice = sm.compute_dice(arr1, arr2)
    assert dice == 1.0


def test_compute_lesion_coverage():
    attn = np.zeros((10, 10), dtype=bool)
    attn[:5, :] = True
    lesion = np.zeros((10, 10), dtype=bool)
    lesion[2:4, :] = True  # 20 pixels, all inside attn
    cov = sm.compute_lesion_coverage(attn, lesion)
    assert cov == 1.0


def test_compute_attention_coverage():
    attn = np.ones((10, 10), dtype=bool)  # 100 pixels
    lesion = np.zeros((10, 10), dtype=bool)
    lesion[:3, :3] = True  # 9 pixels
    cov = sm.compute_attention_coverage(attn, lesion)
    assert abs(cov - 0.09) < 1e-5


def test_pointing_game_hit():
    inst = LesionInstance(
        centroid_x=20, centroid_y=20,
        bbox=[10, 10, 20, 20],
        pixel_area=400,
        detection_confidence=0.0
    )
    peak_xy = (15, 15)  # Inside bbox [10,10,20,20]
    hit = sm.compute_pointing_game(peak_xy, [inst], tolerance_px=5)
    assert hit is True


def test_pointing_game_miss():
    inst = LesionInstance(
        centroid_x=20, centroid_y=20,
        bbox=[10, 10, 20, 20],
        pixel_area=400,
        detection_confidence=0.0
    )
    peak_xy = (80, 80)  # Far outside
    hit = sm.compute_pointing_game(peak_xy, [inst], tolerance_px=5)
    assert hit is False


def test_distance_to_nearest_lesion():
    inst1 = LesionInstance(centroid_x=0, centroid_y=0, bbox=[0,0,5,5], pixel_area=25, detection_confidence=0.0)
    inst2 = LesionInstance(centroid_x=30, centroid_y=40, bbox=[28,38,5,5], pixel_area=25, detection_confidence=0.0)
    # Peak at (0, 0) -> distance to inst1 is 0.0, inst2 is 50.0
    dist = sm.compute_distance_to_nearest_lesion((0, 0), [inst1, inst2])
    assert dist == 0.0


def test_attention_distribution_sum():
    attn = np.ones((10, 10), dtype=np.float32)
    ma_mask = np.zeros((10, 10), dtype=np.uint8)
    ma_mask[:5, :5] = 255  # 25 pixels

    dist = sm.compute_attention_distribution(attn, {"microaneurysm": ma_mask})
    assert abs(dist["microaneurysm"] - 0.25) < 1e-3
    assert abs(dist["other"] - 0.75) < 1e-3
