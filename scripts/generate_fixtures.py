"""
Synthetic Fixture Dataset Generator.
Generates small synthetic retinal fundus-like image fixtures and metadata CSV files.
Used strictly for CPU smoke tests, API integration tests, and frontend UI preview.
Does NOT use real patient data or external datasets.
"""
import sys
sys.path = [p for p in sys.path if not (p.endswith("Python311") or p.endswith("Python311\\"))]
from pathlib import Path
import numpy as np
import cv2
import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "data" / "fixtures"
IMAGES_DIR = FIXTURES_DIR / "images"


def generate_synthetic_fundus(filename: str, has_exudates: bool = False, is_dark: bool = False) -> Path:
    """Generates a synthetic 224x224 image mimicking retinal fundus characteristics."""
    h, w = 224, 224
    img = np.zeros((h, w, 3), dtype=np.uint8)

    if is_dark:
        # Generate dark/low quality synthetic image
        cv2.circle(img, (w // 2, h // 2), 90, (5, 5, 10), -1)
    else:
        # Retinal background: dark reddish/orange circular disc
        center = (w // 2, h // 2)
        radius = 100
        cv2.circle(img, center, radius, (15, 35, 180), -1)

        # Optic nerve disc (bright yellow/orange circle offset)
        optic_disc_center = (w // 2 + 35, h // 2 - 10)
        cv2.circle(img, optic_disc_center, 18, (80, 200, 255), -1)

        # Synthetic blood vessels (dark red curves radiating from optic disc)
        cv2.ellipse(img, optic_disc_center, (40, 60), 30, 0, 180, (10, 15, 90), 2)
        cv2.ellipse(img, optic_disc_center, (60, 40), -40, 0, 180, (10, 15, 90), 2)

        if has_exudates:
            # Draw synthetic bright spots (lesions/exudates)
            for pt in [(80, 100), (95, 120), (110, 85)]:
                cv2.circle(img, pt, 4, (120, 240, 255), -1)

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = IMAGES_DIR / filename
    cv2.imwrite(str(out_path), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    return out_path


def build_synthetic_fixtures():
    """Generates fixture dataset images and metadata files."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    img1 = generate_synthetic_fundus("normal_retina_01.png", has_exudates=False)
    img2 = generate_synthetic_fundus("dr_retina_02.png", has_exudates=True)
    img3 = generate_synthetic_fundus("dark_corrupt_03.png", is_dark=True)

    # ODIR multi-label metadata fixture
    odir_df = pd.DataFrame([
        {"id": "001", "filename": "normal_retina_01.png", "Normal": 1, "Diabetic Retinopathy": 0, "Glaucoma": 0, "Cataract": 0, "AMD": 0, "split": "train"},
        {"id": "002", "filename": "dr_retina_02.png", "Normal": 0, "Diabetic Retinopathy": 1, "Glaucoma": 0, "Cataract": 0, "AMD": 0, "split": "val"},
        {"id": "003", "filename": "dark_corrupt_03.png", "Normal": 0, "Diabetic Retinopathy": 0, "Glaucoma": 0, "Cataract": 0, "AMD": 0, "split": "test"}
    ])
    odir_df.to_csv(FIXTURES_DIR / "odir_fixtures.csv", index=False)

    # APTOS multiclass metadata fixture
    aptos_df = pd.DataFrame([
        {"id": "001", "filename": "normal_retina_01.png", "diagnosis": 0, "label_name": "No DR", "split": "train"},
        {"id": "002", "filename": "dr_retina_02.png", "diagnosis": 2, "label_name": "Moderate DR", "split": "val"},
        {"id": "003", "filename": "dark_corrupt_03.png", "diagnosis": 0, "label_name": "No DR", "split": "test"}
    ])
    aptos_df.to_csv(FIXTURES_DIR / "aptos_fixtures.csv", index=False)

    print(f"[OK] Generated synthetic fixture images and metadata CSV files in {FIXTURES_DIR}")


if __name__ == "__main__":
    build_synthetic_fixtures()
