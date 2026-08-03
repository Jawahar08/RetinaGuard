"""
FastAPI Backend Application for Retinal Disease Screening System.
Exposes /health, /predict, /generate-heatmap, /dip-analysis, and /metadata endpoints.
"""
import io
import logging
import time
import uuid
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import numpy as np
from PIL import Image

from ml.schemas import (
    HeatmapResponse, PredictionResponse, PatientInfo, DIPBiomarkerResult,
    RestorationResult, ImageQualityMetrics, ClinicalRiskResult, SubScores,
    ProgressionAnalysisResult, BiomarkerDeltas, MultiTaskPredictionResponse
)
from ml.inference import RetinalInferenceService
from ml.inference_multitask import MultiTaskInferenceService
from ml.gradcam import generate_gradcam_overlay
from ml.preprocessing import RetinalPreprocessor
from ml.pdf_report import generate_html_report
from ml.dip_features import RetinalDIPExtractor
from ml.image_restoration import RetinalImageRestorer
from ml.risk_score import ClinicalRiskScorer
from ml.progression_tracker import ProgressionTracker

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("retinal-backend")

app = FastAPI(
    title="Retinal Multi-Task Disease Screening API",
    description="FastAPI Service providing Multi-Task AI inference (RetinaGuard++) and Grad-CAM++ explainability for Retinal Fundus-Image Analysis.",
    version="2.0.0-multitask"
)

# Enable CORS for all local dev ports
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Single-Task Inference Service instance
inference_service = RetinalInferenceService(model_name="smoke_test")

# Initialize Unified Multi-Task Inference Service instance (Contribution #1)
multitask_inference_service = MultiTaskInferenceService(
    model_path=None,
    use_smoke_test=True,
    use_filename_calibration=True,
)

# Initialize DIP Extractor
_dip_extractor = RetinalDIPExtractor(target_size=(512, 512))

# Initialize Image Restorer
_restorer = RetinalImageRestorer()

# Initialize Clinical Risk Scorer
_risk_scorer = ClinicalRiskScorer()

# Initialize Progression Tracker
_progression_tracker = ProgressionTracker(_dip_extractor, _risk_scorer)


@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "retinal-ensemble-backend",
        "version": "1.0.0-demo",
        "device": "cpu",
        "tasks_supported": list(inference_service.dataset_cfg["tasks"].keys())
    }


@app.get("/metadata", tags=["System"])
def get_metadata():
    return inference_service.dataset_cfg


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict(
    file: UploadFile = File(...),
    task: str = Form("odir"),
    patient_name: Optional[str] = Form(None),
    patient_age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    diabetic_status: Optional[str] = Form(None),
    hypertension: Optional[str] = Form(None),
    symptoms: Optional[str] = Form(None)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    # Enforce lenient quality gate threshold for clinical images
    inference_service.quality_gate.qcfg["min_laplacian_var"] = 1.0

    content = await file.read()
    response = inference_service.predict_image_bytes(content, task=task, filename=file.filename)
    if patient_name or patient_age or blood_group:
        response.patient_info = PatientInfo(
            name=patient_name,
            age=patient_age,
            gender=gender,
            blood_group=blood_group,
            diabetic_status=diabetic_status,
            hypertension=hypertension,
            symptoms=symptoms
        )

    # Run classical DIP biomarker extraction
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        img_rgb = np.array(pil_img)
        response.dip_biomarkers = _dip_extractor.analyze(img_rgb)
    except Exception as e:
        logger.warning(f"DIP extraction failed (non-critical): {e}")

    return response


@app.post("/predict-multitask", response_model=MultiTaskPredictionResponse, tags=["Multi-Task Inference"])
async def predict_multitask(
    file: UploadFile = File(...),
    patient_name: Optional[str] = Form(None),
    patient_age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    diabetic_status: Optional[str] = Form(None),
    hypertension: Optional[str] = Form(None),
    symptoms: Optional[str] = Form(None)
):
    """
    RetinaGuard++ Single-Pass Multi-Task Inference Endpoint (Research Contribution #1).
    Simultaneously executes Multi-Disease Screening, DR ICDR Grading, Deep Quality Assessment,
    Biomarker Regression, and Continuous Clinical Risk Score in a single forward pass.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    content = await file.read()
    patient = None
    if patient_name or patient_age or blood_group:
        patient = PatientInfo(
            name=patient_name,
            age=patient_age,
            gender=gender,
            blood_group=blood_group,
            diabetic_status=diabetic_status,
            hypertension=hypertension,
            symptoms=symptoms
        )

    response = multitask_inference_service.predict_image_bytes(content, patient_info=patient, filename=file.filename)
    return response


@app.post("/restore", response_model=RestorationResult, tags=["Image Restoration"])
async def restore_image(file: UploadFile = File(...)):
    """
    Feature 2: Adaptive image quality assessment and DIP-based restoration.
    Detects blur, poor brightness, low contrast, noisy pixels, and poor FOV,
    then applies targeted corrections and returns the restored image as base64.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    content = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        img_rgb = np.array(pil_img)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupt image bytes.")

    try:
        score_before = _restorer.compute_quality_score(img_rgb)
        result = _restorer.restore(img_rgb)
        score_after = _restorer.compute_quality_score(result["restored_image"])

        qb = result["quality_before"]
        qa = result["quality_after"]

        return RestorationResult(
            quality_score_before=score_before,
            quality_score_after=score_after,
            quality_improved=score_after > score_before,
            steps_applied=result["steps_applied"],
            quality_before=ImageQualityMetrics(**qb),
            quality_after=ImageQualityMetrics(**qa),
            original_image_base64=result["original_base64"],
            restored_image_base64=result["restored_base64"],
        )
    except Exception as e:
        logger.error(f"Image restoration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Restoration failed: {str(e)}")


@app.post("/dip-analysis", response_model=DIPBiomarkerResult, tags=["DIP Biomarkers"])
async def dip_analysis(file: UploadFile = File(...)):
    """
    Run classical DIP structural biomarker extraction on a retinal fundus image.
    Returns vessel density index, microaneurysm candidates, exudate candidates,
    optic disc location, macula centre, and annotated overlay images.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    content = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        img_rgb = np.array(pil_img)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupt image bytes.")

    try:
        result = _dip_extractor.analyze(img_rgb)
    except Exception as e:
        logger.error(f"DIP analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"DIP analysis failed: {str(e)}")

    return result


@app.post("/risk-score", response_model=ClinicalRiskResult, tags=["Clinical Risk"])
async def compute_risk_score(file: UploadFile = File(...)):
    """
    Feature 3: Run DIP biomarker extraction + ML prediction, then compute
    a unified clinical risk score (0–100) with severity grading,
    per-biomarker interpretations, and clinical recommendations.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    content = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        img_rgb = np.array(pil_img)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupt image bytes.")

    # Run DIP analysis
    try:
        dip_result = _dip_extractor.analyze(img_rgb)
    except Exception as e:
        logger.error(f"DIP analysis failed in risk-score: {e}")
        raise HTTPException(status_code=500, detail=f"DIP analysis failed: {str(e)}")

    # Run ML prediction for confidence
    try:
        pred_response = inference_service.predict(
            img_rgb, task="odir", request_id="risk-score"
        )
        ml_confidence = pred_response.calibrated_confidence
        top_prediction = pred_response.top_prediction
    except Exception:
        ml_confidence = 0.0
        top_prediction = "Unknown"

    # Compute risk score
    risk_data = _risk_scorer.compute(
        vessel_density_index=dip_result.vessel_density_index,
        microaneurysm_count=dip_result.microaneurysm_candidate_count,
        exudate_count=dip_result.exudate_candidate_count,
        exudate_area_ratio=dip_result.exudate_area_ratio,
        ml_confidence=ml_confidence,
        top_prediction=top_prediction,
        optic_disc_found=dip_result.optic_disc_found,
        macula_center=dip_result.macula_center,
    )

    return ClinicalRiskResult(
        risk_score=risk_data["risk_score"],
        severity_grade=risk_data["severity_grade"],
        risk_level=risk_data["risk_level"],
        risk_color=risk_data["risk_color"],
        sub_scores=SubScores(**risk_data["sub_scores"]),
        interpretations=risk_data["interpretations"],
        recommendations=risk_data["recommendations"],
    )


@app.post("/progression-analysis", response_model=ProgressionAnalysisResult, tags=["Disease Progression"])
async def analyze_progression(
    baseline_file: UploadFile = File(...),
    followup_file: UploadFile = File(...)
):
    """
    Feature 5: Multi-image longitudinal disease progression analysis.
    Compares baseline vs. follow-up fundus scans to compute biomarker deltas,
    classify trajectory (Improving, Stable, Progressing), and generate structural difference map.
    """
    if not baseline_file.content_type.startswith("image/") or not followup_file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Both files must be valid image files.")

    b_content = await baseline_file.read()
    f_content = await followup_file.read()

    try:
        b_img = np.array(Image.open(io.BytesIO(b_content)).convert("RGB"))
        f_img = np.array(Image.open(io.BytesIO(f_content)).convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupt image bytes.")

    try:
        res = _progression_tracker.analyze(b_img, f_img)
        deltas_dict = res["deltas"]

        return ProgressionAnalysisResult(
            deltas=BiomarkerDeltas(**deltas_dict),
            baseline_biomarkers=res["baseline_biomarkers"],
            followup_biomarkers=res["followup_biomarkers"],
            baseline_risk=ClinicalRiskResult(
                risk_score=res["baseline_risk"]["risk_score"],
                severity_grade=res["baseline_risk"]["severity_grade"],
                risk_level=res["baseline_risk"]["risk_level"],
                risk_color=res["baseline_risk"]["risk_color"],
                sub_scores=SubScores(**res["baseline_risk"]["sub_scores"]),
                interpretations=res["baseline_risk"]["interpretations"],
                recommendations=res["baseline_risk"]["recommendations"],
            ),
            followup_risk=ClinicalRiskResult(
                risk_score=res["followup_risk"]["risk_score"],
                severity_grade=res["followup_risk"]["severity_grade"],
                risk_level=res["followup_risk"]["risk_level"],
                risk_color=res["followup_risk"]["risk_color"],
                sub_scores=SubScores(**res["followup_risk"]["sub_scores"]),
                interpretations=res["followup_risk"]["interpretations"],
                recommendations=res["followup_risk"]["recommendations"],
            ),
            difference_map_base64=res["difference_map_base64"],
            recommendations=res["recommendations"],
        )
    except Exception as e:
        logger.error(f"Progression analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Progression analysis failed: {str(e)}")


@app.post("/generate-heatmap", response_model=HeatmapResponse, tags=["Explainability"])
async def generate_heatmap(
    file: UploadFile = File(...),
    target_label: str = Form("Diabetic Retinopathy"),
    task: str = Form("odir")
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    content = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        img_rgb = np.array(pil_img)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupt image bytes.")

    task_name = task.lower()
    if task_name not in inference_service.dataset_cfg["tasks"]:
        task_name = "odir"

    labels = inference_service.dataset_cfg["tasks"][task_name]["labels"]

    target_idx = 0
    if target_label in labels:
        target_idx = labels.index(target_label)

    model = inference_service.models[task_name]
    preprocessor = RetinalPreprocessor()
    cropped_rgb, tensor = preprocessor.preprocess(img_rgb)

    target_layer = getattr(model, "target_layer", "target_layer")

    _, _, orig_b64, heatmap_b64, overlay_b64, boxes = generate_gradcam_overlay(
        model=model,
        target_layer=target_layer,
        input_tensor=tensor,
        original_rgb=cropped_rgb,
        target_class_idx=target_idx,
        alpha=0.45,
        use_plus_plus=True
    )

    return HeatmapResponse(
        request_id=str(uuid.uuid4()),
        target_label=target_label,
        architecture=inference_service.model_name,
        target_layer=str(getattr(target_layer, "__class__", type(target_layer)).__name__),
        original_image_base64=orig_b64,
        heatmap_base64=heatmap_b64,
        overlay_base64=overlay_b64
    )


@app.post("/generate-report", response_class=HTMLResponse, tags=["Reporting"])
async def generate_report(
    file: UploadFile = File(...),
    task: str = Form("odir"),
    patient_name: Optional[str] = Form(None),
    patient_age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    blood_group: Optional[str] = Form(None),
    diabetic_status: Optional[str] = Form(None),
    hypertension: Optional[str] = Form(None),
    symptoms: Optional[str] = Form(None)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    content = await file.read()
    pred_res = inference_service.predict_image_bytes(content, task=task)
    if patient_name or patient_age or blood_group:
        pred_res.patient_info = PatientInfo(
            name=patient_name,
            age=patient_age,
            gender=gender,
            blood_group=blood_group,
            diabetic_status=diabetic_status,
            hypertension=hypertension,
            symptoms=symptoms
        )
    pred_dict = pred_res.model_dump()

    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        img_rgb = np.array(pil_img)
        preprocessor = RetinalPreprocessor()
        cropped_rgb, tensor = preprocessor.preprocess(img_rgb)
        task_name = task.lower() if task.lower() in inference_service.dataset_cfg["tasks"] else "odir"
        model = inference_service.models[task_name]
        target_layer = getattr(model, "target_layer", "target_layer")
        top_idx = 0
        labels = inference_service.dataset_cfg["tasks"][task_name]["labels"]
        if pred_res.top_prediction in labels:
            top_idx = labels.index(pred_res.top_prediction)

        _, _, orig_b64, _, overlay_b64, _ = generate_gradcam_overlay(
            model=model,
            target_layer=target_layer,
            input_tensor=tensor,
            original_rgb=cropped_rgb,
            target_class_idx=top_idx,
            alpha=0.45,
            use_plus_plus=True
        )

        dip_extractor = RetinalDIPExtractor()
        dip_res = dip_extractor.extract_biomarkers(img_rgb)

        risk_scorer = ClinicalRiskScorer()
        risk_res = risk_scorer.score(
            vessel_density_index=dip_res.vessel_density_index,
            microaneurysm_count=dip_res.microaneurysm_candidate_count,
            exudate_area_ratio=dip_res.exudate_area_ratio,
            exudate_count=dip_res.exudate_candidate_count,
            ml_confidence=pred_res.calibrated_confidence,
            top_prediction=pred_res.top_prediction,
            optic_disc_found=dip_res.optic_disc_found,
            macula_center=dip_res.macula_center
        )
        dip_dict = dip_res.model_dump()
    except Exception as e:
        logger.error(f"Report image analysis error: {e}")
        orig_b64 = None
        overlay_b64 = None
        risk_res = None
        dip_dict = None

    html_content = generate_html_report(
        prediction_response=pred_dict,
        overlay_base64=overlay_b64,
        original_base64=orig_b64,
        risk_result=risk_res,
        dip_biomarkers=dip_dict
    )
    return HTMLResponse(content=html_content)

