'use client';

import React from 'react';
import { ArrowRight, Eye } from 'lucide-react';

interface SiteHeaderProps {
  lang: 'en' | 'ph';
  setLang: (lang: 'en' | 'ph') => void;
  onStartScreening: () => void;
  onExploreMethod: () => void;
}

export default function SiteHeader({ lang, setLang, onStartScreening, onExploreMethod }: SiteHeaderProps) {
  return (
    <header style={{ borderBottom: '1.5px solid rgba(20, 18, 16, 0.1)', background: 'rgba(246, 243, 236, 0.85)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="container-editorial" style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--ink-black)', color: '#fff', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-thick)', boxShadow: 'var(--shadow-sm)' }}>
            <Eye size={20} color="var(--signal-yellow)" />
          </div>
          <div>
            <h1 className="font-serif-display" style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.1 }}>
              RetinaGuard
            </h1>
            <p className="font-grotesk-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              EXPLAINABLE MULTI-DISEASE SCREENING
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a href="#overview" style={{ color: 'var(--ink-black)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>Overview</a>
          <button onClick={onStartScreening} style={{ background: 'none', border: 'none', color: 'var(--ink-black)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Screening</button>
          <a href="#dip-explorer" style={{ color: 'var(--ink-black)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>DIP Biomarkers</a>
          <a href="#progression" style={{ color: 'var(--ink-black)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>Progression</a>
          <a href="#research" style={{ color: 'var(--ink-black)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>Research</a>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--card-white)', border: 'var(--border-thick)', borderRadius: 'var(--radius-pill)', padding: '3px', boxShadow: 'var(--shadow-sm)' }}>
            <button
              className={`btn-editorial-secondary ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
              style={{ padding: '3px 10px', fontSize: '0.72rem', border: 'none', boxShadow: 'none' }}
            >
              🇺🇸 EN
            </button>
            <button
              className={`btn-editorial-secondary ${lang === 'ph' ? 'active' : ''}`}
              onClick={() => setLang('ph')}
              style={{ padding: '3px 10px', fontSize: '0.72rem', border: 'none', boxShadow: 'none' }}
            >
              🇵🇭 PH
            </button>
          </div>

          <button className="btn-editorial-primary" onClick={onStartScreening} style={{ padding: '8px 18px', fontSize: '0.78rem' }}>
            START SCREENING <ArrowRight size={14} />
          </button>
        </nav>
      </div>
    </header>
  );
}
