# Model Card — Retinal Fundus-Image Ensemble System

## Model Details

- **Model Name**: Retinal Disease Screening Deep Learning Ensemble
- **Version**: `1.0.0-demo`
- **Architectures**:
  1. **ResNet50**: ImageNet weights, 2048-dim feature output, target layer `layer4`.
  2. **DenseNet121**: ImageNet weights, 1024-dim feature output, target layer `features.denseblock4`.
  3. **EfficientNetB3**: ImageNet weights, 1536-dim feature output, target layer `features.7`.
  4. **Feature Fusion**: 4608-dim feature concatenation with MLP (`4608 -> 1024 -> 512 -> 256 -> Task Head`).
  5. **Soft Voting**: Probability averaging across aligned label schemas.
  6. **Stacking**: Out-of-fold predictions fit to an XGBoost meta-classifier.

## Intended Use

- **Intended Purpose**: Educational demonstration, academic research, and screening-support research.
- **Out-of-Scope Use**:
  - Direct clinical diagnosis or treatment planning.
  - Autonomous medical decision making without clinician oversight.
  - Processing corrupt, unreadable, non-retinal, or OOD images (filtered by Image Quality Gate).

## Data Provenance

- **ODIR**: Multi-label disease classification (Normal, Diabetic Retinopathy, Glaucoma, Cataract, AMD).
- **APTOS 2019**: 5-class Diabetic Retinopathy severity grading (No DR to Severe).

## Model Provenance & Artifact Tracking

Every inference response includes:
- Request ID
- Task name & schema version
- Model version
- Preprocessing version
- Quality Gate outcome & flags
- Calibrated confidence score
- Human-review / Abstention status

## Ethical & Clinical Risk Register

1. **Over-reliance on Automated Predictions**: AI screening outputs should assist, never replace, trained ophthalmologists.
2. **Domain Shift Risk**: Images acquired from different fundus cameras, illuminations, or patient ethnicities may exhibit distribution drift.
3. **Data Leakage Mitigation**: Grouped splits by patient/eye ID prevent in-sample memorization during cross-validation.

## Clinical Safety Disclaimer

> [!CAUTION]
> **Non-Clinical System**: This software is not clinically validated, FDA-cleared, or CE-marked. It must not be used as a primary diagnostic device.
