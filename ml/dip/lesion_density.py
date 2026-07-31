"""
Feature 6: Lesion Density Mapping & Spatial Clustering
======================================================
Computes spatial density metrics, nearest-neighbor spatial clustering indices,
and 2D spatial density heatmap overlays for microaneurysms and exudates.
"""
import base64
import io
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


def compute_lesion_density_and_clusters(
    img_rgb: np.ndarray,
    ma_candidates: List[Tuple[int, int]],
    exudate_candidates: List[Tuple[int, int]]
) -> Dict:
    """
    Computes spatial lesion density map, cluster dispersion scores, and density heatmap overlay.
    """
    h, w = img_rgb.shape[:2]
    all_lesions = ma_candidates + exudate_candidates
    total_lesions = len(all_lesions)
    
    image_area_mm2 = (h * w) / (150.0 * 150.0)  # Approx 150 px/mm scale
    lesion_density = total_lesions / max(image_area_mm2, 0.1)
    
    if total_lesions < 2:
        return {
            "lesion_density": round(lesion_density, 2),
            "lesion_cluster_score": 0.0,
            "total_lesion_count": total_lesions,
            "density_heatmap_b64": ""
        }
        
    # Spatial clustering score via nearest-neighbor distance variance
    if len(all_lesions) > 300:
        indices = np.random.choice(len(all_lesions), size=300, replace=False)
        sampled_lesions = [all_lesions[i] for i in indices]
    else:
        sampled_lesions = all_lesions
        
    coords = np.array(sampled_lesions)
    diffs = coords[:, np.newaxis, :] - coords[np.newaxis, :, :]
    dists = np.sqrt(np.sum(diffs ** 2, axis=-1))
    np.fill_diagonal(dists, np.inf)
    
    min_dists = np.min(dists, axis=1)
    cluster_score = float(np.std(min_dists) / max(np.mean(min_dists), 1e-3))
    
    # 2D Gaussian Kernel Density Estimation (KDE) Heatmap
    density_map = np.zeros((h, w), dtype=np.float32)
    for y, x in all_lesions:
        if 0 <= y < h and 0 <= x < w:
            density_map[y, x] += 1.0
            
    smoothed_kde = gaussian_filter(density_map, sigma=15.0)
    max_val = np.max(smoothed_kde)
    if max_val > 0:
        norm_kde = smoothed_kde / max_val
    else:
        norm_kde = smoothed_kde
        
    # Create thermal heatmap overlay (Jet / Turbo color mapping)
    overlay = img_rgb.copy().astype(np.float32)
    heatmap_r = np.clip(norm_kde * 255.0 * 1.5, 0, 255)
    heatmap_g = np.clip((1.0 - np.abs(norm_kde - 0.5) * 2.0) * 255.0, 0, 255)
    heatmap_b = np.clip((1.0 - norm_kde) * 255.0 * 0.8, 0, 255)
    
    alpha = np.clip(norm_kde * 0.6, 0, 0.6)[:, :, np.newaxis]
    color_map = np.stack([heatmap_r, heatmap_g, heatmap_b], axis=-1)
    
    blended = (overlay * (1.0 - alpha) + color_map * alpha).astype(np.uint8)
    
    pil_img = Image.fromarray(blended)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    return {
        "lesion_density": round(lesion_density, 2),
        "lesion_cluster_score": round(cluster_score, 4),
        "total_lesion_count": total_lesions,
        "density_heatmap_b64": b64_str
    }
