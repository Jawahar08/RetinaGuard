"""
Unit tests for RetinaGuard++ Multi-Task Learning Architecture (Research Contribution #1).
Tests MultiTaskRetinalModel, MultiTaskLoss, MultiTaskRetinalDataset, and MultiTaskInferenceService.
"""
import numpy as np
import pytest
from ml.multitask_model import MultiTaskRetinalModel, SmokeMultiTaskModel
from ml.losses.multitask_loss import MultiTaskLoss
from ml.datasets.multitask_dataset import MultiTaskRetinalDataset
from ml.inference_multitask import MultiTaskInferenceService


def test_smoke_multitask_model_forward():
    model = SmokeMultiTaskModel()
    dummy_input = np.random.randint(0, 255, (2, 512, 512, 3), dtype=np.uint8)
    outputs = model(dummy_input)

    assert outputs.disease_logits.shape == (2, 8)
    assert outputs.dr_logits.shape == (2, 5)
    assert outputs.quality_preds.shape == (2, 6)
    assert outputs.biomarker_preds.shape == (2, 6)
    assert outputs.risk_pred.shape == (2, 1)


def test_multitask_loss():
    loss_fn = MultiTaskLoss()
    # Test fallback loss structure
    res = loss_fn(None, {})
    assert "total_loss" in res
    assert "disease_loss" in res
    assert "dr_loss" in res


def test_multitask_dataset():
    records = [{
        "image_path": "test.jpg",
        "disease_labels": [1, 0, 0, 0, 0, 0, 0, 0],
        "dr_grade": 2,
        "quality": [0.8, 0.9, 0.85, 0.9, 0.88, 1.0],
        "biomarkers": [0.1, 4.0, 0.01, 0.3, 1.0, 40.0],
        "risk_score": 35.0
    }]
    dataset = MultiTaskRetinalDataset(records=records)
    assert len(dataset) == 1
    image, targets, masks = dataset[0]
    assert "disease" in targets
    assert "dr_grade" in targets


def test_multitask_inference_service():
    service = MultiTaskInferenceService(use_smoke_test=True)

    # Generate synthetic image bytes
    from PIL import Image
    import io
    img = Image.fromarray(np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    response = service.predict_image_bytes(img_bytes)

    assert response.architecture == "MultiTask-EfficientNet-B3"
    assert len(response.multitask_outputs.disease_screening) == 8
    assert 0 <= response.multitask_outputs.dr_severity.grade <= 4
    assert 0.0 <= response.multitask_outputs.predicted_risk_score <= 100.0
    assert response.dip_biomarkers is not None
    assert response.clinical_risk is not None
