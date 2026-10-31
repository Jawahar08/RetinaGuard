"""
Lesion Engine — Spatial Instance Extraction for Semantic Explainability.
=========================================================================
Wraps the existing DIP feature extractors (Black Top-Hat + CIE LAB) to produce
per-instance spatial metadata (bounding boxes, centroids, pixel areas) required
by the spatial matching and Lesion Grounding Score modules.

Key design decisions:
  - Microaneurysms vs hemorrhages are separated by connected-component area
    using a configurable threshold (lesion_separation.microaneurysm_max_area_px).
  - Detection confidence is 0.0 for all classical DIP candidates — no probabilistic
    model is used; this field is reserved for future trained detectors.
  - All output is tagged with source="classical_dip" and an explicit clinical note.
  - This module is backward-compatible: existing DIPExtractor callers are unaffected.
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

try:
    from scipy.ndimage import label as ndlabel
except ImportError:
    ndlabel = None

from ml.dip_features import (
    _clahe_green,
    _morphological_closing,
    extract_vessel_mask,
    locate_optic_disc,
)
from ml.schemas import LesionInstance, LesionSpatialMask

logger = logging.getLogger("retinal-lesion-engine")

_ROOT = Path(__file__).resolve().parent.parent
_CFG_PATH = _ROOT / "configs" / "lesion_grounding_config.json"

# ─────────────────────────────────────────────────────────────────────────────
# Config loader
# ─────────────────────────────────────────────────────────────────────────────

def _load_sep_config() -> Dict:
    if _CFG_PATH.exists():
        with open(_CFG_PATH) as f:
            return json.load(f).get("lesion_separation", {})
    return {}


_SEP_CFG = _load_sep_config()

MA_MAX_AREA: int = int(_SEP_CFG.get("microaneurysm_max_area_px", 150))
EXUDATE_MIN_AREA: int = int(_SEP_CFG.get("exudate_min_area_px", 10))

# ─────────────────────────────────────────────────────────────────────────────
# Connected-component instance extractor
# ─────────────────────────────────────────────────────────────────────────────

def _extract_instances(binary_mask: np.ndarray) -> List[LesionInstance]:
    """
    Run OpenCV connected-components analysis on a binary uint8 mask and
    return a LesionInstance for every component (excluding background label 0).

    Args:
        binary_mask: uint8 H×W, values 0 or 255.

    Returns:
        List of LesionInstance objects, one per connected component.
    """
    mask_u8 = (binary_mask > 0).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask_u8, connectivity=8
    )
    instances: List[LesionInstance] = []
    for i in range(1, num_labels):          # label 0 = background
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area == 0:
            continue
        x = int(stats[i, cv2.CC_STAT_LEFT])
        y = int(stats[i, cv2.CC_STAT_TOP])
        w = int(stats[i, cv2.CC_STAT_WIDTH])
        h = int(stats[i, cv2.CC_STAT_HEIGHT])
        cx = int(round(centroids[i, 0]))
        cy = int(round(centroids[i, 1]))
        instances.append(
            LesionInstance(
                centroid_x=cx,
                centroid_y=cy,
                bbox=[x, y, w, h],
                pixel_area=area,
                detection_confidence=0.0,   # classical DIP — no model confidence
                severity_index=None,
            )
        )
    return instances


# ─────────────────────────────────────────────────────────────────────────────
# Per-lesion mask extractors
# ─────────────────────────────────────────────────────────────────────────────

def extract_ma_hemorrhage_masks(img_rgb: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Apply Black Top-Hat to the green channel and split the resulting binary mask
    into microaneurysm candidates (small components) and hemorrhage candidates
    (large components) using MA_MAX_AREA as the area threshold.

    Returns:
        (ma_mask, hemorrhage_mask) — two binary uint8 masks (H×W, values 0/255).
    """
    green = img_rgb[:, :, 1].astype(np.float32)
    closed = _morphological_closing(green, radius=5)
    bth = np.maximum(0.0, closed - green)

    thresh_val = np.percentile(bth, 95)
    combined_mask = (bth >= thresh_val).astype(np.uint8) * 255

    # Separate by connected-component area
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        combined_mask, connectivity=8
    )
    ma_mask = np.zeros_like(combined_mask)
    hem_mask = np.zeros_like(combined_mask)

    for i in range(1, num_labels):
        area = int(stats[i, cv2.CC_STAT_AREA])
        component = (labels == i).astype(np.uint8) * 255
        if area <= MA_MAX_AREA:
            ma_mask = cv2.bitwise_or(ma_mask, component)
        else:
            hem_mask = cv2.bitwise_or(hem_mask, component)

    return ma_mask, hem_mask


def extract_exudate_mask(img_rgb: np.ndarray) -> np.ndarray:
    """
    Segment hard exudate candidates via CIE LAB L* + b* thresholding,
    filtering out connected components smaller than EXUDATE_MIN_AREA.

    Returns:
        exudate_mask — binary uint8 mask (H×W, values 0/255).
    """
    try:
        lab = cv2.cvtColor(img_rgb.astype(np.uint8), cv2.COLOR_RGB2LAB)
        L = lab[:, :, 0].astype(np.float32)
        b = lab[:, :, 2].astype(np.float32)
    except Exception:
        # Fallback to custom LAB approximation from dip_features
        from ml.dip_features import _rgb_to_lab_approx
        L, _, b = _rgb_to_lab_approx(img_rgb)

    L_thresh = np.percentile(L, 70)
    b_thresh = np.percentile(b, 70)
    raw_mask = ((L >= L_thresh) & (b >= b_thresh)).astype(np.uint8) * 255

    # Filter small components
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        raw_mask, connectivity=8
    )
    clean_mask = np.zeros_like(raw_mask)
    for i in range(1, num_labels):
        if int(stats[i, cv2.CC_STAT_AREA]) >= EXUDATE_MIN_AREA:
            clean_mask[labels == i] = 255

    return clean_mask


# ─────────────────────────────────────────────────────────────────────────────
# Main engine class
# ─────────────────────────────────────────────────────────────────────────────

_SOURCE = "classical_dip"

_DETECTION_NOTES = {
    "microaneurysm": (
        "Microaneurysm candidates detected via Black Top-Hat morphological transform "
        "on the green channel. Components with area ≤ {} px are classified as microaneurysms. "
        "These are algorithmic candidates only — not expert-validated ground truth."
    ).format(MA_MAX_AREA),
    "hemorrhage": (
        "Hemorrhage candidates detected via Black Top-Hat morphological transform. "
        "Components with area > {} px are classified as hemorrhage candidates. "
        "These are algorithmic candidates only — not expert-validated ground truth."
    ).format(MA_MAX_AREA),
    "hard_exudate": (
        "Hard exudate candidates detected via CIE LAB L* + b* channel thresholding. "
        "Components with area < {} px are discarded as noise. "
        "These are algorithmic candidates only — not expert-validated ground truth."
    ).format(EXUDATE_MIN_AREA),
}


class LesionEngine:
    """
    Extracts spatial lesion masks and per-instance metadata for three DR lesion classes:
      - Microaneurysms  (small dark dots, Black Top-Hat area ≤ MA_MAX_AREA px)
      - Hemorrhages     (larger dark blobs, Black Top-Hat area > MA_MAX_AREA px)
      - Hard exudates   (bright yellowish regions, CIE LAB thresholding)

    All masks are tagged source="classical_dip". Detection confidence is always 0.0.
    """

    def __init__(self, target_size: Tuple[int, int] = (512, 512)):
        self.target_size = target_size

    def _resize(self, img_rgb: np.ndarray) -> np.ndarray:
        from PIL import Image
        return np.array(
            Image.fromarray(img_rgb.astype(np.uint8)).resize(
                self.target_size, Image.LANCZOS
            )
        )

    def extract(self, img_rgb: np.ndarray) -> Dict[str, "LesionEngineResult"]:
        """
        Run all lesion extractions on a fundus image and return a mapping
        from lesion_class → LesionSpatialMask.

        Args:
            img_rgb: uint8 H×W×3 RGB fundus image.

        Returns:
            Dict with keys "microaneurysm", "hemorrhage", "hard_exudate".
            Each value is a LesionSpatialMask schema object.
        """
        img = self._resize(img_rgb)
        h, w = img.shape[:2]
        total_px = h * w

        results: Dict[str, LesionSpatialMask] = {}

        # ── Microaneurysms & Hemorrhages ──────────────────────────────────────
        try:
            ma_mask, hem_mask = extract_ma_hemorrhage_masks(img)
        except Exception as e:
            logger.warning(f"MA/hemorrhage extraction failed: {e}")
            ma_mask = np.zeros((h, w), dtype=np.uint8)
            hem_mask = np.zeros((h, w), dtype=np.uint8)

        for cls, mask in [("microaneurysm", ma_mask), ("hemorrhage", hem_mask)]:
            instances = _extract_instances(mask)
            total_area = int(np.count_nonzero(mask))
            results[cls] = LesionSpatialMask(
                lesion_class=cls,
                source=_SOURCE,
                mask_shape=[h, w],
                instance_count=len(instances),
                instances=instances,
                total_pixel_area=total_area,
                area_ratio=round(total_area / max(total_px, 1), 6),
                detection_note=_DETECTION_NOTES[cls],
            )

        # ── Hard Exudates ─────────────────────────────────────────────────────
        try:
            ex_mask = extract_exudate_mask(img)
        except Exception as e:
            logger.warning(f"Exudate extraction failed: {e}")
            ex_mask = np.zeros((h, w), dtype=np.uint8)

        ex_instances = _extract_instances(ex_mask)
        ex_area = int(np.count_nonzero(ex_mask))
        results["hard_exudate"] = LesionSpatialMask(
            lesion_class="hard_exudate",
            source=_SOURCE,
            mask_shape=[h, w],
            instance_count=len(ex_instances),
            instances=ex_instances,
            total_pixel_area=ex_area,
            area_ratio=round(ex_area / max(total_px, 1), 6),
            detection_note=_DETECTION_NOTES["hard_exudate"],
        )

        logger.info(
            "LesionEngine: MA=%d, Hem=%d, Exudate=%d instances",
            len(results["microaneurysm"].instances),
            len(results["hemorrhage"].instances),
            len(results["hard_exudate"].instances),
        )
        return results

    def get_masks_as_arrays(self, img_rgb: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Return raw binary numpy masks (H×W uint8) for each lesion class.
        Used internally by spatial_metrics.py for array-level computation.
        """
        img = self._resize(img_rgb)
        try:
            ma_mask, hem_mask = extract_ma_hemorrhage_masks(img)
        except Exception:
            h, w = img.shape[:2]
            ma_mask = np.zeros((h, w), dtype=np.uint8)
            hem_mask = np.zeros((h, w), dtype=np.uint8)
        try:
            ex_mask = extract_exudate_mask(img)
        except Exception:
            ex_mask = np.zeros(img.shape[:2], dtype=np.uint8)

        try:
            vessel_mask = extract_vessel_mask(img)
        except Exception:
            vessel_mask = np.zeros(img.shape[:2], dtype=np.uint8)

        return {
            "microaneurysm": ma_mask,
            "hemorrhage": hem_mask,
            "hard_exudate": ex_mask,
            "vessel": vessel_mask,
        }
