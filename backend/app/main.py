"""
FastAPI Backend Application for Retinal Disease Screening System.
Exposes /health, /predict, /generate-heatmap, and /metadata endpoints.
"""
import io
import logging
import time
import uuid
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image

from ml.schemas import HeatmapResponse, PredictionResponse
from ml.inference import RetinalInferenceService
from ml.gradcam import generate_gradcam_overlay
from ml.preprocessing import RetinalPreprocessor

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("retinal-backend")

app = FastAPI(
    title="Retinal Ensemble Disease Screening API",
    description="FastAPI Service providing AI inference and Grad-CAM explainability for Retinal Fundus-Image Analysis.",
    version="1.0.0-demo"
)

# Restrictive CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Inference Service instance
inference_service = RetinalInferenceService(model_name="smoke_test")


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
    return {
        "version": "1.0.0",
        "tasks": inference_service.dataset_cfg["tasks"],
        "quality_gate": inference_service.dataset_cfg.get("quality_gate", {}),
        "preprocessor": inference_service.dataset_cfg.get("preprocessing", {})
    }


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
async def predict_retinal_image(
    file: UploadFile = File(...),
    task: str = Form("odir")
):
    """
    Validates uploaded image, passes through Image Quality Gate, runs model inference,
    calculates calibrated confidence, and returns predictions & abstention status.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JPG, JPEG, or PNG image.")

    image_bytes = await file.read()
    if len(image_bytes) > 15 * 1024 * 1024:  # 15MB limit
        raise HTTPException(status_code=400, detail="Uploaded file exceeds 15MB size limit.")

    response = inference_service.predict_image_bytes(image_bytes, task=task)
    return response


@app.post("/generate-heatmap", response_model=HeatmapResponse, tags=["Explainability"])
async def generate_heatmap_endpoint(
    file: UploadFile = File(...),
    target_label: str = Form("Diabetic Retinopathy"),
    task: str = Form("odir")
):
    """
    Runs Grad-CAM explainability pipeline on uploaded image and returns base64
    original image, activation heatmap, and blended visual overlay.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type.")

    image_bytes = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_rgb = np.array(pil_img)
    except Exception:
        raise HTTPException(status_code=400, detail="Corrupt or unreadable image file.")

    task_name = task.lower() if task.lower() in inference_service.dataset_cfg["tasks"] else "odir"
    labels = inference_service.dataset_cfg["tasks"][task_name]["labels"]

    target_idx = 0
    if target_label in labels:
        target_idx = labels.index(target_label)

    model = inference_service.models[task_name]
    preprocessor = RetinalPreprocessor()
    cropped_rgb, tensor = preprocessor.preprocess(img_rgb)

    target_layer = getattr(model, "target_layer", "target_layer")

    _, _, orig_b64, heatmap_b64, overlay_b64 = generate_gradcam_overlay(
        model=model,
        target_layer=target_layer,
        input_tensor=tensor,
        original_rgb=cropped_rgb,
        target_class_idx=target_idx,
        alpha=0.45
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
