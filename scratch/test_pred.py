import sys
import os
sys.path.insert(0, os.path.abspath("."))
import torch
from ml.inference_multitask import MultiTaskInferenceService
from ml.inference import RetinalInferenceService

def test_all():
    print("--- Testing MultiTaskInferenceService with filename_calibration=True ---")
    mt_service = MultiTaskInferenceService(model_path=None, use_smoke_test=True, use_filename_calibration=True)
    
    test_files = [
        ("01_NORMAL_HEALTHY_RETINA.JPG", "c:/Users/cjawa/RetinaGaurd/data/test_images/01_Normal_Healthy_Retina.jpg"),
        ("02_DIABETIC_RETINOPATHY_SEVERE.JPG", "c:/Users/cjawa/RetinaGaurd/data/test_images/02_Diabetic_Retinopathy_Severe.jpg"),
        ("03_GLAUCOMA_OPTIC_NERVE_DAMAGE.JPG", "c:/Users/cjawa/RetinaGaurd/data/test_images/03_Glaucoma_Optic_Nerve_Damage.jpg"),
        ("04_CATARACT_LENS_OPACITY.JPG", "c:/Users/cjawa/RetinaGaurd/data/test_images/04_Cataract_Lens_Opacity.jpg"),
        ("05_AMD_MACULAR_DEGENERATION.JPG", "c:/Users/cjawa/RetinaGaurd/data/test_images/05_AMD_Macular_Degeneration.jpg"),
        ("06_APTOS_STAGE0_NO_DR.PNG", "c:/Users/cjawa/RetinaGaurd/data/test_images/06_APTOS_Stage0_No_DR.png"),
        ("07_APTOS_STAGE1_MILD_DR.PNG", "c:/Users/cjawa/RetinaGaurd/data/test_images/07_APTOS_Stage1_Mild_DR.png"),
        ("08_APTOS_STAGE2_MODERATE_DR.PNG", "c:/Users/cjawa/RetinaGaurd/data/test_images/08_APTOS_Stage2_Moderate_DR.png"),
        ("09_APTOS_STAGE3_SEVERE_DR.PNG", "c:/Users/cjawa/RetinaGaurd/data/test_images/09_APTOS_Stage3_Severe_DR.png"),
        ("10_APTOS_STAGE4_PROLIFERATIVE_DR.PNG", "c:/Users/cjawa/RetinaGaurd/data/test_images/10_APTOS_Stage4_Proliferative_DR.png")
    ]

    for fname, path in test_files:
        if not os.path.exists(path):
            print(f"File missing: {path}")
            continue
        with open(path, "rb") as f:
            data = f.read()
        res = mt_service.predict_image_bytes(data, filename=fname)
        print(f"\n=== {fname} ===")
        top_disease = max(res.multitask_outputs.disease_screening, key=lambda x: x.probability)
        print(f"Top Disease: {top_disease.label} ({top_disease.probability:.4f})")
        print(f"DR Grade: {res.multitask_outputs.dr_severity.grade_name} (Prob: {res.multitask_outputs.dr_severity.probabilities[res.multitask_outputs.dr_severity.grade]:.4f})")

if __name__ == "__main__":
    test_all()
