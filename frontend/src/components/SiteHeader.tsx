'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { PulseDot, RippleButton } from './AnimationKit';

interface SiteHeaderProps {
  onStartScreening: () => void;
  onExploreMethod: () => void;
  recordsCount?: number;
}

export default function SiteHeader({ onStartScreening, onExploreMethod, recordsCount }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header style={{
      borderBottom: scrolled ? '1.5px solid rgba(20,18,16,0.12)' : '1.5px solid transparent',
      background: scrolled
        ? 'rgba(246,243,236,0.95)'
        : 'rgba(246,243,236,0.80)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
      boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.07)' : 'none',
    }}>
      <div
        className="container-editorial"
        style={{
          padding: scrolled ? '13px 24px' : '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          transition: 'padding 0.3s ease',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'default' }}>
          <div style={{
            background: 'var(--ink-black)',
            color: '#fff',
            width: scrolled ? '32px' : '36px',
            height: scrolled ? '32px' : '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'var(--border-thick)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'width 0.3s ease, height 0.3s ease',
            position: 'relative',
          }}>
            <Eye size={scrolled ? 16 : 20} color="var(--signal-yellow)" style={{ transition: 'all 0.3s ease' }} />
            {/* eye pulse ring */}
            <span style={{
              position: 'absolute', inset: -4, borderRadius: 13,
              border: '1.5px solid rgba(255,200,61,0.35)',
              animation: 'pulse-ring 3s ease-out infinite',
            }} />
          </div>
          <div>
            <h1 className="font-serif-display" style={{
              fontSize: scrolled ? '1.15rem' : '1.35rem',
              fontWeight: 800, lineHeight: 1.1,
              transition: 'font-size 0.3s ease',
            }}>
              RetinaGuard
            </h1>
            <p className="font-grotesk-mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              EXPLAINABLE MULTI-DISEASE SCREENING
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          {[
            { label: 'Overview', href: '#overview' },
            { label: 'Screening', onClick: onStartScreening },
            { label: 'DIP Biomarkers', href: '#dip-explorer' },
            { label: 'Progression', href: '#progression' },
            {
              label: 'Past Records 🗂️',
              href: '/records',
              badge: typeof recordsCount === 'number' ? recordsCount : undefined
            },
            { label: 'Research', href: '#research' },
          ].map((item, i) =>
            item.href ? (
              <a
                key={i}
                href={item.href}
                style={{
                  color: 'var(--ink-black)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  position: 'relative',
                  paddingBottom: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                className="nav-link-animated"
              >
                {item.label}
                {typeof item.badge === 'number' && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    background: '#E2E8F0',
                    color: 'var(--ink-black)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    border: '1px solid rgba(20,18,16,0.15)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </a>
            ) : (
              <button
                key={i}
                onClick={item.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-black)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  position: 'relative',
                  paddingBottom: '2px',
                }}
                className="nav-link-animated"
              >
                {item.label}
              </button>
            )
          )}

          {/* Live indicator + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '0.7rem', fontWeight: 700, color: '#166534',
              background: '#F0FDF4', border: '1.5px solid #141210',
              borderRadius: 'var(--radius-pill)', padding: '4px 10px',
            }}>
              <PulseDot color="#10B981" /> LIVE
            </span>
            <RippleButton
              className="btn-editorial-primary"
              onClick={onStartScreening}
              style={{ padding: '8px 18px', fontSize: '0.78rem' }}
            >
              START SCREENING 👁️ <ArrowRight size={14} />
            </RippleButton>
          </div>
        </nav>
      </div>
    </header>
  );
}


