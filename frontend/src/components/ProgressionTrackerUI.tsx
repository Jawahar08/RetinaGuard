'use client';

import React, { useState } from 'react';

interface BiomarkerDeltas {
  delta_vessel_density_index: number;
  delta_microaneurysm_count: number;
  delta_exudate_count: number;
  delta_exudate_area_ratio: number;
  delta_risk_score: number;
  trajectory: string;
  trajectory_color: string;
  badge_text: string;
  baseline_risk_score: number;
  followup_risk_score: number;
  baseline_severity: string;
  followup_severity: string;
}

interface ProgressionData {
  deltas: BiomarkerDeltas;
  difference_map_base64: string;
  recommendations: string[];
}

export default function ProgressionTrackerUI() {
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [followupFile, setFollowupFile] = useState<File | null>(null);
  const [baselinePreview, setBaselinePreview] = useState<string | null>(null);
  const [followupPreview, setFollowupPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProgressionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBaselineSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBaselineFile(file);
      setBaselinePreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleFollowupSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFollowupFile(file);
      setFollowupPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const runAnalysis = async () => {
    if (!baselineFile || !followupFile) {
      setError('Please select both baseline and follow-up images.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('baseline_file', baselineFile);
    formData.append('followup_file', followupFile);

    try {
      const response = await fetch('http://localhost:8000/progression-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data: ProgressionData = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend server on port 8000.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDelta = (val: number, isPct: boolean = false) => {
    const sign = val > 0 ? '+' : '';
    const text = isPct ? `${sign}${(val * 100).toFixed(2)}%` : `${sign}${val}`;
    const color = val > 0 ? '#ef4444' : val < 0 ? '#22c55e' : '#64748b';
    return <span style={{ color, fontWeight: 700 }}>{text}</span>;
  };

  return (
    <div style={{
      background: 'var(--card-white)', border: 'var(--border-thick)',
      borderRadius: 'var(--radius-card)', padding: 24,
      boxShadow: 'var(--shadow-hard)', marginTop: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>📈</span>
        <div>
          <h3 className="font-grotesk-mono" style={{ fontSize: 14, color: 'var(--electric-blue)' }}>
            LONGITUDINAL DISEASE PROGRESSION TRACKER
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Compare baseline vs. follow-up retinal scans to quantify structural changes & disease trajectory
          </p>
        </div>
      </div>

      {/* Dual Image Upload Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
        {/* Baseline Upload */}
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 16, textAlign: 'center', background: '#f8fafc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
            📅 Baseline Visit (Earlier Scan)
          </div>
          {baselinePreview ? (
            <img src={baselinePreview} alt="Baseline" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{ padding: '30px 10px', color: '#94a3b8', fontSize: 13 }}>
              Select Baseline Image
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleBaselineSelect}
            style={{ marginTop: 10, fontSize: 12 }}
          />
        </div>

        {/* Follow-up Upload */}
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 16, textAlign: 'center', background: '#f8fafc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>
            📅 Follow-up Visit (Recent Scan)
          </div>
          {followupPreview ? (
            <img src={followupPreview} alt="Follow-up" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{ padding: '30px 10px', color: '#94a3b8', fontSize: 13 }}>
              Select Follow-up Image
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFollowupSelect}
            style={{ marginTop: 10, fontSize: 12 }}
          />
        </div>
      </div>

      {/* Compare Button */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onClick={runAnalysis}
          disabled={!baselineFile || !followupFile || isLoading}
          style={{
            background: (!baselineFile || !followupFile || isLoading) ? '#cbd5e1' : 'var(--electric-blue)',
            color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 999,
            fontSize: 14, fontWeight: 700, cursor: (!baselineFile || !followupFile || isLoading) ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-hard)', transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? 'Processing Serial Comparison...' : '🔍 Compare Retinal Scans'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 20 }}>
          {/* Trajectory Badge */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{
              background: result.deltas.trajectory_color, color: '#fff',
              padding: '6px 18px', borderRadius: 999, fontSize: 14, fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              {result.deltas.badge_text}
            </span>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              Baseline Risk: <strong>{result.deltas.baseline_risk_score}</strong> ({result.deltas.baseline_severity}) → Follow-up Risk: <strong>{result.deltas.followup_risk_score}</strong> ({result.deltas.followup_severity})
            </div>
          </div>

          {/* Delta Metrics Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
            background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, textAlign: 'center',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Δ Risk Score</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                {formatDelta(result.deltas.delta_risk_score)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Δ Vessel Density</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                {formatDelta(result.deltas.delta_vessel_density_index)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Δ Microaneurysms</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                {formatDelta(result.deltas.delta_microaneurysm_count)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Δ Exudate Ratio</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>
                {formatDelta(result.deltas.delta_exudate_area_ratio, true)}
              </div>
            </div>
          </div>

          {/* Difference Visualizer Map */}
          {result.difference_map_base64 && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h4 className="font-grotesk-mono" style={{ fontSize: 12, color: 'var(--electric-blue)', marginBottom: 8 }}>
                STRUCTURAL CHANGE MAP (RED = NEW LESIONS, GREEN = RESOLVED)
              </h4>
              <img
                src={`data:image/png;base64,${result.difference_map_base64}`}
                alt="Difference Map"
                style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 12, border: '2px solid #e2e8f0' }}
              />
            </div>
          )}

          {/* Clinical Recommendations */}
          <div>
            <h4 className="font-grotesk-mono" style={{ fontSize: 12, color: 'var(--electric-blue)', marginBottom: 8 }}>
              LONGITUDINAL CLINICAL RECOMMENDATIONS
            </h4>
            <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: '#1e293b' }}>
              {result.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
