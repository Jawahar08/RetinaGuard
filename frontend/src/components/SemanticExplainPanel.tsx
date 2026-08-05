'use client';

import React, { useState } from 'react';

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
  const score = grounding.score || 0;
  const label = grounding.label || 'Insufficient evidence';
  const labelColor = grounding.label_color || '#3b82f6';
  const warnings = grounding.warnings || [];
  const metrics = grounding.per_lesion_metrics || [];
  const dist = grounding.attention_distribution || {};

  // Image source based on active tab
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
    switch (region) {
      case 'microaneurysm': return '#dc2626'; // Red
      case 'hemorrhage': return '#991b1b';    // Dark Red
      case 'hard_exudate': return '#d97706';  // Yellow/Amber
      case 'vessel': return '#16a34a';        // Green
      case 'optic_disc': return '#2563eb';    // Blue
      default: return '#64748b';             // Slate
    }
  };

  return (
    <div
      style={{
        background: '#0f172a',
        color: '#f8fafc',
        border: '3px solid #1e293b',
        borderRadius: 24,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        padding: '28px',
        margin: '28px 0',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── Header Bar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #1e293b',
          paddingBottom: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧬</span>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Lesion-Level Semantic Explainability
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 9999,
                background: '#3b0764',
                color: '#e9d5ff',
                border: '1px solid #7e22ce',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Research Layer v1.0
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, margin: 0 }}>
            Connecting Grad-CAM++ neural feature sensitivity to algorithmically detected anatomical retinal lesions
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕ Close Panel
          </button>
        )}
      </div>

      {/* ── Primary Summary & Score Section ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Left Column: Gauge Card */}
        <div
          style={{
            background: '#020617',
            border: '2px solid #1e293b',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#94a3b8',
              marginBottom: 12,
            }}
          >
            Lesion Grounding Score
          </div>

          {/* Semicircle Gauge with STRICT Inline Size Constraints */}
          <div
            style={{
              position: 'relative',
              width: 140,
              height: 140,
              maxWidth: 140,
              maxHeight: 140,
              margin: '0 auto',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              style={{ width: 140, height: 140, maxWidth: 140, maxHeight: 140, display: 'block' }}
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#1e293b"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={labelColor}
                strokeWidth="10"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * Math.max(0, Math.min(100, score))) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                {Math.round(score)}
              </span>
              <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 700 }}>
                OUT OF 100
              </span>
            </div>
          </div>

          {/* Label Badge */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: labelColor,
              marginTop: 10,
            }}
          >
            {label}
          </div>

          {/* Sub-metrics */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid #1e293b',
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>Classifier Conf:</span>
              <strong style={{ color: '#38bdf8' }}>{(data.prediction_confidence * 100).toFixed(1)}%</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>Target Disease:</span>
              <strong style={{ color: '#c084fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {data.predicted_disease}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Warnings & Interpretation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active Warnings */}
          {warnings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {warnings.map((w, idx) => {
                const isHighConfLowGrounding = w.includes('HIGH_CONFIDENCE_LOW_GROUNDING');
                const isNoLesions = w.includes('NO_LESION_CANDIDATES');
                const isBorder = w.includes('BORDER_ATTENTION');

                const bg = isHighConfLowGrounding ? '#450a0a' : isNoLesions ? '#451a03' : isBorder ? '#422006' : '#1e293b';
                const border = isHighConfLowGrounding ? '#ef4444' : isNoLesions ? '#f97316' : isBorder ? '#eab308' : '#64748b';
                const textColor = isHighConfLowGrounding ? '#fca5a5' : isNoLesions ? '#fed7aa' : isBorder ? '#fef08a' : '#cbd5e1';

                const title = w.includes(':') ? w.split(':')[0] : w.substring(0, 50);
                const detail = w.includes(':') ? w.substring(w.indexOf(':') + 1).trim() : w;

                return (
                  <div
                    key={idx}
                    style={{
                      background: bg,
                      borderLeft: `4px solid ${border}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: textColor,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>⚠️</span>
                      <span>{title}</span>
                    </div>
                    <div>{detail}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Semantic Interpretation Card */}
          <div
            style={{
              background: '#020617',
              border: '2px solid #1e293b',
              borderRadius: 16,
              padding: 18,
              flex: 1,
            }}
          >
            <h4
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#c084fc',
                margin: '0 0 10px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>💬</span> Semantic Interpretation Narrative
            </h4>
            <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              {grounding.semantic_interpretation}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Grid: Visual Viewer & Spatial Metrics ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)',
          gap: 24,
        }}
      >
        {/* Left Column: Interactive Visual Viewer */}
        <div
          style={{
            background: '#020617',
            border: '2px solid #1e293b',
            borderRadius: 16,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: 0 }}>
              Spatial Visual Grounding
            </h3>
            {/* Tab buttons */}
            <div style={{ display: 'flex', gap: 4, background: '#0f172a', padding: 4, borderRadius: 8 }}>
              {(['combined', 'overlay', 'heatmap', 'original'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === t ? '#7e22ce' : 'transparent',
                    color: activeTab === t ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t === 'combined' ? 'Combined' : t === 'overlay' ? 'Grad-CAM++' : t === 'heatmap' ? 'Heatmap' : 'Original'}
                </button>
              ))}
            </div>
          </div>

          {/* Image Container */}
          <div
            style={{
              background: '#000000',
              borderRadius: 12,
              border: '1px solid #1e293b',
              overflow: 'hidden',
              minHeight: 280,
              maxHeight: 380,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {getDisplayImage() ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={getDisplayImage()}
                alt="Semantic Explainability Visualization"
                style={{ maxHeight: 380, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: 30 }}>
                Visualization image unavailable
              </div>
            )}
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: '#94a3b8', justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
              Microaneurysms
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#991b1b', display: 'inline-block' }}></span>
              Hemorrhages
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block' }}></span>
              Hard Exudates
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
              Vessels
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid #ffffff', background: 'transparent', display: 'inline-block' }}></span>
              Attn Contour
            </span>
          </div>
        </div>

        {/* Right Column: Per-Lesion Metrics & Attention Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Per-Lesion Spatial Metrics Table */}
          <div
            style={{
              background: '#020617',
              border: '2px solid #1e293b',
              borderRadius: 16,
              padding: 18,
            }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Per-Lesion Spatial Metrics
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textWrap: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1e293b', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>Lesion Class</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Count</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Lesion Cov</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Attn Cov</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>IoU</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Point Game</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, idx) => {
                    const iouStr = m.iou !== undefined && m.iou !== null ? m.iou.toFixed(3) : 'N/A';
                    const pgStr = m.pointing_game_hit === true ? 'HIT ✓' : m.pointing_game_hit === false ? 'MISS ✗' : 'N/A';
                    const pgColor = m.pointing_game_hit === true ? '#4ade80' : m.pointing_game_hit === false ? '#f87171' : '#64748b';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ padding: '10px 6px', fontWeight: 700, color: '#f1f5f9', textTransform: 'capitalize' }}>
                          {m.lesion_class.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#cbd5e1' }}>
                          {m.instance_count}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#c084fc', fontWeight: 700 }}>
                          {(m.lesion_coverage * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                          {(m.attention_coverage * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#94a3b8' }}>
                          {iouStr}
                        </td>
                        <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800, color: pgColor }}>
                          {pgStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attention Distribution Breakdown */}
          <div
            style={{
              background: '#020617',
              border: '2px solid #1e293b',
              borderRadius: 16,
              padding: 18,
            }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Attention Distribution Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(dist).map(([region, frac]) => {
                const pct = Math.round((frac as number) * 100);
                const color = getRegionColor(region);

                return (
                  <div key={region} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ textTransform: 'capitalize', color: '#94a3b8', fontWeight: 600 }}>
                        {region.replace('_', ' ')}
                      </span>
                      <strong style={{ color: '#f8fafc' }}>{pct}%</strong>
                    </div>
                    <div style={{ width: '100%', background: '#0f172a', borderRadius: 9999, height: 8, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: color,
                          height: '100%',
                          borderRadius: 9999,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Provenance & Disclaimer Footer ── */}
      <div
        style={{
          borderTop: '2px solid #1e293b',
          marginTop: 24,
          paddingTop: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 11,
          color: '#64748b',
        }}
      >
        <div>
          <span>Config Version: </span>
          <code style={{ color: '#c084fc', fontFamily: 'monospace' }}>
            lesion_grounding_config.json (v{grounding.config_version})
          </code>
        </div>
        <div style={{ fontStyle: 'italic', textAlign: 'right', maxWidth: 600, lineHeight: 1.4 }}>
          {data.disclaimer}
        </div>
      </div>
    </div>
  );
}
