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
  const score = grounding.score;
  const label = grounding.label;
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

  // Color mapping for attention distribution bars
  const getRegionColor = (region: string) => {
    switch (region) {
      case 'microaneurysm': return '#ef4444'; // Red
      case 'hemorrhage': return '#b91c1c'; // Dark Red
      case 'hard_exudate': return '#eab308'; // Yellow
      case 'vessel': return '#22c55e'; // Green
      case 'optic_disc': return '#3b82f6'; // Blue
      default: return '#64748b'; // Slate
    }
  };

  return (
    <div className="bg-slate-900 border-2 border-purple-900/60 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 font-sans my-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧬</span>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent">
              Lesion-Level Semantic Explainability
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-600/40 text-purple-300 font-medium">
              Research Layer v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounding neural attention against anatomical lesion candidates
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="self-start md:self-auto text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            ✕ Close Panel
          </button>
        )}
      </div>

      {/* Primary Score & Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Score Gauge */}
        <div className="md:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Lesion Grounding Score
          </div>

          <div className="relative flex items-center justify-center my-2">
            <svg className="w-36 h-36" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="#1e293b"
                strokeWidth="10"
              />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={labelColor}
                strokeWidth="10"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * Math.max(0, Math.min(100, score))) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{Math.round(score)}</span>
              <span className="text-[10px] text-slate-400">OUT OF 100</span>
            </div>
          </div>

          <div className="text-sm font-bold mt-1" style={{ color: labelColor }}>
            {label}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-left w-full text-xs border-t border-slate-800/80 pt-3 text-slate-300">
            <div>
              <span className="text-slate-500 block">Classifier Conf:</span>
              <span className="font-semibold text-sky-400">{(data.prediction_confidence * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 block">Target Class:</span>
              <span className="font-semibold text-purple-300 truncate block">{data.predicted_disease}</span>
            </div>
          </div>
        </div>

        {/* Right: Semantic Interpretation & Warnings */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          {/* Active Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w, idx) => {
                const isHighConfLowGrounding = w.includes('HIGH_CONFIDENCE_LOW_GROUNDING');
                const isNoLesions = w.includes('NO_LESION_CANDIDATES');
                const isShortcut = w.includes('BORDER_ATTENTION_SHORTCUT');

                const bgClass = isHighConfLowGrounding
                  ? 'bg-rose-950/60 border-rose-600/50 text-rose-200'
                  : isNoLesions
                  ? 'bg-amber-950/60 border-amber-600/50 text-amber-200'
                  : isShortcut
                  ? 'bg-yellow-950/60 border-yellow-600/50 text-yellow-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300';

                return (
                  <div key={idx} className={`p-3 rounded-lg border text-xs leading-relaxed ${bgClass}`}>
                    <div className="font-bold flex items-center gap-1.5 mb-0.5">
                      <span>⚠️</span>
                      <span>{w.split(':')[0]}</span>
                    </div>
                    <div>{w.includes(':') ? w.substring(w.indexOf(':') + 1).trim() : w}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interpretation Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
              <span>💬</span> Semantic Interpretation
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {grounding.semantic_interpretation}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Overlay Viewer & Spatial Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Image Viewer with Tabs */}
        <div className="lg:col-span-6 bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Spatial Visual Grounding
            </h3>
            {/* Tab buttons */}
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg text-[11px]">
              <button
                onClick={() => setActiveTab('combined')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'combined'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setActiveTab('overlay')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'overlay'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Grad-CAM++
              </button>
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'heatmap'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setActiveTab('original')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'original'
                    ? 'bg-purple-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Original
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div className="relative rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-[300px] border border-slate-800">
            {getDisplayImage() ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={getDisplayImage()}
                alt="Explainability Visualization"
                className="max-h-[380px] w-auto object-contain"
              />
            ) : (
              <div className="text-xs text-slate-500 italic p-6">Visualization unavailable</div>
            )}
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 pt-1 justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
              Microaneurysms
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-800 inline-block"></span>
              Hemorrhages
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
              Hard Exudates
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Vessels
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white bg-transparent inline-block"></span>
              Attention Contour
            </span>
          </div>
        </div>

        {/* Right 6 cols: Per-Lesion Metrics & Attention Distribution */}
        <div className="lg:col-span-6 space-y-4">
          {/* Per-Lesion Metrics Table */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Per-Lesion Spatial Metrics
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                    <th className="pb-2">Lesion Class</th>
                    <th className="pb-2 text-center">Count</th>
                    <th className="pb-2 text-center">Lesion Cov</th>
                    <th className="pb-2 text-center">Attn Cov</th>
                    <th className="pb-2 text-center">IoU</th>
                    <th className="pb-2 text-center">Point Game</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {metrics.map((m, idx) => {
                    const iouStr = m.iou !== undefined && m.iou !== null ? m.iou.toFixed(3) : 'N/A';
                    const pgStr =
                      m.pointing_game_hit === true
                        ? 'HIT ✓'
                        : m.pointing_game_hit === false
                        ? 'MISS ✗'
                        : 'N/A';
                    const pgColor =
                      m.pointing_game_hit === true
                        ? 'text-emerald-400'
                        : m.pointing_game_hit === false
                        ? 'text-rose-400'
                        : 'text-slate-500';

                    return (
                      <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 font-medium capitalize text-slate-200">
                          {m.lesion_class.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-300">{m.instance_count}</td>
                        <td className="py-2.5 text-center font-mono text-purple-300">
                          {(m.lesion_coverage * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 text-center font-mono text-sky-300">
                          {(m.attention_coverage * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-400">{iouStr}</td>
                        <td className={`py-2.5 text-center font-semibold text-[11px] ${pgColor}`}>
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
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Attention Distribution Breakdown
            </h3>

            <div className="space-y-2">
              {Object.entries(dist).map(([region, frac]) => {
                const pct = Math.round((frac as number) * 100);
                const color = getRegionColor(region);

                return (
                  <div key={region} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="capitalize text-slate-400">{region.replace('_', ' ')}</span>
                      <span className="font-semibold text-slate-200">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Config Provenance & Research Disclaimer Footer */}
      <div className="border-t border-slate-800 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center text-[11px] text-slate-500 gap-2">
        <div>
          <span>Config: </span>
          <code className="text-purple-400 font-mono">lesion_grounding_config.json (v{grounding.config_version})</code>
        </div>
        <div className="text-right italic max-w-xl">
          {data.disclaimer}
        </div>
      </div>
    </div>
  );
}
