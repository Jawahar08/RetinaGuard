"""
Script to extract APTOS 2019 and ODIR-5K raw datasets from Downloads into RetinaGuard/data/raw/.
"""
import sys
import os
import zipfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
DOWNLOADS_DIR = Path("C:/Users/shrir/Downloads")
DATA_RAW_DIR = ROOT_DIR / "data" / "raw"

APTOS_ZIP = DOWNLOADS_DIR / "aptos2019-blindness-detection.zip"
ODIR_ZIP = DOWNLOADS_DIR / "archive (3).zip"

APTOS_TARGET = DATA_RAW_DIR / "aptos"
ODIR_TARGET = DATA_RAW_DIR / "odir"


def extract_zip(zip_path: Path, target_dir: Path):
    if not zip_path.exists():
        print(f"[ERROR] Zip file not found: {zip_path}")
        return False

    print(f"[EXTRACTING] {zip_path.name} ({zip_path.stat().st_size / (1024**3):.2f} GB) to {target_dir}...")
    target_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as z:
        members = z.namelist()
        total = len(members)
        print(f"   Found {total} files inside zip...")
        
        for idx, member in enumerate(members, 1):
            z.extract(member, target_dir)
            if idx % 1000 == 0 or idx == total:
                print(f"   Extracted {idx}/{total} files ({(idx/total)*100:.1f}%)")

    print(f"[SUCCESS] Extracted {zip_path.name} successfully!\n")
    return True


def main():
    print("=" * 70)
    print("RETINAGUARD DATASET EXTRACTION PIPELINE")
    print("=" * 70)

    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)

    # 1. APTOS Extraction
    if APTOS_ZIP.exists():
        extract_zip(APTOS_ZIP, APTOS_TARGET)
    else:
        print(f"[WARNING] APTOS zip missing at {APTOS_ZIP}")

    # 2. ODIR Extraction
    if ODIR_ZIP.exists():
        extract_zip(ODIR_ZIP, ODIR_TARGET)
    else:
        print(f"[WARNING] ODIR zip missing at {ODIR_ZIP}")

    print("=" * 70)
    print("DATASET EXTRACTION COMPLETE!")
    print(f"   - APTOS Path: {APTOS_TARGET}")
    print(f"   - ODIR Path: {ODIR_TARGET}")
    print("=" * 70)


if __name__ == "__main__":
    main()
