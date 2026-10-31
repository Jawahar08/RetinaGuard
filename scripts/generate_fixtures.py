"""
Synthetic Fixture Dataset Generator.
Generates small synthetic retinal fundus-like image fixtures and metadata CSV files.
Used strictly for CPU smoke tests, API integration tests, and frontend UI preview.
Does NOT use real patient data or external datasets.
"""
import sys
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
FRONTEND_SAMPLES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "samples"


def generate_synthetic_fundus(filename: str, disease_type: str = "normal", is_dark: bool = False) -> Path:
    """Generates a synthetic high-resolution (512x512) image mimicking retinal fundus characteristics."""
    h, w = 512, 512
    img = np.zeros((h, w, 3), dtype=np.uint8)

    if is_dark:
        # Dark / Low quality test image
        cv2.circle(img, (w // 2, h // 2), 220, (8, 8, 12), -1)
    else:
        # Retinal background: Orange-red fundus disc with radial illumination
        center = (w // 2, h // 2)
        radius = 230
        cv2.circle(img, center, radius, (180, 50, 15), -1)

        # Subtle dark macula area
        macula_center = (w // 2 - 60, h // 2 + 10)
        cv2.circle(img, macula_center, 35, (140, 35, 10), -1)

        # Optic nerve disc (bright yellowish-white circle offset temporally)
        optic_disc_center = (w // 2 + 100, h // 2 - 20)
        cv2.circle(img, optic_disc_center, 42, (255, 220, 140), -1)
        cv2.circle(img, optic_disc_center, 18, (255, 245, 190), -1)  # Optic cup

        # Vascular arcade tree (dark red branching structures radiating from optic disc)
        vessel_color = (90, 15, 10)
        cv2.ellipse(img, optic_disc_center, (90, 140), 25, 0, 180, vessel_color, 4)
        cv2.ellipse(img, optic_disc_center, (130, 90), -35, 0, 180, vessel_color, 4)
        cv2.ellipse(img, optic_disc_center, (160, 190), 15, 0, 160, vessel_color, 3)
        cv2.ellipse(img, optic_disc_center, (190, 120), -20, 0, 160, vessel_color, 3)

        # Add disease-specific lesions
        if disease_type == "dr":
            # Exudates (bright yellow flecks)
            for pt in [(180, 220), (200, 260), (230, 190), (160, 300), (210, 310)]:
                cv2.circle(img, pt, 7, (255, 245, 130), -1)
            # Microaneurysms (tiny dark red dots)
            for pt in [(260, 180), (280, 240), (220, 340), (310, 210)]:
                cv2.circle(img, pt, 4, (60, 10, 5), -1)
        elif disease_type == "glaucoma":
            # Enlarged Optic Cup (high Cup-to-Disc ratio)
            cv2.circle(img, optic_disc_center, 30, (255, 250, 210), -1)
        elif disease_type == "cataract":
            # Blurry central haze over retina
            img = cv2.GaussianBlur(img, (21, 21), 5)
            cv2.circle(img, center, 140, (200, 180, 160), -1)

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = IMAGES_DIR / filename
    cv2.imwrite(str(out_path), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    # Also copy to frontend public samples if exists
    if FRONTEND_SAMPLES_DIR.exists():
        cv2.imwrite(str(FRONTEND_SAMPLES_DIR / filename), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    return out_path


def build_synthetic_fixtures():
    """Generates fixture dataset images and metadata files."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    img1 = generate_synthetic_fundus("normal_retina_01.png", disease_type="normal")
    img2 = generate_synthetic_fundus("dr_retina_02.png", disease_type="dr")
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
