"""
Unit and Integration Tests for Retinal Ensemble Pipeline.
"""
import pytest
import numpy as np
import cv2
import torch
from pathlib import Path
from fastapi.testclient import TestClient

from ml.schemas import QualityGateResult, PredictionResponse, ClassPrediction
from ml.quality_gate import ImageQualityGate
from ml.preprocessing import RetinalPreprocessor
from ml.models import model_factory, ResNet50Retinal, DenseNet121Retinal, EfficientNetB3Retinal, FeatureFusionRetinalModel, SmokeTestModel
from ml.gradcam import generate_gradcam_overlay
from backend.app.main import app


@pytest.fixture
def sample_fundus_image():
    """Generates 224x224 synthetic retinal fundus numpy RGB array."""
    img = np.zeros((224, 224, 3), dtype=np.uint8)
    cv2.circle(img, (112, 112), 100, (15, 35, 180), -1)
    cv2.circle(img, (140, 100), 18, (80, 200, 255), -1)
    return img


@pytest.fixture
def dark_corrupt_image():
    """Generates dark corrupt numpy RGB image."""
    return np.zeros((224, 224, 3), dtype=np.uint8)


def test_quality_gate(sample_fundus_image, dark_corrupt_image):
    qgate = ImageQualityGate()
    valid_res = qgate.evaluate(sample_fundus_image)
    assert valid_res.passed is True
    assert valid_res.quality_score > 0.5

    dark_res = qgate.evaluate(dark_corrupt_image)
    assert dark_res.passed is False
    assert "extremely_dark" in dark_res.flags or "poor_field_of_view" in dark_res.flags


def test_preprocessor(sample_fundus_image):
    prep = RetinalPreprocessor()
    cropped, tensor = prep.preprocess(sample_fundus_image)
    assert cropped.shape == (224, 224, 3)
    assert tensor.shape == (1, 3, 224, 224)
    assert isinstance(tensor, torch.Tensor)


def test_model_feature_dimensions():
    num_classes = 5
    dummy = torch.randn(2, 3, 224, 224)

    r50 = ResNet50Retinal(num_classes=num_classes)
    d121 = DenseNet121Retinal(num_classes=num_classes)
    eb3 = EfficientNetB3Retinal(num_classes=num_classes)
    fusion = FeatureFusionRetinalModel(r50, d121, eb3, num_classes=num_classes)

    assert r50.extract_features(dummy).shape == (2, 2048)
    assert d121.extract_features(dummy).shape == (2, 1024)
    assert eb3.extract_features(dummy).shape == (2, 1536)
    assert fusion(dummy).shape == (2, 5)


def test_gradcam_generation(sample_fundus_image):
    model = SmokeTestModel(num_classes=5)
    prep = RetinalPreprocessor()
    _, tensor = prep.preprocess(sample_fundus_image)

    hm_rgb, overlay_rgb, orig_b64, hm_b64, overlay_b64, boxes = generate_gradcam_overlay(
        model=model,
        target_layer=model.target_layer,
        input_tensor=tensor,
        original_rgb=sample_fundus_image,
        target_class_idx=1
    )

    assert hm_rgb.shape == sample_fundus_image.shape
    assert overlay_rgb.shape == sample_fundus_image.shape
    assert orig_b64.startswith("data:image/png;base64,")
    assert overlay_b64.startswith("data:image/png;base64,")
    assert isinstance(boxes, list)



def test_fastapi_endpoints(sample_fundus_image):
    client = TestClient(app)

    # 1. Health
    h_res = client.get("/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "healthy"

    # 2. Metadata
    m_res = client.get("/metadata")
    assert m_res.status_code == 200
    assert "odir" in m_res.json()["tasks"]
    assert "aptos" in m_res.json()["tasks"]

    # Encode sample image to png bytes
    _, buf = cv2.imencode(".png", cv2.cvtColor(sample_fundus_image, cv2.COLOR_RGB2BGR))
    img_bytes = buf.tobytes()

    # 3. Predict ODIR
    files = {"file": ("test.png", img_bytes, "image/png")}
    p_res = client.post("/predict", files=files, data={"task": "odir"})
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["task"] == "odir"
    assert len(p_data["predictions"]) == 5

    # 4. Generate Heatmap
    files_hm = {"file": ("test.png", img_bytes, "image/png")}
    hm_res = client.post("/generate-heatmap", files=files_hm, data={"target_label": "Diabetic Retinopathy", "task": "odir"})
    assert hm_res.status_code == 200
    hm_data = hm_res.json()
    assert hm_data["target_label"] == "Diabetic Retinopathy"
    assert "overlay_base64" in hm_data

    # 5. Generate Report Endpoint
    files_rpt = {"file": ("test.png", img_bytes, "image/png")}
    rpt_res = client.post("/generate-report", files=files_rpt, data={"task": "odir"})
    assert rpt_res.status_code == 200
    assert "RetinaGuard AI" in rpt_res.text
    assert "Diagnostic Screening Summary" in rpt_res.text


def test_onnx_exporter(tmp_path):
    from ml.onnx_exporter import ONNXModelExporter, ONNXInferenceSession
    exporter = ONNXModelExporter(output_dir=tmp_path)
    model = SmokeTestModel(num_classes=5)
    onnx_path = exporter.export_to_onnx(model, "smoke_test")
    assert onnx_path.exists()

    session = ONNXInferenceSession(onnx_path)
    dummy_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
    logits = session.run(dummy_input)
    assert logits.shape == (1, 5)

