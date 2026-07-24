# System Architecture Specification — Retinal Disease Screening System

## Overview

This document specifies the technical architecture for the multi-model deep learning ensemble system for retinal fundus-image disease screening.

## Core Principles & Design Boundaries

1. **Strict Data Leakage Prevention**:
   - Subject / Patient group-based splitting (`GroupKFold` / `GroupShuffleSplit`).
   - Out-of-fold predictions for stacking meta-classifiers (`XGBoost`).
   - Normalization statistics and calibration parameters computed strictly on training data.

2. **Explicit Provenance**:
   - Every inference response includes task name, label schema version, model name & version, preprocessing version, quality gate outcome, and calibrated confidence.

3. **Clinical Safety Boundaries**:
   - Automated quality and OOD gate filtering unreadable or non-retinal images.
   - Low confidence (<45%) triggers human-review flag and model abstention.
   - Grad-CAM heatmap visualization explicitly disclaimed as model attention focus, not standalone diagnostic proof.

## Component Specifications

### 1. Image Quality Gate (`ml/quality_gate.py`)
- Evaluates resolution, aspect ratio, Laplacian variance blur score, exposure, and field-of-view ratio.

### 2. Preprocessing & CLAHE (`ml/preprocessing.py`)
- Automatic black border cropping.
- CLAHE contrast enhancement on LAB color space L-channel.
- Resize to 224x224 (or 299x299).
- ImageNet normalization.

### 3. Model Architectures (`ml/models.py`)
- **ResNet50**: 2048-dim feature output.
- **DenseNet121**: 1024-dim feature output.
- **EfficientNetB3**: 1536-dim feature output.
- **Feature Fusion**: 4608-dim concatenation + MLP (`4608 -> 1024 -> 512 -> 256 -> Task Head`).

### 4. FastAPI Service (`backend/app/main.py`)
- `/health`: Health status and device verification.
- `/metadata`: Configuration and schema definitions.
- `/predict`: Image upload, quality validation, inference, and prediction response.
- `/generate-heatmap`: Grad-CAM heatmap overlay generation.

### 5. Next.js Dashboard (`frontend/src/app/page.tsx`)
- TypeScript dashboard with drag-and-drop upload, probability bars, calibrated confidence indicator, human-review banner, and Grad-CAM overlay viewer.
