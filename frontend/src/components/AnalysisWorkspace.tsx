'use client';

import React, { useRef } from 'react';
import { Eye, Activity, AlertTriangle, RefreshCw, Sparkles, Download, UserCheck } from 'lucide-react';
import PatientIntakeForm, { PatientInfoData } from './PatientIntakeForm';

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

interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  blood_group?: string;
  diabetic_status?: string;
  hypertension?: string;
  symptoms?: string;
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
  patient_info?: PatientInfo;
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

interface AnalysisWorkspaceProps {
  t: Record<string, string>;
  task: 'odir' | 'aptos';
  setTask: (task: 'odir' | 'aptos') => void;
  patientInfo: PatientInfoData;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfoData>>;
  selectedFile: File | null;
  previewUrl: string | null;
  isLoading: boolean;
  useMock: boolean;
  setUseMock: (useMock: boolean) => void;
  errorMsg: string | null;
  prediction: PredictionResponse | null;
  heatmapData: HeatmapResponse | null;
  activeHeatmapTab: 'overlay' | 'heatmap' | 'original';
  setActiveHeatmapTab: (tab: 'overlay' | 'heatmap' | 'original') => void;
  handleFileSelect: (file: File) => void;
  handleDrop: (e: React.DragEvent) => void;
  runPrediction: () => void;
  downloadReport: () => void;
  workspaceRef: React.RefObject<HTMLDivElement>;
}

export default function AnalysisWorkspace({
  t,
  task,
  setTask,
  patientInfo,
  setPatientInfo,
  selectedFile,
  previewUrl,
  isLoading,
  useMock,
  setUseMock,
  errorMsg,
  prediction,
  heatmapData,
  activeHeatmapTab,
  setActiveHeatmapTab,
  handleFileSelect,
  handleDrop,
  runPrediction,
  downloadReport,
  workspaceRef
}: AnalysisWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section id="analyze" ref={workspaceRef} style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 32px 64px' }}>
      
      {/* Step 1: Patient Medical Intake Form */}
      <PatientIntakeForm
        t={t}
        patientInfo={patientInfo}
        setPatientInfo={setPatientInfo}
        onComplete={() => {}}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '40px', alignItems: 'start' }}>
        
        {/* Left Column: Form & Upload */}
        <div className="editorial-card" style={{ padding: '36px' }}>
          <h2 className="font-serif-display" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '24px' }}>
            Step 2: {t.step1Title}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <button
              className={`btn-editorial-secondary ${task === 'odir' ? 'active' : ''}`}
              onClick={() => setTask('odir')}
              style={{ padding: '18px', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '20px' }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.taskOdirTitle}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>{t.taskOdirSub}</div>
            </button>

            <button
              className={`btn-editorial-secondary ${task === 'aptos' ? 'active' : ''}`}
              onClick={() => setTask('aptos')}
              style={{ padding: '18px', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '20px' }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.taskAptosTitle}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>{t.taskAptosSub}</div>
            </button>
          </div>

          <h2 className="font-serif-display" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '18px' }}>
            Step 3: {t.step2Title}
          </h2>

          <div
            className="dropzone-editorial"
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
                <img src={previewUrl} alt="Retinal Preview" style={{ maxHeight: '220px', borderRadius: '16px', margin: '0 auto 14px', border: 'var(--border-thick)', boxShadow: 'var(--shadow-hard)' }} />
                <p className="font-grotesk-mono" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedFile?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <Eye size={48} color="var(--ink-black)" style={{ marginBottom: '16px' }} />
                <p className="font-serif-display" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t.dropzoneText}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>{t.dropzoneSub}</p>
              </div>
            )}
          </div>

          {/* Real Clinical Dataset Sample Selector */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#FDFBF7', border: 'var(--border-thick)', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ink-black)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="var(--electric-blue)" /> LOAD REAL CLINICAL DATASET SAMPLES:
              </span>
              <a
                href="/Real_Retinal_Test_Images.zip"
                download="Real_Retinal_Test_Images.zip"
                className="btn-editorial-secondary"
                style={{ fontSize: '0.72rem', padding: '4px 10px', textDecoration: 'none', background: '#EFF6FF', color: '#1D4ED8', borderColor: '#93C5FD' }}
              >
                <Download size={13} /> Download 10 Test Images (.zip)
              </a>
            </div>

            {task === 'aptos' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/aptos_stage_0_normal.png')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '06_APTOS_STAGE0_NO_DR.PNG', { type: 'image/png' })));
                  }}
                >
                  🟢 Stage 0 (No DR)
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/aptos_stage_1_mild.png')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '07_APTOS_STAGE1_MILD_DR.PNG', { type: 'image/png' })));
                  }}
                >
                  🟡 Stage 1 (Mild DR)
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/aptos_stage_2_moderate.png')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '08_APTOS_STAGE2_MODERATE_DR.PNG', { type: 'image/png' })));
                  }}
                >
                  🟠 Stage 2 (Moderate DR)
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/aptos_stage_3_severe.png')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '09_APTOS_STAGE3_SEVERE_DR.PNG', { type: 'image/png' })));
                  }}
                >
                  🔴 Stage 3 (Severe DR)
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/aptos_stage_4_proliferative.png')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '10_APTOS_STAGE4_PROLIFERATIVE_DR.PNG', { type: 'image/png' })));
                  }}
                >
                  🚨 Stage 4 (Proliferative DR)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/odir_normal.jpg')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '01_NORMAL_HEALTHY_RETINA.JPG', { type: 'image/jpeg' })));
                  }}
                >
                  🟢 Normal Retina
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/odir_dr.jpg')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '02_DIABETIC_RETINOPATHY_SEVERE.JPG', { type: 'image/jpeg' })));
                  }}
                >
                  🔴 Diabetic Retinopathy
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/odir_glaucoma.jpg')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '03_GLAUCOMA_OPTIC_NERVE_DAMAGE.JPG', { type: 'image/jpeg' })));
                  }}
                >
                  👁️ Glaucoma
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/odir_cataract.jpg')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '04_CATARACT_LENS_OPACITY.JPG', { type: 'image/jpeg' })));
                  }}
                >
                  🌫️ Cataract
                </button>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.72rem', padding: '6px 10px' }}
                  onClick={() => {
                    fetch('/samples/odir_amd.jpg')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '05_AMD_MACULAR_DEGENERATION.JPG', { type: 'image/jpeg' })));
                  }}
                >
                  🔬 AMD (Macular Degeneration)
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FDF2F2', border: 'var(--border-thick)', color: 'var(--clinical-pink)', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
              {t.mockModeLabel}
            </label>

            <button
              className="btn-editorial-primary"
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

        {/* Right Column: Results & Heatmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {!prediction ? (
            <div className="editorial-card" style={{ padding: '64px 32px', textAlign: 'center', backgroundColor: '#FAF7F2' }}>
              <Activity size={56} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '20px' }} />
              <h3 className="font-serif-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink-black)' }}>
                Awaiting Image Submission
              </h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.95rem', maxWidth: '420px', margin: '8px auto 0' }}>
                Complete patient intake, select a screening task, upload a retinal fundus photograph, and run analysis to view 4608d ensemble predictions and Grad-CAM visual heatmaps.
              </p>
            </div>
          ) : (
            <>
              {!prediction.quality_gate.passed ? (
                <div className="editorial-card" style={{ padding: '24px', backgroundColor: '#FFF4F4', borderColor: 'var(--clinical-pink)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--clinical-pink)' }}>
                    <AlertTriangle size={24} />
                    <h3 className="font-serif-display" style={{ fontWeight: 800, fontSize: '1.25rem' }}>{t.qualityFailedTitle}</h3>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{prediction.quality_gate.rejection_reason}</p>
                </div>
              ) : prediction.abstain ? (
                <div className="editorial-card" style={{ padding: '24px', backgroundColor: '#FFF9E6', borderColor: 'var(--signal-yellow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--ink-black)' }}>
                    <AlertTriangle size={24} />
                    <h3 className="font-serif-display" style={{ fontWeight: 800, fontSize: '1.25rem' }}>{t.abstainTitle}</h3>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>{prediction.abstention_reason}</p>
                </div>
              ) : null}

              <div className="editorial-card" style={{ padding: '36px' }}>
                {/* Patient Summary Badge */}
                {patientInfo.name && (
                  <div style={{ background: '#F0F9FF', border: 'var(--border-thick)', borderRadius: '16px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <UserCheck size={20} color="#0284C7" />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink-black)' }}>
                          {patientInfo.name} <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>({patientInfo.age} yrs, {patientInfo.gender})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Blood Group: <strong style={{ color: '#DC2626' }}>{patientInfo.bloodGroup}</strong> | Diabetes: <strong>{patientInfo.diabeticStatus}</strong> | High BP: <strong>{patientInfo.hypertension}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="pill-badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>LINKED RECORD</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <span className="pill-badge pill-badge-yellow" style={{ marginBottom: '12px' }}>
                      QUALITY GATE PASSED
                    </span>
                    <h2 className="font-serif-display" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>
                      {prediction.top_prediction}
                    </h2>
                    <p className="font-grotesk-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      MODEL: {prediction.model_name} (v{prediction.model_version})
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', background: 'var(--signal-yellow)', padding: '16px 24px', border: 'var(--border-thick)', borderRadius: '20px', boxShadow: 'var(--shadow-hard)' }}>
                    <div className="font-grotesk-mono" style={{ fontSize: '0.7rem', fontWeight: 700 }}>{t.confidenceLabel}</div>
                    <div className="font-serif-display" style={{ fontSize: '2.2rem', fontWeight: 900 }}>
                      {(prediction.calibrated_confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0 28px' }}>
                  {prediction.predictions.map((p) => (
                    <div key={p.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: p.is_positive ? 700 : 500 }}>
                        <span>{p.label} {p.is_positive ? '✓' : ''}</span>
                        <span>{(p.probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="prob-track-editorial">
                        <div className={`prob-fill-editorial ${p.is_positive ? 'positive' : ''}`} style={{ width: `${Math.min(100, Math.max(4, p.probability * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-editorial-secondary" onClick={downloadReport}>
                    <Download size={16} /> {t.downloadReportBtn}
                  </button>
                </div>
              </div>

              {heatmapData && (
                <div className="editorial-card" style={{ padding: '36px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <span className="font-grotesk-mono" style={{ fontSize: '0.75rem', color: 'var(--electric-blue)', fontWeight: 700 }}>
                        MODEL ATTENTION / GRAD-CAM
                      </span>
                      <h3 className="font-serif-display" style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                        {t.heatmapTitle}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className={`btn-editorial-secondary ${activeHeatmapTab === 'overlay' ? 'active' : ''}`} onClick={() => setActiveHeatmapTab('overlay')}>
                        {t.tabBlended}
                      </button>
                      <button className={`btn-editorial-secondary ${activeHeatmapTab === 'heatmap' ? 'active' : ''}`} onClick={() => setActiveHeatmapTab('heatmap')}>
                        {t.tabHeatmap}
                      </button>
                      <button className={`btn-editorial-secondary ${activeHeatmapTab === 'original' ? 'active' : ''}`} onClick={() => setActiveHeatmapTab('original')}>
                        {t.tabOriginal}
                      </button>
                    </div>
                  </div>

                  <div style={{ border: 'var(--border-thick)', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-hard)', backgroundColor: '#000000' }}>
                    <img
                      src={
                        activeHeatmapTab === 'overlay'
                          ? heatmapData.overlay_base64
                          : activeHeatmapTab === 'heatmap'
                          ? heatmapData.heatmap_base64
                          : heatmapData.original_image_base64
                      }
                      alt="Grad-CAM Model Attention"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>

                  <div style={{ marginTop: '16px', padding: '14px 18px', background: '#FAF7F2', border: 'var(--border-thick)', borderRadius: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong>Clinical Notice:</strong> {t.disclaimerGradcam}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
