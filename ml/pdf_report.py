"""
Feature 3 Enhanced: Automated Clinical Diagnostic Report Generator.
Generates structured HTML/PDF diagnostic screening summaries with:
  - DIP biomarker table (Feature 1 data)
  - Clinical risk score gauge (Feature 3 data)
  - Per-biomarker clinical interpretations
  - Clinical action recommendations
  - DIP overlay images (vessel mask, lesion mask, anatomy overlay)
"""
import base64
from datetime import datetime
from typing import Dict, Any, List, Optional


def _risk_gauge_svg(score: float, color: str, label: str) -> str:
    """Generate an SVG semi-circle gauge for risk score visualization."""
    # Arc from 180° to 0° (left to right semicircle)
    # score 0 = leftmost, score 100 = rightmost
    angle = 180 - (score / 100.0 * 180)
    import math
    rad = math.radians(angle)
    cx, cy, r = 100, 100, 80
    # End point of the arc
    ex = cx + r * math.cos(rad)
    ey = cy - r * math.sin(rad)
    large_arc = 1 if score > 50 else 0

    return f"""
    <svg viewBox="0 0 200 120" width="200" height="120" style="margin: 0 auto; display: block;">
        <!-- Background arc -->
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>
        <!-- Score arc -->
        <path d="M 20 100 A 80 80 0 {large_arc} 1 {ex:.1f} {ey:.1f}" fill="none" stroke="{color}" stroke-width="12" stroke-linecap="round"/>
        <!-- Score text -->
        <text x="100" y="90" text-anchor="middle" font-size="28" font-weight="800" fill="{color}">{score:.0f}</text>
        <text x="100" y="108" text-anchor="middle" font-size="11" fill="#64748b">{label}</text>
    </svg>
    """


def generate_html_report(
    prediction_response: Dict[str, Any],
    overlay_base64: Optional[str] = None,
    original_base64: Optional[str] = None,
    risk_result: Optional[Dict[str, Any]] = None,
    dip_biomarkers: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generates an HTML clinical screening report suitable for PDF printing / download.
    Enhanced with Feature 3: DIP biomarker table, risk gauge, interpretations, recommendations.
    """
    req_id = prediction_response.get("request_id", "N/A")
    task = prediction_response.get("task", "odir").upper()
    model_name = prediction_response.get("model_name", "RetinaGuard Stacking Ensemble")
    top_pred = prediction_response.get("top_prediction", "N/A")
    confidence = prediction_response.get("calibrated_confidence", 0.0)
    abstain = prediction_response.get("abstain", False)
    abstention_reason = prediction_response.get("abstention_reason", "")

    q_gate = prediction_response.get("quality_gate", {})
    quality_score = q_gate.get("quality_score", 1.0)
    q_passed = q_gate.get("passed", True)

    preds = prediction_response.get("predictions", [])
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Format predictions table
    rows_html = ""
    for p in preds:
        lbl = p.get("label", "")
        prob = p.get("probability", 0.0)
        is_pos = p.get("is_positive", False)
        badge_cls = "badge-danger" if (is_pos and lbl != "Normal" and lbl != "No DR") else "badge-success"
        badge_text = "POSSIBLE LESION" if is_pos else "CLEAR"
        rows_html += f"""
        <tr>
            <td><strong>{lbl}</strong></td>
            <td>{prob * 100:.1f}%</td>
            <td>
                <div class="progress-bar"><div class="progress-fill" style="width: {prob * 100}%;"></div></div>
            </td>
            <td><span class="badge {badge_cls}">{badge_text}</span></td>
        </tr>
        """

    # Patient info
    p_info = prediction_response.get("patient_info") or {}
    patient_name = p_info.get("name") or "Unspecified Patient"
    patient_age = p_info.get("age") or "N/A"
    patient_gender = p_info.get("gender") or "N/A"
    blood_group = p_info.get("blood_group") or "N/A"
    diabetic_status = p_info.get("diabetic_status") or "Unspecified"
    hypertension = p_info.get("hypertension") or "Unspecified"
    symptoms = p_info.get("symptoms") or "None reported"

    patient_profile_html = f"""
    <div class="patient-card">
        <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 8px;">👤 PATIENT MEDICAL PROFILE</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 13px;">
            <div><strong>Patient Name:</strong> {patient_name}</div>
            <div><strong>Age / Gender:</strong> {patient_age} yrs ({patient_gender})</div>
            <div><strong>Blood Group:</strong> <span class="blood-badge">{blood_group}</span></div>
            <div><strong>Diabetes:</strong> {diabetic_status}</div>
            <div><strong>Hypertension:</strong> {hypertension}</div>
            <div style="grid-column: span 3;"><strong>Visual Symptoms:</strong> {symptoms}</div>
        </div>
    </div>
    """

    # ── Feature 3: Risk Score Section ──
    risk_section_html = ""
    if risk_result:
        rs = risk_result.get("risk_score", 0)
        sg = risk_result.get("severity_grade", "Unknown")
        rl = risk_result.get("risk_level", "Unknown")
        rc = risk_result.get("risk_color", "#64748b")
        sub = risk_result.get("sub_scores", {})
        interps = risk_result.get("interpretations", [])
        recs = risk_result.get("recommendations", [])

        gauge_svg = _risk_gauge_svg(rs, rc, rl)

        sub_score_rows = ""
        for key, val in sub.items():
            label = key.replace("_", " ").title()
            bar_color = "#22c55e" if val <= 30 else ("#eab308" if val <= 60 else "#ef4444")
            sub_score_rows += f"""
            <tr>
                <td>{label}</td>
                <td>{val:.0f}/100</td>
                <td><div class="progress-bar"><div class="progress-fill" style="width: {val}%; background: {bar_color};"></div></div></td>
            </tr>"""

        interp_items = "".join(f"<li>{i}</li>" for i in interps)
        next_checkup_date = risk_result.get("next_checkup_date", "To be determined by clinician")
        followup_interval = risk_result.get("followup_interval", "Standard Annual Screening")

        rec_items = "".join(f"<li>{r}</li>" for r in recs)

        risk_section_html = f"""
        <div class="section-title">🎯 Clinical Risk Assessment</div>
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 15px;">
            <div style="flex: 0 0 220px; text-align: center;">
                {gauge_svg}
                <div style="font-size: 16px; font-weight: 700; color: {rc}; margin-top: 5px;">{sg}</div>
            </div>
            <div style="flex: 1;">
                <table>
                    <thead><tr><th>Risk Component</th><th>Score</th><th>Level</th></tr></thead>
                    <tbody>{sub_score_rows}</tbody>
                </table>
            </div>
        </div>

        <div class="section-title">🗓️ EXPECTED NEXT CHECK-UP SCHEDULE</div>
        <div style="background: #f0f9ff; border: 2px solid #0284c7; border-radius: 10px; padding: 16px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #0369a1; font-weight: 800;">Recommended Follow-up Date</div>
                <div style="font-size: 22px; font-weight: 800; color: #0284c7; margin-top: 4px;">📅 {next_checkup_date}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700;">Recommended Frequency</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;">⏱️ {followup_interval}</div>
            </div>
        </div>

        <div class="section-title">📋 Clinical Interpretations</div>
        <ul class="interp-list">{interp_items}</ul>

        <div class="section-title">💊 Clinical Recommendations</div>
        <ul class="rec-list">{rec_items}</ul>
        """

    # ── Feature 1: DIP Biomarker Section ──
    dip_section_html = ""
    if dip_biomarkers:
        vdi = dip_biomarkers.get("vessel_density_index", 0)
        ma_count = dip_biomarkers.get("microaneurysm_candidate_count", 0)
        exu_count = dip_biomarkers.get("exudate_candidate_count", 0)
        exu_ratio = dip_biomarkers.get("exudate_area_ratio", 0)
        od_found = dip_biomarkers.get("optic_disc_found", False)
        od_bbox = dip_biomarkers.get("optic_disc_bbox", None)
        mac_center = dip_biomarkers.get("macula_center", None)

        vessel_b64 = dip_biomarkers.get("vessel_mask_base64", "")
        lesion_b64 = dip_biomarkers.get("lesion_mask_base64", "")
        anatomy_b64 = dip_biomarkers.get("anatomy_overlay_base64", "")

        dip_images = ""
        if vessel_b64 or lesion_b64 or anatomy_b64:
            img_cards = ""
            if vessel_b64:
                img_cards += f'<div class="img-card"><h4>Vessel Segmentation</h4><img src="data:image/png;base64,{vessel_b64}" alt="Vessel Mask"/></div>'
            if lesion_b64:
                img_cards += f'<div class="img-card"><h4>Lesion Candidates</h4><img src="data:image/png;base64,{lesion_b64}" alt="Lesion Mask"/></div>'
            if anatomy_b64:
                img_cards += f'<div class="img-card"><h4>Anatomy Overlay</h4><img src="data:image/png;base64,{anatomy_b64}" alt="Anatomy"/></div>'
            dip_images = f'<div class="image-grid" style="grid-template-columns: repeat(3, 1fr);">{img_cards}</div>'

        dip_section_html = f"""
        <div class="section-title">🔬 DIP Structural Biomarker Analysis</div>
        <div class="summary-box" style="grid-template-columns: repeat(4, 1fr);">
            <div>
                <div>Vessel Density</div>
                <div class="metric-val">{vdi:.4f}</div>
            </div>
            <div>
                <div>Microaneurysms</div>
                <div class="metric-val">{ma_count}</div>
            </div>
            <div>
                <div>Exudates</div>
                <div class="metric-val">{exu_count}</div>
            </div>
            <div>
                <div>Exudate Ratio</div>
                <div class="metric-val">{exu_ratio:.4f}</div>
            </div>
        </div>
        <div style="margin-top: 10px; font-size: 13px; color: #475569;">
            <strong>Optic Disc:</strong> {'✅ Detected' if od_found else '❌ Not detected'}
            {f' — bbox: {od_bbox}' if od_bbox else ''}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Macula:</strong> {f'center at {mac_center}' if mac_center else 'Not estimated'}
        </div>
        {dip_images}
        """

    # ── Original + Grad-CAM images ──
    img_section = ""
    if original_base64 and overlay_base64:
        img_section = f"""
        <div class="image-grid">
            <div class="img-card">
                <h4>Original Retinal Image</h4>
                <img src="{original_base64}" alt="Original Retinal Image" />
            </div>
            <div class="img-card">
                <h4>Grad-CAM++ Lesion Grounding Map</h4>
                <img src="{overlay_base64}" alt="Grad-CAM Overlay" />
            </div>
        </div>
        """

    abstain_box = ""
    if abstain:
        abstain_box = f"""
        <div class="alert-warning">
            ⚠️ <strong>CLINICAL ABSTENTION NOTICE:</strong> {abstention_reason}
        </div>
        """

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>RetinaGuard AI Clinical Diagnostic Screening Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
        .report-card {{ max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 30px; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }}
        .logo {{ font-size: 24px; font-weight: 800; color: #0284c7; }}
        .sublogo {{ font-size: 12px; color: #64748b; font-weight: 400; }}
        .meta {{ font-size: 13px; color: #64748b; text-align: right; }}
        .section-title {{ font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 25px; margin-bottom: 12px; border-left: 4px solid #0284c7; padding-left: 10px; }}
        .summary-box {{ display: grid; gap: 15px; background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; justify-content: space-around; text-align: center; grid-template-columns: repeat(3, 1fr); }}
        .metric-val {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }}
        th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background-color: #f8fafc; color: #475569; font-weight: 600; }}
        .progress-bar {{ background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; width: 120px; }}
        .progress-fill {{ background: #0284c7; height: 100%; }}
        .badge {{ padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }}
        .badge-success {{ background: #dcfce7; color: #166534; }}
        .badge-danger {{ background: #fee2e2; color: #991b1b; }}
        .image-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }}
        .img-card {{ text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }}
        .img-card img {{ width: 100%; max-height: 250px; object-fit: contain; border-radius: 6px; }}
        .img-card h4 {{ margin: 0 0 8px 0; font-size: 13px; color: #475569; }}
        .patient-card {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 20px; color: #1e3a8a; }}
        .blood-badge {{ background: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }}
        .alert-warning {{ background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 12px; border-radius: 8px; margin-top: 15px; font-size: 13px; }}
        .interp-list, .rec-list {{ font-size: 13px; line-height: 1.8; color: #334155; padding-left: 20px; }}
        .rec-list li {{ color: #0f172a; font-weight: 500; }}
        .disclaimer {{ margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4; }}
        @media print {{ body {{ padding: 0; }} .report-card {{ box-shadow: none; }} }}
    </style>
</head>
<body>
    <div class="report-card">
        <div class="header">
            <div>
                <div class="logo">👁️ RetinaGuard AI</div>
                <div class="sublogo">Deep Learning + Classical DIP Retinal Disease Screening System</div>
            </div>
            <div class="meta">
                <div><strong>Request ID:</strong> {req_id[:12]}...</div>
                <div><strong>Date:</strong> {now_str}</div>
                <div><strong>Task:</strong> {task} Screening</div>
            </div>
        </div>

        {patient_profile_html}
        {abstain_box}

        <div class="section-title">Diagnostic Screening Summary</div>
        <div class="summary-box">
            <div>
                <div>Primary Impression</div>
                <div class="metric-val" style="color: #0284c7;">{top_pred}</div>
            </div>
            <div>
                <div>Model Confidence</div>
                <div class="metric-val">{confidence * 100:.1f}%</div>
            </div>
            <div>
                <div>Quality Score</div>
                <div class="metric-val" style="color: {'#166534' if q_passed else '#991b1b'};">{quality_score * 100:.0f}%</div>
            </div>
        </div>

        {risk_section_html}

        <div class="section-title">Multi-Disease Risk Analysis</div>
        <table>
            <thead>
                <tr>
                    <th>Disease Category</th>
                    <th>Probability</th>
                    <th>Risk Gauge</th>
                    <th>Screening Status</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>

        {dip_section_html}
        {img_section}

        <div class="disclaimer">
            <strong>Non-Clinical Research Disclaimer:</strong> RetinaGuard is an educational and research screening-support demonstration system. Predictions are generated by a deep neural network ensemble and classical DIP biomarker analysis, and must be evaluated by a certified ophthalmologist before taking clinical or diagnostic action.
        </div>
    </div>
</body>
</html>
"""
    return html
