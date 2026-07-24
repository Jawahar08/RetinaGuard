"""
Data Validation, Duplicate Detection, and Grouped Leakage-Safe Splitting.
"""
import hashlib
from pathlib import Path
from typing import Dict, List, Set, Tuple
import numpy as np
import pandas as pd
from PIL import Image


def compute_md5(file_path: Path) -> str:
    """Computes MD5 hash of image bytes for exact duplicate detection."""
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()


def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
    """Computes difference hash (dHash) for perceptual near-duplicate detection."""
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    pixels = np.array(resized)
    # Compare adjacent pixels in each row
    diff = pixels[:, 1:] > pixels[:, :-1]
    # Convert boolean array to hex hash string
    return hex(int("".join(diff.flatten().astype(int).astype(str)), 2))[2:].zfill(16)


def find_duplicates(img_dir: Path) -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    """
    Scans directory for exact (MD5) and near (dHash) duplicate images.
    Returns (md5_duplicates, dhash_duplicates).
    """
    md5_map: Dict[str, List[str]] = {}
    dhash_map: Dict[str, List[str]] = {}

    for img_path in Path(img_dir).glob("*.[pP][nN][gG]"):
        try:
            md5_val = compute_md5(img_path)
            md5_map.setdefault(md5_val, []).append(img_path.name)

            with Image.open(img_path) as img:
                dhash_val = compute_dhash(img)
                dhash_map.setdefault(dhash_val, []).append(img_path.name)
        except Exception:
            continue

    exact_dupes = {k: v for k, v in md5_map.items() if len(v) > 1}
    near_dupes = {k: v for k, v in dhash_map.items() if len(v) > 1}

    return exact_dupes, near_dupes


def create_grouped_splits(
    df: pd.DataFrame,
    group_col: Optional[str] = "subject_id",
    test_size: float = 0.2,
    val_size: float = 0.15,
    seed: int = 42
) -> pd.DataFrame:
    """
    Creates leakage-safe train/val/test splits grouped by subject/eye identifier.
    Ensures images from the same subject never cross split boundaries.
    """
    df = df.copy()
    np.random.seed(seed)

    if group_col and group_col in df.columns:
        groups = df[group_col].unique()
        np.random.shuffle(groups)

        n_groups = len(groups)
        n_test = int(n_groups * test_size)
        n_val = int(n_groups * val_size)

        test_groups = set(groups[:n_test])
        val_groups = set(groups[n_test:n_test + n_val])
        train_groups = set(groups[n_test + n_val:])

        def assign_split(g):
            if g in test_groups: return "test"
            elif g in val_groups: return "val"
            else: return "train"

        df["split"] = df[group_col].apply(assign_split)
    else:
        # Fallback random stratifiable split if subject ID is unavailable
        indices = np.arange(len(df))
        np.random.shuffle(indices)

        n_test = int(len(df) * test_size)
        n_val = int(len(df) * val_size)

        df["split"] = "train"
        df.iloc[indices[:n_test], df.columns.get_loc("split")] = "test"
        df.iloc[indices[n_test:n_test + n_val], df.columns.get_loc("split")] = "val"

    return df
