'use client';

import React from 'react';
import { Cpu, Layers, Award } from 'lucide-react';

interface EnsemblePipelineProps {
  t: Record<string, string>;
  methodRef: React.RefObject<HTMLDivElement>;
}

export default function EnsemblePipeline({ t, methodRef }: EnsemblePipelineProps) {
  return (
    <section id="method" ref={methodRef} style={{ maxWidth: '1360px', margin: '0 auto', padding: '64px 32px', borderTop: '2px solid rgba(20,18,16,0.1)' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 48px' }}>
        <span className="pill-badge pill-badge-blue" style={{ marginBottom: '16px' }}>
          ARCHITECTURE PIPELINE
        </span>
        <h2 className="font-serif-display" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          {t.ensembleTitle}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '1.05rem' }}>
          {t.ensembleSub}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        <div className="editorial-card" style={{ padding: '24px', textAlign: 'center' }}>
          <Cpu size={32} color="var(--electric-blue)" style={{ marginBottom: '12px' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ResNet-50</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>2048d Deep Features</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px', textAlign: 'center' }}>
          <Cpu size={32} color="var(--electric-blue)" style={{ marginBottom: '12px' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>DenseNet-121</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>1024d Dense Features</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px', textAlign: 'center' }}>
          <Cpu size={32} color="var(--electric-blue)" style={{ marginBottom: '12px' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>EfficientNet-B3</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>1536d Scaled Features</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--signal-yellow)' }}>
          <Layers size={32} color="var(--ink-black)" style={{ marginBottom: '12px' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 800 }}>Feature Fusion</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.75rem', color: 'var(--ink-black)', marginTop: '4px', fontWeight: 700 }}>4608d Joint Vector</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--clinical-pink)', color: '#FFFFFF' }}>
          <Award size={32} color="#FFFFFF" style={{ marginBottom: '12px' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 800 }}>Stacking Meta</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>Calibrated Prediction</p>
        </div>
      </div>
    </section>
  );
}
