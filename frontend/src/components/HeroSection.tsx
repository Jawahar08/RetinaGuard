'use client';

import React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';

interface HeroSectionProps {
  t: Record<string, string>;
  onStartScreening: () => void;
  onExploreMethod: () => void;
}

export default function HeroSection({ t, onStartScreening, onExploreMethod }: HeroSectionProps) {
  return (
    <section id="overview" style={{ maxWidth: '1360px', margin: '0 auto', padding: '64px 32px 48px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <span className="pill-badge pill-badge-yellow">ENSEMBLE DEEP LEARNING</span>
        <span className="pill-badge pill-badge-blue">GRAD-CAM ATTENTION</span>
        <span className="pill-badge pill-badge-white">SOTA ACCURACY 98.22%</span>
      </div>

      <h1 className="font-serif-display" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.8rem)', fontWeight: 800, lineHeight: 1.05, maxWidth: '950px', letterSpacing: '-0.02em', marginBottom: '24px' }}>
        {t.heroTitleLine1} <br />
        <span style={{ fontStyle: 'italic', color: 'var(--electric-blue)' }}>{t.heroTitleLine2}</span>
      </h1>

      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '750px', marginBottom: '32px', lineHeight: 1.6 }}>
        {t.heroSub}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button className="btn-editorial-primary" onClick={onStartScreening}>
          {t.ctaPrimary} <ArrowRight size={18} />
        </button>
        <button className="btn-editorial-secondary" onClick={onExploreMethod}>
          {t.ctaSecondary}
        </button>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--card-white)', border: 'var(--border-thick)', borderRadius: 'var(--radius-pill)', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={16} color="var(--clinical-pink)" /> {t.trustLine}
      </div>
    </section>
  );
}
