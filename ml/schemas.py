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
