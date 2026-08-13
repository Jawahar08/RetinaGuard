'use client';

import React from 'react';

export default function ResearchMetrics({ t }: { t: any }) {
  return (
    <section id="research" className="container-editorial" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1.5px solid rgba(20,18,16,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="pill-badge pill-badge-yellow" style={{ marginBottom: '10px' }}>
            IEEE RESEARCH BENCHMARK
          </span>
          <h2 className="font-serif-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15 }}>
            {t.researchTitle}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
            {t.researchSub}
          </p>
        </div>
      </div>

      <div className="editorial-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textTransform: 'none', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ background: '#FAF7F2', borderBottom: 'var(--border-thick)' }}>
              <th className="font-grotesk-mono" style={{ padding: '14px 20px', fontSize: '0.78rem' }}>Model Architecture</th>
              <th className="font-grotesk-mono" style={{ padding: '14px 20px', fontSize: '0.78rem' }}>Feature Dim</th>
              <th className="font-grotesk-mono" style={{ padding: '14px 20px', fontSize: '0.78rem' }}>Test Accuracy</th>
              <th className="font-grotesk-mono" style={{ padding: '14px 20px', fontSize: '0.78rem' }}>Weighted F1</th>
              <th className="font-grotesk-mono" style={{ padding: '14px 20px', fontSize: '0.78rem' }}>ECE Calibration</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(20,18,16,0.1)' }}>
              <td style={{ padding: '16px 20px', fontWeight: 700 }}>ResNet-50</td>
              <td style={{ padding: '16px 20px' }}>2048d</td>
              <td style={{ padding: '16px 20px' }}>86.48%</td>
              <td style={{ padding: '16px 20px' }}>0.8767</td>
              <td style={{ padding: '16px 20px' }}>0.0856</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(20,18,16,0.1)' }}>
              <td style={{ padding: '16px 20px', fontWeight: 700 }}>DenseNet-121</td>
              <td style={{ padding: '16px 20px' }}>1024d</td>
              <td style={{ padding: '16px 20px' }}>89.62%</td>
              <td style={{ padding: '16px 20px' }}>0.9033</td>
              <td style={{ padding: '16px 20px' }}>0.0751</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(20,18,16,0.1)' }}>
              <td style={{ padding: '16px 20px', fontWeight: 700 }}>EfficientNet-B3</td>
              <td style={{ padding: '16px 20px' }}>1536d</td>
              <td style={{ padding: '16px 20px' }}>92.08%</td>
              <td style={{ padding: '16px 20px' }}>0.9240</td>
              <td style={{ padding: '16px 20px' }}>0.0550</td>
            </tr>
            <tr style={{ background: '#FFF9E6', fontWeight: 800 }}>
              <td style={{ padding: '16px 20px', color: 'var(--ink-black)' }}>RetinaGuard Stacking Ensemble SOTA</td>
              <td style={{ padding: '16px 20px' }}>4608d + OOF</td>
              <td style={{ padding: '16px 20px', color: 'var(--electric-blue)', fontSize: '1.05rem' }}>98.22%</td>
              <td style={{ padding: '16px 20px' }}>0.9825</td>
              <td style={{ padding: '16px 20px' }}>0.0425</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
