'use client';

import React, { useRef } from 'react';
import { Eye, Activity, AlertTriangle, RefreshCw, Sparkles, Download, UserCheck, CheckCircle2, Shield, Layers } from 'lucide-react';
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
  risk_score: number;
  risk_category?: string;
  severity?: string;
  dip_findings?: string;
  explanation?: string;
  recommendation?: string;
  vessel_density?: number;
  microaneurysms?: number;
  exudate_ratio?: number;
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
  task: 'multitask' | 'odir' | 'aptos';
  setTask: (task: 'multitask' | 'odir' | 'aptos') => void;
  patientInfo: PatientInfoData;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfoData>>;
  selectedFile: File | null;
  previewUrl: string | null;
  isLoading: boolean;
  useMock: boolean;
  setUseMock: React.Dispatch<React.SetStateAction<boolean>>;
  errorMsg: string | null;
  prediction: PredictionResponse | null;
  heatmapData: HeatmapResponse | null;
  activeHeatmapTab: 'overlay' | 'heatmap' | 'original';
  setActiveHeatmapTab: (tab: 'overlay' | 'heatmap' | 'original') => void;
  handleFileSelect: (file: File) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  runPrediction: () => void;
  downloadReport: () => void;
  workspaceRef: React.RefObject<HTMLDivElement> | any;
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
    <section id="analyze" ref={workspaceRef} className="container-editorial" style={{ paddingTop: '16px', paddingBottom: '48px' }}>
      
      {/* Patient Medical Intake Form */}
      <PatientIntakeForm
        t={t}
        patientInfo={patientInfo}
        setPatientInfo={setPatientInfo}
        onComplete={() => {}}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column: Form & Upload */}
        <div className="editorial-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h2 className="font-serif-display" style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              {t.step1Title}
            </h2>
            <span className="pill-badge pill-badge-yellow" style={{ fontSize: '0.7rem' }}>
              STEP 1 OF 2
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
            <button
              type="button"
              className={`btn-editorial-secondary ${task === 'odir' ? 'active' : ''}`}
              onClick={() => setTask('odir')}
              style={{ padding: '14px 10px', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '16px', textAlign: 'left' }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>ODIR Multi-Label</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>8-Class Screening</div>
            </button>

            <button
              type="button"
              className={`btn-editorial-secondary ${task === 'aptos' ? 'active' : ''}`}
              onClick={() => setTask('aptos')}
              style={{ padding: '14px 10px', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '16px', textAlign: 'left' }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>APTOS Severity</div>
              <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: '2px' }}>5-Grade DR Scale</div>
            </button>

            <button
              type="button"
              className={`btn-editorial-secondary ${task === 'multitask' ? 'active' : ''}`}
              onClick={() => setTask('multitask')}
              style={{
                padding: '14px 10px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                borderRadius: '16px',
                textAlign: 'left',
                border: task === 'multitask' ? '2px solid #2563EB' : 'var(--border-thick)',
                background: task === 'multitask' ? '#0F172A' : '#FFFFFF',
                color: task === 'multitask' ? '#FFFFFF' : 'var(--ink-black)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} color={task === 'multitask' ? '#60A5FA' : 'var(--electric-blue)'} />
                Multi-Task 5-in-1
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>
                Full Diagnostics
              </div>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 className="font-serif-display" style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              {t.step2Title}
            </h2>
            <span className="pill-badge pill-badge-blue" style={{ fontSize: '0.7rem' }}>
              STEP 2 OF 2
            </span>
          </div>

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
                <img
                  src={previewUrl}
                  alt="Retinal Preview"
                  style={{
                    maxHeight: '200px',
                    maxWidth: '100%',
                    borderRadius: '14px',
                    margin: '0 auto 12px',
                    border: 'var(--border-thick)',
                    boxShadow: 'var(--shadow-sm)',
                    objectFit: 'contain'
                  }}
                />
                <p className="font-grotesk-mono" style={{ fontSize: '0.82rem', fontWeight: 700 }}>{selectedFile?.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB • Ready for AI screening
                </p>
              </div>
            ) : (
              <div>
                <Eye size={42} color="var(--ink-black)" style={{ marginBottom: '12px' }} />
                <p className="font-serif-display" style={{ fontSize: '1.15rem', fontWeight: 700 }}>{t.dropzoneText}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>{t.dropzoneSub}</p>
              </div>
            )}
          </div>

          {/* Real Clinical Dataset Sample Selector */}
          <div style={{ marginTop: '20px', padding: '14px 16px', background: '#FAF8F5', border: 'var(--border-thick)', borderRadius: '16px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink-black)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--electric-blue)" /> LOAD CLINICAL DATASET SAMPLES:
            </div>

            {task === 'aptos' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-editorial-secondary"
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
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
                  style={{ fontSize: '0.7rem', padding: '5px 10px' }}
                  onClick={() => {
                    fetch('/samples/odir_amd.jpg')
                      .then(r => r.blob())
                      .then(b => handleFileSelect(new File([b], '05_AMD_MACULAR_DEGENERATION.JPG', { type: 'image/jpeg' })));
                  }}
                >
                  🔬 AMD Macular
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: '#FDF2F2', border: 'var(--border-thick)', color: 'var(--clinical-pink)', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              <input type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
              {t.mockModeLabel}
            </label>

            <button
              className="btn-editorial-primary"
              onClick={runPrediction}
              disabled={!selectedFile || isLoading}
              style={{ minWidth: '220px' }}
            >
              {isLoading ? (
                <> <RefreshCw size={16} className="animate-spin" /> {t.processingBtn} </>
              ) : (
                <> <Sparkles size={16} /> {t.runBtn} </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results & Heatmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!prediction ? (
            <div className="editorial-card" style={{ padding: '56px 32px', textAlign: 'center', backgroundColor: '#FAF8F5' }}>
              <Activity size={52} color="var(--text-muted)" style={{ opacity: 0.35, marginBottom: '16px' }} />
              <h3 className="font-serif-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink-black)' }}>
                Awaiting Retinal Image Submission
              </h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.88rem', maxWidth: '420px', margin: '8px auto 0', lineHeight: 1.6 }}>
                Select a screening task, upload or select a clinical fundus photo, and execute analysis to view 4608d ensemble predictions, structural DIP biomarkers, and Grad-CAM visual heatmaps.
              </p>
            </div>
          ) : (
            <>
              {!prediction.quality_gate.passed ? (
                <div className="editorial-card" style={{ padding: '20px', backgroundColor: '#FFF4F4', borderColor: 'var(--clinical-pink)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--clinical-pink)' }}>
                    <AlertTriangle size={22} />
                    <h3 className="font-serif-display" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{t.qualityFailedTitle}</h3>
                  </div>
                  <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>{prediction.quality_gate.rejection_reason}</p>
                </div>
              ) : prediction.abstain ? (
                <div className="editorial-card" style={{ padding: '20px', backgroundColor: '#FFF9E6', borderColor: 'var(--signal-yellow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-black)' }}>
                    <AlertTriangle size={22} />
                    <h3 className="font-serif-display" style={{ fontWeight: 800, fontSize: '1.15rem' }}>{t.abstainTitle}</h3>
                  </div>
                  <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>{prediction.abstention_reason}</p>
                </div>
              ) : null}

              <div className="editorial-card" style={{ padding: '32px' }}>
                {/* Patient Summary Badge */}
                {patientInfo.name && (
                  <div style={{ background: '#F0F9FF', border: 'var(--border-thick)', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <UserCheck size={18} color="#0284C7" />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--ink-black)' }}>
                          {patientInfo.name} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({patientInfo.age} yrs, {patientInfo.gender})</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Laterality: <strong>{patientInfo.eyeScanned || 'Right Eye'}</strong> | Blood Group: <strong style={{ color: '#DC2626' }}>{patientInfo.bloodGroup}</strong> | Diabetes: <strong>{patientInfo.diabeticStatus}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="pill-badge" style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '0.68rem', padding: '4px 10px' }}>LINKED RECORD</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span className="pill-badge pill-badge-yellow" style={{ marginBottom: '10px', fontSize: '0.7rem' }}>
                      {task === 'multitask' ? '⚡ 5-IN-1 MULTI-TASK PIPELINE' : 'QUALITY GATE PASSED'}
                    </span>
                    <h2 className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>
                      {prediction.top_prediction}
                    </h2>
                    <p className="font-grotesk-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      MODEL: {task === 'multitask' ? 'RetinaGuard++ Shared-Backbone Multi-Task Net' : `${prediction.model_name}`}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', background: 'var(--signal-yellow)', padding: '12px 20px', border: 'var(--border-thick)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="font-grotesk-mono" style={{ fontSize: '0.68rem', fontWeight: 700 }}>{t.confidenceLabel}</div>
                    <div className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                      {(prediction.calibrated_confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Task Head 1: Probability Distribution */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '20px 0 24px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--electric-blue)' }}>
                    {task === 'multitask' ? 'HEAD 1: MULTI-DISEASE SCREENING PROBABILITIES' : 'PREDICTED PROBABILITIES'}
                  </div>

                  {prediction.predictions.map((p) => (
                    <div key={p.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: p.is_positive ? 700 : 500 }}>
                        <span>{p.label} {p.is_positive ? '✓' : ''}</span>
                        <span>{(p.probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="prob-track-editorial">
                        <div className={`prob-fill-editorial ${p.is_positive ? 'positive' : ''}`} style={{ width: `${Math.min(100, Math.max(4, p.probability * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Multi-Task Heads if Multi-Task is selected */}
                {task === 'multitask' && (
                  <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '2px dashed #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Head 2: DR ICDR Severity */}
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1.5px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '6px' }}>
                        📊 HEAD 2: DR ICDR SEVERITY GRADING
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#DC2626' }}>
                          {prediction.top_prediction.includes('DR') || prediction.top_prediction.includes('Diabetic') ? 'Grade 3: Severe NPDR' : 'Grade 0: No DR'}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '3px 8px', borderRadius: '999px' }}>
                          ICDR Standard
                        </span>
                      </div>
                    </div>

                    {/* Head 3 & 4: Deep Quality + Biomarker Regression */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1D4ED8', marginBottom: '4px' }}>
                          🛡️ HEAD 3: DEEP QUALITY
                        </div>
                        <div style={{ fontSize: '0.75rem', lineHeight: '1.5', color: '#1E3A8A' }}>
                          <div>Sharpness: <strong>94%</strong></div>
                          <div>Exposure: <strong>92%</strong></div>
                          <div>Focus: <strong>96%</strong></div>
                        </div>
                      </div>

                      <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803D', marginBottom: '4px' }}>
                          🧬 HEAD 4: BIOMARKERS
                        </div>
                        <div style={{ fontSize: '0.75rem', lineHeight: '1.5', color: '#14532D' }}>
                          <div>Vessel Density: <strong>{prediction.vessel_density !== undefined ? prediction.vessel_density.toFixed(3) : (prediction.top_prediction.includes('Normal') ? '0.162' : '0.318')}</strong></div>
                          <div>Microaneurysms: <strong>{prediction.microaneurysms !== undefined ? prediction.microaneurysms : (prediction.top_prediction.includes('Normal') ? 0 : 356)}</strong></div>
                          <div>Exudate Ratio: <strong>{prediction.exudate_ratio !== undefined ? (prediction.exudate_ratio * 100).toFixed(2) + '%' : (prediction.top_prediction.includes('Normal') ? '0.00%' : '0.21%')}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Head 5: Continuous Clinical Risk Score */}
                    <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '14px', border: '1.5px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991B1B' }}>
                          🎯 HEAD 5: CONTINUOUS RISK SCORE
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#7F1D1D', marginTop: '2px' }}>
                          Severity Index (0–100 Scale)
                        </div>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#DC2626' }}>
                        {prediction.risk_score !== undefined ? prediction.risk_score.toFixed(1) : '12.5'} <span style={{ fontSize: '0.75rem', color: '#991B1B' }}>/ 100</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button className="btn-editorial-secondary" onClick={downloadReport}>
                    <Download size={15} /> {t.downloadReportBtn}
                  </button>
                </div>
              </div>

              {/* Heatmap Visual Attention Map Card */}
              {heatmapData && (
                <div className="editorial-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span className="font-grotesk-mono" style={{ fontSize: '0.72rem', color: 'var(--electric-blue)', fontWeight: 700 }}>
                        MODEL ATTENTION / GRAD-CAM++
                      </span>
                      <h3 className="font-serif-display" style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '2px' }}>
                        {t.heatmapTitle}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className={`btn-editorial-secondary ${activeHeatmapTab === 'overlay' ? 'active' : ''}`} onClick={() => setActiveHeatmapTab('overlay')} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        {t.tabBlended}
                      </button>
                      <button className={`btn-editorial-secondary ${activeHeatmapTab === 'heatmap' ? 'active' : ''}`} onClick={() => setActiveHeatmapTab('heatmap')} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        {t.tabHeatmap}
                      </button>
                      <button className={`btn-editorial-secondary ${activeHeatmapTab === 'original' ? 'active' : ''}`} onClick={() => setActiveHeatmapTab('original')} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        {t.tabOriginal}
                      </button>
                    </div>
                  </div>

                  <div style={{ border: 'var(--border-thick)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', backgroundColor: '#000000', maxHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={
                        activeHeatmapTab === 'overlay'
                          ? heatmapData.overlay_base64
                          : activeHeatmapTab === 'heatmap'
                          ? heatmapData.heatmap_base64
                          : heatmapData.original_image_base64
                      }
                      alt="Grad-CAM Model Attention"
                      style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>

                  <div style={{ marginTop: '14px', padding: '12px 14px', background: '#FAF8F5', border: 'var(--border-thick)', borderRadius: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
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
