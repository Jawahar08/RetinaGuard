"""
Feature 7: Hemorrhage Segmentation (Dot, Blot & Flame Hemorrhages)
===================================================================
Segments dark Intraretinal Hemorrhages using morphological erosion, shape eccentricity,
and contrast thresholding to calculate total hemorrhage area and count.
"""
import base64
import io
from typing import Dict

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects


def segment_hemorrhages(img_rgb: np.ndarray, vessel_mask: np.ndarray) -> Dict:
    """
    Segments Dot, Blot, and Flame hemorrhages excluding the vascular tree.
    """
    h, w = img_rgb.shape[:2]
    green = img_rgb[:, :, 1].astype(np.float32)
    
    # Non-vessel background mask
    non_vessel = (vessel_mask <= 30)
    
    # Hemorrhages are dark regions in green channel below local background threshold
    local_mean = np.mean(green)
    dark_mask = (green < local_mean * 0.55) & non_vessel
    
    labeled_hem, num_features = label(dark_mask)
    slices = find_objects(labeled_hem)
    
    dot_count, blot_count, flame_count = 0, 0, 0
    total_area = 0
    hem_coords = []
    
    for i, slc in enumerate(slices):
        if slc is None:
            continue
        patch = (labeled_hem[slc] == (i + 1))
        area = int(np.sum(patch))
        
        if 4 <= area <= 300:
            total_area += area
            py, px = slc[0].start, slc[1].start
            hem_coords.append((px, py, area))
            
            # Shape analysis: Eccentricity & Aspect Ratio
            ph, pw = patch.shape
            aspect_ratio = float(max(ph, pw) / max(min(ph, pw), 1))
            
            if area < 15 and aspect_ratio < 1.4:
                dot_count += 1
            elif aspect_ratio > 2.0:
                flame_count += 1
            else:
                blot_count += 1
                
    total_count = dot_count + blot_count + flame_count
    hem_ratio = float(total_area / max(h * w, 1))
    
    # Render Overlay (Magenta for Hemorrhages)
    overlay_img = Image.fromarray(img_rgb.copy())
    draw = ImageDraw.Draw(overlay_img)
    
    for x, y, area in hem_coords:
        r = max(2, int(np.sqrt(area)))
        draw.ellipse([x - r, y - r, x + r, y + r], outline=(255, 0, 128), width=2)
        
    buf = io.BytesIO()
    overlay_img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    return {
        "hemorrhage_count": total_count,
        "dot_hemorrhage_count": dot_count,
        "blot_hemorrhage_count": blot_count,
        "flame_hemorrhage_count": flame_count,
        "hemorrhage_area": total_area,
        "hemorrhage_ratio": round(hem_ratio, 6),
        "hemorrhage_overlay_b64": b64_str
    }
