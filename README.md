<!-- ╔══════════════════════════════════════════════════════════════════════════════════╗ -->
<!-- ║        ⚡ RETINAGUARD — THE ULTIMATE DEEP LEARNING & DIP SCREENING SYSTEM v4.0   ║ -->
<!-- ╚══════════════════════════════════════════════════════════════════════════════════╝ -->

<a name="top"></a>

<div align="center">

<!-- ─────────── ANIMATED HERO BANNER ─────────── -->

<a href="#-quick-start">
  <img src=".github/assets/hero-animated.svg" alt="RetinaGuard — AI-Powered Retinal Fundus Screening Platform" width="100%" />
</a>

<br />

<!-- ─────────── SHIELD.IO BADGES ─────────── -->

[![Model Training](https://img.shields.io/badge/Model_Training-COMPLETED-success?style=flat-square&logo=pytorch&logoColor=white)](#-model-training--checkpoint-milestone)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![PyTorch 2.0+](https://img.shields.io/badge/PyTorch-2.0%2B-ee4c2c?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.7%2B-5C3EE8?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org)
[![Git LFS](https://img.shields.io/badge/Git_LFS-Tracked-blue?style=flat-square&logo=git&logoColor=white)](#-model-training--checkpoint-milestone)
[![License](https://img.shields.io/badge/License-Research_MIT-00d2ff?style=flat-square&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Research System](https://img.shields.io/badge/💎_All_Features-FREE-10b981?style=flat-square&logo=opensourceinitiative&logoColor=white)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-7b2ff7?style=flat-square&logo=git&logoColor=white)](https://github.com/Jawahar08/RetinaGuard/pulls)
[![Stars](https://img.shields.io/github/stars/Jawahar08/RetinaGuard?style=flat-square&color=ffd93d&logo=github)](https://github.com/Jawahar08/RetinaGuard)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](#-docker-deployment)

<br />

<!-- ─────────── ANIMATED STATS ─────────── -->

<img src=".github/assets/stats-animated.svg" alt="Platform Stats" width="100%" />

<br />

> **RetinaGuard** is a production-grade, end-to-end medical research & screening platform that fuses **Ensemble Deep Learning** (ResNet50 + DenseNet121 + EfficientNetB3 + 4608-d Feature Fusion MLP) with **Classical Digital Image Processing (DIP)** (Frangi vesselness filter, Hough transform Cup-to-Disc ratio, L\*a\*b\* exudate segmentation). It features an **Adaptive Quality Gate with DIP Auto-Restoration**, **Grad-CAM++ visual explainability**, a **0–100 Clinical Composite Risk Engine**, automated **Clinical PDF Report Generation**, and an interactive **Next.js 14 DIP Explorer Dashboard** — all exposed via **FastAPI microservices** and **100% open for research**.

<br />

<!-- ─────────── ANIMATED FEATURES STRIP ─────────── -->

<img src=".github/assets/features-animated.svg" alt="Feature Overview" width="100%" />

<br />

<!-- ─────────── LIVE DASHBOARD DEMO ─────────── -->

<a href="#-quick-start">
  <img src=".github/assets/dashboard-demo.svg" alt="RetinaGuard Workspace Dashboard" width="100%" />
</a>

<br />

<!-- ─────────── NAVIGATION PILLS ─────────── -->

<a href="#-the-problem"><img src="https://img.shields.io/badge/💡_Problem-ff6b6b?style=for-the-badge" /></a>
<a href="#-features-at-a-glance"><img src="https://img.shields.io/badge/✨_Features-7b2ff7?style=for-the-badge" /></a>
<a href="#-feature-1--classical-dip-biomarker-extraction"><img src="https://img.shields.io/badge/🔬_DIP_Biomarkers-64ffda?style=for-the-badge" /></a>
<a href="#-feature-2--deep-learning-ensemble-engine"><img src="https://img.shields.io/badge/🧠_DL_Ensemble-00d2ff?style=for-the-badge" /></a>
<a href="#-feature-3--adaptive-quality-gate--image-restoration"><img src="https://img.shields.io/badge/🛡️_Quality_Gate-ffd93d?style=for-the-badge" /></a>
<a href="#-feature-4--clinical-risk-engine--pdf-reports"><img src="https://img.shields.io/badge/📊_Risk_Engine-ff6b6b?style=for-the-badge" /></a>
<a href="#%EF%B8%8F-system-architecture"><img src="https://img.shields.io/badge/🏗️_Architecture-00d2ff?style=for-the-badge" /></a>
<a href="#-tech-stack"><img src="https://img.shields.io/badge/🛠️_Stack-7b2ff7?style=for-the-badge" /></a>
<a href="#-quick-start"><img src="https://img.shields.io/badge/🚀_Start-00d2ff?style=for-the-badge" /></a>
<a href="#-api-reference"><img src="https://img.shields.io/badge/📡_API-ffd93d?style=for-the-badge" /></a>
<a href="#-docker-deployment"><img src="https://img.shields.io/badge/🌐_Deploy-10b981?style=for-the-badge" /></a>

</div>

<br />

<!-- ═══════════════════════════ GRADIENT DIVIDER ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 💡 The Problem

```
Stage 1:   "Low quality or blurry fundus scan received from clinic."
Stage 2:   "Black-box deep learning model yields single label without explanation."
Stage 3:   "Ophthalmologists distrust raw AI confidence percentages."
Stage 4:   "No structural biomarkers (CDR, vessel density) extracted to support verdict."
Stage 5:   "No automated clinical report generated for patient records."
Solution:  ✅ You deployed RetinaGuard. Quality restored, biomarkers calculated, 
              4608-d ensemble fused, Grad-CAM heatmap overlayed, PDF report generated!
```

<table>
<tr>
<td width="50%">

### ❌ Traditional Ocular AI Tools

```diff
- 😰 Single black-box CNN architecture with high variance
- 📝 No image quality validation — processes corrupt or out-of-focus scans
- 🔄 Zero quantitative structural biomarker analysis (no CDR, no VDI)
- 📉 No explainability — doctors receive probability without spatial heatmaps
- 🤷 Manual report synthesis required for clinical documentation
- 🏢 High GPU dependency with no CPU-bound fallback capability
- 💻 Monolithic design with no separation between DIP & DL pipelines
- 🎤 Closed proprietary lock-in with zero inspectable code
- 🏗️ Static pixel processing without adaptive contrast restoration
- 💰 Expensive commercial software licenses
- 🧠 Pure deep learning — ignoring 50 years of verified DIP science
```

</td>
<td width="50%">

### ✅ RetinaGuard AI System

```diff
+ 🧠 3-Model Ensemble (ResNet50 + DenseNet121 + EfficientNetB3 + Fusion MLP)
+ 🛡️ 5-Point Quality Gate (Blur, exposure, resolution, aspect ratio, FOV)
+ 🔧 Adaptive DIP Restoration (CLAHE + Unsharp Mask + Bilateral + Gamma)
+ 🔬 Classical DIP Engine (Frangi vessel filter, Hough Cup-to-Disc Ratio)
+ 🔮 Grad-CAM++ Visual Explainability with attention heatmaps
+ 📊 Composite Clinical Risk Scoring (0–100 scaled risk severity grade)
+ 📄 Automated PDF Clinical Report generation with diagnostic visuals
+ 💻 Interactive Next.js 14 DIP Explorer Dashboard with live gauges
+ ⚡ FastAPI microservices with dual ODIR & APTOS multi-label support
+ 🐳 Docker containerized with complete local execution support
+ 💎 100% FREE & Open Source — complete medical research transparency
```

</td>
</tr>
</table>

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## ✨ Features at a Glance

<div align="center">

```
╔═══════════════════╦═══════════════════╦═══════════════════╦═══════════════════╗
║   🧠 3-Model      ║   🔬 Classical    ║   🛡️ Adaptive     ║   📊 Clinical     ║
║   DL Ensemble     ║   DIP Biomarkers  ║   Quality Gate    ║   Risk Engine     ║
╠═══════════════════╬═══════════════════╬═══════════════════╬═══════════════════╣
║   🔮 Grad-CAM++   ║   📄 PDF Clinical ║   💻 Next.js 14   ║   ⚡ FastAPI      ║
║   Heatmap Engine  ║   Report System   ║   DIP Explorer    ║   Microservice    ║
╠═══════════════════╬═══════════════════╬═══════════════════╬═══════════════════╣
║   👁️ Optic Disc   ║   🩸 Vessel       ║   💛 Exudate      ║   🐳 Docker       ║
║   Hough CDR       ║   Frangi Filter   ║   L*a*b* Masking  ║   Containerized   ║
╠═══════════════════╬═══════════════════╬═══════════════════╬═══════════════════╣
║   🏥 Multi-Task   ║   🧪 PyTest       ║   📦 ONNX Exporter║   💎 100% FREE    ║
║   ODIR & APTOS    ║   Smoke Suite     ║   Optimization    ║   Open Research   ║
╚═══════════════════╩═══════════════════╩═══════════════════╩═══════════════════╝
```

</div>

<table>
<tr>
<td width="50%" valign="top">

### 🧠 Deep Learning Ensemble Engine
> 4608-dimensional feature concatenation

- ✅ **ResNet50** (2048-d layer4 bottleneck features)
- ✅ **DenseNet121** (1024-d denseblock4 features)
- ✅ **EfficientNetB3** (1536-d top feature maps)
- ✅ **FeatureFusionRetinalModel** — concatenates 4608-d vectors into a 4-layer MLP classifier
- ✅ Multi-task support: **ODIR** (5-class multi-label) & **APTOS** (5-grade DR severity)
- ✅ CPU fallback execution mode when CUDA is unavailable

</td>
<td width="50%" valign="top">

### 🔬 Classical DIP Biomarker Engine
> Pure CPU mathematical feature extraction

- ✅ **Frangi Vessel Filter**: Multi-scale Hessian matrix ($\sigma \in \{1,2,3,4\}$) for Vessel Density Index (VDI)
- ✅ **Optic Disc & Cup Detection**: Circular Hough Transform for Cup-to-Disc Ratio (CDR)
- ✅ **Exudate Segmentation**: CIE L\*a\*b\* + HSV color space thresholding
- ✅ **Vessel Tortuosity & A/V Ratio**: Arteriole-to-venule ratio & arc length curvature metrics
- ✅ Microaneurysm candidate spot detection

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🛡️ Quality Gate & DIP Restoration
> Pre-inference image validation and enhancement

- ✅ **5-Point Check**: Resolution, aspect ratio, blur index ($\text{Var}(\nabla^2 I)$), exposure mean ($\mu$), FOV coverage
- ✅ **Auto-Restoration Pipeline**:
  1. Unsharp masking for crisp vessel boundaries
  2. Gamma correction ($\gamma = 1.2$) for dark region enhancement
  3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
  4. Bilateral filtering for noise reduction while preserving edges

</td>
<td width="50%" valign="top">

### 📊 Clinical Risk Engine & PDF Reports
> Automated patient risk stratification & documentation

- ✅ **Composite Risk Score (0–100)**: Integrates DL class probabilities, VDI, CDR, exudate area, and quality flags
- ✅ **5-Tier Severity Scale**: Normal → Mild → Moderate → Severe → Critical
- ✅ **Automated PDF Generation**: Formatted HTML/PDF export with patient demographics, biomarker tables, and diagnostic overlays
- ✅ Auto-generated clinical recommendations

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔮 Grad-CAM++ Explainability Engine
> Spatial visual attention heatmaps

- ✅ **Grad-CAM++ Implementation**: Second-order derivative weighting for multi-instance lesion localization
- ✅ **Overlay Generation**: Jet colormap alpha-blended ($\alpha = 0.45$) onto fundus images
- ✅ **Target Class Selection**: Inspect heatmaps for any target pathology (DR, Glaucoma, AMD, Cataract, Normal)
- ✅ Base64 PNG export for dashboard rendering

</td>
<td width="50%" valign="top">

### 💻 Next.js 14 Interactive Dashboard
> Modern visual inspection workspace

- ✅ Multi-tab **DIP Explorer**: Original, Restored, Vessels, Optic Disc, Grad-CAM
- ✅ Animated circular SVG metric gauges (CDR, VDI, Risk, Confidence)
- ✅ Patient intake form with diabetic & hypertension clinical metadata
- ✅ Real-time FastAPI backend integration
- ✅ Built with React 18, TypeScript, Tailwind CSS, and Lucide React

</td>
</tr>
</table>

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🔬 Feature 1 — Classical DIP Biomarker Extraction

> **Module:** `ml/dip_features.py` — High-speed CPU feature extraction using NumPy, SciPy, and Pillow.

```mermaid
flowchart LR
    A["📸 Fundus Image"] --> B["🟢 Green Channel\n+ CLAHE"]
    B --> C1["🩸 Frangi Hessian Filter\nScale σ ∈ {1,2,3,4}"]
    B --> C2["👁️ Hough Circle Detector\nDisc & Cup Boundaries"]
    B --> C3["💛 CIE L*a*b* Masking\nExudate Candidate Spotting"]
    
    C1 --> D1["📊 Vessel Density Index (VDI)\nTortuosity & A/V Ratio"]
    C2 --> D2["🎯 Cup-to-Disc Ratio (CDR)\nDiameter Ratio"]
    C3 --> D3["📍 Exudate Area Ratio\nCandidate Spot Count"]

    style A fill:#020617,stroke:#00d2ff,stroke-width:2px,color:#00d2ff
    style B fill:#0f172a,stroke:#64ffda,stroke-width:2px,color:#64ffda
    style C1 fill:#0f172a,stroke:#ff6b6b,stroke-width:2px,color:#ff6b6b
    style C2 fill:#0f172a,stroke:#ffd93d,stroke-width:2px,color:#ffd93d
    style C3 fill:#0f172a,stroke:#f093fb,stroke-width:2px,color:#f093fb
    style D1 fill:#020617,stroke:#ff6b6b,stroke-width:2px,color:#ff6b6b
    style D2 fill:#020617,stroke:#ffd93d,stroke-width:2px,color:#ffd93d
    style D3 fill:#020617,stroke:#f093fb,stroke-width:2px,color:#f093fb
```

### Extracted Biomarkers Summary

| Metric | Algorithm / Formula | Clinical Significance | Normal Range |
|:---|:---|:---|:---:|
| **Cup-to-Disc Ratio (CDR)** | $\text{CDR} = \frac{\text{Diameter}_{\text{cup}}}{\text{Diameter}_{\text{disc}}}$ | Primary structural indicator for **Glaucoma** | $< 0.55$ |
| **Vessel Density Index (VDI)** | $\text{VDI} = \frac{\text{Pixels}_{\text{vessel}}}{\text{Pixels}_{\text{FOV}}}$ | Indicates vascular drop-out or proliferative vessels in **DR** | $10\% - 18\%$ |
| **Vessel Tortuosity** | $\tau = \frac{\text{Arc Length}}{\text{Chord Length}} - 1$ | Indicates hypertensive or diabetic retinopathy changes | $< 0.15$ |
| **Exudate Candidate Area** | Thresholding in $L^*a^*b^*$ ($L^* > 75, b^* > 20$) | Indicates vascular leakage in **Diabetic Macular Edema** | $0.0\%$ |

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🧠 Feature 2 — Deep Learning Ensemble Engine

> **Module:** `ml/models.py` — Multi-backbone feature fusion architecture.

```mermaid
flowchart TD
    IN["📸 Preprocessed Retinal Image (3×512×512)"] --> B1["🔴 ResNet50\n(layer4 bottleneck)"]
    IN --> B2["🟢 DenseNet121\n(denseblock4)"]
    IN --> B3["🔵 EfficientNetB3\n(features.7)"]

    B1 --> F1["2048-d Feature Vector"]
    B2 --> F2["1024-d Feature Vector"]
    B3 --> F3["1536-d Feature Vector"]

    F1 & F2 & F3 --> CONCAT["⚡ Concatenation Layer\n(4608-d Fused Vector)"]

    CONCAT --> MLP["🧠 Fusion MLP\n4608 → 1024 → 512 → 256\n(BatchNorm + Dropout 0.4)"]

    MLP --> HEAD1["🏥 ODIR Head (5 Classes)\nNormal · DR · Glaucoma · Cataract · AMD"]
    MLP --> HEAD2["🔍 APTOS Head (5 Grades)\n0: None → 4: Proliferative"]

    style IN fill:#020617,stroke:#00d2ff,stroke-width:2px,color:#00d2ff
    style CONCAT fill:#0f172a,stroke:#7b2ff7,stroke-width:2px,color:#7b2ff7
    style MLP fill:#0f172a,stroke:#64ffda,stroke-width:2px,color:#64ffda
    style HEAD1 fill:#020617,stroke:#ff6b6b,stroke-width:2px,color:#ff6b6b
    style HEAD2 fill:#020617,stroke:#ffd93d,stroke-width:2px,color:#ffd93d
```

### 🏆 Model Training & Checkpoint Milestone (Completed)

> **Script:** `scripts/train.py` &nbsp;|&nbsp; **Checkpoints Directory:** `models/checkpoints/` (Tracked via **Git LFS**)

The full end-to-end training pipeline has been executed and completed across both clinical task benchmarks using **EfficientNet-B3 (pretrained ImageNet backbone)**:

| Task / Dataset | Output Classes | Saved Checkpoint | Size | Optimization Strategies |
|:---|:---|:---|:---:|:---|
| **APTOS 2019** | 5-Class DR Severity Grading (*No DR* $\rightarrow$ *Proliferative DR*) | `models/checkpoints/aptos_best.pth` | **138.7 MB** | Class-balanced WeightedRandomSampler, Ben Graham + CLAHE preprocessing, Cross-Entropy Loss |
| **ODIR-5K** | 8-Class Multi-Label Retinal Disease Screening (*N, D, G, C, A, H, M, O*) | `models/checkpoints/odir_best.pth` | **138.7 MB** | Focal Loss (handles class imbalance), Cosine Annealing LR Schedule, Test-Time Augmentation (TTA) |

#### Execute Training Pipeline

```bash
# Train APTOS 2019 DR Severity Model (30 epochs)
python scripts/train.py --task aptos --epochs 30

# Train ODIR-5K Multi-Label Screening Model (30 epochs)
python scripts/train.py --task odir --epochs 30

# Train Both Benchmarks Sequentially
python scripts/train.py --task both --epochs 30
```

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🛡️ Feature 3 — Adaptive Quality Gate & Image Restoration

> **Modules:** `ml/quality_gate.py` & `ml/image_restoration.py`

```mermaid
flowchart LR
    A["📸 Incoming Scan"] --> B{"🛡️ 5-Point Quality Check"}
    
    B -->|"Resolution < 100px"| FAIL["❌ Rejected / Error"]
    B -->|"Aspect Ratio > 2.5"| FAIL
    B -->|"Blur Index Var < 15"| WARN["⚠️ Needs Restoration"]
    B -->|"Exposure Mean Out of Range"| WARN
    B -->|"Passed All Checks"| PASS["✅ Clean Image"]

    WARN --> R1["1️⃣ Unsharp Masking"]
    R1 --> R2["2️⃣ Gamma Adjustment (γ=1.2)"]
    R2 --> R3["3️⃣ Green Channel CLAHE"]
    R3 --> R4["4️⃣ Bilateral Filter"]
    R4 --> PASS

    PASS --> OUT["🚀 Send to DL & DIP Engines"]

    style A fill:#020617,stroke:#00d2ff,stroke-width:2px,color:#00d2ff
    style B fill:#0f172a,stroke:#ffd93d,stroke-width:2px,color:#ffd93d
    style WARN fill:#0f172a,stroke:#ff6b6b,stroke-width:2px,color:#ff6b6b
    style PASS fill:#020617,stroke:#64ffda,stroke-width:2px,color:#64ffda
```

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 📊 Feature 4 — Clinical Risk Engine & PDF Reports

> **Modules:** `ml/risk_score.py` & `ml/pdf_report.py`

```mermaid
flowchart TD
    DL_CONF["🧠 DL Max Confidence"] --> SCORE["📊 Composite Risk Engine\nWeighted Aggregator"]
    VDI["🩸 Vessel Density %"] --> SCORE
    CDR["👁️ Cup-to-Disc Ratio"] --> SCORE
    EXUDATE["💛 Exudate Spot Area"] --> SCORE
    QUALITY["🛡️ Quality Gate Flag"] --> SCORE

    SCORE --> NUM["🔢 Composite Risk Score (0–100)"]
    
    NUM --> S1["0–15: Low Risk (Normal)"]
    NUM --> S2["16–35: Moderate Risk (Mild)"]
    NUM --> S3["36–55: Elevated Risk (Moderate)"]
    NUM --> S4["56–75: High Risk (Severe)"]
    NUM --> S5["76–100: Critical Risk (Proliferative)"]

    NUM --> PDF["📄 Generate PDF Clinical Report\n(HTML + WeasyPrint / ReportLab)"]

    style SCORE fill:#0f172a,stroke:#7b2ff7,stroke-width:2px,color:#7b2ff7
    style NUM fill:#020617,stroke:#ff6b6b,stroke-width:2px,color:#ff6b6b
    style PDF fill:#020617,stroke:#64ffda,stroke-width:2px,color:#64ffda
```

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🏗️ System Architecture

### High-Level Overview

```mermaid
flowchart TD
    subgraph CLIENT["🖥️ CLIENT TIER — Next.js 14 + React 18"]
        U["👤 Clinician / Researcher"] --> FE["⚡ App Router Workspace"]
        FE --> DASH["📊 Dashboard & Analytics"]
        FE --> INTAKE["📝 Patient Demographics Form"]
        FE --> DIP_VIS["🔬 DIP Explorer (5 Visual Tabs)"]
        FE --> HEATMAP["🔮 Grad-CAM Attention View"]
        FE --> REPORT["📄 PDF Report Downloader"]
    end

    subgraph API["⚡ API TIER — FastAPI Microservices"]
        GW["🌐 REST API Gateway\n(backend/app/main.py)"] --> PREDICT["POST /predict"]
        GW --> HEAT_ENDPOINT["POST /generate-heatmap"]
        GW --> REP_ENDPOINT["POST /generate-report"]
        GW --> DIP_ENDPOINT["POST /dip-analysis"]
        GW --> RESTORE_ENDPOINT["POST /restore"]
        GW --> RISK_ENDPOINT["POST /risk-score"]
    end

    subgraph ENGINE["🧠 CORE ENGINE TIER — PyTorch + OpenCV"]
        QG["🛡️ Quality Gate & Restorer"]
        DL["🧠 DL Ensemble (ResNet+DenseNet+EfficientNet)"]
        DIP["🔬 DIP Biomarker Pipeline"]
        CAM["🔮 Grad-CAM++ Generator"]
        RISK["📊 Composite Risk Engine"]
        PDF_ENG["📄 Clinical PDF Synthesizer"]
    end

    PREDICT --> QG --> DL & DIP --> RISK --> GW
    HEAT_ENDPOINT --> CAM --> GW
    REP_ENDPOINT --> PDF_ENG --> GW
    DIP_ENDPOINT --> DIP --> GW
    RESTORE_ENDPOINT --> QG --> GW
    RISK_ENDPOINT --> RISK --> GW

    style CLIENT fill:#020617,stroke:#00d2ff,stroke-width:2px,color:#00d2ff
    style API fill:#0f172a,stroke:#7b2ff7,stroke-width:2px,color:#7b2ff7
    style ENGINE fill:#0f172a,stroke:#64ffda,stroke-width:2px,color:#64ffda
```

<br />

<!-- ─────────── WAVE SEPARATOR ─────────── -->
<img src=".github/assets/wave-animated.svg" width="100%" />

<br />

### 🔄 Core Product Flow

```mermaid
flowchart LR
    A["📸 Upload Image\n+ Demographics"] --> B["🛡️ Quality Gate Check"]
    B -->|"Low Quality"| C["🔧 DIP Restoration\nCLAHE + Unsharp"]
    B -->|"High Quality"| D["⚡ Parallel Execution"]
    C --> D
    D --> E1["🧠 4608-d DL Ensemble\nPathology Inference"]
    D --> E2["🔬 Classical DIP Engine\nCDR + VDI + Exudates"]
    E1 & E2 --> F["📊 Composite Risk Scoring\n0–100 Grade"]
    F --> G["🔮 Grad-CAM++ Heatmap\nLesion Attention Map"]
    G --> H["📄 PDF Clinical Report\nDownloadable PDF"]

    style A fill:#020617,stroke:#00d2ff,stroke-width:2px,color:#00d2ff
    style B fill:#0f172a,stroke:#ffd93d,stroke-width:2px,color:#ffd93d
    style D fill:#0f172a,stroke:#7b2ff7,stroke-width:2px,color:#7b2ff7
    style F fill:#0f172a,stroke:#ff6b6b,stroke-width:2px,color:#ff6b6b
    style H fill:#020617,stroke:#64ffda,stroke-width:2px,color:#64ffda
```

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🛠️ Tech Stack

<div align="center">

<img src=".github/assets/techstack-animated.svg" alt="Tech Stack" width="100%" />

</div>

<details open>
<summary><b>🐍 Backend & ML Frameworks</b></summary>
<br />

| Technology | Role | Version |
|:----------:|------|:-------:|
| <img src="https://skillicons.dev/icons?i=py" width="24" /> **Python** | Core runtime environment | `3.10+` |
| <img src="https://skillicons.dev/icons?i=pytorch" width="24" /> **PyTorch** | Deep learning model inference & feature extraction | `2.0+` |
| <img src="https://skillicons.dev/icons?i=fastapi" width="24" /> **FastAPI** | High-performance asynchronous REST API backend | `0.100+` |
| <img src="https://skillicons.dev/icons?i=opencv" width="24" /> **OpenCV** | Classical digital image processing & matrix ops | `4.7+` |
| 🔢 **NumPy / SciPy** | Matrix math, Frangi Hessian filters, signal processing | `latest` |
| 🧪 **scikit-image** | Morphological filtering, watershed segmentation, CLAHE | `latest` |
| 📋 **Pydantic** | Strict API data validation & request/response schemas | `2.0+` |

</details>

<details open>
<summary><b>🖥️ Frontend Dashboard</b></summary>
<br />

| Technology | Role | Version |
|:----------:|------|:-------:|
| <img src="https://skillicons.dev/icons?i=nextjs" width="24" /> **Next.js** | React application framework (App Router) | `14` |
| <img src="https://skillicons.dev/icons?i=react" width="24" /> **React** | Component UI rendering engine | `18` |
| <img src="https://skillicons.dev/icons?i=ts" width="24" /> **TypeScript** | Type-safe development | `5` |
| <img src="https://skillicons.dev/icons?i=tailwind" width="24" /> **Tailwind CSS** | Custom styling & glassmorphic layout | `3.x` |
| 💎 **Lucide React** | Icon library for clinical UI elements | `latest` |

</details>

<details open>
<summary><b>🐳 Infrastructure & DevOps</b></summary>
<br />

| Technology | Role |
|:----------:|------|
| <img src="https://skillicons.dev/icons?i=docker" width="24" /> **Docker** | Multi-stage containerized deployment |
| 📦 **ONNX Runtime** | High-speed optimized model deployment format |
| 🧪 **PyTest** | Automated test suite & smoke test verification |

</details>

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 📁 Project Structure

```
RetinaGuard/
├── 🔧 backend/
│   └── app/
│       ├── main.py                     # FastAPI REST server — 8 endpoints
│       └── __init__.py
│
├── 🎨 frontend/
│   └── src/
│       ├── app/                        # Next.js 14 App Router
│       │   ├── layout.tsx              # Root HTML wrapper & fonts
│       │   └── page.tsx                # Main screening workspace page
│       └── components/
│           ├── DIPExplorer.tsx          # 5-tab DIP visualizer & animated gauges
│           ├── AnalysisWorkspace.tsx    # File uploader & diagnostic layout
│           ├── PatientIntakeForm.tsx    # Clinical demographics entry
│           ├── HeroSection.tsx         # Animated landing hero banner
│           ├── EnsemblePipeline.tsx     # DL architecture diagram
│           ├── ResearchMetrics.tsx      # SOTA performance counters
│           ├── DiseaseReference.tsx     # Pathology classification guide
│           ├── SiteHeader.tsx          # Top navigation header
│           ├── SiteFooter.tsx          # Footer & clinical disclaimer
│           └── TickerBar.tsx           # Live metric ticker
│
├── 🧠 ml/                              # Core ML & DIP Algorithms
│   ├── models.py                       # ResNet50 + DenseNet121 + EfficientNetB3 + Fusion MLP
│   ├── inference.py                    # Inference engine with CPU/GPU dispatch
│   ├── gradcam.py                      # Grad-CAM++ visual explainability engine
│   ├── dip_features.py                 # Classical DIP biomarkers (Frangi, CDR, Exudates)
│   ├── image_restoration.py            # Adaptive quality gate & restoration pipeline
│   ├── quality_gate.py                 # 5-point quality inspection engine
│   ├── risk_score.py                   # 0–100 Composite clinical risk engine
│   ├── pdf_report.py                   # Automated clinical PDF report generator
│   ├── preprocessing.py                # Retinal image preprocessor (CLAHE, cropping)
│   ├── schemas.py                      # Pydantic data schemas
│   ├── training.py                     # Training & validation loops
│   ├── dataset_adapters.py             # ODIR & APTOS dataset loaders
│   ├── data_validation.py              # Dataset integrity verification
│   └── onnx_exporter.py                # ONNX model compilation utility
├── 📦 models/                           # Model Checkpoints (Git LFS)
│   └── checkpoints/
│       ├── aptos_best.pth              # Trained 5-Class DR Severity Model (138.7 MB)
│       └── odir_best.pth               # Trained 8-Class Multi-Label Model (138.7 MB)
│
├── 📂 .github/assets/                  # Animated SVG badges & graphics
├── 📂 configs/                         # YAML dataset & model configurations
├── 📂 scripts/                         # train.py · generate_fixtures.py · smoke_test.py
├── 📂 tests/                           # PyTest automated unit & integration tests
├── 📂 docs/                            # PROJECT_COMPLETE_DOCUMENTATION.md
├── 🐳 docker-compose.yml               # Docker multi-container orchestrator
├── 📋 requirements.txt                 # Python dependencies
└── 📖 README.md                        # Project documentation
```

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 📡 API Reference

> **Base URL:** `http://localhost:8000` &nbsp;|&nbsp; **Swagger Docs:** `http://localhost:8000/docs`

| Method | Endpoint | Description | Key Parameters / Payload |
|:---:|:---|:---|:---|
| `GET` | `/health` | System status & supported tasks | — |
| `GET` | `/metadata` | Architecture & dataset configuration | — |
| `POST` | `/predict` | **Full pipeline inference** (DL + DIP + Risk) | `file` (Multipart Image), `task` (`odir`/`aptos`), Patient metadata |
| `POST` | `/generate-heatmap` | Grad-CAM++ visual explainability map | `file` (Image), `target_class` |
| `POST` | `/generate-report` | Complete clinical HTML/PDF report | `file` (Image), Patient metadata |
| `POST` | `/dip-analysis` | DIP biomarker extraction only | `file` (Image) |
| `POST` | `/restore` | Quality inspection & DIP restoration | `file` (Image) |
| `POST` | `/risk-score` | Composite clinical risk score calculation | `file` (Image) |

<details>
<summary><b>📘 Sample Request & Response Payload — POST /predict (Click to expand)</b></summary>

```json
{
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "task": "odir",
  "top_prediction": "Diabetic Retinopathy",
  "calibrated_confidence": 0.874,
  "class_probabilities": {
    "Normal": 0.082,
    "Diabetic Retinopathy": 0.874,
    "Glaucoma": 0.028,
    "Cataract": 0.009,
    "AMD": 0.007
  },
  "quality_gate": {
    "passed": true,
    "checks": {
      "resolution": true,
      "aspect_ratio": true,
      "blur_index": true,
      "exposure": true,
      "fov_coverage": true
    }
  },
  "dip_biomarkers": {
    "vessel_density_index": 0.142,
    "cup_to_disc_ratio": 0.42,
    "optic_disc_found": true,
    "exudate_candidate_count": 7,
    "exudate_area_ratio": 0.023,
    "vessel_tortuosity_index": 0.11
  },
  "clinical_risk": {
    "composite_risk_score": 62.4,
    "severity_grade": "Severe NPDR",
    "risk_level": "High Risk"
  }
}
```

</details>

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🚀 Quick Start

### 1️⃣ Clone & Switch Branch

```bash
git clone https://github.com/Jawahar08/RetinaGuard.git
cd RetinaGuard
git checkout shriram
```

### 2️⃣ Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Generate Test Fixtures & Run Smoke Test

```bash
python scripts/generate_fixtures.py       # Create synthetic retinal images
python scripts/smoke_test.py              # Execute end-to-end CPU verification
```

### 4️⃣ Start FastAPI Backend

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
> 📡 Server live at: **http://127.0.0.1:8000** &nbsp;|&nbsp; 📑 Docs: **http://127.0.0.1:8000/docs**

### 5️⃣ Start Next.js Frontend

```bash
cd frontend
npm install
npm run dev
```
> 🖥️ Dashboard live at: **http://localhost:3000**

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## 🐳 Docker Deployment

Run both backend microservice and frontend web app with a single command:

```bash
docker-compose up --build
```

| Service | Port | Description |
|:---|:---:|:---|
| `backend` | `:8000` | FastAPI service (PyTorch + OpenCV + DIP Engine) |
| `frontend` | `:3000` | Next.js 14 Dashboard UI |

<br />

<!-- ═══════════════════════════ GRADIENT SEPARATOR ═══════════════════════════ -->
<img src=".github/assets/divider-animated.svg" width="100%" />

<br />

## ⚠️ Medical & Research Disclaimer

> **Non-Clinical Research & Educational System**
> RetinaGuard is designed strictly for research, software architecture demonstration, and educational purposes. It is **not** an FDA-cleared, CE-marked, or clinically certified medical device. All outputs, risk scores, and visual heatmaps must be verified by a licensed ophthalmologist or healthcare professional before any diagnostic or clinical decision.

<br />

---

<div align="center">

<text font-family="'Segoe UI',sans-serif" font-size="12" fill="#64748b">
Built with PyTorch · FastAPI · Next.js 14 · OpenCV · Classical DIP · Grad-CAM++
<br />
RetinaGuard © 2026 — Research & Educational Use Only · Made with CJ❤️
</text>

</div>
