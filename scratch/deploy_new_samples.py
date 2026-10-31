import os
import shutil
from PIL import Image

artifacts_dir = r"C:\Users\cjawa\.gemini\antigravity-ide\brain\7db77c58-311f-4510-9e50-2a6109b55e3c"

mapping = {
    "normal": "sample_normal_retina_1785753489897.png",
    "dr_severe": "sample_diabetic_retinopathy_1785753504243.png",
    "glaucoma": "sample_glaucoma_1785753518370.png",
    "cataract": "sample_cataract_1785753534216.png",
    "amd": "sample_amd_1785753548858.png",
    "dr_mild": "sample_dr_mild_1785753565674.png",
    "dr_moderate": "sample_dr_moderate_1785753581894.png",
    "dr_proliferative": "sample_dr_proliferative_1785753595675.png"
}

public_samples_dir = r"c:\Users\cjawa\RetinaGaurd\frontend\public\samples"
test_images_dir = r"c:\Users\cjawa\RetinaGaurd\data\test_images"

destinations = [
    # (key, target_public, target_data)
    ("normal", "odir_normal.jpg", "01_Normal_Healthy_Retina.jpg"),
    ("dr_severe", "odir_dr.jpg", "02_Diabetic_Retinopathy_Severe.jpg"),
    ("glaucoma", "odir_glaucoma.jpg", "03_Glaucoma_Optic_Nerve_Damage.jpg"),
    ("cataract", "odir_cataract.jpg", "04_Cataract_Lens_Opacity.jpg"),
    ("amd", "odir_amd.jpg", "05_AMD_Macular_Degeneration.jpg"),
    ("normal", "aptos_stage_0_normal.png", "06_APTOS_Stage0_No_DR.png"),
    ("dr_mild", "aptos_stage_1_mild.png", "07_APTOS_Stage1_Mild_DR.png"),
    ("dr_moderate", "aptos_stage_2_moderate.png", "08_APTOS_Stage2_Moderate_DR.png"),
    ("dr_severe", "aptos_stage_3_severe.png", "09_APTOS_Stage3_Severe_DR.png"),
    ("dr_proliferative", "aptos_stage_4_proliferative.png", "10_APTOS_Stage4_Proliferative_DR.png"),
]

for key, pub_name, data_name in destinations:
    src_file = os.path.join(artifacts_dir, mapping[key])
    if not os.path.exists(src_file):
        print(f"Source file missing: {src_file}")
        continue
    
    img = Image.open(src_file)
    
    # Save to public/samples
    pub_path = os.path.join(public_samples_dir, pub_name)
    if pub_name.lower().endswith(".jpg") or pub_name.lower().endswith(".jpeg"):
        img.convert("RGB").save(pub_path, "JPEG", quality=95)
    else:
        img.save(pub_path, "PNG")
    print(f"Updated {pub_path}")

    # Save to data/test_images
    data_path = os.path.join(test_images_dir, data_name)
    if data_name.lower().endswith(".jpg") or data_name.lower().endswith(".jpeg"):
        img.convert("RGB").save(data_path, "JPEG", quality=95)
    else:
        img.save(data_path, "PNG")
    print(f"Updated {data_path}")

print("All sample images updated successfully!")
