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

from ml.schemas import HeatmapResponse, PredictionResponse, PatientInfo, DIPBiomarkerResult, RestorationResult, ImageQualityMetrics
from ml.inference import RetinalInferenceService
from ml.gradcam import generate_gradcam_overlay
from ml.preprocessing import RetinalPreprocessor
from ml.pdf_report import generate_html_report
from ml.dip_features import RetinalDIPExtractor
from ml.image_restoration import RetinalImageRestorer

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("retinal-backend")

app = FastAPI(
    title="Retinal Ensemble Disease Screening API",
    description="FastAPI Service providing AI inference and Grad-CAM++ explainability for Retinal Fundus-Image Analysis.",
    version="1.0.0-demo"
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

# Initialize Inference Service instance
inference_service = RetinalInferenceService(model_name="smoke_test")

# Initialize DIP Extractor
_dip_extractor = RetinalDIPExtractor(target_size=(512, 512))

# Initialize Image Restorer
_restorer = RetinalImageRestorer()


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

    content = await file.read()
    response = inference_service.predict_image_bytes(content, task=task)
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
    except Exception:
        orig_b64 = None
        overlay_b64 = None

    html_content = generate_html_report(
        prediction_response=pred_dict,
        overlay_base64=overlay_b64,
        original_base64=orig_b64
    )
    return HTMLResponse(content=html_content)

