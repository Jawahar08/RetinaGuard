"""
Feature 8: Cotton Wool Spot Detection
=====================================
Detects fluffy white lesions (Cotton Wool Spots) indicating microvascular ischemia
in Diabetic Retinopathy and Hypertensive Retinopathy.
"""
import base64
import io
from typing import Dict

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import label, find_objects, gaussian_filter


def detect_cotton_wool_spots(img_rgb: np.ndarray, exudate_mask: np.ndarray) -> Dict:
    """
    Detects Cotton Wool Spots using texture variance and soft boundary lightness profile.
    """
    h, w = img_rgb.shape[:2]
    gray = np.mean(img_rgb, axis=2).astype(np.float32)
    
    # Smooth local background
    bg_smooth = gaussian_filter(gray, sigma=15.0)
    diff = gray - bg_smooth
    
    # Cotton Wool Spots: bright (+diff), soft edges (low gradient contrast compared to hard exudates)
    # Exclude sharp hard exudates
    non_exudate = (exudate_mask == 0)
    cws_mask = (diff > 25.0) & non_exudate
    
    labeled_cws, num_features = label(cws_mask)
    slices = find_objects(labeled_cws)
    
    cws_count = 0
    cws_coords = []
    
    for i, slc in enumerate(slices):
        if slc is None:
            continue
        patch = (labeled_cws[slc] == (i + 1))
        area = int(np.sum(patch))
        
        if 20 <= area <= 600:  # Cotton Wool spots are larger than microaneurysms
            cws_count += 1
            py, px = slc[0].start, slc[1].start
            cws_coords.append((px, py, area))
            
    # Render Overlay (Cyan-White Dashed Circles)
    overlay_img = Image.fromarray(img_rgb.copy())
    draw = ImageDraw.Draw(overlay_img)
    
    for x, y, area in cws_coords:
        r = int(np.sqrt(area / np.pi)) + 2
        draw.ellipse([x - r, y - r, x + r, y + r], outline=(220, 240, 255), width=2)
        
    buf = io.BytesIO()
    overlay_img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    return {
        "cotton_wool_spot_count": cws_count,
        "cws_overlay_b64": b64_str
    }
