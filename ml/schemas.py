"""
Pydantic schemas for Retinal Fundus-Image Analysis Pipeline.
Ensures strong typing, contract stability, and explicit provenance.
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class QualityGateResult(BaseModel):
    passed: bool = Field(..., description="Whether image passed quality and OOD checks")
    quality_score: float = Field(..., description="Calculated overall image quality score (0.0 to 1.0)")
    rejection_reason: Optional[str] = Field(None, description="Human-readable rejection reason if passed is False")
    flags: List[str] = Field(default_factory=list, description="Specific quality issue flags detected")
    blur_score: float = Field(..., description="Laplacian variance blur score")
    fov_ratio: float = Field(..., description="Estimated field of view ratio")
    mean_brightness: float = Field(..., description="Mean pixel brightness")


class ClassPrediction(BaseModel):
    label: str
    probability: float
    is_positive: bool = Field(False, description="Whether probability exceeds operating threshold")


class PatientInfo(BaseModel):
    name: Optional[str] = Field(None, description="Patient full name")
    age: Optional[str] = Field(None, description="Patient age")
    gender: Optional[str] = Field(None, description="Patient gender")
    blood_group: Optional[str] = Field(None, description="Patient blood group")
    diabetic_status: Optional[str] = Field(None, description="Patient diabetes history/status")
    hypertension: Optional[str] = Field(None, description="Hypertension status")
    symptoms: Optional[str] = Field(None, description="Visual symptoms reported")


class PredictionResponse(BaseModel):
    request_id: str
    task: str = Field(..., description="Task name: 'odir' (multi-label) or 'aptos' (multiclass)")
    label_schema_version: str = "1.0.0"
    model_name: str
    model_version: str = "1.0.0-demo"
    preprocessing_version: str = "1.0.0"
    quality_gate: QualityGateResult
    predictions: List[ClassPrediction]
    top_prediction: str
    calibrated_confidence: float = Field(..., description="Calibrated prediction confidence score (0.0 to 1.0)")
    abstain: bool = Field(False, description="True if model abstains due to low confidence or quality issues")
    abstention_reason: Optional[str] = Field(None, description="Reason for abstention if abstain is True")
    patient_info: Optional[PatientInfo] = Field(None, description="Patient medical background information")
    dip_biomarkers: Optional["DIPBiomarkerResult"] = Field(None, description="Classical DIP structural biomarker results")
    disclaimer: str = Field(
        "For research and educational screening support only. Not clinically validated for diagnostic or treatment decisions.",
        description="Clinical safety boundary disclaimer"
    )


class DIPBiomarkerResult(BaseModel):
    """Classical DIP structural biomarker results for Feature 1."""
    vessel_density_index: float = Field(..., description="Ratio of vessel pixels to FOV pixels (0.0–1.0)")
    microaneurysm_candidate_count: int = Field(..., description="Estimated microaneurysm / haemorrhage blob count")
    exudate_candidate_count: int = Field(..., description="Estimated exudate candidate blob count")
    exudate_area_ratio: float = Field(..., description="Exudate pixel area / total image pixels (0.0–1.0)")
    optic_disc_found: bool = Field(..., description="Whether optic disc candidate was detected")
    optic_disc_bbox: Optional[List[int]] = Field(None, description="Optic disc bounding box [x, y, w, h]")
    macula_center: Optional[List[int]] = Field(None, description="Estimated macula fovea center [x, y]")
    anatomy_overlay_base64: Optional[str] = Field(None, description="Annotated anatomy overlay PNG (base64)")
    vessel_mask_base64: Optional[str] = Field(None, description="Binary vessel segmentation mask PNG (base64)")
    lesion_mask_base64: Optional[str] = Field(None, description="Binary lesion candidate mask PNG (base64)")


class ImageQualityMetrics(BaseModel):
    """Per-image quality measurements used by the restoration engine."""
    blur_score: float = Field(..., description="Laplacian variance blur score (higher = sharper)")
    brightness: float = Field(..., description="Mean pixel brightness (0–255)")
    contrast: float = Field(..., description="Pixel intensity standard deviation")
    fov_ratio: float = Field(..., description="Fraction of pixels belonging to retinal FOV")
    has_noise: bool = Field(..., description="Whether salt-and-pepper noise was detected")


class RestorationResult(BaseModel):
    """Feature 2: Adaptive image restoration result."""
    quality_score_before: float = Field(..., description="Composite image quality score before restoration (0.0–1.0)")
    quality_score_after: float = Field(..., description="Composite image quality score after restoration (0.0–1.0)")
    quality_improved: bool = Field(..., description="Whether restoration improved the quality score")
    steps_applied: List[str] = Field(default_factory=list, description="List of restoration steps applied")
    quality_before: ImageQualityMetrics = Field(..., description="Raw quality metrics before restoration")
    quality_after: ImageQualityMetrics = Field(..., description="Raw quality metrics after restoration")
    original_image_base64: Optional[str] = Field(None, description="Original image PNG (base64)")
    restored_image_base64: Optional[str] = Field(None, description="Restored image PNG (base64)")


class SubScores(BaseModel):
    """Individual risk component scores (0–100 each)."""
    vessel_density_risk: float = Field(..., description="Vessel density sub-risk score")
    lesion_risk: float = Field(..., description="Microaneurysm/haemorrhage sub-risk score")
    exudate_risk: float = Field(..., description="Exudate sub-risk score")
    ml_confidence_risk: float = Field(..., description="ML model confidence sub-risk score")
    anatomy_risk: float = Field(..., description="Anatomical structure detection sub-risk score")


class ClinicalRiskResult(BaseModel):
    """Feature 3: DIP-guided clinical risk score and severity grading."""
    risk_score: float = Field(..., description="Composite clinical risk score (0.0–100.0)")
    severity_grade: str = Field(..., description="ICDR-inspired severity grade (e.g., 'Mild NPDR')")
    risk_level: str = Field(..., description="Human-readable risk level (e.g., 'Moderate Risk')")
    risk_color: str = Field(..., description="Hex color for risk display (e.g., '#ef4444')")
    sub_scores: SubScores = Field(..., description="Per-component risk sub-scores")
    interpretations: List[str] = Field(default_factory=list, description="Per-biomarker clinical interpretations")
    recommendations: List[str] = Field(default_factory=list, description="Clinical action recommendations")
    next_checkup_date: Optional[str] = Field(None, description="Recommended next check-up date (e.g. 'October 29, 2026')")
    followup_interval: Optional[str] = Field(None, description="Recommended follow-up interval (e.g. '6 Months')")


class BiomarkerDeltas(BaseModel):
    """Changes between baseline and follow-up DIP biomarkers."""
    delta_vessel_density_index: float = Field(..., description="Change in Vessel Density Index")
    delta_microaneurysm_count: int = Field(..., description="Change in Microaneurysm candidate count")
    delta_exudate_count: int = Field(..., description="Change in Exudate candidate count")
    delta_exudate_area_ratio: float = Field(..., description="Change in Exudate area ratio")
    delta_risk_score: float = Field(..., description="Change in Clinical Risk Score")
    trajectory: str = Field(..., description="Classification: e.g. 'Stable / Unchanged', 'Mild Progression'")
    trajectory_color: str = Field(..., description="Hex color for UI display")
    badge_text: str = Field(..., description="Badge text for UI display")
    baseline_risk_score: float = Field(..., description="Baseline risk score")
    followup_risk_score: float = Field(..., description="Follow-up risk score")
    baseline_severity: str = Field(..., description="Baseline severity grade")
    followup_severity: str = Field(..., description="Follow-up severity grade")


class ProgressionAnalysisResult(BaseModel):
    """Feature 5: Serial image comparison and progression tracker result."""
    deltas: BiomarkerDeltas = Field(..., description="Biomarker delta metrics")
    baseline_biomarkers: DIPBiomarkerResult = Field(..., description="Full DIP biomarkers for baseline scan")
    followup_biomarkers: DIPBiomarkerResult = Field(..., description="Full DIP biomarkers for follow-up scan")
    baseline_risk: ClinicalRiskResult = Field(..., description="Clinical risk assessment for baseline scan")
    followup_risk: ClinicalRiskResult = Field(..., description="Clinical risk assessment for follow-up scan")
    difference_map_base64: str = Field(..., description="Color-coded structural difference map PNG (base64)")
    recommendations: List[str] = Field(default_factory=list, description="Clinical action recommendations")


class HeatmapResponse(BaseModel):

    request_id: str
    target_label: str
    architecture: str
    target_layer: str
    original_image_base64: str
    heatmap_base64: str
    overlay_base64: str
    disclaimer: str = Field(
        "Grad-CAM visual attention highlight shows model feature focus. It is not clinical evidence of pathology.",
        description="XAI safety disclaimer"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Multi-Task Learning (MTL) Schemas for RetinaGuard++ (Contribution #1)
# ─────────────────────────────────────────────────────────────────────────────

class AIQualityAssessment(BaseModel):
    """Head 3 Output: Deep Image Quality Assessment."""
    blur_score: float = Field(..., description="Predicted sharpness / blur score (0.0 to 1.0)")
    exposure_score: float = Field(..., description="Predicted illumination exposure score (0.0 to 1.0)")
    illumination_score: float = Field(..., description="Predicted uniformity score (0.0 to 1.0)")
    focus_score: float = Field(..., description="Predicted focus score (0.0 to 1.0)")
    overall_quality_score: float = Field(..., description="Composite AI quality score (0.0 to 1.0)")
    passed: bool = Field(..., description="Whether image meets quality criteria")


class AIBiomarkerRegression(BaseModel):
    """Head 4 Output: Continuous Retinal Biomarker Regression."""
    vessel_density_index: float = Field(..., description="Predicted vessel density ratio (0.0 to 0.5)")
    microaneurysm_count: int = Field(..., description="Predicted microaneurysm candidate count")
    exudate_area_ratio: float = Field(..., description="Predicted exudate area ratio")
    cup_to_disc_ratio: float = Field(..., description="Predicted optic cup-to-disc ratio (CDR)")
    vessel_tortuosity: float = Field(..., description="Predicted vessel tortuosity index")
    optic_disc_radius: float = Field(..., description="Predicted optic disc radius (pixels)")


class DRGradePrediction(BaseModel):
    """Head 2 Output: DR ICDR Severity Grade."""
    grade: int = Field(..., description="Severity grade (0 to 4)")
    grade_name: str = Field(..., description="ICDR Grade Name (e.g. 'Moderate NPDR')")
    probabilities: List[float] = Field(..., description="Softmax probabilities for grades 0-4")


class MultiTaskOutputs(BaseModel):
    """Container for all 5 prediction heads from a single forward pass."""
    disease_screening: List[ClassPrediction] = Field(..., description="Head 1: Multi-disease predictions")
    dr_severity: DRGradePrediction = Field(..., description="Head 2: ICDR DR severity grade")
    ai_quality: AIQualityAssessment = Field(..., description="Head 3: Deep image quality assessment")
    ai_biomarkers: AIBiomarkerRegression = Field(..., description="Head 4: Biomarker regression estimates")
    predicted_risk_score: float = Field(..., description="Head 5: Continuous clinical risk score (0-100)")


class MultiTaskPredictionResponse(BaseModel):
    """Unified Single-Pass Multi-Task Response for RetinaGuard++."""
    request_id: str
    architecture: str = "MultiTask-EfficientNet-B3"
    version: str = "2.0.0-multitask"
    quality_gate: QualityGateResult
    multitask_outputs: MultiTaskOutputs
    dip_biomarkers: Optional[DIPBiomarkerResult] = None
    clinical_risk: Optional[ClinicalRiskResult] = None
    patient_info: Optional[PatientInfo] = None
    disclaimer: str = Field(
        "Single-pass Multi-Task research prediction. Not clinically validated for sole diagnostic decisions.",
        description="Clinical safety boundary disclaimer"
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Lesion-Level Semantic Explainability Schemas (Research Contribution)
# ─────────────────────────────────────────────────────────────────────────────

class LesionInstance(BaseModel):
    """Spatial metadata for a single detected lesion connected component."""
    centroid_x: int = Field(..., description="Centroid X coordinate in image pixel space")
    centroid_y: int = Field(..., description="Centroid Y coordinate in image pixel space")
    bbox: List[int] = Field(..., description="Bounding box [x, y, w, h] in pixel coordinates")
    pixel_area: int = Field(..., description="Total pixel area of this connected component")
    detection_confidence: float = Field(
        ...,
        description=(
            "Detection confidence [0.0–1.0]. "
            "Set to 0.0 for classical DIP candidates (no probabilistic model used). "
            "Values >0 indicate a trained detector was used."
        )
    )
    severity_index: Optional[float] = Field(
        None,
        description="Optional per-instance severity metric (e.g., relative intensity, future use)"
    )


class LesionSpatialMask(BaseModel):
    """
    Full spatial description for all detected instances of one lesion class.

    IMPORTANT: Binary mask arrays are NOT stored in this schema (too large for API transport).
    The mask_shape field records dimensions for client-side reconstruction if needed.
    Actual mask arrays are handled in-memory within the ML pipeline.
    """
    lesion_class: str = Field(
        ...,
        description="Lesion class identifier: 'microaneurysm' | 'hemorrhage' | 'hard_exudate'"
    )
    source: str = Field(
        ...,
        description=(
            "Provenance of this mask. "
            "'classical_dip' = algorithmic candidate (Black Top-Hat / CIE LAB). "
            "'expert_annotation' = human-validated ground truth. "
            "'dl_model' = trained deep-learning detector."
        )
    )
    mask_shape: List[int] = Field(..., description="[H, W] of the binary mask array")
    instance_count: int = Field(..., description="Total number of detected connected components")
    instances: List[LesionInstance] = Field(
        default_factory=list,
        description="Per-instance spatial metadata (centroid, bbox, area)"
    )
    total_pixel_area: int = Field(..., description="Sum of all instance pixel areas")
    area_ratio: float = Field(
        ...,
        description="total_pixel_area / (H * W) — fraction of image covered by this lesion class"
    )
    detection_note: str = Field(
        ...,
        description="Human-readable note about detection reliability and source limitations"
    )


class AttentionMap(BaseModel):
    """
    Normalized Grad-CAM++ attention map metadata for one forward pass.

    The raw float32 map is handled in-memory. This schema carries the
    derived summary statistics and visualization outputs.
    """
    method: str = Field("gradcam_plusplus", description="XAI method used")
    target_class: str = Field(..., description="Disease class for which attention was generated")
    target_class_idx: int = Field(..., description="Class index into the model output vector")
    map_shape: List[int] = Field(..., description="[H, W] of the attention map")
    attention_threshold: float = Field(
        ...,
        description="Threshold applied to binarize the normalized map for spatial matching"
    )
    high_attention_pixel_count: int = Field(
        ...,
        description="Number of pixels exceeding the attention threshold"
    )
    peak_attention_x: int = Field(..., description="X coordinate of the maximum attention pixel")
    peak_attention_y: int = Field(..., description="Y coordinate of the maximum attention pixel")
    overlay_base64: str = Field(..., description="Grad-CAM++ overlay PNG (base64)")
    heatmap_base64: str = Field(..., description="Grad-CAM++ heatmap PNG (base64)")
    original_base64: str = Field(..., description="Original fundus image PNG (base64)")
    disclaimer: str = Field(
        "Grad-CAM++ attention highlights model feature sensitivity, not proven lesion location. "
        "Attention maps are spatially coarse and should not be interpreted as pixel-level diagnoses.",
        description="XAI safety disclaimer"
    )


class PerLesionGroundingMetrics(BaseModel):
    """
    Spatial agreement metrics between Grad-CAM++ attention and one lesion class.

    Metrics are computed only when both an attention mask and a lesion mask are available.
    Optional fields are None when computation is not applicable (e.g., no lesions detected).
    """
    lesion_class: str = Field(..., description="Lesion class these metrics describe")
    iou: Optional[float] = Field(
        None,
        description="Intersection over Union between binarized attention and lesion mask. "
                    "Unreliable for tiny lesions (<50px); see distance_to_nearest_lesion instead."
    )
    dice: Optional[float] = Field(
        None,
        description="Dice coefficient (2*|G∩L|)/(|G|+|L|) between attention and lesion mask"
    )
    lesion_coverage: float = Field(
        ...,
        description="Fraction [0–1] of detected lesion pixels that fall within the high-attention region"
    )
    attention_coverage: float = Field(
        ...,
        description="Fraction [0–1] of high-attention pixels that overlap with the lesion mask"
    )
    distance_to_nearest_lesion: Optional[float] = Field(
        None,
        description="Euclidean distance (px) from the attention peak to the nearest lesion centroid. "
                    "Useful for tiny lesions where IoU is near-zero by construction."
    )
    pointing_game_hit: Optional[bool] = Field(
        None,
        description="True if peak attention pixel falls within any lesion bounding box ± tolerance_px"
    )
    pointing_game_tolerance_px: int = Field(
        ...,
        description="Tolerance in pixels applied to pointing-game evaluation"
    )
    instance_count: int = Field(..., description="Number of detected lesion instances for this class")
    note: str = Field(..., description="Human-readable interpretation of these metrics")


class LesionGroundingResult(BaseModel):
    """
    Transparent, configurable Lesion Grounding Score measuring how well
    model attention corresponds to detected pathological structures.

    IMPORTANT DISTINCTION:
    - prediction_confidence: classifier certainty about the disease prediction
    - grounding_score: spatial overlap between attention and detected lesions

    These are independent. A high grounding score does NOT prove clinical correctness.
    """
    score: float = Field(..., description="Lesion Grounding Score [0–100]")
    label: str = Field(
        ...,
        description="Interpretable label: 'Strong anatomical agreement' | 'Moderate agreement' | "
                    "'Weak agreement' | 'Insufficient evidence'"
    )
    label_color: str = Field(..., description="Hex color for dashboard display")
    component_scores: Dict[str, float] = Field(
        default_factory=dict,
        description="Per-component weighted scores contributing to the final score"
    )
    attention_distribution: Dict[str, float] = Field(
        default_factory=dict,
        description="Fraction of total attention mass associated with each region "
                    "(microaneurysm, hemorrhage, hard_exudate, vessels, optic_disc, other)"
    )
    per_lesion_metrics: List[PerLesionGroundingMetrics] = Field(
        default_factory=list,
        description="Full spatial metrics for each evaluated lesion class"
    )
    semantic_interpretation: str = Field(
        ...,
        description="Auto-generated human-readable explanation of the grounding result"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description=(
            "Safety flags that require attention: "
            "HIGH_CONFIDENCE_LOW_GROUNDING | NO_LESION_CANDIDATES | "
            "INSUFFICIENT_LESION_EVIDENCE | BORDER_ATTENTION_SHORTCUT"
        )
    )
    config_version: str = Field(..., description="Version of lesion_grounding_config.json used")
    disclaimer: str = Field(
        "The Lesion Grounding Score is a research metric. It does not constitute clinical validation "
        "or proof of diagnostic correctness. Expert review is always required.",
        description="Research safety disclaimer"
    )


class SemanticExplainabilityResult(BaseModel):
    """
    Complete output of the Lesion-Level Semantic Explainability pipeline.

    Combines disease prediction, Grad-CAM++ attention, spatial lesion detection,
    and lesion grounding into a single typed response suitable for dashboard
    display and PDF report integration.
    """
    request_id: str
    predicted_disease: str = Field(..., description="Top predicted disease class")
    prediction_confidence: float = Field(
        ...,
        description="Classifier confidence [0–1] for the predicted disease (independent of grounding)"
    )
    quality_gate: QualityGateResult
    attention_map: AttentionMap
    lesion_masks: List[LesionSpatialMask] = Field(
        default_factory=list,
        description="Spatial lesion masks for all evaluated lesion classes"
    )
    grounding_result: LesionGroundingResult
    safety_flags: List[str] = Field(
        default_factory=list,
        description="All active safety flags from quality gate, abstention, and explainability checks"
    )
    abstain: bool = Field(
        False,
        description="True if the system recommends human review before acting on this result"
    )
    abstention_reason: Optional[str] = Field(
        None,
        description="Human-readable reason for abstention if abstain=True"
    )
    combined_overlay_base64: Optional[str] = Field(
        None,
        description=(
            "Combined visualization: original fundus + Grad-CAM++ heatmap + lesion masks overlaid. "
            "Lesion colors: microaneurysms=red, hemorrhages=darkred, hard_exudates=yellow, "
            "vessels=green. Attention contour in white."
        )
    )
    disclaimer: str = Field(
        "For research and educational screening support only. Not clinically validated. "
        "Lesion candidates are algorithmic approximations. Expert ophthalmologist review required.",
        description="Full clinical and research safety disclaimer"
    )
    limitations: List[str] = Field(
        default_factory=list,
        description="Known limitations of this result loaded from configuration"
    )
