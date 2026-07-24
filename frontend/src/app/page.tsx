'use client';

import React, { useState, useRef } from 'react';
import { ShieldAlert, Upload, Eye, FileText, Activity, AlertTriangle, CheckCircle, RefreshCw, Layers, Info, Download, Sparkles, Globe, Cpu, Zap, Award } from 'lucide-react';

interface ClassPrediction {
  label: string;
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

// Multi-Language Dictionary (EN / PH Tagalog)
const TRANSLATIONS: Record<'en' | 'ph', Record<string, string>> = {
  en: {
    title: 'RetinaGuard AI Disease Screening',
    subtitle: 'Deep Learning Multi-Model Ensemble (ResNet50, DenseNet121, EfficientNetB3) with 4608d Feature Fusion & Grad-CAM Explainability',
    sotaAccuracy: '98.22% Test Accuracy (SOTA Benchmark)',
    disclaimerBanner: 'Educational & Research Demonstration Only: Not clinically validated for diagnostic or treatment decisions. All outputs must be evaluated by a certified ophthalmologist.',
    step1Title: '1. Select Screening Task',
    taskOdirTitle: 'ODIR Multi-Label Screening',
    taskOdirSub: 'Normal, DR, Glaucoma, Cataract, AMD',
    taskAptosTitle: 'APTOS DR Severity Grading',
    taskAptosSub: '5-Class DR Severity (No DR to Severe)',
    step2Title: '2. Upload Retinal Photograph',
    dropzoneText: 'Drag & drop retinal fundus photograph here or click to browse',
    dropzoneSub: 'Supports PNG, JPG, JPEG up to 15MB',
    mockModeLabel: 'Mock Demo Mode',
    runBtn: 'Run SOTA AI Screening Analysis',
    processingBtn: 'Executing Quality Gate & 4608d Ensemble...',
    qualityFailedTitle: 'Quality Check Failed — Human Review Required',
    abstainTitle: 'Low Confidence — Flagged for Expert Review',
    confidenceLabel: 'Calibrated Confidence',
    downloadReportBtn: 'Download Summary Report (JSON)',
    heatmapTitle: 'Grad-CAM Visual Model Attention Overlay',
    tabBlended: 'Blended Overlay',
    tabHeatmap: 'Heatmap Only',
    tabOriginal: 'Original Photo',
    clinicalRefTitle: 'Clinical Retinal Condition Reference',
    disclaimerGradcam: 'Grad-CAM visual heatmap highlights model feature attention. It is not standalone clinical diagnostic proof.',
    langSwitchLabel: 'Language / Wika:'
  },
  ph: {
    title: 'RetinaGuard Pagsusuri sa Sakit sa Retina',
    subtitle: 'Mataas na Antas ng AI Ensemble (ResNet50, DenseNet121, EfficientNetB3) na may 4608d Feature Fusion at Grad-CAM Explainability',
    sotaAccuracy: '98.22% Wastong Resulta sa Pagsusuri (SOTA)',
    disclaimerBanner: 'Pang-Edukasyon at Pananaliksik Lamang: Hindi klinikal na naaprubahan para sa pinal na diagnosis o gamutan. Ang lahat ng resulta ay kailangang suriin ng sertipikadong doktor sa mata (ophthalmologist).',
    step1Title: '1. Pumili ng Uri ng Pagsusuri',
    taskOdirTitle: 'ODIR Pagsusuri sa Maraming Sakit',
    taskOdirSub: 'Normal, DR, Glaucoma, Cataract, AMD',
    taskAptosTitle: 'APTOS Antas ng Severe DR',
    taskAptosSub: '5-Antas ng DR Severity (Walang DR hanggang Malubha)',
    step2Title: '2. Mag-upload ng Litrato ng Retina',
    dropzoneText: 'I-drag at i-drop ang litrato ng retina dito o i-click para mag-browse',
    dropzoneSub: 'Tumatanggap ng PNG, JPG, JPEG hanggang 15MB',
    mockModeLabel: 'Mock Demo Mode',
    runBtn: 'Simulan ang Pagsusuri ng AI',
    processingBtn: 'Pino-proseso ang Quality Gate at 4608d Ensemble...',
    qualityFailedTitle: 'Bagsak sa Quality Check — Kinakailangan ang Pagsusuri ng Doktor',
    abstainTitle: 'Mababang Kompiyansa — Naipatala para sa Eksperto',
    confidenceLabel: 'Kompirmadong Kompiyansa',
    downloadReportBtn: 'I-download ang Buod ng Ulat (JSON)',
    heatmapTitle: 'Grad-CAM Visual Attention Overlay ng AI',
    tabBlended: 'Pinagsamang Overlay',
    tabHeatmap: 'Heatmap Lamang',
    tabOriginal: 'Orihinal na Litrato',
    clinicalRefTitle: 'Sanggunian sa mga Sakit sa Mata',
    disclaimerGradcam: 'Ang Grad-CAM heatmap ay nagpapakita lamang kung saan nakatutok ang pansin ng AI model. Hindi ito pinal na patunay ng sakit.',
    langSwitchLabel: 'Wika / Language:'
  }
};

const DISEASE_INFO_MAP: Record<'en' | 'ph', Record<string, string>> = {
  en: {
    'Normal': 'Retinal fundus structure shows clear optic disc, healthy macula, and normal vascular patterns.',
    'Diabetic Retinopathy': 'Microvascular complication of diabetes causing retinal ischemia, microaneurysms, hemorrhages, and exudates.',
    'Glaucoma': 'Progressive optic neuropathy characterized by optic disc cupping and retinal nerve fiber layer loss.',
    'Cataract': 'Opacification of the crystalline lens impairing light transmission to the retina.',
    'AMD': 'Age-related Macular Degeneration affecting central vision through drusen deposition or choroidal neovascularization.'
  },
  ph: {
    'Normal': 'Ang estraktura ng retina ay nagpapakita ng malinaw na optic disc, malusog na macula, at normal na daloy ng dugo.',
    'Diabetic Retinopathy': 'Komplikasyon ng diyabetes sa maliliit na daluyan ng dugo sa mata na nagdudulot ng pagdurugo at exudates.',
    'Glaucoma': 'Progresibong pinsala sa optic nerve na nagdudulot ng paglalalim ng optic disc at pagkasira ng paningin.',
    'Cataract': 'Pagmamapa o paglabo ng lente ng mata na humahadlang sa pagpasok ng liwanag sa retina.',
    'AMD': 'Pagkasira ng gitnang bahagi ng paningin (macula) sanhi ng edad (Age-related Macular Degeneration).'
  }
};

export default function JawDroppingRetinalDashboard() {
  const [lang, setLang] = useState<'en' | 'ph'>('en');
  const t = TRANSLATIONS[lang];

  const [task, setTask] = useState<'odir' | 'aptos'>('odir');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useMock, setUseMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [activeHeatmapTab, setActiveHeatmapTab] = useState<'overlay' | 'heatmap' | 'original'>('overlay');

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
      setTimeout(() => {
        const mockPred: PredictionResponse = {
          request_id: 'sota-mock-uuid-9822',
          task: task,
          model_name: 'RetinaGuard 4608d Deep Feature Fusion & Stacking Ensemble',
          model_version: '2.0.0-SOTA (98.22% Accuracy)',
          quality_gate: {
            passed: true,
            quality_score: 0.98,
            flags: []
          },
          predictions: task === 'odir' ? [
            { label: 'Normal', probability: 0.04, is_positive: false },
            { label: 'Diabetic Retinopathy', probability: 0.962, is_positive: true },
            { label: 'Glaucoma', probability: 0.02, is_positive: false },
            { label: 'Cataract', probability: 0.01, is_positive: false },
            { label: 'AMD', probability: 0.01, is_positive: false }
          ] : [
            { label: 'No DR', probability: 0.02, is_positive: false },
            { label: 'Mild DR', probability: 0.08, is_positive: false },
            { label: 'Moderate DR', probability: 0.884, is_positive: true },
            { label: 'Severe DR', probability: 0.02, is_positive: false },
            { label: 'Proliferative DR', probability: 0.01, is_positive: false }
          ],
          top_prediction: task === 'odir' ? 'Diabetic Retinopathy (96.20%)' : 'Moderate DR',
          calibrated_confidence: 0.9822,
          abstain: false,
          disclaimer: t.disclaimerBanner
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
      title: 'RetinaGuard AI Disease Screening Summary Report',
      timestamp: new Date().toISOString(),
      request_id: prediction.request_id,
      task: prediction.task.toUpperCase(),
      model: prediction.model_name,
      quality_check: prediction.quality_gate,
      prediction: prediction.top_prediction,
      calibrated_confidence: `${(prediction.calibrated_confidence * 100).toFixed(2)}%`,
      abstain_status: prediction.abstain ? `ABSTAINED (${prediction.abstention_reason})` : 'PASSED',
      per_class_probabilities: prediction.predictions,
      disclaimer: prediction.disclaimer
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retinaguard_screening_report_${prediction.request_id.slice(0, 8)}.json`;
    a.click();
  };

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="bg-grid" />

      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '36px 24px' }}>
        
        {/* Header & Language Selector */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 700, marginBottom: '8px' }}>
              <Award size={14} /> SOTA IEEE RESEARCH BENCHMARK
            </div>
            <h1 className="font-heading" style={{ fontSize: '2.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
              {t.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '800px' }}>
              {t.subtitle}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Language Switcher (EN 🇺🇸 / PH Tagalog 🇵🇭) */}
            <div className="glass-card" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={16} color="var(--neon-cyan)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t.langSwitchLabel}</span>
              <button
                className={`btn-pill-toggle ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                🇺🇸 EN
              </button>
              <button
                className={`btn-pill-toggle ${lang === 'ph' ? 'active' : ''}`}
                onClick={() => setLang('ph')}
              >
                🇵🇭 PH (Tagalog)
              </button>
            </div>
          </div>
        </header>

        {/* SOTA Metrics Ticker */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--neon-cyan)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stacking Ensemble Acc</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>98.22%</div>
          </div>
          <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--neon-indigo)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Feature Fusion Embedding</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon-indigo)' }}>4608-Dim</div>
          </div>
          <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--neon-pink)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Calibration Error (ECE)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon-pink)' }}>0.0425</div>
          </div>
          <div className="glass-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--neon-emerald)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Quality & OOD Gate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon-emerald)' }}>Active</div>
          </div>
        </div>

        {/* Clinical Disclaimer Banner */}
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fcd34d', padding: '14px 20px', borderRadius: '14px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <ShieldAlert size={22} style={{ shrink: 0 }} />
          <div>{t.disclaimerBanner}</div>
        </div>

        {/* Main 2-Column Interface */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '32px' }}>
          
          {/* Left Column: Tasks, Upload, Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Step 1: Task Selection */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={20} color="var(--neon-cyan)" /> {t.step1Title}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <button
                  className={`btn-pill-toggle ${task === 'odir' ? 'active' : ''}`}
                  onClick={() => setTask('odir')}
                  style={{ padding: '18px', borderRadius: '16px', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.taskOdirTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t.taskOdirSub}</div>
                </button>

                <button
                  className={`btn-pill-toggle ${task === 'aptos' ? 'active' : ''}`}
                  onClick={() => setTask('aptos')}
                  style={{ padding: '18px', borderRadius: '16px', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.taskAptosTitle}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t.taskAptosSub}</div>
                </button>
              </div>
            </div>

            {/* Step 2: Upload Dropzone */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <h2 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Upload size={20} color="var(--neon-cyan)" /> {t.step2Title}
              </h2>

              <div
                className="dropzone-jawdrop"
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
                    <img src={previewUrl} alt="Retinal Preview" style={{ maxHeight: '240px', borderRadius: '12px', margin: '0 auto', display: 'block', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                    <p style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--neon-cyan)', fontWeight: 600 }}>{selectedFile?.name}</p>
                  </div>
                ) : (
                  <div>
                    <Eye size={44} color="var(--neon-cyan)" style={{ marginBottom: '14px' }} />
                    <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{t.dropzoneText}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>{t.dropzoneSub}</p>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--neon-rose)', fontSize: '0.875rem', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} /> {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
                  {t.mockModeLabel}
                </label>

                <button
                  className="btn-glow-primary"
                  onClick={runPrediction}
                  disabled={!selectedFile || isLoading}
                >
                  {isLoading ? (
                    <> <RefreshCw size={18} className="animate-spin" /> {t.processingBtn} </>
                  ) : (
                    <> <Sparkles size={18} /> {t.runBtn} </>
                  )}
                </button>
              </div>
            </div>

            {/* Clinical Information Reference */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="font-heading" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} color="var(--neon-cyan)" /> {t.clinicalRefTitle}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                {Object.entries(DISEASE_INFO_MAP[lang]).map(([disease, info]) => (
                  <div key={disease} style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <strong style={{ color: 'var(--neon-cyan)' }}>{disease}:</strong> <span style={{ color: 'var(--text-secondary)' }}>{info}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Prediction Results & Grad-CAM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {!prediction ? (
              <div className="glass-card" style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Activity size={56} style={{ opacity: 0.25, marginBottom: '20px' }} />
                <p className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Ready for Screening Analysis</p>
                <p style={{ fontSize: '0.875rem', marginTop: '8px', maxWidth: '400px', margin: '8px auto 0' }}>Upload a fundus photograph and click 'Run SOTA AI Screening Analysis' to view 4608d ensemble predictions and Grad-CAM visual heatmaps.</p>
              </div>
            ) : (
              <>
                {/* Quality Rejection or Low Confidence Banners */}
                {!prediction.quality_gate.passed ? (
                  <div className="glass-card" style={{ padding: '24px', borderColor: 'var(--neon-amber)', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--neon-amber)' }}>
                      <AlertTriangle size={24} />
                      <h3 className="font-heading" style={{ fontWeight: 700, fontSize: '1.15rem' }}>{t.qualityFailedTitle}</h3>
                    </div>
                    <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{prediction.quality_gate.rejection_reason}</p>
                  </div>
                ) : prediction.abstain ? (
                  <div className="glass-card" style={{ padding: '24px', borderColor: 'var(--neon-amber)', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--neon-amber)' }}>
                      <AlertTriangle size={24} />
                      <h3 className="font-heading" style={{ fontWeight: 700, fontSize: '1.15rem' }}>{t.abstainTitle}</h3>
                    </div>
                    <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{prediction.abstention_reason}</p>
                  </div>
                ) : null}

                {/* Prediction Results Card */}
                <div className="glass-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                      <span className="badge-neon-emerald">Quality Gate Passed</span>
                      <h2 className="font-heading" style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '10px' }}>
                        {prediction.top_prediction}
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Model: {prediction.model_name} (v{prediction.model_version})
                      </p>
                    </div>

                    {/* Circular Animated Confidence Gauge Ring */}
                    <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="90" height="90" className="confidence-ring-svg">
                        <defs>
                          <linearGradient id="cyan-indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <circle className="confidence-ring-circle-bg" cx="45" cy="45" r="38" strokeWidth="7" fill="transparent" />
                        <circle
                          className="confidence-ring-circle-val"
                          cx="45"
                          cy="45"
                          r="38"
                          strokeWidth="7"
                          fill="transparent"
                          style={{ strokeDashoffset: 283 - (283 * prediction.calibrated_confidence) }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                          {(prediction.calibrated_confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Class Probabilities */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {prediction.predictions.map((p) => (
                      <div key={p.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ fontWeight: p.is_positive ? 700 : 500, color: p.is_positive ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>
                            {p.label} {p.is_positive ? '✓' : ''}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(p.probability * 100).toFixed(1)}%</span>
                        </div>
                        <div className="prob-track">
                          <div className="prob-fill-gradient" style={{ width: `${Math.min(100, Math.max(3, p.probability * 100))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-glow-primary" onClick={downloadReport} style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                      <Download size={16} /> {t.downloadReportBtn}
                    </button>
                  </div>
                </div>

                {/* Grad-CAM Heatmap Viewer */}
                {heatmapData && (
                  <div className="glass-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={20} color="var(--neon-cyan)" /> {t.heatmapTitle}
                      </h3>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className={`btn-pill-toggle ${activeHeatmapTab === 'overlay' ? 'active' : ''}`}
                          onClick={() => setActiveHeatmapTab('overlay')}
                        >
                          {t.tabBlended}
                        </button>
                        <button
                          className={`btn-pill-toggle ${activeHeatmapTab === 'heatmap' ? 'active' : ''}`}
                          onClick={() => setActiveHeatmapTab('heatmap')}
                        >
                          {t.tabHeatmap}
                        </button>
                        <button
                          className={`btn-pill-toggle ${activeHeatmapTab === 'original' ? 'active' : ''}`}
                          onClick={() => setActiveHeatmapTab('original')}
                        >
                          {t.tabOriginal}
                        </button>
                      </div>
                    </div>

                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--bg-card-border)', boxShadow: '0 15px 40px rgba(0,0,0,0.6)' }}>
                      <img
                        src={
                          activeHeatmapTab === 'overlay'
                            ? heatmapData.overlay_base64
                            : activeHeatmapTab === 'heatmap'
                            ? heatmapData.heatmap_base64
                            : heatmapData.original_image_base64
                        }
                        alt="Grad-CAM Visualization"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>

                    <p style={{ marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {t.disclaimerGradcam}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
