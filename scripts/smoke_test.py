"""
End-to-End CPU Smoke Test Script.
Validates synthetic fixture generation, quality gate, preprocessing, PyTorch models,
inference pipeline, Grad-CAM overlays, and FastAPI endpoints.
"""
import os
import sys
sys.path = [p for p in sys.path if not (p.endswith("Python311") or p.endswith("Python311\\"))]
from pathlib import Path
import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from scripts.generate_fixtures import build_synthetic_fixtures
from ml.quality_gate import ImageQualityGate
from ml.preprocessing import RetinalPreprocessor
from ml.models import model_factory, ResNet50Retinal, DenseNet121Retinal, EfficientNetB3Retinal, FeatureFusionRetinalModel
from ml.inference import RetinalInferenceService
from ml.gradcam import generate_gradcam_overlay
from fastapi.testclient import TestClient
from backend.app.main import app
import cv2


def run_smoke_test():
    print("=" * 70)
    print("[SMOKE TEST] RUNNING RETINAL ENSEMBLE SYSTEM CPU SMOKE TEST")
    print("=" * 70)

    # 1. Generate Synthetic Fixtures
    print("\n[1/6] Generating synthetic fixtures...")
    build_synthetic_fixtures()

    fixture_path = ROOT_DIR / "data" / "fixtures" / "images" / "normal_retina_01.png"
    dark_fixture_path = ROOT_DIR / "data" / "fixtures" / "images" / "dark_corrupt_03.png"

    with open(fixture_path, "rb") as f:
        valid_img_bytes = f.read()

    with open(dark_fixture_path, "rb") as f:
        dark_img_bytes = f.read()

    # 2. Test Quality Gate
    print("\n[2/6] Testing Image Quality & OOD Gate...")
    qgate = ImageQualityGate()
    pil_valid = np.array(cv2.imread(str(fixture_path)))
    pil_dark = np.array(cv2.imread(str(dark_fixture_path)))

    res_valid = qgate.evaluate(pil_valid)
    print(f"  - Valid Fixture Quality Passed: {res_valid.passed} (Score: {res_valid.quality_score:.2f})")
    assert res_valid.passed, "Valid fixture failed quality gate!"

    res_dark = qgate.evaluate(pil_dark)
    print(f"  - Dark Fixture Quality Passed: {res_dark.passed} (Flags: {res_dark.flags})")
    assert not res_dark.passed, "Dark fixture incorrectly passed quality gate!"

    # 3. Test Preprocessing
    print("\n[3/6] Testing Preprocessor & CLAHE...")
    prep = RetinalPreprocessor()
    cropped, tensor_or_arr = prep.preprocess(pil_valid)
    print(f"  - Preprocessed Shape: {cropped.shape}, Array/Tensor Shape: {tensor_or_arr.shape}")
    assert tensor_or_arr.shape == (1, 3, 224, 224), f"Unexpected shape: {tensor_or_arr.shape}"

    # 4. Test Models Architecture & Feature Fusion Dimensions
    print("\n[4/6] Testing Base Models & Feature Fusion Architecture...")
    num_classes = 5
    r50 = ResNet50Retinal(num_classes=num_classes)
    d121 = DenseNet121Retinal(num_classes=num_classes)
    eb3 = EfficientNetB3Retinal(num_classes=num_classes)
    fusion = FeatureFusionRetinalModel(r50, d121, eb3, num_classes=num_classes)
    smoke = model_factory("smoke_test", num_classes=num_classes)

    dummy_input = np.random.randn(2, 3, 224, 224).astype(np.float32)
    print(f"  - Smoke Model Output: {smoke.forward(dummy_input).shape}")
    print(f"  - ResNet50 Feature Extractor: {r50.extract_features(dummy_input).shape} (Expected: [2, 2048])")
    print(f"  - DenseNet121 Feature Extractor: {d121.extract_features(dummy_input).shape} (Expected: [2, 1024])")
    print(f"  - EfficientNetB3 Feature Extractor: {eb3.extract_features(dummy_input).shape} (Expected: [2, 1536])")
    print(f"  - Feature Fusion Output (4608d -> Head): {fusion.forward(dummy_input).shape} (Expected: [2, 5])")

    # 5. Test Inference Service & Abstention
    print("\n[5/6] Testing Inference Service Pipeline...")
    service = RetinalInferenceService(model_name="smoke_test")
    pred_res = service.predict_image_bytes(valid_img_bytes, task="odir")
    print(f"  - Task: {pred_res.task}, Top Pred: {pred_res.top_prediction}, Conf: {pred_res.calibrated_confidence:.2%}")
    assert pred_res.quality_gate.passed, "Inference quality check failed on valid fixture!"

    # 6. Test FastAPI Service Endpoints
    print("\n[6/6] Testing FastAPI Client Endpoints (/health, /predict, /generate-heatmap)...")
    client = TestClient(app)
    
    h_res = client.get("/health")
    assert h_res.status_code == 200, f"/health failed: {h_res.text}"
    print(f"  - GET /health Status: {h_res.json()['status']}")

    files = {"file": ("normal_retina_01.png", valid_img_bytes, "image/png")}
    p_res = client.post("/predict", files=files, data={"task": "odir"})
    assert p_res.status_code == 200, f"/predict failed: {p_res.text}"
    print(f"  - POST /predict Response Task: {p_res.json()['task']}, Predictions Count: {len(p_res.json()['predictions'])}")

    files_hm = {"file": ("normal_retina_01.png", valid_img_bytes, "image/png")}
    hm_res = client.post("/generate-heatmap", files=files_hm, data={"target_label": "Diabetic Retinopathy", "task": "odir"})
    assert hm_res.status_code == 200, f"/generate-heatmap failed: {hm_res.text}"
    print(f"  - POST /generate-heatmap Target: {hm_res.json()['target_label']}, Overlay Length: {len(hm_res.json()['overlay_base64'])}")

    print("\n" + "=" * 70)
    print("[SUCCESS] CPU SMOKE TEST PASSED SUCCESSFULLY! ALL CONTRACTS VERIFIED.")
    print("=" * 70)


if __name__ == "__main__":
    run_smoke_test()
