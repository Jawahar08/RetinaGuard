'use client';

import React from 'react';
import { RevealUp, AnimatedCounter, MagneticCard, GradientText } from './AnimationKit';

const METRICS = [
  { value: 98.22, suffix: '%', label: 'SOTA Test Accuracy', color: '#315CF5', bg: '#EFF3FF', border: '#BAC8FF' },
  { value: 0.9825, suffix: '', label: 'Weighted F1 Score', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', decimals: 4 },
  { value: 4608, suffix: 'D', label: 'Feature Fusion Dim.', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { value: 0.0425, suffix: '', label: 'ECE Calibration ↓', color: '#E7358A', bg: '#FDF2F8', border: '#FBCFE8', decimals: 4 },
];

const ROWS = [
  { model: 'ResNet-50', feat: '2048d', acc: '86.48%', f1: '0.8767', ece: '0.0856', sota: false },
  { model: 'DenseNet-121', feat: '1024d', acc: '89.62%', f1: '0.9033', ece: '0.0751', sota: false },
  { model: 'EfficientNet-B3', feat: '1536d', acc: '92.08%', f1: '0.9240', ece: '0.0550', sota: false },
  { model: 'RetinaGuard Ensemble (SOTA)', feat: '4608d + OOF', acc: '98.22%', f1: '0.9825', ece: '0.0425', sota: true },
];

export default function ResearchMetrics({ t }: { t: any }) {
  return (
    <section id="research" className="container-editorial" style={{ paddingTop: '56px', paddingBottom: '56px', borderTop: '1.5px solid rgba(20,18,16,0.08)', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <RevealUp>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="pill-badge pill-badge-yellow" style={{ marginBottom: '12px' }}>
              IEEE RESEARCH BENCHMARK
            </span>
            <h2 className="font-serif-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15 }}>
              <GradientText>{t.researchTitle}</GradientText>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', maxWidth: 560 }}>
              {t.researchSub}
            </p>
          </div>
        </div>
      </RevealUp>

      {/* Animated metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {METRICS.map((m, i) => (
          <RevealUp key={i} delay={i * 80}>
            <MagneticCard
              style={{
                background: m.bg,
                border: `2px solid ${m.border}`,
                borderRadius: 20,
                padding: '20px 22px',
                boxShadow: '4px 4px 0px #141210',
                textAlign: 'center',
              }}
            >
              <div className="font-serif-display" style={{ fontSize: '2rem', fontWeight: 900, color: m.color, lineHeight: 1 }}>
                <AnimatedCounter target={m.value} suffix={m.suffix} decimals={m.decimals ?? 2} duration={1600} />
              </div>
              <div className="font-grotesk-mono" style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 6 }}>
                {m.label}
              </div>
            </MagneticCard>
          </RevealUp>
        ))}
      </div>

      {/* Research table */}
      <RevealUp delay={200}>
        <div className="editorial-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#FAF7F2', borderBottom: 'var(--border-thick)' }}>
                {['Model Architecture', 'Feature Dim', 'Test Accuracy', 'Weighted F1', 'ECE Calibration'].map((h, i) => (
                  <th key={i} className="font-grotesk-mono" style={{ padding: '14px 20px', fontSize: '0.78rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid rgba(20,18,16,0.08)',
                    background: row.sota ? '#FFFBEB' : 'transparent',
                    fontWeight: row.sota ? 800 : 400,
                    transition: 'background 0.2s ease',
                    animation: `card-entrance 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms both`,
                  }}
                  className={row.sota ? '' : 'research-row'}
                >
                  <td style={{ padding: '15px 20px', fontWeight: row.sota ? 800 : 700 }}>
                    {row.sota ? '🏆 ' : ''}{row.model}
                  </td>
                  <td style={{ padding: '15px 20px' }}>{row.feat}</td>
                  <td style={{ padding: '15px 20px', color: row.sota ? 'var(--electric-blue)' : 'inherit', fontSize: row.sota ? '1.05rem' : undefined }}>
                    {row.acc}
                  </td>
                  <td style={{ padding: '15px 20px' }}>{row.f1}</td>
                  <td style={{ padding: '15px 20px' }}>{row.ece}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RevealUp>
    </section>
  );
}


