'use client';

import React from 'react';
import { Cpu, Layers, Award } from 'lucide-react';

interface EnsemblePipelineProps {
  t: Record<string, string>;
  methodRef: React.RefObject<HTMLDivElement>;
}

export default function EnsemblePipeline({ t, methodRef }: EnsemblePipelineProps) {
  return (
    <section id="method" ref={methodRef} className="container-editorial" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1.5px solid rgba(20,18,16,0.1)' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 40px' }}>
        <span className="pill-badge pill-badge-blue" style={{ marginBottom: '14px' }}>
          ARCHITECTURE PIPELINE
        </span>
        <h2 className="font-serif-display" style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15 }}>
          {t.ensembleTitle}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.98rem', lineHeight: 1.6 }}>
          {t.ensembleSub}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="editorial-card" style={{ padding: '24px 18px', textAlign: 'center' }}>
          <Cpu size={28} color="var(--electric-blue)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>ResNet-50</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>2048d Deep Features</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px 18px', textAlign: 'center' }}>
          <Cpu size={28} color="var(--electric-blue)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>DenseNet-121</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>1024d Dense Features</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px 18px', textAlign: 'center' }}>
          <Cpu size={28} color="var(--electric-blue)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>EfficientNet-B3</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>1536d Scaled Features</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px 18px', textAlign: 'center', backgroundColor: 'var(--signal-yellow)' }}>
          <Layers size={28} color="var(--ink-black)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 800 }}>Feature Fusion</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-black)', marginTop: '4px', fontWeight: 700 }}>4608d Joint Vector</p>
        </div>

        <div className="editorial-card" style={{ padding: '24px 18px', textAlign: 'center', backgroundColor: 'var(--clinical-pink)', color: '#FFFFFF' }}>
          <Award size={28} color="#FFFFFF" style={{ margin: '0 auto 10px', display: 'block' }} />
          <h4 className="font-serif-display" style={{ fontSize: '1.1rem', fontWeight: 800 }}>Stacking Meta</h4>
          <p className="font-grotesk-mono" style={{ fontSize: '0.72rem', marginTop: '4px', opacity: 0.9 }}>Calibrated Prediction</p>
        </div>
      </div>
    </section>
  );
}
