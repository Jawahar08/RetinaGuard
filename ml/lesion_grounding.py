"""
Lesion Grounding Score Composer.
=================================
Computes a transparent, configurable Lesion Grounding Score [0–100] measuring
how strongly Grad-CAM++ model attention corresponds to detected retinal lesions.

Architecture:
  - All thresholds and weights loaded from configs/lesion_grounding_config.json.
  - Operates on pre-computed spatial metrics (from spatial_metrics.py).
  - Produces a LesionGroundingResult schema with all component scores, the
    composite score, a human-readable label, and safety warnings.

IMPORTANT: The Lesion Grounding Score is a research metric.
  - It does NOT prove clinical correctness.
  - It is separate from and independent of prediction confidence.
  - A high score with wrong diagnosis is possible.
  - A low score with correct diagnosis is possible (e.g., if the lesion engine
    fails to detect lesions that the classifier correctly identified).
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from ml.schemas import (
    LesionGroundingResult,
    LesionSpatialMask,
    PerLesionGroundingMetrics,
)
from ml import spatial_metrics as sm

logger = logging.getLogger("retinal-lesion-grounding")

_ROOT = Path(__file__).resolve().parent.parent
_CFG_PATH = _ROOT / "configs" / "lesion_grounding_config.json"


# ─────────────────────────────────────────────────────────────────────────────
# Config loader
# ─────────────────────────────────────────────────────────────────────────────

def _load_config() -> Dict:
    if _CFG_PATH.exists():
        with open(_CFG_PATH) as f:
            return json.load(f)
    logger.warning("lesion_grounding_config.json not found; using defaults.")
    return {
        "version": "default",
        "attention": {
            "threshold": 0.50,
            "pointing_game_tolerance_px": 15,
            "border_fraction_threshold": 0.40,
        },
        "grounding_weights": {
            "microaneurysm_lesion_coverage": 0.30,
            "hard_exudate_lesion_coverage": 0.25,
            "hemorrhage_lesion_coverage": 0.20,
            "pointing_game": 0.15,
            "attention_concentration": 0.10,
        },
        "score_thresholds": {"strong": 70, "moderate": 45, "weak": 20},
        "score_labels": {
            "strong": {"label": "Strong anatomical agreement", "color": "#22c55e"},
            "moderate": {"label": "Moderate agreement", "color": "#eab308"},
            "weak": {"label": "Weak agreement", "color": "#f97316"},
            "insufficient": {"label": "Insufficient evidence", "color": "#ef4444"},
        },
        "safety_warnings": {
            "high_confidence_threshold": 0.75,
            "low_grounding_threshold": 30,
            "min_lesion_count_for_grounding": 1,
        },
        "coverage_fallback": {
            "use_soft_distance_fallback": True,
            "tiny_lesion_area_threshold_px": 50,
            "max_acceptable_distance_px": 30,
        },
        "source_disclaimer": (
            "Lesion masks are algorithmic candidates from classical DIP methods."
        ),
        "limitations": ["No expert-annotated ground truth available."],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Grounding composer
# ─────────────────────────────────────────────────────────────────────────────

class LesionGroundingComposer:
    """
    Computes the Lesion Grounding Score from attention maps and lesion masks.

    Usage:
        composer = LesionGroundingComposer()
        result = composer.compute(
            attention_map=float32_heatmap,   # H×W float32 [0,1]
            lesion_mask_arrays={"microaneurysm": ..., ...},
            lesion_spatial_masks=[LesionSpatialMask, ...],
            prediction_confidence=0.91,
        )
    """

    def __init__(self):
        self.cfg = _load_config()
        self.version = self.cfg.get("version", "unknown")
        self._attn_cfg = self.cfg.get("attention", {})
        self._weights = self.cfg.get("grounding_weights", {})
        self._thresholds = self.cfg.get("score_thresholds", {})
        self._labels = self.cfg.get("score_labels", {})
        self._safety = self.cfg.get("safety_warnings", {})
        self._fallback = self.cfg.get("coverage_fallback", {})

    # ── Per-lesion metrics ────────────────────────────────────────────────────

    def _compute_per_lesion_metrics(
        self,
        lesion_class: str,
        attention_binary: np.ndarray,
        lesion_binary: np.ndarray,
        attention_map: np.ndarray,
        spatial_mask: LesionSpatialMask,
        peak_xy: Tuple[int, int],
    ) -> PerLesionGroundingMetrics:
        """Compute all spatial metrics for one lesion class."""
        tolerance = int(self._attn_cfg.get("pointing_game_tolerance_px", 15))
        tiny_threshold = int(self._fallback.get("tiny_lesion_area_threshold_px", 50))

        total_lesion_area = int(np.count_nonzero(lesion_binary))
        instance_count = spatial_mask.instance_count

        # Basic coverage metrics (always computed)
        lesion_cov = sm.compute_lesion_coverage(attention_binary, lesion_binary)
        attention_cov = sm.compute_attention_coverage(attention_binary, lesion_binary)

        # IoU + Dice — skip if lesion is entirely tiny components
        avg_inst_area = (
            (total_lesion_area / max(instance_count, 1))
            if instance_count > 0 else 0
        )
        use_fallback = (
            avg_inst_area < tiny_threshold
            and self._fallback.get("use_soft_distance_fallback", True)
        )

        if use_fallback or total_lesion_area == 0:
            iou = None
            dice = None
        else:
            iou = sm.compute_iou(attention_binary, lesion_binary)
            dice = sm.compute_dice(attention_binary, lesion_binary)

        # Distance to nearest lesion
        dist = sm.compute_distance_to_nearest_lesion(peak_xy, spatial_mask.instances)

        # Pointing game
        pg = sm.compute_pointing_game(peak_xy, spatial_mask.instances, tolerance)

        # Build human-readable note
        note = self._build_lesion_note(
            lesion_class, instance_count, lesion_cov, attention_cov, iou, dist, pg, use_fallback
        )

        return PerLesionGroundingMetrics(
            lesion_class=lesion_class,
            iou=round(iou, 4) if iou is not None else None,
            dice=round(dice, 4) if dice is not None else None,
            lesion_coverage=round(lesion_cov, 4),
            attention_coverage=round(attention_cov, 4),
            distance_to_nearest_lesion=round(dist, 2) if dist is not None else None,
            pointing_game_hit=pg,
            pointing_game_tolerance_px=tolerance,
            instance_count=instance_count,
            note=note,
        )

    def _build_lesion_note(
        self,
        lesion_class: str,
        count: int,
        lesion_cov: float,
        attn_cov: float,
        iou: Optional[float],
        dist: Optional[float],
        pg: Optional[bool],
        use_fallback: bool,
    ) -> str:
        if count == 0:
            return f"No {lesion_class} candidates detected — grounding not possible for this class."

        parts = [f"{count} {lesion_class} candidate(s) detected."]
        parts.append(f"Lesion coverage: {lesion_cov*100:.1f}% of lesion pixels in high-attention region.")
        parts.append(f"Attention coverage: {attn_cov*100:.1f}% of attention overlaps lesion mask.")

        if iou is not None:
            parts.append(f"IoU: {iou:.3f}.")
        elif use_fallback:
            parts.append("IoU not computed (tiny lesion fallback active).")

        if dist is not None:
            max_d = float(self._fallback.get("max_acceptable_distance_px", 30))
            qual = "within tolerance" if dist <= max_d else "outside tolerance"
            parts.append(f"Distance to nearest lesion: {dist:.1f}px ({qual}).")

        if pg is True:
            parts.append("Pointing-game: HIT — attention peak inside lesion bounding box.")
        elif pg is False:
            parts.append("Pointing-game: MISS — attention peak outside all lesion bounding boxes.")

        return " ".join(parts)

    # ── Score composition ─────────────────────────────────────────────────────

    def _score_from_metrics(
        self,
        per_lesion: List[PerLesionGroundingMetrics],
        attention_distribution: Dict[str, float],
    ) -> Tuple[float, Dict[str, float]]:
        """
        Compute the weighted Lesion Grounding Score from per-lesion metrics.

        Component scores:
          - microaneurysm_lesion_coverage (weight from config)
          - hard_exudate_lesion_coverage  (weight from config)
          - hemorrhage_lesion_coverage    (weight from config)
          - pointing_game                 (weight from config) — fraction of classes with PG hit
          - attention_concentration       (weight from config) — 1 - other_fraction
        """
        w = self._weights
        components: Dict[str, float] = {}

        # Per-class coverage contributions
        class_coverage_map = {m.lesion_class: m.lesion_coverage for m in per_lesion}

        for cls, weight_key in [
            ("microaneurysm", "microaneurysm_lesion_coverage"),
            ("hard_exudate", "hard_exudate_lesion_coverage"),
            ("hemorrhage", "hemorrhage_lesion_coverage"),
        ]:
            coverage = class_coverage_map.get(cls, 0.0)
            weight = float(w.get(weight_key, 0.0))
            components[weight_key] = round(coverage * 100 * weight, 4)

        # Pointing-game component: fraction of classes with a hit
        pg_hits = [m.pointing_game_hit for m in per_lesion if m.pointing_game_hit is not None]
        pg_fraction = float(sum(pg_hits) / max(len(pg_hits), 1)) if pg_hits else 0.0
        components["pointing_game"] = round(pg_fraction * 100 * float(w.get("pointing_game", 0.0)), 4)

        # Attention concentration: fraction of attention NOT on "other" regions
        other_frac = float(attention_distribution.get("other", 1.0))
        concentration = max(0.0, 1.0 - other_frac)
        components["attention_concentration"] = round(
            concentration * 100 * float(w.get("attention_concentration", 0.0)), 4
        )

        score = float(sum(components.values()))
        score = max(0.0, min(100.0, score))
        return score, components

    # ── Label assignment ──────────────────────────────────────────────────────

    def _assign_label(self, score: float) -> Tuple[str, str]:
        thresholds = self._thresholds
        labels = self._labels
        if score >= float(thresholds.get("strong", 70)):
            cfg = labels.get("strong", {})
        elif score >= float(thresholds.get("moderate", 45)):
            cfg = labels.get("moderate", {})
        elif score >= float(thresholds.get("weak", 20)):
            cfg = labels.get("weak", {})
        else:
            cfg = labels.get("insufficient", {})
        return cfg.get("label", "Unknown"), cfg.get("color", "#94a3b8")

    # ── Safety warnings ───────────────────────────────────────────────────────

    def _collect_warnings(
        self,
        score: float,
        prediction_confidence: float,
        per_lesion: List[PerLesionGroundingMetrics],
        border_fraction: float,
    ) -> List[str]:
        warnings: List[str] = []
        s = self._safety

        total_instances = sum(m.instance_count for m in per_lesion)
        min_count = int(s.get("min_lesion_count_for_grounding", 1))

        if total_instances < min_count:
            warnings.append(
                "NO_LESION_CANDIDATES: No lesion candidates were detected by the classical DIP engine. "
                "Grounding score is not meaningful. This does not imply absence of disease."
            )
        elif score < float(s.get("low_grounding_threshold", 30)):
            warnings.append(
                f"INSUFFICIENT_LESION_EVIDENCE: Lesion Grounding Score ({score:.0f}/100) is below "
                f"the minimum threshold ({s.get('low_grounding_threshold', 30)}). "
                "Model attention does not strongly correspond to detected lesion regions."
            )

        if (
            prediction_confidence >= float(s.get("high_confidence_threshold", 0.75))
            and score < float(s.get("low_grounding_threshold", 30))
        ):
            warnings.append(
                f"HIGH_CONFIDENCE_LOW_GROUNDING: Prediction confidence is "
                f"{prediction_confidence*100:.1f}% but the Lesion Grounding Score is only "
                f"{score:.0f}/100. The model is confident but its attention does not align with "
                "detected pathology. Human review is strongly recommended."
            )

        border_thresh = float(self._attn_cfg.get("border_fraction_threshold", 0.40))
        if border_fraction > border_thresh:
            warnings.append(
                f"BORDER_ATTENTION_SHORTCUT: {border_fraction*100:.1f}% of model attention is "
                f"concentrated on image borders (threshold: {border_thresh*100:.0f}%). "
                "This may indicate shortcut learning on image artifacts, black padding, or "
                "non-retinal content. Human review recommended."
            )

        return warnings

    # ── Semantic interpretation ───────────────────────────────────────────────

    def _build_interpretation(
        self,
        score: float,
        label: str,
        per_lesion: List[PerLesionGroundingMetrics],
        attention_distribution: Dict[str, float],
        warnings: List[str],
        predicted_disease: str,
    ) -> str:
        total_instances = sum(m.instance_count for m in per_lesion)

        if total_instances == 0:
            return (
                f"No retinal lesion candidates were detected by the classical DIP engine for the "
                f"predicted condition ({predicted_disease}). The Lesion Grounding Score cannot be "
                "computed meaningfully. This result requires expert ophthalmologist review."
            )

        # Summarize which lesions had strong coverage
        covered = [
            m.lesion_class
            for m in per_lesion
            if m.lesion_coverage >= 0.50 and m.instance_count > 0
        ]
        not_covered = [
            m.lesion_class
            for m in per_lesion
            if m.lesion_coverage < 0.50 and m.instance_count > 0
        ]
        uncovered = [m.lesion_class for m in per_lesion if m.instance_count == 0]

        lines: List[str] = []

        if covered:
            cls_str = " and ".join(c.replace("_", " ") for c in covered)
            lines.append(
                f"Model attention primarily overlaps detected {cls_str} regions "
                f"(coverage ≥50%)."
            )
        if not_covered:
            cls_str = " and ".join(c.replace("_", " ") for c in not_covered)
            lines.append(
                f"Attention coverage was weak for {cls_str} regions."
            )
        if uncovered:
            cls_str = " and ".join(c.replace("_", " ") for c in uncovered)
            lines.append(f"No {cls_str} candidates were detected.")

        other_pct = attention_distribution.get("other", 0.0) * 100
        if other_pct > 40:
            lines.append(
                f"{other_pct:.0f}% of attention falls outside all detected lesion regions, "
                "which may indicate the model is using non-lesion features."
            )

        lines.append(
            f"Overall Lesion Grounding Score: {score:.0f}/100 ({label}). "
            f"These findings are {'consistent with' if score >= 45 else 'weakly consistent with'} "
            f"the predicted condition ({predicted_disease}), but expert review remains necessary."
        )

        if warnings:
            lines.append(
                "⚠ One or more safety warnings are active — see the warnings field for details."
            )

        return " ".join(lines)

    # ── Public API ────────────────────────────────────────────────────────────

    def compute(
        self,
        attention_map: np.ndarray,
        lesion_mask_arrays: Dict[str, np.ndarray],
        lesion_spatial_masks: List[LesionSpatialMask],
        prediction_confidence: float = 0.0,
        predicted_disease: str = "Unknown",
    ) -> LesionGroundingResult:
        """
        Compute the complete Lesion Grounding Result.

        Args:
            attention_map: Normalized H×W float32 Grad-CAM++ map in [0, 1].
            lesion_mask_arrays: Dict of lesion_class → H×W uint8 binary mask.
                                Must be resized to the same H×W as attention_map beforehand.
            lesion_spatial_masks: List of LesionSpatialMask schema objects
                                  (provides per-instance metadata).
            prediction_confidence: Classifier confidence [0–1] for abstention logic.
            predicted_disease: Disease class name for interpretation text.

        Returns:
            LesionGroundingResult with all metrics, score, label, and warnings.
        """
        threshold = float(self._attn_cfg.get("threshold", 0.50))
        attn_h, attn_w = attention_map.shape[:2]

        # Binarize attention
        attn_binary = sm.binarize_attention(attention_map, threshold)

        # Peak attention pixel
        peak_xy = sm.get_attention_peak(attention_map)

        # Build a lookup for spatial masks
        spatial_mask_map: Dict[str, LesionSpatialMask] = {
            m.lesion_class: m for m in lesion_spatial_masks
        }

        # Per-lesion metrics
        per_lesion_metrics: List[PerLesionGroundingMetrics] = []
        for cls in ["microaneurysm", "hemorrhage", "hard_exudate"]:
            lesion_arr = lesion_mask_arrays.get(cls)
            spatial = spatial_mask_map.get(cls)

            if lesion_arr is None or spatial is None:
                # Lesion class missing — report as zero
                per_lesion_metrics.append(
                    PerLesionGroundingMetrics(
                        lesion_class=cls,
                        iou=None,
                        dice=None,
                        lesion_coverage=0.0,
                        attention_coverage=0.0,
                        distance_to_nearest_lesion=None,
                        pointing_game_hit=None,
                        pointing_game_tolerance_px=int(
                            self._attn_cfg.get("pointing_game_tolerance_px", 15)
                        ),
                        instance_count=0,
                        note=f"No {cls} data available for this image.",
                    )
                )
                continue

            # Resize lesion mask to match attention map
            lesion_resized = sm.resize_to_common(lesion_arr, (attn_h, attn_w))
            lesion_binary = sm.binarize_mask(lesion_resized)

            plm = self._compute_per_lesion_metrics(
                lesion_class=cls,
                attention_binary=attn_binary,
                lesion_binary=lesion_binary,
                attention_map=attention_map,
                spatial_mask=spatial,
                peak_xy=peak_xy,
            )
            per_lesion_metrics.append(plm)

        # Attention distribution
        attn_dist = sm.compute_attention_distribution(
            attention_map, lesion_mask_arrays, threshold
        )

        # Border attention
        border_frac = sm.compute_border_attention_fraction(attention_map)

        # Composite score
        score, components = self._score_from_metrics(per_lesion_metrics, attn_dist)

        # Total instance count — check for no-lesion scenario
        total_instances = sum(m.instance_count for m in per_lesion_metrics)
        if total_instances == 0:
            score = 0.0
            components = {k: 0.0 for k in components}

        # Label
        label, color = self._assign_label(score)

        # Warnings
        warnings = self._collect_warnings(
            score, prediction_confidence, per_lesion_metrics, border_frac
        )

        # Semantic interpretation
        interpretation = self._build_interpretation(
            score, label, per_lesion_metrics, attn_dist, warnings, predicted_disease
        )

        return LesionGroundingResult(
            score=round(score, 2),
            label=label,
            label_color=color,
            component_scores=components,
            attention_distribution={k: round(v, 4) for k, v in attn_dist.items()},
            per_lesion_metrics=per_lesion_metrics,
            semantic_interpretation=interpretation,
            warnings=warnings,
            config_version=self.version,
        )
