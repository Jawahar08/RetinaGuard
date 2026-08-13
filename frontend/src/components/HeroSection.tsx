'use client';

import React from 'react';
import { ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  t: Record<string, string>;
  onStartScreening: () => void;
  onExploreMethod: () => void;
}

export default function HeroSection({ t, onStartScreening, onExploreMethod }: HeroSectionProps) {
  return (
    <section id="overview" className="container-editorial" style={{ paddingTop: '48px', paddingBottom: '32px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span className="pill-badge pill-badge-yellow">⚡ 4608-D ENSEMBLE DEEP LEARNING</span>
        <span className="pill-badge pill-badge-blue">🔬 CLASSICAL DIP BIOMARKERS</span>
        <span className="pill-badge pill-badge-white">🎯 SOTA ACCURACY 98.22%</span>
      </div>

      <h1 className="font-serif-display" style={{ fontSize: 'clamp(2.4rem, 4.5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.08, maxWidth: '960px', letterSpacing: '-0.02em', marginBottom: '20px' }}>
        {t.heroTitleLine1} <br />
        <span style={{ fontStyle: 'italic', color: 'var(--electric-blue)' }}>{t.heroTitleLine2}</span>
      </h1>

      <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '780px', marginBottom: '28px', lineHeight: 1.6 }}>
        {t.heroSub}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button className="btn-editorial-primary" onClick={onStartScreening}>
          {t.ctaPrimary} <ArrowRight size={16} />
        </button>
        <button className="btn-editorial-secondary" onClick={onExploreMethod}>
          {t.ctaSecondary}
        </button>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--card-white)', border: 'var(--border-thick)', borderRadius: 'var(--radius-pill)', fontSize: '0.78rem', color: 'var(--text-muted)', boxShadow: 'var(--shadow-sm)' }}>
        <ShieldAlert size={15} color="var(--clinical-pink)" /> {t.trustLine}
      </div>
    </section>
  );
}
