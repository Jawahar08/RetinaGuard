# 👁️ RetinaGuard: Enhanced Ensemble Deep Learning & Digital Image Processing (DIP) System for Retinal Disease Screening

> **Project Documentation** — *Full Technical Blueprint, Architecture, Feature Specifications, and Execution Guide (From Scratch to Current State)*  
> **Branch**: `shriram`  
> **Repository**: `https://github.com/Jawahar08/RetinaGuard.git`  
> **Current Date**: July 28, 2026  

---

> [!IMPORTANT]
> **Non-Clinical Research & Educational System Disclaimer**:  
> RetinaGuard is strictly an educational, scientific research, and decision-support demonstration system. It is not clinically validated by FDA/CE or intended for direct diagnostic or treatment decisions. All predictions, risk scores, and visual overlays must be evaluated by a certified medical professional (ophthalmologist/retina specialist).

---

## 📋 Table of Contents
1. [Executive Summary & Evolution Timeline](#1-executive-summary--evolution-timeline)
2. [System Architecture & Data Pipeline](#2-system-architecture--data-pipeline)
3. [Deep Learning Model Ensemble Suite](#3-deep-learning-model-ensemble-suite)
4. [Classical Digital Image Processing (DIP) Biomarker Suite (Feature 1)](#4-classical-digital-image-processing-dip-biomarker-suite-feature-1)
5. [Adaptive Quality Gate & DIP Restoration Engine (Feature 2)](#5-adaptive-quality-gate--dip-restoration-engine-feature-2)
6. [DIP-Guided Risk Scoring, Severity Grading & PDF Reports (Feature 3)](#6-dip-guided-risk-scoring-severity-grading--pdf-reports-feature-3)
7. [Interactive Next.js Dashboard & DIP Explorer (Feature 4)](#7-interactive-nextjs-dashboard--dip-explorer-feature-4)
8. [Backend API Specifications](#8-backend-api-specifications)
9. [Step-by-Step Local Setup & Execution Guide](#9-step-by-step-local-setup--execution-guide)
10. [Git Version Control & Commit Log](#10-git-version-control--commit-log)

---

## 1. 🚀 Executive Summary & Evolution Timeline

RetinaGuard was designed and constructed from the ground up as an end-to-end, production-shaped deep learning and computer vision framework for automated retinal fundus-image screening. 

### 📜 Evolution from Scratch to Present

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Phase 1: Foundation & Baseline Deep Learning Architecture                        │
│  - PyTorch multi-model factory (ResNet50, DenseNet121, EfficientNetB3)           │
│  - Feature fusion MLP (4608-d concatenated embeddings)                           │
│  - Baseline FastAPI inference server & Next.js UI boilerplate                     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Phase 2: Feature 1 — Classical DIP Biomarker Extraction Suite (`dip_features.py`)│
│  - Frangi vesselness filtering & vessel density metric                           │
│  - Hough Transform optic disc & cup segmentation (Cup-to-Disc Ratio calculation) │
│  - Color space lesion detection (L*a*b* / HSV exudate mapping)                    │
│  - Vessel tortuosity & Artery-to-Vein (A/V) ratio estimators                      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Phase 3: Feature 2 — Adaptive Quality Gate & DIP Restoration (`quality_gate.py`) │
│  - Laplacian variance blur detection & exposure/contrast verification            │
│  - Background illumination correction via morphological filtering                │
│  - CLAHE adaptive histogram equalization & bilateral noise reduction             │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Phase 4: Feature 3 — Clinical Risk Engine & Automated PDF Reports (`pdf_report.py`)│
│  - Multi-task risk score synthesis (DIP structural metrics + DL probabilities)   │
│  - Disease severity grading (Normal, Mild, Moderate, Severe, Proliferative DR)   │
│  - High-resolution HTML/WeasyPrint PDF report generation with patient intake form │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Phase 5: Feature 4 — Next.js DIP Explorer Dashboard (`DIPExplorer.tsx`)          │
│  - Multi-tab interactive visualizer (Original vs Restored vs Biomarkers)         │
│  - Real-time DIP metric gauges, risk radars, and export controls                 │
│  - Full integration with FastAPI backend and GitHub branch deployment (`shriram`)│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🏛 System Architecture & Data Pipeline

The system is structured into a modular multi-tier architecture:

```mermaid
graph TD
    User[Web Client / Next.js Dashboard] -->|Upload Image + Patient Data| API[FastAPI Backend /predict]
    
    subgraph Quality & Restoration Gate
        API --> Gate[Quality Gate]
        Gate -->|Blur / Low Contrast| Restorer[DIP Image Restorer]
        Restorer -->|Illumination Corrected| Gate
        Gate -->|Passed| Preproc[Retinal Preprocessor: CLAHE + Resize]
    end
    
    subgraph Deep Learning Engine
        Preproc --> ResNet[ResNet50: 2048d]
        Preproc --> DenseNet[DenseNet121: 1024d]
        Preproc --> EffNet[EfficientNetB3: 1536d]
        ResNet & DenseNet & EffNet --> Fusion[4608d Fusion MLP]
        Fusion --> SoftVoting[Soft Voting / Stacking Classifier]
    end
    
    subgraph Digital Image Processing (DIP) Engine
        Preproc --> Vessels[Frangi Vessel Extractor]
        Preproc --> Disc[Optic Disc & Cup Detector]
        Preproc --> Lesions[Exudate & Lesion Segmenter]
        Vessels & Disc & Lesions --> Biomarkers[DIP Structural Metrics]
    end
    
    subgraph Explainability & Risk Engine
        SoftVoting & Biomarkers --> RiskEngine[Clinical Risk Scorer]
        SoftVoting --> GradCAM[Grad-CAM++ Overlay Generator]
        RiskEngine & GradCAM --> PDF[Clinical PDF Report Engine]
    end
    
    PDF --> Response[JSON Response + Base64 Overlays + PDF Download]
    Response --> User
```

---

## 3. 🧠 Deep Learning Model Ensemble Suite

The deep learning pipeline combines three complementary convolutional neural network architectures to extract rich spatial and structural feature representations.

| Architecture | Input Resolution | Extracted Feature Dim | Target Conv Layer for Grad-CAM | Primary Strength |
| :--- | :--- | :--- | :--- | :--- |
| **ResNet50** | 512 × 512 | 2048-d | `layer4` | Deep residual features, spatial landmark recognition |
| **DenseNet121** | 512 × 512 | 1024-d | `features.denseblock4` | Feature reuse, micro-lesion detection |
| **EfficientNetB3** | 512 × 512 | 1536-d | `features.7` | Multi-scale compound scaling, high computational efficiency |

### 4608-Dimensional Feature Fusion Network
1. **Embedding Concatenation**: Features extracted from the penultimate pooling layers of all three models are concatenated into a unified vector:
   $$\mathbf{z}_{\text{fused}} = [\mathbf{z}_{\text{ResNet50}} \,\|\, \mathbf{z}_{\text{DenseNet121}} \,\|\, \mathbf{z}_{\text{EfficientNetB3}}] \in \mathbb{R}^{4608}$$
2. **Multi-Layer Perceptron (MLP)**:
   $$\mathbb{R}^{4608} \xrightarrow{\text{FC + BatchNorm + ReLU + Dropout(0.4)}} \mathbb{R}^{1024} \xrightarrow{\text{FC + ReLU + Dropout(0.3)}} \mathbb{R}^{512} \xrightarrow{\text{FC + ReLU}} \mathbb{R}^{256} \rightarrow \text{Output Head}$$
3. **Soft Voting & Stacking**: Meta-classifier (XGBoost) trained on out-of-fold cross-validation logits to prevent data leakage.
4. **Grad-CAM++ Explainability Engine**: Computes pixel-wise visual activation gradients mapped into a Jet color overlay for clinical interpretability.

---

## 4. 🔬 Classical Digital Image Processing (DIP) Biomarker Suite (Feature 1)

Located in [`ml/dip_features.py`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/ml/dip_features.py), this module extracts quantitative anatomical and pathological biomarkers without relying solely on black-box neural networks.

```
RetinalDIPExtractor
├── extract_optic_disc_cup()  ──► Cup-to-Disc Ratio (CDR), Disc Area, Cup Area
├── extract_vessels()         ──► Vessel Density %, Frangi Vessel Mask, Tortuosity Index
├── detect_exudates()         ──► Exudate Count, Lesion Area %, L*a*b* & HSV Masks
└── estimate_av_ratio()       ──► Artery-to-Vein Diameter Ratio (AVR)
```

### Key DIP Algorithms Implemented:
* **Green-Channel Extraction**: Retinal fundus green channel exhibits optimal contrast between blood vessels and background retina.
* **Optic Disc & Cup Segmentation**:
  1. High-intensity thresholding on the red/green channels.
  2. Morphological closing to remove vessel occlusions.
  3. Hough Circle Transform & contour fitting to measure Optic Disc diameter ($D_{\text{disc}}$) and Optic Cup diameter ($D_{\text{cup}}$).
  4. **Cup-to-Disc Ratio (CDR)**:
     $$\text{CDR} = \frac{\text{Diameter}_{\text{cup}}}{\text{Diameter}_{\text{disc}}}$$
     *(CDR > 0.55 indicates potential Glaucomatous optic neuropathy).*
* **Frangi Vesselness Filter**: Multiscale Hessian matrix eigenvector analysis to highlight tubular vessel structures:
  $$V_0(s) = \begin{cases} 0 & \text{if } \lambda_2 > 0 \\ \exp\left(-\frac{R_B^2}{2\beta^2}\right)\left(1 - \exp\left(-\frac{S^2}{2c^2}\right)\right) & \text{otherwise} \end{cases}$$
* **Vessel Tortuosity & A/V Ratio**: Measures arc length vs. chord length along vessel centerlines to quantify vascular curvature associated with hypertensive retinopathy.
* **Color-Space Exudate Detection**: Converts RGB fundus images to CIELAB ($L^*a^*b^*$) and HSV color spaces to isolate bright yellow hard exudates from hemorrhages.

---

## 5. 🛡 Adaptive Quality Gate & DIP Restoration Engine (Feature 2)

Located in [`ml/quality_gate.py`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/ml/quality_gate.py) and [`ml/image_restoration.py`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/ml/image_restoration.py).

### Quality Gate Criteria
Before running inference, every uploaded image is subjected to strict quality validation:
1. **Resolution Threshold**: Minimum $100 \times 100$ pixels.
2. **Aspect Ratio Limit**: Rejects extreme non-standard ratios ($> 2.5$).
3. **Blur Index (Laplacian Variance)**:
   $$\text{Focus Score} = \text{Var}\left(\Delta I\right)$$
   *(Images with score $< 100.0$ are flagged as blurry).*
4. **Exposure & Contrast Index**: Evaluates mean luminance and histogram dispersion to prevent overexposed or pitch-black submissions.

### DIP Restoration Pipeline
If an image fails or exhibits low contrast/uneven lighting, it passes through the automatic restoration pipeline:
1. **Illumination Correction**: Estimates background illumination using large-kernel Gaussian morphological opening and subtracts non-uniform light gradient:
   $$I_{\text{corrected}}(x,y) = I(x,y) - I_{\text{background}}(x,y) + \bar{I}$$
2. **CLAHE (Contrast Limited Adaptive Histogram Equalization)**: Applied on localized $8 \times 8$ tiles with a clip limit of $2.0$ to enhance subtle retinal microaneurysms.
3. **Non-Local Denoising & Bilateral Filtering**: Preserves sharp vessel edges while smoothing sensor noise.

---

## 6. 📊 DIP-Guided Risk Scoring, Severity Grading & PDF Reports (Feature 3)

Located in [`ml/risk_score.py`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/ml/risk_score.py) and [`ml/pdf_report.py`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/ml/pdf_report.py).

### Clinical Risk Score Formula
Blends deep learning ensemble prediction confidence with classical DIP structural metrics:

$$\text{Risk Score} = w_1 \cdot P_{\text{Ensemble}}(\text{Disease}) + w_2 \cdot f(\text{CDR}) + w_3 \cdot f(\text{Vessel Density}) + w_4 \cdot f(\text{Exudates})$$

### Supported Disease Classifications & Severity Grades:
1. **Diabetic Retinopathy (DR)**:
   * Grade 0: No DR
   * Grade 1: Mild DR (Microaneurysms present)
   * Grade 2: Moderate DR (Hard exudates & intraretinal hemorrhages)
   * Grade 3: Severe DR (Cotton wool spots & venous beading)
   * Grade 4: Proliferative DR (Neovascularization)
2. **Glaucoma**: CDR $\ge 0.55$, neuroretinal rim thinning.
3. **Cataract**: Media opacity & vessel attenuation.
4. **Age-Related Macular Degeneration (AMD)**: Drusen accumulation in macula.

### Automated PDF Report Generator
Generates clinical PDF documents containing:
* Patient demographic & intake form metadata.
* Disease prediction confidence breakdown with multi-class probabilities.
* DIP structural biomarker summary (CDR, vessel density %, tortuosity, exudate count).
* Quad-pane visual gallery (Original Image, Preprocessed Image, DIP Biomarker Overlay, Grad-CAM++ Heatmap).

---

## 7. 💻 Interactive Next.js Dashboard & DIP Explorer (Feature 4)

Located in [`frontend/src/components/DIPExplorer.tsx`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/frontend/src/components/DIPExplorer.tsx) and [`frontend/src/components/AnalysisWorkspace.tsx`](file:///c:/Users/shrir/OneDrive/Desktop/RetinaGuard/frontend/src/components/AnalysisWorkspace.tsx).

### Frontend Highlights:
* **Tech Stack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React icons.
* **Hero Section & Ticker Bar**: Displays live system health metrics, model versions, and real-time backend CPU status.
* **Patient Intake Form**: Interactive input for patient demographics, diabetic history, hypertension status, and symptoms.
* **Interactive DIP Explorer Component**:
  * **Multi-Tab Visualizer**: Switch between *Original*, *Restored*, *Optic Disc*, *Vessel Network*, and *Grad-CAM Heatmap*.
  * **Interactive Metrics Panel**: Circular animated gauges for CDR, Vessel Density, Blur Index, and Risk Rating.
  * **Export Capabilities**: One-click download for high-resolution PNG masks and clinical PDF reports.

---

## 8. 🔌 Backend API Specifications

The FastAPI backend runs on `http://localhost:8000`.

### Key Endpoints

#### 1. System Health Check
`GET /health`  
Returns system operational status, PyTorch execution device (CPU/CUDA), and supported diagnostic tasks.

#### 2. Model Prediction & Clinical Analysis
`POST /predict`  
* **Parameters**: `file` (Image upload), `task` (`odir` or `aptos`), `patient_name`, `patient_age`, `diabetic_status`, `hypertension`, `symptoms`.  
* **Returns**: JSON object containing predictions, confidence scores, quality gate status, DIP biomarkers, risk scores, base64-encoded Grad-CAM heatmap, and base64-encoded DIP overlays.

#### 3. Grad-CAM++ Visual Explainability
`POST /generate-heatmap`  
Generates localized activation heatmaps for specific model layers.

#### 4. DIP Biomarker Extraction
`POST /dip-analysis`  
Returns raw numerical metrics (CDR, vessel density %, lesion counts) and segmentation masks.

---

## 9. 🛠 Step-by-Step Local Setup & Execution Guide

### Prerequisites
* Python 3.10+
* Node.js v18+ & npm v9+
* Git

---

### Step 1: Install Python Dependencies
```bash
# Navigate to project directory
cd c:\Users\shrir\OneDrive\Desktop\RetinaGuard

# Install requirements
pip install -r requirements.txt
```

---

### Step 2: Generate Synthetic Test Fixtures
```bash
python scripts/generate_fixtures.py
```

---

### Step 3: Run End-to-End CPU Smoke Test
```bash
python scripts/smoke_test.py
```

---

### Step 4: Run PyTest Test Suite
```bash
python -m pytest tests/
```

---

### Step 5: Launch FastAPI Backend Server
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
* **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc API Docs**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Step 6: Launch Next.js Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
* **Web Interface**: [http://localhost:3000](http://localhost:3000)

---

## 10. 🐙 Git Version Control & Commit Log

### Branch Information
* **Active Branch**: `shriram`
* **Remote Tracking**: `origin/shriram` (`https://github.com/Jawahar08/RetinaGuard.git`)

### Recent Commit History
```
8b6c729 - (HEAD -> shriram, origin/shriram) chore: ignore PAPILA data folder and update gitignore
3fef0e2 - feat(ui): Feature 4 - Interactive DIP Explorer Next.js component with animated gauges & multi-tab visualizer
af9ab55 - feat(risk): Feature 3 - DIP-guided clinical risk score, severity grading & enhanced PDF report
3f726cd - feat(quality): Feature 2 - adaptive quality gate & DIP image restoration pipeline
0b0d3a6 - feat(dip): Feature 1 - classical DIP structural biomarker extraction suite
4c06123 - feat: add patient medical intake form and patient profile integration into clinical PDF reports
```

---

*Document generated automatically for RetinaGuard system verification and submission.*
