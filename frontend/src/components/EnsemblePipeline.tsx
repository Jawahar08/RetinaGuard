'use client';

import React from 'react';
import { Cpu, Layers, Award, ArrowRight } from 'lucide-react';
import { RevealUp, MagneticCard } from './AnimationKit';

interface EnsemblePipelineProps {
  t: Record<string, string>;
  methodRef: React.RefObject<HTMLDivElement>;
}

const PIPELINE_STEPS = [
  { icon: <Cpu size={28} color="var(--electric-blue)" />, title: 'ResNet-50', sub: '2048d Deep Features', bg: '#FFFFFF', delay: 0 },
  { icon: <Cpu size={28} color="var(--electric-blue)" />, title: 'DenseNet-121', sub: '1024d Dense Features', bg: '#FFFFFF', delay: 100 },
  { icon: <Cpu size={28} color="var(--electric-blue)" />, title: 'EfficientNet-B3', sub: '1536d Scaled Features', bg: '#FFFFFF', delay: 200 },
  { icon: <Layers size={28} color="var(--ink-black)" />, title: 'Feature Fusion', sub: '4608d Joint Vector', bg: 'var(--signal-yellow)', delay: 300 },
  { icon: <Award size={28} color="#FFFFFF" />, title: 'Stacking Meta', sub: 'Calibrated Prediction', bg: 'var(--clinical-pink)', textColor: '#FFFFFF', delay: 400 },
];

export default function EnsemblePipeline({ t, methodRef }: EnsemblePipelineProps) {
  return (
    <section
      id="method"
      ref={methodRef}
      className="container-editorial"
      style={{ paddingTop: '56px', paddingBottom: '56px', borderTop: '1.5px solid rgba(20,18,16,0.08)', position: 'relative', zIndex: 1 }}
    >
      <RevealUp>
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 44px' }}>
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
      </RevealUp>

      {/* Pipeline flow with animated arrows */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        justifyContent: 'center',
        flexWrap: 'nowrap',
      }}>
        {PIPELINE_STEPS.map((step, i) => (
          <React.Fragment key={i}>
            <RevealUp delay={step.delay} style={{ flexShrink: 0 }}>
              <MagneticCard
                className="editorial-card"
                style={{
                  padding: '24px 18px',
                  textAlign: 'center',
                  backgroundColor: step.bg,
                  minWidth: '160px',
                  color: step.textColor,
                  animation: `card-entrance 0.55s cubic-bezier(0.22,1,0.36,1) ${step.delay}ms both`,
                }}
              >
                <div style={{ margin: '0 auto 10px', display: 'flex', justifyContent: 'center' }}>
                  {step.icon}
                </div>
                <h4 className="font-serif-display" style={{ fontSize: '1.05rem', fontWeight: 800, color: step.textColor }}>
                  {step.title}
                </h4>
                <p className="font-grotesk-mono" style={{
                  fontSize: '0.68rem', color: step.textColor || 'var(--text-muted)',
                  marginTop: '4px', fontWeight: step.textColor ? 700 : undefined,
                  opacity: step.textColor ? 0.9 : 1,
                }}>
                  {step.sub}
                </p>
              </MagneticCard>
            </RevealUp>

            {/* Arrow connector (skip after last) */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{
                flexShrink: 0,
                animation: `badge-pop 0.4s cubic-bezier(0.22,1,0.36,1) ${step.delay + 200}ms both`,
                opacity: 0,
              }}>
                <ArrowRight size={22} color="var(--electric-blue)" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
