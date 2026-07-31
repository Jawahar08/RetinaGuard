"""
RetinaGuard++ Classical Digital Image Processing (DIP) & Fusion Engine Package.
Exposes quantitative retinal structural biomarker extractors and hybrid AI fusion network.
"""
from ml.dip.vessel_analysis import extract_vessel_tortuosity_and_caliber
from ml.dip.branching_analysis import extract_branching_angles
from ml.dip.artery_vein_classifier import classify_arteries_and_veins
from ml.dip.optic_cup import segment_optic_cup_and_disc
from ml.dip.lesion_density import compute_lesion_density_and_clusters
from ml.dip.hemorrhage import segment_hemorrhages
from ml.dip.cotton_wool import detect_cotton_wool_spots
from ml.dip.fractal_dimension import compute_vascular_fractal_dimension
from ml.dip.regional_density import compute_regional_vessel_density
from ml.dip.fusion_engine import ClinicalFusionEngine
from ml.dip.explainability import generate_clinical_rationale

__all__ = [
    "extract_vessel_tortuosity_and_caliber",
    "extract_branching_angles",
    "classify_arteries_and_veins",
    "segment_optic_cup_and_disc",
    "compute_lesion_density_and_clusters",
    "segment_hemorrhages",
    "detect_cotton_wool_spots",
    "compute_vascular_fractal_dimension",
    "compute_regional_vessel_density",
    "ClinicalFusionEngine",
    "generate_clinical_rationale",
]
