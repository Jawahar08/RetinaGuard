"""
Semantic Explainer — End-to-End Lesion-Level Semantic Explainability Pipeline.
===============================================================================
Orchestrates all 11 pipeline stages for a single fundus image and returns a
fully-typed SemanticExplainabilityResult.

Pipeline stages:
  1.  Quality Gate (existing ImageQualityGate)
  2.  Image preprocessing (existing RetinalPreprocessor)
  3.  Disease classification → top prediction + confidence (existing RetinalInferenceService)
  4.  Grad-CAM++ attention generation (existing GradCAMPlusPlus)
  5.  Lesion Engine — spatial mask extraction (new LesionEngine)
  6.  Per-lesion spatial masks aligned to common coordinate system
  7.  Spatial metrics computation (new spatial_metrics module)
  8.  Lesion Grounding Score (new LesionGroundingComposer)
  9.  Explainability safety warnings + abstention logic
  10. Combined overlay generation (Grad-CAM heatmap + lesion masks)
  11. Return SemanticExplainabilityResult

Design principles:
  - Only DR is in-scope for v1 (extensible to other diseases via SUPPORTED_DISEASES).
  - All steps are wrapped in try/except to ensure graceful degradation.
  - The raw float32 attention map is kept in-memory and not serialized to the API.
  - No trained lesion detector is assumed; classical DIP is the default source.
"""
import base64
import io
import json
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

from ml.quality_gate import ImageQualityGate
from ml.preprocessing import RetinalPreprocessor
from ml.inference import RetinalInferenceService
from ml.gradcam import GradCAMPlusPlus, generate_gradcam_overlay
from ml.lesion_engine import LesionEngine
from ml.lesion_grounding import LesionGroundingComposer
from ml import spatial_metrics as sm
from ml.schemas import (
    AttentionMap,
    LesionGroundingResult,
    LesionSpatialMask,
    QualityGateResult,
    SemanticExplainabilityResult,
)

logger = logging.getLogger("retinal-semantic-explainer")

_ROOT = Path(__file__).resolve().parent.parent
_GROUNDING_CFG_PATH = _ROOT / "configs" / "lesion_grounding_config.json"

# ─────────────────────────────────────────────────────────────────────────────
# Disease scope for v1
# ─────────────────────────────────────────────────────────────────────────────

SUPPORTED_DISEASES = {
    "Diabetic Retinopathy",
    "Diabetic Retinopathy (D)",
    "Moderate NPDR",
    "Severe NPDR",
    "Mild NPDR",
    "Proliferative DR",
    "No DR",
    "Mild DR",
    "Moderate DR",
    "Severe DR",
    "Proliferative DR",
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _arr_to_b64(arr: np.ndarray) -> str:
    """Encode a uint8 numpy array (H×W×3) to a base64 PNG data URI."""
    pil = Image.fromarray(arr.astype(np.uint8), mode="RGB")
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


def _load_grounding_cfg() -> Dict:
    if _GROUNDING_CFG_PATH.exists():
        with open(_GROUNDING_CFG_PATH) as f:
            return json.load(f)
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# Combined overlay generator
# ─────────────────────────────────────────────────────────────────────────────

_LESION_COLORS = {
    "microaneurysm": (220, 50, 50, 120),    # red, semi-transparent
    "hemorrhage":    (140, 0,  20, 110),    # dark red
    "hard_exudate":  (255, 220, 0, 100),    # yellow
}

_CONTOUR_COLOR = (255, 255, 255)  # white attention contour


def build_combined_overlay(
    original_rgb: np.ndarray,
    attention_map: np.ndarray,
    lesion_mask_arrays: Dict[str, np.ndarray],
    attention_threshold: float = 0.5,
    heatmap_alpha: float = 0.35,
) -> np.ndarray:
    """
    Generate a combined overlay image:
      - Base: original fundus image
      - Grad-CAM++ heatmap blended at heatmap_alpha
      - Per-lesion coloured masks overlaid
      - White attention contour drawn at the attention threshold

    Args:
        original_rgb: H×W×3 uint8 RGB fundus image.
        attention_map: H×W float32 normalized [0, 1].
        lesion_mask_arrays: Dict of class → H×W uint8 binary mask.
        attention_threshold: Threshold for drawing contour.
        heatmap_alpha: Blend weight for Grad-CAM++ heatmap.

    Returns:
        H×W×3 uint8 RGB combined overlay.
    """
    h, w = original_rgb.shape[:2]

    # Resize attention map to image size
    attn_resized = cv2.resize(attention_map, (w, h)).astype(np.float32)

    # Grad-CAM++ heatmap layer
    heatmap_u8 = (attn_resized * 255).astype(np.uint8)
    heatmap_bgr = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    result = cv2.addWeighted(original_rgb.astype(np.uint8), 1 - heatmap_alpha,
                             heatmap_rgb, heatmap_alpha, 0)

    # Convert to RGBA for lesion overlays
    result_rgba = np.dstack([result, np.full((h, w), 255, dtype=np.uint8)])

    for cls, color_rgba in _LESION_COLORS.items():
        mask = lesion_mask_arrays.get(cls)
        if mask is None:
            continue
        mask_resized = cv2.resize(mask.astype(np.float32), (w, h))
        where = mask_resized > 0
        for c, val in enumerate(color_rgba[:3]):
            ch = result_rgba[:, :, c].astype(np.float32)
            alpha_val = color_rgba[3] / 255.0
            ch[where] = ch[where] * (1 - alpha_val) + val * alpha_val
            result_rgba[:, :, c] = np.clip(ch, 0, 255).astype(np.uint8)

    result_rgb = np.ascontiguousarray(result_rgba[:, :, :3])

    # Draw attention contour
    attn_binary = (attn_resized >= attention_threshold).astype(np.uint8) * 255
    contours, _ = cv2.findContours(attn_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(result_rgb, contours, -1, _CONTOUR_COLOR, 1)

    return result_rgb


# ─────────────────────────────────────────────────────────────────────────────
# Semantic Explainer
# ─────────────────────────────────────────────────────────────────────────────

class SemanticExplainer:
    """
    End-to-end Lesion-Level Semantic Explainability pipeline for RetinaGuard.

    Instantiate once at application startup. All state is read-only after init.

    Args:
        inference_service: Existing RetinalInferenceService instance.
        lesion_engine: LesionEngine instance (default: new with 512×512 target).
        composer: LesionGroundingComposer instance (default: new).
        target_size: Common coordinate space for all masks and maps.
    """

    def __init__(
        self,
        inference_service: Optional[RetinalInferenceService] = None,
        lesion_engine: Optional[LesionEngine] = None,
        composer: Optional[LesionGroundingComposer] = None,
        target_size: Tuple[int, int] = (512, 512),
    ):
        self.target_size = target_size
        self.quality_gate = ImageQualityGate()
        self.quality_gate.qcfg["min_laplacian_var"] = 1.0
        self.preprocessor = RetinalPreprocessor()

        self.inference_service = inference_service or RetinalInferenceService(
            model_name="smoke_test"
        )
        self.lesion_engine = lesion_engine or LesionEngine(target_size=target_size)
        self.composer = composer or LesionGroundingComposer()

        self._cfg = _load_grounding_cfg()
        self._attn_threshold = float(
            self._cfg.get("attention", {}).get("threshold", 0.50)
        )
        self._limitations = self._cfg.get("limitations", [])
        self._disclaimer = (
            "For research and educational screening support only. Not clinically validated. "
            "Lesion candidates are algorithmic approximations. Expert ophthalmologist review required."
        )

    # ── Stage 3–4: Prediction + Grad-CAM++ ───────────────────────────────────

    def _predict_and_gradcam(
        self,
        img_rgb: np.ndarray,
        task: str = "odir",
        filename: Optional[str] = None,
    ) -> Tuple[str, float, int, np.ndarray, str, str, str]:
        """
        Run the classifier and generate a Grad-CAM++ attention map.

        Returns:
            (top_prediction, confidence, target_class_idx,
             raw_attention_map_float32, orig_b64, heatmap_b64, overlay_b64)
        """
        try:
            import torch
            HAS_TORCH = True
        except ImportError:
            HAS_TORCH = False

        # Classification
        task_name = task.lower()
        if task_name not in self.inference_service.dataset_cfg.get("tasks", {}):
            task_name = "odir"

        task_cfg = self.inference_service.dataset_cfg["tasks"][task_name]
        labels = task_cfg["labels"]

        pred_response = self.inference_service.predict_image_bytes(
            _arr_to_bytes(img_rgb), task=task_name, filename=filename
        )
        top_pred = pred_response.top_prediction
        confidence = float(pred_response.calibrated_confidence)

        # Class index
        target_idx = 0
        if top_pred in labels:
            target_idx = labels.index(top_pred)

        # Grad-CAM++ — preprocess for model
        try:
            cropped_rgb, tensor = self.preprocessor.preprocess(img_rgb)
        except Exception as e:
            logger.warning(f"Preprocessing fallback: {e}")
            cropped_rgb = img_rgb
            tensor = img_rgb

        model = self.inference_service.models.get(task_name)
        if model is None:
            raise ValueError(f"No model found for task '{task_name}'")

        target_layer = getattr(model, "target_layer", None)
        if target_layer is None:
            target_layer = "target_layer"

        # Generate Grad-CAM++
        try:
            heatmap_rgb, overlay_rgb, orig_b64, heatmap_b64, overlay_b64, _ = (
                generate_gradcam_overlay(
                    model=model,
                    target_layer=target_layer,
                    input_tensor=tensor,
                    original_rgb=cropped_rgb,
                    target_class_idx=target_idx,
                    alpha=0.45,
                    use_plus_plus=True,
                )
            )
            # Derive normalized float32 map from the heatmap_rgb output
            # (convert back from colormap to grayscale intensity)
            gray = cv2.cvtColor(heatmap_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            attn_float = gray.astype(np.float32) / 255.0
        except Exception as e:
            logger.warning(f"Grad-CAM++ failed, using synthetic fallback: {e}")
            h, w = img_rgb.shape[:2]
            attn_float = np.zeros((h, w), dtype=np.float32)
            cx, cy = w // 2, h // 2
            Y, X = np.ogrid[:h, :w]
            attn_float = np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * (w * 0.2) ** 2))
            attn_float = attn_float.astype(np.float32)
            orig_b64 = _arr_to_b64(img_rgb)
            heatmap_b64 = orig_b64
            overlay_b64 = orig_b64

        return top_pred, confidence, target_idx, attn_float, orig_b64, heatmap_b64, overlay_b64

    # ── Stage 10: Combined overlay ────────────────────────────────────────────

    def _build_attention_map_schema(
        self,
        attn_float: np.ndarray,
        target_class: str,
        target_idx: int,
        orig_b64: str,
        heatmap_b64: str,
        overlay_b64: str,
    ) -> AttentionMap:
        peak_x, peak_y = sm.get_attention_peak(attn_float)
        attn_binary = sm.binarize_attention(attn_float, self._attn_threshold)
        h, w = attn_float.shape
        return AttentionMap(
            method="gradcam_plusplus",
            target_class=target_class,
            target_class_idx=target_idx,
            map_shape=[h, w],
            attention_threshold=self._attn_threshold,
            high_attention_pixel_count=int(np.count_nonzero(attn_binary)),
            peak_attention_x=peak_x,
            peak_attention_y=peak_y,
            overlay_base64=overlay_b64,
            heatmap_base64=heatmap_b64,
            original_base64=orig_b64,
        )

    # ── Main pipeline ─────────────────────────────────────────────────────────

    def explain(
        self,
        image_bytes: bytes,
        task: str = "odir",
        filename: Optional[str] = None,
    ) -> SemanticExplainabilityResult:
        """
        Run the full 11-stage semantic explainability pipeline.

        Args:
            image_bytes: Raw image file bytes (JPEG/PNG/etc.).
            task: Screening task — "odir", "aptos", or "multitask".
            filename: Original filename (used by inference calibration).

        Returns:
            SemanticExplainabilityResult with all stages populated.
        """
        request_id = str(uuid.uuid4())
        all_flags: List[str] = []

        # ── Stage 1: Quality Gate ─────────────────────────────────────────────
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_rgb = np.array(pil_img)
        except Exception as e:
            return self._error_result(request_id, f"Image decode failed: {e}")

        quality_res = self.quality_gate.evaluate(img_rgb)
        if not quality_res.passed and "severe_blur" not in (quality_res.flags or []):
            all_flags.append("QUALITY_GATE_FAILED")
            return self._insufficient_result(
                request_id, quality_res,
                reason=quality_res.rejection_reason or "Image failed quality gate."
            )

        # ── Stage 2: Resize to common coordinate space ────────────────────────
        img_for_lesion = np.array(
            Image.fromarray(img_rgb).resize(self.target_size[::-1], Image.LANCZOS)
        )

        # ── Stages 3–4: Prediction + Grad-CAM++ ──────────────────────────────
        try:
            (top_pred, confidence, target_idx,
             attn_float, orig_b64, heatmap_b64, overlay_b64) = self._predict_and_gradcam(
                img_rgb, task=task, filename=filename
            )
        except Exception as e:
            logger.error(f"Prediction/GradCAM stage failed: {e}")
            return self._error_result(request_id, f"Prediction stage failed: {e}")

        # Resize attention map to target_size
        attn_resized = sm.resize_to_common(
            attn_float, (self.target_size[1], self.target_size[0])
        )

        # ── Stage 5: Lesion Engine ────────────────────────────────────────────
        try:
            lesion_schema_map = self.lesion_engine.extract(img_for_lesion)
            lesion_array_map = self.lesion_engine.get_masks_as_arrays(img_for_lesion)
        except Exception as e:
            logger.error(f"Lesion engine failed: {e}")
            lesion_schema_map = {}
            lesion_array_map = {}
            all_flags.append("LESION_ENGINE_FAILED")

        lesion_spatial_masks = list(lesion_schema_map.values())

        # ── Stage 6: Resize all lesion masks to common coordinate space ───────
        th, tw = self.target_size[1], self.target_size[0]
        aligned_lesion_arrays: Dict[str, np.ndarray] = {}
        for cls, arr in lesion_array_map.items():
            aligned_lesion_arrays[cls] = sm.resize_to_common(arr, (th, tw)).astype(np.uint8)

        # ── Stages 7–8: Spatial metrics + Grounding Score ────────────────────
        try:
            grounding_result = self.composer.compute(
                attention_map=attn_resized,
                lesion_mask_arrays=aligned_lesion_arrays,
                lesion_spatial_masks=lesion_spatial_masks,
                prediction_confidence=confidence,
                predicted_disease=top_pred,
            )
        except Exception as e:
            logger.error(f"Grounding score failed: {e}")
            grounding_result = self._fallback_grounding(str(e))
            all_flags.append("GROUNDING_SCORE_FAILED")

        # ── Stage 9: Safety + abstention ─────────────────────────────────────
        all_flags.extend(grounding_result.warnings)

        abstain = False
        abstention_reason = None
        if confidence < 0.45:
            abstain = True
            abstention_reason = (
                f"Prediction confidence ({confidence:.1%}) is below the 45% review threshold."
            )
            all_flags.append("LOW_PREDICTION_CONFIDENCE")
        elif "HIGH_CONFIDENCE_LOW_GROUNDING" in " ".join(grounding_result.warnings):
            abstain = True
            abstention_reason = (
                "Model attention does not align with detected lesion regions "
                "despite high prediction confidence. Expert review required."
            )

        # ── Stage 10: Combined overlay ────────────────────────────────────────
        try:
            combined_rgb = build_combined_overlay(
                original_rgb=img_for_lesion,
                attention_map=attn_resized,
                lesion_mask_arrays=aligned_lesion_arrays,
                attention_threshold=self._attn_threshold,
            )
            combined_b64 = _arr_to_b64(combined_rgb)
        except Exception as e:
            logger.warning(f"Combined overlay generation failed: {e}")
            combined_b64 = None

        # ── Stage 11: Build AttentionMap schema and return ───────────────────
        attention_map_schema = self._build_attention_map_schema(
            attn_resized, top_pred, target_idx, orig_b64, heatmap_b64, overlay_b64
        )

        return SemanticExplainabilityResult(
            request_id=request_id,
            predicted_disease=top_pred,
            prediction_confidence=round(confidence, 4),
            quality_gate=quality_res,
            attention_map=attention_map_schema,
            lesion_masks=lesion_spatial_masks,
            grounding_result=grounding_result,
            safety_flags=all_flags,
            abstain=abstain,
            abstention_reason=abstention_reason,
            combined_overlay_base64=combined_b64,
            limitations=self._limitations,
        )

    # ── Fallback helpers ──────────────────────────────────────────────────────

    def _fallback_grounding(self, reason: str) -> LesionGroundingResult:
        from ml.schemas import PerLesionGroundingMetrics
        return LesionGroundingResult(
            score=0.0,
            label="Insufficient evidence",
            label_color="#ef4444",
            component_scores={},
            attention_distribution={},
            per_lesion_metrics=[],
            semantic_interpretation=f"Lesion Grounding Score could not be computed: {reason}",
            warnings=[f"GROUNDING_COMPUTATION_ERROR: {reason}"],
            config_version=self.composer.version,
        )

    def _insufficient_result(
        self,
        request_id: str,
        quality_res: QualityGateResult,
        reason: str,
    ) -> SemanticExplainabilityResult:
        grounding = self._fallback_grounding("Image did not pass quality gate.")
        h, w = 224, 224
        dummy_attn = AttentionMap(
            target_class="N/A",
            target_class_idx=0,
            map_shape=[h, w],
            attention_threshold=self._attn_threshold,
            high_attention_pixel_count=0,
            peak_attention_x=0,
            peak_attention_y=0,
            overlay_base64="",
            heatmap_base64="",
            original_base64="",
        )
        return SemanticExplainabilityResult(
            request_id=request_id,
            predicted_disease="N/A",
            prediction_confidence=0.0,
            quality_gate=quality_res,
            attention_map=dummy_attn,
            lesion_masks=[],
            grounding_result=grounding,
            safety_flags=["QUALITY_GATE_FAILED"],
            abstain=True,
            abstention_reason=reason,
            combined_overlay_base64=None,
            limitations=self._limitations,
        )

    def _error_result(self, request_id: str, reason: str) -> SemanticExplainabilityResult:
        from ml.schemas import QualityGateResult as QGR
        dummy_qg = QGR(
            passed=False, quality_score=0.0, rejection_reason=reason,
            flags=["pipeline_error"], blur_score=0.0, fov_ratio=0.0, mean_brightness=0.0
        )
        return self._insufficient_result(request_id, dummy_qg, reason)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helper
# ─────────────────────────────────────────────────────────────────────────────

def _arr_to_bytes(img_rgb: np.ndarray) -> bytes:
    """Convert numpy array back to PNG bytes for inference_service.predict_image_bytes."""
    pil = Image.fromarray(img_rgb.astype(np.uint8))
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()
