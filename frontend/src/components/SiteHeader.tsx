'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SiteHeaderProps {
  lang: 'en' | 'ph';
  setLang: (lang: 'en' | 'ph') => void;
  onStartScreening: () => void;
  onExploreMethod: () => void;
}

export default function SiteHeader({ lang, setLang, onStartScreening, onExploreMethod }: SiteHeaderProps) {
  return (
    <header style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(20,18,16,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 className="font-serif-display" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>
            RetinaGuard
          </h1>
          <p className="font-grotesk-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            EXPLAINABLE RETINAL SCREENING
          </p>
        </div>
      </div>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <a href="#overview" style={{ color: 'var(--ink-black)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Overview</a>
        <button onClick={onStartScreening} style={{ background: 'none', border: 'none', color: 'var(--ink-black)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Analyze</button>
        <button onClick={onExploreMethod} style={{ background: 'none', border: 'none', color: 'var(--ink-black)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>How It Works</button>
        <a href="#research" style={{ color: 'var(--ink-black)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Research</a>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--card-white)', border: 'var(--border-thick)', borderRadius: 'var(--radius-pill)', padding: '4px' }}>
          <button
            className={`btn-editorial-secondary ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
            style={{ padding: '4px 12px', fontSize: '0.75rem', border: 'none', boxShadow: 'none' }}
          >
            🇺🇸 EN
          </button>
          <button
            className={`btn-editorial-secondary ${lang === 'ph' ? 'active' : ''}`}
            onClick={() => setLang('ph')}
            style={{ padding: '4px 12px', fontSize: '0.75rem', border: 'none', boxShadow: 'none' }}
          >
            🇵🇭 PH
          </button>
        </div>

        <button className="btn-editorial-primary" onClick={onStartScreening} style={{ padding: '10px 20px', fontSize: '0.825rem' }}>
          START A SCREENING <ArrowRight size={16} />
        </button>
      </nav>
    </header>
  );
}
