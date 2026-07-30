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
