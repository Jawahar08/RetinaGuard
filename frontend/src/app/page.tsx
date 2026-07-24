'use client';

import React, { useState, useRef } from 'react';
import { ShieldAlert, Upload, Eye, FileText, Activity, AlertTriangle, CheckCircle, RefreshCw, Layers, Info, Download } from 'lucide-react';

interface ClassPrediction {
  label: str;
  probability: number;
  is_positive: boolean;
}

interface QualityGateResult {
  passed: boolean;
  quality_score: number;
  rejection_reason?: string;
  flags: string[];
}

interface PredictionResponse {
  request_id: string;
  task: string;
  model_name: string;
  model_version: string;
  quality_gate: QualityGateResult;
  predictions: ClassPrediction[];
  top_prediction: string;
  calibrated_confidence: number;
  abstain: boolean;
  abstention_reason?: string;
  disclaimer: string;
}

interface HeatmapResponse {
  request_id: string;
  target_label: string;
  architecture: string;
  target_layer: string;
  original_image_base64: string;
  heatmap_base64: string;
  overlay_base64: string;
  disclaimer: string;
}

const DISEASE_INFO: Record<string, string> = {
  'Normal': 'Retinal fundus structure shows clear optic disc, healthy macula, and normal vascular patterns.',
  'Diabetic Retinopathy': 'Microvascular complication of diabetes causing retinal ischemia, microaneurysms, hemorrhages, and exudates.',
  'Glaucoma': 'Progressive optic neuropathy characterized by optic disc cupping and retinal nerve fiber layer loss.',
  'Cataract': 'Opacification of the crystalline lens impairing light transmission to the retina.',
  'AMD': 'Age-related Macular Degeneration affecting central vision through drusen deposition or choroidal neovascularization.'
};

export default function RetinalDashboard() {
  const [task, setTask] = useState<'odir' | 'aptos'>('odir');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useMock, setUseMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [activeHeatmapTab, setActiveHeatmapTab] = useState<'overlay' | 'heatmap' | 'original'>('overlay');
  const [targetLabel, setTargetLabel] = useState<string>('Diabetic Retinopathy');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, JPEG, PNG).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File size exceeds 15MB limit.');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPrediction(null);
    setHeatmapData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const runPrediction = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setErrorMsg(null);

    if (useMock) {
      // Mock response flow
      setTimeout(() => {
        const mockPred: PredictionResponse = {
          request_id: 'mock-uuid-1234',
          task: task,
          model_name: 'ResNet50-DenseNet121-EfficientNetB3 Ensemble (Mock)',
          model_version: '1.0.0-demo',
          quality_gate: {
            passed: true,
            quality_score: 0.92,
            flags: []
          },
          predictions: task === 'odir' ? [
            { label: 'Normal', probability: 0.12, is_positive: false },
            { label: 'Diabetic Retinopathy', probability: 0.88, is_positive: true },
            { label: 'Glaucoma', probability: 0.05, is_positive: false },
            { label: 'Cataract', probability: 0.03, is_positive: false },
            { label: 'AMD', probability: 0.02, is_positive: false }
          ] : [
            { label: 'No DR', probability: 0.05, is_positive: false },
            { label: 'Mild DR', probability: 0.15, is_positive: false },
            { label: 'Moderate DR', probability: 0.72, is_positive: true },
            { label: 'Severe DR', probability: 0.06, is_positive: false },
            { label: 'Proliferative DR', probability: 0.02, is_positive: false }
          ],
          top_prediction: task === 'odir' ? 'Diabetic Retinopathy (88.00%)' : 'Moderate DR',
          calibrated_confidence: 0.88,
          abstain: false,
          disclaimer: 'For research and educational screening support only. Not clinically validated.'
        };
        setPrediction(mockPred);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('task', task);

      const res = await fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Prediction failed.');
      }

      const data: PredictionResponse = await res.json();
      setPrediction(data);

      // Auto-trigger Grad-CAM if passed quality gate
      if (data.quality_gate.passed) {
        fetchHeatmap(data.predictions[0]?.label || 'Diabetic Retinopathy');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to communicate with API server.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeatmap = async (labelToExplain: string) => {
    if (!selectedFile || useMock) return;
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_label', labelToExplain);
      formData.append('task', task);

      const res = await fetch(`${apiBaseUrl}/generate-heatmap`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data: HeatmapResponse = await res.json();
        setHeatmapData(data);
      }
    } catch (err) {
      console.error('Heatmap generation failed:', err);
    }
  };

  const downloadReport = () => {
    if (!prediction) return;
    const reportContent = {
      title: 'Retinal Disease Screening Summary Report',
      timestamp: new Date().toISOString(),
      request_id: prediction.request_id,
      task: prediction.task.toUpperCase(),
      model: prediction.model_name,
      quality_check: prediction.quality_gate,
      prediction: prediction.top_prediction,
      calibrated_confidence: `${(prediction.calibrated_confidence * 100).toFixed(1)}%`,
      abstain_status: prediction.abstain ? `ABSTAINED (${prediction.abstention_reason})` : 'PASSED',
      per_class_probabilities: prediction.predictions,
      disclaimer: prediction.disclaimer
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retinal_screening_report_${prediction.request_id.slice(0, 8)}.json`;
    a.click();
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, background: 'linear-gradient(90deg, #06b6d4, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Retinal Ensemble Disease Screening
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Deep Learning Multi-Model Ensemble (ResNet50, DenseNet121, EfficientNetB3) & Grad-CAM Visual Explainability
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
            Mock API Mode
          </label>
        </div>
      </header>

      {/* Clinical Disclaimer Banner */}
      <div className="disclaimer-banner">
        <ShieldAlert size={20} />
        <div>
          <strong>Educational & Research Screening Demonstration Only:</strong> This system is not clinically validated for diagnostic or treatment decisions. All predictions must be reviewed by a certified ophthalmologist.
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '28px' }}>
        
        {/* Left Column: Task & Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Task Selector Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-cyan)" /> 1. Select Screening Task
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                className={`btn-secondary ${task === 'odir' ? 'active' : ''}`}
                onClick={() => setTask('odir')}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  borderColor: task === 'odir' ? 'var(--accent-cyan)' : 'var(--bg-card-border)',
                  background: task === 'odir' ? 'rgba(6, 182, 212, 0.1)' : 'transparent'
                }}
              >
                <div style={{ fontWeight: 600, color: task === 'odir' ? 'var(--accent-cyan)' : 'var(--text-main)' }}>ODIR Multi-Label</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Normal, DR, Glaucoma, Cataract, AMD</div>
              </button>

              <button
                className={`btn-secondary ${task === 'aptos' ? 'active' : ''}`}
                onClick={() => setTask('aptos')}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  borderColor: task === 'aptos' ? 'var(--accent-indigo)' : 'var(--bg-card-border)',
                  background: task === 'aptos' ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                }}
              >
                <div style={{ fontWeight: 600, color: task === 'aptos' ? 'var(--accent-indigo)' : 'var(--text-main)' }}>APTOS Severity</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>5-Class DR Severity (No DR to Severe)</div>
              </button>
            </div>
          </div>

          {/* Upload Dropzone Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} color="var(--accent-cyan)" /> 2. Upload Retinal Fundus Image
            </h2>

            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {previewUrl ? (
                <div>
                  <img src={previewUrl} alt="Fundus Preview" style={{ maxHeight: '220px', borderRadius: '8px', margin: '0 auto', display: 'block' }} />
                  <p style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--accent-cyan)', fontWeight: 500 }}>{selectedFile?.name}</p>
                </div>
              ) : (
                <div>
                  <Eye size={40} color="var(--accent-cyan)" style={{ marginBottom: '12px' }} />
                  <p style={{ fontWeight: 600, fontSize: '1rem' }}>Drag and drop retinal photograph here</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Supports JPG, JPEG, PNG up to 15MB</p>
                </div>
              )}
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '0.875rem', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> {errorMsg}
              </div>
            )}

            <button
              className="btn-primary"
              onClick={runPrediction}
              disabled={!selectedFile || isLoading}
              style={{ width: '100%', marginTop: '20px', justifyContent: 'center', opacity: !selectedFile || isLoading ? 0.6 : 1 }}
            >
              {isLoading ? (
                <> <RefreshCw size={18} className="animate-spin" /> Processing Preprocessing & Inference... </>
              ) : (
                <> <Activity size={18} /> Run AI Screening Analysis </>
              )}
            </button>
          </div>

          {/* Curated Disease Information */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color="var(--accent-cyan)" /> Clinical Condition Reference
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              {Object.entries(DISEASE_INFO).map(([disease, info]) => (
                <div key={disease} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{disease}:</strong> <span style={{ color: 'var(--text-muted)' }}>{info}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Prediction Results & Grad-CAM Overlay */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {!prediction ? (
            <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Activity size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>No Analysis Results Yet</p>
              <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>Upload a fundus image and click 'Run AI Screening Analysis' to see predictions and Grad-CAM explanations.</p>
            </div>
          ) : (
            <>
              {/* Quality Rejection / Human Review Alert */}
              {!prediction.quality_gate.passed ? (
                <div className="glass-card" style={{ padding: '24px', borderColor: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-amber)' }}>
                    <AlertTriangle size={24} />
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quality Check Failed — Human Review Required</h3>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {prediction.quality_gate.rejection_reason}
                  </p>
                  <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    The AI gate rejected this image to prevent uncalibrated predictions on unreadable or out-of-distribution inputs.
                  </p>
                </div>
              ) : prediction.abstain ? (
                <div className="glass-card" style={{ padding: '24px', borderColor: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-amber)' }}>
                    <AlertTriangle size={24} />
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Low Confidence — Flagged for Expert Review</h3>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {prediction.abstention_reason}
                  </p>
                </div>
              ) : null}

              {/* Prediction Results Card */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <span className="badge badge-success">Quality Check Passed</span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px' }}>
                      {prediction.top_prediction}
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Model: {prediction.model_name} (v{prediction.model_version})
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibrated Confidence</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {(prediction.calibrated_confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Per Class Probability Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  {prediction.predictions.map((p) => (
                    <div key={p.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: p.is_positive ? 600 : 400, color: p.is_positive ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                          {p.label} {p.is_positive ? '✓' : ''}
                        </span>
                        <span style={{ fontWeight: 600 }}>{(p.probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="prob-bar-track">
                        <div className="prob-bar-fill" style={{ width: `${Math.min(100, Math.max(2, p.probability * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" onClick={downloadReport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Download Summary Report (JSON)
                  </button>
                </div>
              </div>

              {/* Grad-CAM Heatmap Viewer */}
              {heatmapData && (
                <div className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Eye size={18} color="var(--accent-cyan)" /> Grad-CAM Model Attention Overlay
                    </h3>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn-secondary ${activeHeatmapTab === 'overlay' ? 'active' : ''}`}
                        onClick={() => setActiveHeatmapTab('overlay')}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: activeHeatmapTab === 'overlay' ? 'var(--accent-cyan)' : 'var(--bg-card-border)' }}
                      >
                        Blended
                      </button>
                      <button
                        className={`btn-secondary ${activeHeatmapTab === 'heatmap' ? 'active' : ''}`}
                        onClick={() => setActiveHeatmapTab('heatmap')}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: activeHeatmapTab === 'heatmap' ? 'var(--accent-cyan)' : 'var(--bg-card-border)' }}
                      >
                        Heatmap
                      </button>
                      <button
                        className={`btn-secondary ${activeHeatmapTab === 'original' ? 'active' : ''}`}
                        onClick={() => setActiveHeatmapTab('original')}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: activeHeatmapTab === 'original' ? 'var(--accent-cyan)' : 'var(--bg-card-border)' }}
                      >
                        Original
                      </button>
                    </div>
                  </div>

                  <div className="heatmap-container">
                    <img
                      src={
                        activeHeatmapTab === 'overlay'
                          ? heatmapData.overlay_base64
                          : activeHeatmapTab === 'heatmap'
                          ? heatmapData.heatmap_base64
                          : heatmapData.original_image_base64
                      }
                      alt="Grad-CAM Visualization"
                    />
                  </div>

                  <p style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    {heatmapData.disclaimer} Target: <strong>{heatmapData.target_label}</strong>. Layer: {heatmapData.target_layer}.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
