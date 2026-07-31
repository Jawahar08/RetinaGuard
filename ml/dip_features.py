"""
Feature 1: Classical DIP Structural Biomarker Extraction Module
===============================================================
Implements medically meaningful classical Digital Image Processing (DIP)
pipeline based on Gonzalez & Woods (4th Edition) principles:

  1. Green-channel CLAHE + Multi-scale Hessian tubular filter
     → Vascular Tree Segmentation & Vessel Density Index (VDI)
  2. Black Top-Hat morphological transform (f•b - f)
     → Microaneurysm & Haemorrhage candidate detection
  3. CIE LAB color-space thresholding (L* + b* channels)
     → Exudate candidate segmentation & area ratio
  4. Red/Green intensity peak + morphological closing
     → Optic Disc localization [x, y, w, h]
  5. Macula center estimation via temporal offset from disc
  6. Annotated clinical visual overlays as base64 PNG strings

All processing runs on CPU with NumPy + SciPy + Pillow (no torch needed).
"""
import base64
import io
import logging
import sys
from pathlib import Path
from typing import Optional, Tuple, List, Any

import numpy as np  # type: ignore
import cv2  # type: ignore
from PIL import Image, ImageDraw, ImageFilter  # type: ignore

try:
    from scipy.ndimage import label as ndlabel  # type: ignore
except ImportError:
    ndlabel = None

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    from ml.schemas import DIPBiomarkerResult  # type: ignore
except ImportError:
    try:
        from .schemas import DIPBiomarkerResult  # type: ignore
    except ImportError:
        from schemas import DIPBiomarkerResult  # type: ignore

logger = logging.getLogger("retinal-dip")


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _to_uint8(arr: np.ndarray) -> np.ndarray:
    """Normalise a float array to uint8 [0, 255]."""
    mn, mx = arr.min(), arr.max()
    if mx - mn < 1e-6:
        return np.zeros_like(arr, dtype=np.uint8)
    return ((arr - mn) / (mx - mn) * 255).astype(np.uint8)


def _pil_to_b64(img: Image.Image) -> str:
    """Encode a PIL Image to a base64 PNG string."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _arr_to_b64(arr: np.ndarray) -> str:
    """Encode a numpy uint8 array (H×W or H×W×3) to base64 PNG string."""
    if arr.ndim == 2:
        pil = Image.fromarray(arr, mode="L")
    else:
        pil = Image.fromarray(arr.astype(np.uint8), mode="RGB")
    return _pil_to_b64(pil)


# ---------------------------------------------------------------------------
# Step 1 — Green-channel CLAHE + Hessian-based vessel segmentation
# ---------------------------------------------------------------------------

def _clahe_green(img_rgb: np.ndarray, clip_limit: float = 3.0, tile: int = 8) -> np.ndarray:
    """Extract green channel and apply OpenCV C++ CLAHE for high-speed equalisation."""
    green = img_rgb[:, :, 1].astype(np.uint8)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile, tile))
    return clahe.apply(green).astype(np.float32)


def _gaussian_kernel_2d(sigma: float, radius: int) -> np.ndarray:
    """Build a 2D Gaussian kernel of given sigma."""
    size = 2 * radius + 1
    ax = np.arange(-radius, radius + 1, dtype=np.float64)
    xx, yy = np.meshgrid(ax, ax)
    kernel = np.exp(-(xx ** 2 + yy ** 2) / (2.0 * sigma ** 2))
    return (kernel / kernel.sum()).astype(np.float32)


def _convolve2d(img: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Accelerated 2D convolution via cv2.filter2D."""
    return cv2.filter2D(img.astype(np.float32), -1, kernel, borderType=cv2.BORDER_REFLECT)


def _hessian_vesselness(green_eq: np.ndarray, sigmas=(1.0, 2.0, 3.0)) -> np.ndarray:
    """
    Multi-scale Frangi-like Hessian tubular response on the CLAHE green channel.
    Approximates second-order Gaussian derivatives for vessel ridge detection.
    Based on Gonzalez §4.7 (Hessian operators) & Frangi et al. (1998).
    """
    h, w = green_eq.shape
    response_max = np.zeros((h, w), dtype=np.float32)

    for sigma in sigmas:
        radius = max(2, int(3 * sigma))
        g = _gaussian_kernel_2d(sigma, radius)

        # Pad image for full convolution
        pad = radius
        padded = np.pad(green_eq, pad, mode="reflect").astype(np.float32)

        # Second-order derivatives via finite differences on Gaussian-smoothed image
        smoothed = _convolve2d(padded, g)
        # Ensure smoothed matches padded dimensions for finite diff
        sr, sc = padded.shape[0] - g.shape[0] + 1, padded.shape[1] - g.shape[1] + 1
        smoothed_full = np.pad(smoothed, [(0, padded.shape[0] - sr), (0, padded.shape[1] - sc)], mode="edge")

        Ixx = np.diff(smoothed_full, n=2, axis=1)
        Iyy = np.diff(smoothed_full, n=2, axis=0)

        # Crop to original size
        min_h = min(Iyy.shape[0], h)
        min_w = min(Ixx.shape[1], w)

        Ixx_c = Ixx[:min_h, :min_w]
        Iyy_c = Iyy[:min_h, :min_w]

        # Frobenius norm of Hessian as vessel likelihood
        R = np.sqrt(Ixx_c ** 2 + Iyy_c ** 2)
        pad_h = h - R.shape[0]
        pad_w = w - R.shape[1]
        R = np.pad(R, [(0, pad_h), (0, pad_w)], mode="constant")

        response_max = np.maximum(response_max, R * (sigma ** 2))

    return response_max


def extract_vessel_mask(img_rgb: np.ndarray, threshold_pct: float = 75.0) -> np.ndarray:
    """
    Returns binary vessel mask (H×W uint8, 255 = vessel) using CLAHE + Hessian filter.
    """
    green_eq = _clahe_green(img_rgb)
    vesselness = _hessian_vesselness(green_eq)
    thresh = np.percentile(vesselness, threshold_pct)
    mask = (vesselness >= thresh).astype(np.uint8) * 255
    return mask


def compute_vessel_density_index(vessel_mask: np.ndarray, fov_mask: Optional[np.ndarray] = None) -> float:
    """
    VDI = vessel pixels / FOV pixels.
    If fov_mask is None, uses pixels with intensity > 10 in the mask image.
    """
    if fov_mask is not None:
        fov_area = np.count_nonzero(fov_mask)
    else:
        # Estimate FOV from the original image dimensions (circular assumption)
        h, w = vessel_mask.shape
        center = (h // 2, w // 2)
        radius = min(h, w) // 2
        Y, X = np.ogrid[:h, :w]
        fov_mask = ((X - center[1]) ** 2 + (Y - center[0]) ** 2 <= radius ** 2)
        fov_area = int(fov_mask.sum())

    vessel_area = int(np.count_nonzero(vessel_mask))
    if fov_area == 0:
        return 0.0
    return float(min(1.0, vessel_area / fov_area))


# ---------------------------------------------------------------------------
# Step 2 — Black Top-Hat for microaneurysm & haemorrhage candidates
# ---------------------------------------------------------------------------

def _morphological_closing(arr: np.ndarray, radius: int = 3) -> np.ndarray:
    """High-speed OpenCV morphological closing."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1, 2 * radius + 1))
    closed = cv2.morphologyEx(_to_uint8(arr), cv2.MORPH_CLOSE, kernel)
    return closed.astype(np.float32)


def extract_lesion_candidates(img_rgb: np.ndarray) -> Tuple[np.ndarray, int, float]:
    """
    Apply Black Top-Hat transform to detect dark lesion candidates
    (microaneurysms, dot haemorrhages) in the green channel.

    Black Top-Hat = closing(f) - f  (highlights dark regions smaller than SE)

    Returns:
        lesion_mask  : binary uint8 mask (H×W)
        candidate_count : estimated number of lesion blobs
        area_ratio   : lesion_pixels / total_image_pixels
    """
    green = img_rgb[:, :, 1].astype(np.float32)
    closed = _morphological_closing(green, radius=5)
    bth = np.maximum(0.0, closed - green)  # Black Top-Hat

    thresh = np.percentile(bth, 95)
    lesion_mask = (bth >= thresh).astype(np.uint8) * 255

    try:
        if ndlabel is not None:
            labeled, n_components = ndlabel(lesion_mask > 0)
        else:
            n_components = int(lesion_mask.max() > 0)
    except Exception:
        n_components = int(lesion_mask.max() > 0)

    h, w = lesion_mask.shape
    area_ratio = float(np.count_nonzero(lesion_mask)) / (h * w)
    return lesion_mask, int(n_components), float(area_ratio)


# ---------------------------------------------------------------------------
# Step 3 — CIE LAB exudate segmentation (L* + b* channels)
# ---------------------------------------------------------------------------

def _rgb_to_lab_approx(img_rgb: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Approximate RGB→CIE LAB conversion via sRGB linearisation + XYZ→LAB.
    Gonzalez §6.4 – color image processing.
    """
    rgb = img_rgb.astype(np.float32) / 255.0
    # sRGB gamma expansion
    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)

    # XYZ via sRGB matrix (D65 illuminant)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]], dtype=np.float32)
    xyz = np.einsum("hwc,dc->hwd", linear, M)

    # Normalise by D65 white point
    D65 = np.array([0.95047, 1.00000, 1.08883], dtype=np.float32)
    xyz_n = xyz / D65

    def f_xyz(t):
        delta = 6.0 / 29.0
        return np.where(t > delta ** 3,
                        np.cbrt(t),
                        t / (3 * delta ** 2) + 4.0 / 29.0)

    fx = f_xyz(xyz_n[:, :, 0])
    fy = f_xyz(xyz_n[:, :, 1])
    fz = f_xyz(xyz_n[:, :, 2])

    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    return L, a, b


def extract_exudate_candidates(img_rgb: np.ndarray) -> Tuple[np.ndarray, int, float]:
    """
    Segment bright exudate candidates using CIE LAB L* (brightness) and b* (yellow-blue).
    High L* + high b* = bright yellowish lesions (exudates, cotton-wool spots).

    Returns:
        exudate_mask : binary uint8 mask (H×W)
        candidate_count : estimated number of exudate blobs
        area_ratio   : exudate_pixels / total_image_pixels
    """
    L, _, b = _rgb_to_lab_approx(img_rgb)

    # Exudates: L > 70th percentile AND b > 70th percentile
    L_thresh = np.percentile(L, 70)
    b_thresh = np.percentile(b, 70)
    exudate_mask = ((L >= L_thresh) & (b >= b_thresh)).astype(np.uint8) * 255

    try:
        if ndlabel is not None:
            labeled, n_components = ndlabel(exudate_mask > 0)
        else:
            n_components = int(exudate_mask.max() > 0)
    except Exception:
        n_components = int(exudate_mask.max() > 0)

    h, w = exudate_mask.shape
    area_ratio = float(np.count_nonzero(exudate_mask)) / (h * w)
    return exudate_mask, int(n_components), float(area_ratio)


# ---------------------------------------------------------------------------
# Step 4 — Optic Disc localisation via intensity peak + morphological closing
# ---------------------------------------------------------------------------

def locate_optic_disc(img_rgb: np.ndarray) -> Tuple[bool, Optional[list]]:
    """
    Locate optic disc using red/green channel mean and morphological closing
    to find the brightest compact circular region.

    Returns:
        found : True if disc candidate found
        bbox  : [x, y, w, h] in pixel coordinates, or None
    """
    # RG mean channel highlights optic disc (bright orange/yellow)
    rg_mean = (img_rgb[:, :, 0].astype(np.float32) + img_rgb[:, :, 1].astype(np.float32)) / 2.0
    closed = _morphological_closing(rg_mean, radius=15)

    thresh = np.percentile(closed, 97)
    bright_mask = (closed >= thresh).astype(np.uint8)

    # Find bounding box of largest bright region
    rows = np.any(bright_mask, axis=1)
    cols = np.any(bright_mask, axis=0)

    if not rows.any() or not cols.any():
        return False, None

    r0, r1 = np.where(rows)[0][[0, -1]]
    c0, c1 = np.where(cols)[0][[0, -1]]

    bbox = [int(c0), int(r0), int(c1 - c0), int(r1 - r0)]
    return True, bbox


def estimate_macula_center(disc_bbox: list, img_shape: Tuple[int, int]) -> list:
    """
    Estimate macula center as ~2.5 disc diameters temporal to the optic disc.
    Temporal direction is inferred as the direction away from the image center.
    """
    h, w = img_shape
    disc_cx = disc_bbox[0] + disc_bbox[2] // 2
    disc_cy = disc_bbox[1] + disc_bbox[3] // 2
    disc_diam = max(disc_bbox[2], disc_bbox[3])

    # Macula is temporal: if disc is left of center → macula is to the right
    temporal_dir = 1 if disc_cx < w // 2 else -1
    mac_cx = disc_cx + temporal_dir * int(2.5 * disc_diam)
    mac_cy = disc_cy

    # Clamp to image bounds
    mac_cx = max(0, min(w - 1, mac_cx))
    mac_cy = max(0, min(h - 1, mac_cy))
    return [int(mac_cx), int(mac_cy)]


# ---------------------------------------------------------------------------
# Step 5 — Annotated clinical overlay generator
# ---------------------------------------------------------------------------

def generate_anatomy_overlay(
    img_rgb: np.ndarray,
    vessel_mask: np.ndarray,
    lesion_mask: np.ndarray,
    exudate_mask: np.ndarray,
    disc_bbox: Optional[list],
    macula_center: Optional[list],
) -> np.ndarray:
    """
    Composite annotated overlay image:
      - Green semi-transparent vessel mask
      - Red semi-transparent lesion mask
      - Yellow semi-transparent exudate mask
      - Cyan rectangle for optic disc
      - Magenta crosshair for macula
    """
    base = Image.fromarray(img_rgb.astype(np.uint8), mode="RGB")
    overlay = base.copy().convert("RGBA")

    # Vessel overlay (green, alpha=80)
    v_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    v_arr = np.zeros((*vessel_mask.shape, 4), dtype=np.uint8)
    v_arr[vessel_mask > 0] = [0, 200, 80, 80]
    v_layer = Image.fromarray(v_arr, mode="RGBA")
    overlay = Image.alpha_composite(overlay, v_layer)

    # Lesion overlay (red, alpha=100)
    l_arr = np.zeros((*lesion_mask.shape, 4), dtype=np.uint8)
    l_arr[lesion_mask > 0] = [220, 50, 50, 100]
    l_layer = Image.fromarray(l_arr, mode="RGBA")
    overlay = Image.alpha_composite(overlay, l_layer)

    # Exudate overlay (yellow, alpha=90)
    e_arr = np.zeros((*exudate_mask.shape, 4), dtype=np.uint8)
    e_arr[exudate_mask > 0] = [255, 220, 0, 90]
    e_layer = Image.fromarray(e_arr, mode="RGBA")
    overlay = Image.alpha_composite(overlay, e_layer)

    # Draw annotations
    draw = ImageDraw.Draw(overlay)

    if disc_bbox is not None:
        x, y, bw, bh = disc_bbox
        draw.rectangle([x, y, x + bw, y + bh], outline=(0, 255, 255, 255), width=3)

    if macula_center is not None:
        mx, my = macula_center
        r = 10
        draw.ellipse([mx - r, my - r, mx + r, my + r], outline=(255, 0, 255, 255), width=2)
        draw.line([mx - 18, my, mx + 18, my], fill=(255, 0, 255, 200), width=1)
        draw.line([mx, my - 18, mx, my + 18], fill=(255, 0, 255, 200), width=1)

    return np.array(overlay.convert("RGB"))


# ---------------------------------------------------------------------------
# Main extractor class
# ---------------------------------------------------------------------------

class RetinalDIPExtractor:
    """
    Orchestrates the complete classical DIP biomarker extraction pipeline.
    Wraps all five stages and returns a DIPBiomarkerResult schema object.
    """

    def __init__(self, target_size: Tuple[int, int] = (512, 512)):
        self.target_size = target_size

    def _preprocess(self, img_rgb: np.ndarray) -> np.ndarray:
        """Resize to target size for consistent processing."""
        pil = Image.fromarray(img_rgb.astype(np.uint8)).resize(
            self.target_size, Image.LANCZOS
        )
        return np.array(pil)

    def analyze(self, img_rgb: np.ndarray) -> DIPBiomarkerResult:
        """
        Run complete DIP biomarker extraction on a retinal fundus RGB image.

        Args:
            img_rgb: numpy uint8 RGB array (H×W×3)

        Returns:
            DIPBiomarkerResult with all biomarkers and visual overlay base64 strings
        """
        img = self._preprocess(img_rgb)
        h, w = img.shape[:2]

        # Stage 1: Vessel segmentation
        logger.info("DIP Stage 1: Vessel segmentation (CLAHE + Hessian)")
        vessel_mask = extract_vessel_mask(img)
        vdi = compute_vessel_density_index(vessel_mask)

        # Stage 2: Lesion candidates (microaneurysms / haemorrhages)
        logger.info("DIP Stage 2: Microaneurysm / haemorrhage detection (Black Top-Hat)")
        lesion_mask, ma_count, _ = extract_lesion_candidates(img)

        # Stage 3: Exudate candidates (CIE LAB)
        logger.info("DIP Stage 3: Exudate segmentation (CIE LAB b* + L*)")
        exudate_mask, ex_count, ex_ratio = extract_exudate_candidates(img)

        # Stage 4: Optic disc localisation
        logger.info("DIP Stage 4: Optic disc localisation")
        disc_found, disc_bbox = locate_optic_disc(img)

        # Stage 5: Macula centre estimation
        macula_center = None
        if disc_found and disc_bbox:
            macula_center = estimate_macula_center(disc_bbox, (h, w))

        # Stage 6: Overlay generation
        logger.info("DIP Stage 5: Generating annotated anatomy overlay")
        overlay_rgb = generate_anatomy_overlay(
            img, vessel_mask, lesion_mask, exudate_mask, disc_bbox, macula_center
        )

        return DIPBiomarkerResult(
            vessel_density_index=round(vdi, 4),
            microaneurysm_candidate_count=ma_count,
            exudate_candidate_count=ex_count,
            exudate_area_ratio=round(ex_ratio, 4),
            optic_disc_found=disc_found,
            optic_disc_bbox=disc_bbox,
            macula_center=macula_center,
            anatomy_overlay_base64=_arr_to_b64(overlay_rgb),
            vessel_mask_base64=_arr_to_b64(vessel_mask),
            lesion_mask_base64=_arr_to_b64(lesion_mask),
        )

    # Aliases for backward compatibility
    extract_biomarkers = analyze
    extract = analyze
