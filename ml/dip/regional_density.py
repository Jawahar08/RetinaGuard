"""
Feature 10: Vessel Density by Quadrant Region (Superior, Inferior, Nasal, Temporal)
===================================================================================
Calculates localized vessel density across 4 anatomical quadrants centered at Optic Disc.
"""
import base64
import io
from typing import Dict, Tuple

import numpy as np
from PIL import Image, ImageDraw


def compute_regional_vessel_density(vessel_mask: np.ndarray, img_rgb: np.ndarray, center_pt: Tuple[int, int] = None) -> Dict:
    """
    Computes vessel density ratio for Superior, Inferior, Nasal, and Temporal quadrants.
    """
    h, w = vessel_mask.shape[:2]
    binary = (vessel_mask > 30).astype(np.uint8)
    
    cx, cy = center_pt if center_pt is not None else (w // 2, h // 2)
    
    # 4 Quadrants masks based on 45-degree diagonal splits from center
    y_coords, x_coords = np.ogrid[:h, :w]
    
    dx = x_coords - cx
    dy = y_coords - cy
    
    superior_mask = (dy < 0) & (np.abs(dx) <= np.abs(dy))
    inferior_mask = (dy >= 0) & (np.abs(dx) <= np.abs(dy))
    nasal_mask = (dx < 0) & (np.abs(dy) < np.abs(dx))
    temporal_mask = (dx >= 0) & (np.abs(dy) < np.abs(dx))
    
    def _density(mask):
        total = np.sum(mask)
        if total == 0:
            return 0.0
        return float(np.sum(binary[mask]) / total)
        
    sup_dens = _density(superior_mask)
    inf_dens = _density(inferior_mask)
    nas_dens = _density(nasal_mask)
    tem_dens = _density(temporal_mask)
    
    # Render Quadrant Grid Overlay
    overlay = Image.fromarray(img_rgb.copy())
    draw = ImageDraw.Draw(overlay)
    
    # Draw quadrant cross-lines
    draw.line([cx - w, cy - w, cx + w, cy + w], fill=(255, 255, 0), width=1)
    draw.line([cx - w, cy + w, cx + w, cy - w], fill=(255, 255, 0), width=1)
    
    buf = io.BytesIO()
    overlay.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    return {
        "regional_vessel_density": {
            "superior": round(sup_dens, 4),
            "inferior": round(inf_dens, 4),
            "nasal": round(nas_dens, 4),
            "temporal": round(tem_dens, 4)
        },
        "regional_overlay_b64": b64_str
    }
