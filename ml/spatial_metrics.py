"""
Spatial Metrics for Lesion-Level Semantic Explainability.
==========================================================
Pure NumPy implementations of all spatial agreement metrics between
Grad-CAM++ attention maps and lesion masks.

All functions:
  - Accept normalized float32 or binary uint8 numpy arrays.
  - Are stateless and have no side effects.
  - Return typed scalars or dicts.
  - Include fallback handling for degenerate inputs (empty masks, zero attention).

Metrics implemented:
  - IoU (Intersection over Union)
  - Dice coefficient
  - Lesion coverage  (fraction of lesion pixels inside high-attention region)
  - Attention coverage (fraction of high-attention pixels inside lesion mask)
  - Distance to nearest lesion centroid from attention peak
  - Pointing-game accuracy (with configurable spatial tolerance)
  - Attention distribution across named anatomical regions
"""
import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("retinal-spatial-metrics")


# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def resize_to_common(arr: np.ndarray, target_shape: Tuple[int, int]) -> np.ndarray:
    """
    Resize a 2D array to target_shape using nearest-neighbour interpolation.
    Works for both float attention maps and binary uint8 masks.

    Args:
        arr: H×W array (float32 or uint8).
        target_shape: (H_out, W_out).

    Returns:
        Resized array as float32.
    """
    import cv2
    h_out, w_out = target_shape
    resized = cv2.resize(arr.astype(np.float32), (w_out, h_out), interpolation=cv2.INTER_NEAREST)
    return resized


def binarize_attention(attention_map: np.ndarray, threshold: float) -> np.ndarray:
    """
    Binarize a normalized [0, 1] float32 attention map using a threshold.

    Args:
        attention_map: H×W float32 in [0, 1].
        threshold: Values above this are foreground.

    Returns:
        H×W bool array.
    """
    return attention_map >= threshold


def binarize_mask(mask: np.ndarray) -> np.ndarray:
    """
    Convert any mask array (uint8 0/255 or float 0/1) to a bool array.
    """
    return mask > 0


# ─────────────────────────────────────────────────────────────────────────────
# Core spatial metrics
# ─────────────────────────────────────────────────────────────────────────────

def compute_iou(attention_binary: np.ndarray, lesion_binary: np.ndarray) -> float:
    """
    Intersection over Union between binarized attention and lesion mask.

    IoU = |G ∩ L| / |G ∪ L|

    Returns 0.0 if both masks are empty (not undefined — treat as no agreement).
    Note: IoU is unreliable for tiny lesions (< ~50px) because Grad-CAM++ is
    spatially coarse. Use distance_to_nearest_lesion for small structures.

    Args:
        attention_binary: H×W bool — high-attention region.
        lesion_binary:    H×W bool — lesion region.

    Returns:
        IoU in [0, 1].
    """
    g = attention_binary.astype(bool)
    l = lesion_binary.astype(bool)
    intersection = np.count_nonzero(g & l)
    union = np.count_nonzero(g | l)
    if union == 0:
        return 0.0
    return float(intersection / union)


def compute_dice(attention_binary: np.ndarray, lesion_binary: np.ndarray) -> float:
    """
    Dice coefficient (Sørensen–Dice index).

    Dice = 2|G ∩ L| / (|G| + |L|)

    Args:
        attention_binary: H×W bool.
        lesion_binary:    H×W bool.

    Returns:
        Dice in [0, 1].
    """
    g = attention_binary.astype(bool)
    l = lesion_binary.astype(bool)
    intersection = np.count_nonzero(g & l)
    denom = np.count_nonzero(g) + np.count_nonzero(l)
    if denom == 0:
        return 0.0
    return float(2 * intersection / denom)


def compute_lesion_coverage(attention_binary: np.ndarray, lesion_binary: np.ndarray) -> float:
    """
    Lesion coverage: fraction of detected lesion pixels falling inside the
    high-attention region.

    lesion_coverage = |G ∩ L| / |L|

    A value of 1.0 means all lesion pixels are explained by attention.
    A value of 0.0 means no lesion pixels fall in the high-attention region.

    Args:
        attention_binary: H×W bool — high-attention region.
        lesion_binary:    H×W bool — lesion region.

    Returns:
        Lesion coverage in [0, 1].
    """
    g = attention_binary.astype(bool)
    l = lesion_binary.astype(bool)
    lesion_area = np.count_nonzero(l)
    if lesion_area == 0:
        return 0.0
    overlap = np.count_nonzero(g & l)
    return float(overlap / lesion_area)


def compute_attention_coverage(attention_binary: np.ndarray, lesion_binary: np.ndarray) -> float:
    """
    Attention coverage: fraction of high-attention pixels that fall inside the
    lesion mask.

    attention_coverage = |G ∩ L| / |G|

    A value of 1.0 means all model attention is on lesion regions.

    Args:
        attention_binary: H×W bool — high-attention region.
        lesion_binary:    H×W bool — lesion region.

    Returns:
        Attention coverage in [0, 1].
    """
    g = attention_binary.astype(bool)
    l = lesion_binary.astype(bool)
    attention_area = np.count_nonzero(g)
    if attention_area == 0:
        return 0.0
    overlap = np.count_nonzero(g & l)
    return float(overlap / attention_area)


def compute_distance_to_nearest_lesion(
    peak_xy: Tuple[int, int],
    lesion_instances: List,        # List[LesionInstance]
) -> Optional[float]:
    """
    Euclidean distance from the attention peak pixel to the nearest lesion centroid.

    This is the primary metric for tiny lesions (microaneurysms) where IoU is
    near-zero by construction due to Grad-CAM++'s spatial coarseness.

    Args:
        peak_xy: (x, y) of the attention peak pixel.
        lesion_instances: List of LesionInstance objects with centroid_x/centroid_y.

    Returns:
        Minimum Euclidean distance in pixels, or None if no instances.
    """
    if not lesion_instances:
        return None
    px, py = peak_xy
    distances = [
        float(np.sqrt((inst.centroid_x - px) ** 2 + (inst.centroid_y - py) ** 2))
        for inst in lesion_instances
    ]
    return float(min(distances))


def compute_pointing_game(
    peak_xy: Tuple[int, int],
    lesion_instances: List,         # List[LesionInstance]
    tolerance_px: int = 15,
) -> Optional[bool]:
    """
    Pointing-game accuracy: True if the attention peak falls within any lesion
    bounding box expanded by ±tolerance_px.

    Args:
        peak_xy: (x, y) of the attention peak pixel.
        lesion_instances: List of LesionInstance objects with bbox [x, y, w, h].
        tolerance_px: Spatial tolerance in pixels (default: 15).

    Returns:
        True if hit, False if miss, None if no instances.
    """
    if not lesion_instances:
        return None
    px, py = peak_xy
    for inst in lesion_instances:
        bx, by, bw, bh = inst.bbox
        x_min = bx - tolerance_px
        x_max = bx + bw + tolerance_px
        y_min = by - tolerance_px
        y_max = by + bh + tolerance_px
        if x_min <= px <= x_max and y_min <= py <= y_max:
            return True
    return False


def compute_attention_distribution(
    attention_map: np.ndarray,
    lesion_masks: Dict[str, np.ndarray],
    attention_threshold: float = 0.5,
) -> Dict[str, float]:
    """
    Compute the fraction of total attention mass associated with each named region.
    Regions are evaluated in priority order; pixels are assigned to the first
    matching region. The remainder is labeled "other".

    Args:
        attention_map: H×W float32 in [0, 1].
        lesion_masks: Dict of region_name → H×W binary uint8 mask.
                      Keys: "microaneurysm", "hemorrhage", "hard_exudate", "vessel", "optic_disc".
        attention_threshold: Threshold for binarizing attention (used for allocation).

    Returns:
        Dict mapping region_name → fraction of total attention (sums to ~1.0).
    """
    total_attention = float(np.sum(attention_map))
    if total_attention < 1e-7:
        return {k: 0.0 for k in list(lesion_masks.keys()) + ["other"]}

    distribution: Dict[str, float] = {}
    allocated = np.zeros_like(attention_map, dtype=bool)

    priority_order = ["microaneurysm", "hemorrhage", "hard_exudate", "optic_disc", "vessel"]

    for region in priority_order:
        if region not in lesion_masks:
            distribution[region] = 0.0
            continue
        mask_bool = lesion_masks[region] > 0
        # Only count pixels not yet allocated
        region_mask = mask_bool & ~allocated
        region_attention = float(np.sum(attention_map * region_mask))
        distribution[region] = round(region_attention / total_attention, 4)
        allocated |= region_mask

    # Remaining attention not in any lesion region
    other_attention = float(np.sum(attention_map * ~allocated))
    distribution["other"] = round(other_attention / total_attention, 4)

    return distribution


def compute_border_attention_fraction(
    attention_map: np.ndarray,
    border_fraction: float = 0.10,
) -> float:
    """
    Fraction of total attention mass that falls in the outer border region
    (used to detect shortcut-learning on image borders/artifacts).

    Args:
        attention_map: H×W float32 in [0, 1].
        border_fraction: Width of border as fraction of image dimension (default 10%).

    Returns:
        Fraction [0, 1] of total attention in border region.
    """
    h, w = attention_map.shape
    border_h = max(1, int(h * border_fraction))
    border_w = max(1, int(w * border_fraction))

    border_mask = np.zeros((h, w), dtype=bool)
    border_mask[:border_h, :] = True
    border_mask[h - border_h:, :] = True
    border_mask[:, :border_w] = True
    border_mask[:, w - border_w:] = True

    total = float(np.sum(attention_map))
    if total < 1e-7:
        return 0.0
    border_attn = float(np.sum(attention_map * border_mask))
    return float(border_attn / total)


def get_attention_peak(attention_map: np.ndarray) -> Tuple[int, int]:
    """
    Return (x, y) coordinates of the maximum attention pixel.

    Args:
        attention_map: H×W float32 in [0, 1].

    Returns:
        (x, y) as pixel coordinates (col, row).
    """
    idx = np.argmax(attention_map)
    row, col = np.unravel_index(idx, attention_map.shape)
    return int(col), int(row)
