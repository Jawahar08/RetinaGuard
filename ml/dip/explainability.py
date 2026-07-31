"""
Explainability Engine: Clinical Rationale & Diagnostic Evidence Generator
==========================================================================
Translates deep learning predictions and 13 quantitative DIP structural biomarkers
into evidence-backed natural language clinical rationales for diagnostic transparency.
"""
from typing import Dict, List, Tuple


def generate_clinical_rationale(
    prediction: str,
    confidence: float,
    biomarkers: Dict
) -> Tuple[str, List[str]]:
    """
    Generates structured clinical diagnostic evidence and markdown rationale text.
    
    Returns:
      (markdown_rationale, evidence_bullets)
    """
    evidence = []
    
    # 1. Microaneurysm & Exudate Evidence
    ma_count = biomarkers.get("microaneurysm_count", 0)
    exudate_ratio = biomarkers.get("exudate_area_ratio", 0.0)
    
    if ma_count >= 15:
        evidence.append(f"High Microaneurysm Density: {ma_count} microaneurysm candidates detected (Normal < 3).")
    elif ma_count >= 5:
        evidence.append(f"Moderate Microaneurysms: {ma_count} microaneurysms detected.")
    else:
        evidence.append(f"Low Microaneurysm Count: {ma_count} detected.")
        
    if exudate_ratio >= 0.02:
        evidence.append(f"Significant Hard Exudates: Exudate area ratio is {exudate_ratio:.4f} (Normal < 0.005).")
    elif exudate_ratio >= 0.005:
        evidence.append(f"Mild Hard Exudate Accumulation: Exudate area ratio is {exudate_ratio:.4f}.")
        
    # 2. Hemorrhage & Cotton Wool Spots Evidence
    hem_count = biomarkers.get("hemorrhage_count", 0)
    cws_count = biomarkers.get("cotton_wool_spot_count", 0)
    
    if hem_count > 0:
        evidence.append(f"Retinal Hemorrhages: {hem_count} intraretinal dot/blot/flame hemorrhages detected.")
    if cws_count > 0:
        evidence.append(f"Microvascular Ischemia: {cws_count} Cotton Wool Spots detected.")
        
    # 3. Vessel Structural Biomarkers Evidence
    tortuosity = biomarkers.get("vessel_tortuosity_index", 1.08)
    avr = biomarkers.get("artery_vein_ratio", 0.67)
    cdr = biomarkers.get("cup_disc_ratio", 0.40)
    fractal_d = biomarkers.get("vascular_fractal_dimension", 1.42)
    
    if tortuosity >= 1.25:
        evidence.append(f"Elevated Vessel Tortuosity: Tortuosity Index = {tortuosity:.3f} (Normal < 1.15) indicating vascular strain.")
    if avr < 0.60:
        evidence.append(f"Arteriolar Narrowing: Artery-to-Vein Ratio (AVR) = {avr:.2f} (Normal 0.65 - 0.75) indicating hypertensive remodeling.")
    if cdr >= 0.50:
        evidence.append(f"Glaucomatous Optic Cupping: Cup-to-Disc Ratio (CDR) = {cdr:.2f} (Normal < 0.45).")
    if fractal_d < 1.35:
        evidence.append(f"Vascular Density Dropout: Fractal Dimension D = {fractal_d:.3f} (Normal 1.40 - 1.45) suggesting capillary loss.")
        
    # Markdown Summary Rationale
    md_lines = [
        f"### 📋 Clinical Diagnostic Summary & Evidence Rationale",
        f"**Primary Diagnosis**: **{prediction}** *(Confidence: {confidence * 100:.1f}%)*",
        "",
        "#### Quantitative Structural Evidence:",
    ]
    for bullet in evidence:
        md_lines.append(f"- 🔬 {bullet}")
        
    md_lines.extend([
        "",
        "---",
        "*This hybrid diagnosis is produced by fusing Deep Learning CNN feature representations with 13 classical Digital Image Processing (DIP) structural biomarkers.*"
    ])
    
    markdown_rationale = "\n".join(md_lines)
    return markdown_rationale, evidence
