"""
Automated Clinical Diagnostic Report Generator.
Generates structured HTML/PDF diagnostic screening summaries.
"""
import base64
from datetime import datetime
from typing import Dict, Any, Optional


def generate_html_report(
    prediction_response: Dict[str, Any],
    overlay_base64: Optional[str] = None,
    original_base64: Optional[str] = None
) -> str:
    """Generates an HTML clinical screening report suitable for PDF printing / download."""
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
        .report-card {{ max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 30px; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }}
        .logo {{ font-size: 24px; font-weight: 800; color: #0284c7; }}
        .sublogo {{ font-size: 12px; color: #64748b; font-weight: 400; }}
        .meta {{ font-size: 13px; color: #64748b; text-align: right; }}
        .section-title {{ font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 25px; margin-bottom: 12px; border-left: 4px solid #0284c7; padding-left: 10px; }}
        .summary-box {{ display: flex; gap: 15px; background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px; justify-content: space-around; text-align: center; }}
        .metric-val {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }}
        th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background-color: #f8fafc; color: #475569; font-weight: 600; }}
        .progress-bar {{ background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; width: 120px; }}
        .progress-fill {{ background: #0284c7; height: 100%; }}
        .badge {{ padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }}
        .badge-success {{ background: #dcfce7; color: #166534; }}
        .badge-danger {{ background: #fee2e2; color: #991b1b; }}
        .image-grid {{ display: flex; gap: 20px; margin-top: 15px; }}
        .img-card {{ flex: 1; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }}
        .img-card img {{ width: 100%; max-height: 250px; object-fit: contain; border-radius: 6px; }}
        .alert-warning {{ background: #fffbeeb; border: 1px solid #fde68a; color: #92400e; padding: 12px; border-radius: 8px; margin-top: 15px; font-size: 13px; }}
        .disclaimer {{ margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4; }}
    </style>
</head>
<body>
    <div class="report-card">
        <div class="header">
            <div>
                <div class="logo">👁️ RetinaGuard AI</div>
                <div class="sublogo">Deep Learning Retinal Disease Screening System</div>
            </div>
            <div class="meta">
                <div><strong>Request ID:</strong> {req_id[:12]}...</div>
                <div><strong>Date:</strong> {now_str}</div>
                <div><strong>Task:</strong> {task} Screening</div>
            </div>
        </div>

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

        {img_section}

        <div class="disclaimer">
            <strong>Non-Clinical Research Disclaimer:</strong> RetinaGuard is an educational and research screening-support demonstration system. Predictions are generated by a deep neural network ensemble and must be evaluated by a certified ophthalmologist before taking clinical or diagnostic action.
        </div>
    </div>
</body>
</html>
"""
    return html
