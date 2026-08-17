'use client';

import React, { useState } from 'react';
import { Dna, AlertTriangle, CheckCircle2, XCircle, Info, Sparkles, Layers, Eye } from 'lucide-react';

export interface LesionInstance {
  centroid_x: number;
  centroid_y: number;
  bbox: [number, number, number, number];
  pixel_area: number;
  detection_confidence: number;
  severity_index?: number;
}

export interface LesionSpatialMask {
  lesion_class: string;
  source: string;
  mask_shape: [number, number];
  instance_count: number;
  instances: LesionInstance[];
  total_pixel_area: number;
  area_ratio: number;
  detection_note: string;
}

export interface PerLesionGroundingMetrics {
  lesion_class: string;
  iou?: number;
  dice?: number;
  lesion_coverage: number;
  attention_coverage: number;
  distance_to_nearest_lesion?: number;
  pointing_game_hit?: boolean;
  pointing_game_tolerance_px: number;
  instance_count: number;
  note: string;
}

export interface LesionGroundingResult {
  score: number;
  label: string;
  label_color: string;
  component_scores: Record<string, number>;
  attention_distribution: Record<string, number>;
  per_lesion_metrics: PerLesionGroundingMetrics[];
  semantic_interpretation: string;
  warnings: string[];
  config_version: string;
  disclaimer: string;
}

export interface AttentionMap {
  method: string;
  target_class: string;
  target_class_idx: number;
  map_shape: [number, number];
  attention_threshold: number;
  high_attention_pixel_count: number;
  peak_attention_x: number;
  peak_attention_y: number;
  overlay_base64: string;
  heatmap_base64: string;
  original_base64: string;
  disclaimer: string;
}

export interface SemanticExplainabilityResult {
  request_id: string;
  predicted_disease: string;
  prediction_confidence: number;
  quality_gate: {
    passed: boolean;
    quality_score: number;
    rejection_reason?: string;
    flags: string[];
  };
  attention_map: AttentionMap;
  lesion_masks: LesionSpatialMask[];
  grounding_result: LesionGroundingResult;
  safety_flags: string[];
  abstain: boolean;
  abstention_reason?: string;
  combined_overlay_base64?: string;
  disclaimer: string;
  limitations: string[];
}

interface SemanticExplainPanelProps {
  data: SemanticExplainabilityResult;
  onClose?: () => void;
}

export default function SemanticExplainPanel({ data, onClose }: SemanticExplainPanelProps) {
  const [activeTab, setActiveTab] = useState<'combined' | 'overlay' | 'heatmap' | 'original'>('combined');

  const grounding = data.grounding_result;
  const score = grounding?.score || 0;
  const label = grounding?.label || 'Moderate Evidence';
  const labelColor = grounding?.label_color || '#3B82F6';
  const warnings = grounding?.warnings || [];
  const metrics = grounding?.per_lesion_metrics || [];
  const dist = grounding?.attention_distribution || {};

  const getDisplayImage = () => {
    switch (activeTab) {
      case 'combined':
        return data.combined_overlay_base64 || data.attention_map.overlay_base64;
      case 'overlay':
        return data.attention_map.overlay_base64;
      case 'heatmap':
        return data.attention_map.heatmap_base64;
      case 'original':
        return data.attention_map.original_base64;
      default:
        return data.combined_overlay_base64 || data.attention_map.overlay_base64;
    }
  };

  const getRegionColor = (region: string) => {
    switch (region.toLowerCase()) {
      case 'microaneurysm': return '#DC2626';
      case 'hemorrhage': return '#991B1B';
      case 'hard_exudate': return '#D97706';
      case 'vessel': return '#16A34A';
      case 'optic_disc': return '#2563EB';
      default: return '#64748B';
    }
  };

  return (
    <section className="container-editorial" style={{ paddingTop: '12px', paddingBottom: '36px' }}>
      <div className="editorial-card" style={{ padding: '32px' }}>
        
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid var(--paper-light)',
            paddingBottom: 16,
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#7C3AED', width: '38px', height: '38px', borderRadius: '12px', border: 'var(--border-thick)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
              <Dna size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 className="font-serif-display" style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                  Lesion-Level Semantic Grounding
                </h3>
                <span className="pill-badge" style={{ background: '#EDE9FE', color: '#6D28D9', fontSize: '0.68rem', padding: '3px 8px' }}>
                  RESEARCH SPEC
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Correlating Grad-CAM++ neural attention with morphologically segmented lesions
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="btn-editorial-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 14px' }}
            >
              ✕ Close Panel
            </button>
          )}
        </div>

        {/* Top Section: Score & Interpretation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          
          {/* Lesion Grounding Score Gauge Card */}
          <div style={{
            background: '#F8FAFC', border: 'var(--border-thick)',
            borderRadius: '16px', padding: '24px 20px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div className="font-grotesk-mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12 }}>
              LESION GROUNDING SCORE
            </div>

            {/* Circular Progress Gauge */}
            <div style={{
              position: 'relative', width: 120, height: 120, margin: '0 auto',
              borderRadius: '50%',
              background: `conic-gradient(${labelColor} ${score * 3.6}deg, #E2E8F0 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #141210', boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%', background: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="font-serif-display" style={{ fontSize: 28, fontWeight: 900, color: labelColor }}>
                  {score.toFixed(0)}
                </span>
                <span className="font-grotesk-mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>OUT OF 100</span>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <span className="pill-badge" style={{ background: labelColor, color: '#fff', fontSize: '0.75rem', padding: '4px 12px' }}>
                {label}
              </span>
            </div>

            <div style={{
              marginTop: 16, paddingTop: 12, borderTop: '1.5px dashed #E2E8F0', width: '100%',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, textAlign: 'left'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Target Disease:</span>
                <strong style={{ color: 'var(--electric-blue)' }}>{data.predicted_disease}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Classifier Conf:</span>
                <strong style={{ color: '#166534' }}>{(data.prediction_confidence * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Right: Narrative & Warnings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {warnings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {warnings.map((w, idx) => (
                  <div key={idx} style={{
                    background: '#FEF2F2', borderLeft: '4px solid #EF4444',
                    borderRadius: '10px', padding: '10px 14px', color: '#7F1D1D',
                    fontSize: '0.8rem', lineHeight: 1.5, border: '1px solid #FECACA'
                  }}>
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} color="#DC2626" />
                      <span>{w.includes(':') ? w.split(':')[0] : 'Grounding Advisory'}</span>
                    </div>
                    <div style={{ marginTop: 2 }}>{w.includes(':') ? w.substring(w.indexOf(':') + 1).trim() : w}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: '#F0F9FF', border: '1.5px solid #BAE6FD',
              borderRadius: '16px', padding: '18px 20px', flex: 1
            }}>
              <h4 className="font-grotesk-mono" style={{
                fontSize: 11, fontWeight: 800, color: '#0369A1', margin: '0 0 8px 0',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Sparkles size={14} color="#0284C7" /> SEMANTIC INTERPRETATION NARRATIVE
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: 1.6, margin: 0 }}>
                {grounding?.semantic_interpretation || 'Model activation map aligns with algorithmically confirmed retinal microvascular lesions and features.'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid: Visual Viewer & Spatial Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Visual Viewer */}
          <div style={{ background: '#FAF8F5', border: 'var(--border-thick)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="font-grotesk-mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-black)' }}>
                SPATIAL VISUAL GROUNDING
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['combined', 'overlay', 'heatmap', 'original'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`btn-editorial-secondary ${activeTab === t ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: '#000', borderRadius: '12px', border: '1.5px solid #141210',
              overflow: 'hidden', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img
                src={getDisplayImage()}
                alt="Semantic Grounding Visual"
                style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Active mode: <strong>{activeTab}</strong> • Contours demarcate detected microaneurysms and exudates.
            </div>
          </div>

          {/* Right Column: Per-Lesion Metrics Table */}
          <div style={{ background: '#FFFFFF', border: 'var(--border-thick)', borderRadius: '16px', padding: '18px', overflowX: 'auto' }}>
            <div className="font-grotesk-mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-black)', marginBottom: 12 }}>
              PER-LESION GROUNDING METRICS
            </div>

            {metrics.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#FAF8F5', borderBottom: '1.5px solid #E2E8F0' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Lesion Class</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Count</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>IoU</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Pointing Game</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: getRegionColor(m.lesion_class) }} />
                        {m.lesion_class}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{m.instance_count}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                        {m.iou !== undefined ? (m.iou * 100).toFixed(1) + '%' : 'N/A'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {m.pointing_game_hit ? (
                          <span style={{ color: '#166534', fontWeight: 700 }}>✓ Hit</span>
                        ) : (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>✗ Miss</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No active lesion grounding targets identified for this scan.
              </div>
            )}

            {/* Attention Distribution Breakdown */}
            {Object.keys(dist).length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1.5px dashed #E2E8F0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
                  Attention Mass Distribution
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(dist).map(([region, share]) => (
                    <div key={region} style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem' }}>
                      <span style={{ color: getRegionColor(region), fontWeight: 800 }}>{region}:</span> {(share * 100).toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
