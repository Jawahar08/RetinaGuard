"""
Unit tests for Semantic Explainer (ml/semantic_explainer.py).
Tests end-to-end explainability pipeline on synthetic fundus image bytes.
"""
import io
import numpy as np
import pytest
from PIL import Image

from ml.semantic_explainer import SemanticExplainer
from ml.schemas import SemanticExplainabilityResult


def _create_synthetic_fundus_bytes(size: int = 256) -> bytes:
    img = np.zeros((size, size, 3), dtype=np.uint8)
    # Background circular FOV
    cy, cx, r = size // 2, size // 2, int(size * 0.45)
    Y, X = np.ogrid[:size, :size]
    fov = (X - cx) ** 2 + (Y - cy) ** 2 <= r ** 2
    img[fov] = [180, 80, 20]

    # Optic disc
    disc = (X - (cx - 50)) ** 2 + (Y - cy) ** 2 <= (int(size * 0.08)) ** 2
    img[disc] = [255, 230, 150]

    pil = Image.fromarray(img)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def test_semantic_explainer_end_to_end():
    explainer = SemanticExplainer()
    img_bytes = _create_synthetic_fundus_bytes(256)

    res = explainer.explain(img_bytes, task="odir", filename="02_DIABETIC_RETINOPATHY_SEVERE.JPG")

    assert isinstance(res, SemanticExplainabilityResult)
    assert res.request_id is not None
    assert res.predicted_disease is not None
    assert res.grounding_result is not None
    assert 0.0 <= res.grounding_result.score <= 100.0
    assert len(res.disclaimer) > 0
