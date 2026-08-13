'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, ShieldAlert, Zap, Brain, Activity } from 'lucide-react';
import { GradientText, RevealUp, PulseDot, ScanLineOverlay, RippleButton, AnimationKeyframes } from './AnimationKit';

interface HeroSectionProps {
  t: Record<string, string>;
  onStartScreening: () => void;
  onExploreMethod: () => void;
}

/* ── Typewriter for the italic hero line ─── */
function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const delay = 350; // pause before starting
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, 46);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <span>
      {displayed}
      <span style={{
        display: 'inline-block', width: '3px', height: '0.85em',
        background: done ? 'transparent' : 'var(--electric-blue)',
        verticalAlign: 'middle', marginLeft: 2,
        animation: done ? 'none' : 'blink-cursor 0.8s step-end infinite',
        borderRadius: 2,
        transition: 'background 0.3s',
      }} />
    </span>
  );
}

/* ── Floating stat cards ────────────────────────────────────────────────── */
function FloatingStatCard({
  value, label, color, icon, delay
}: { value: string; label: string; color: string; icon: React.ReactNode; delay: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.92)',
      border: '2px solid #141210',
      borderRadius: 18,
      padding: '12px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '4px 4px 0px #141210',
      animation: `card-entrance 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}ms both, float-badge 5s ease-in-out ${delay}ms infinite`,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid #141210', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#141210', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Retinal scan preview card ──────────────────────────────────────────── */
function ScanPreviewCard() {
  const [scanning, setScanning] = useState(true);
  const [dotIndex, setDotIndex] = useState(0);

  const DOTS = [
    { x: 55, y: 45, color: '#EF4444', label: 'DR', size: 10 },
    { x: 42, y: 58, color: '#F59E0B', label: 'OD', size: 14 },
    { x: 67, y: 52, color: '#10B981', label: 'FOV', size: 8 },
    { x: 50, y: 35, color: '#315CF5', label: 'Vessel', size: 7 },
  ];

  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scanning) return;
    const i = setInterval(() => setDotIndex(d => (d + 1) % DOTS.length), 1200);
    return () => clearInterval(i);
  }, [scanning]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 360,
      aspectRatio: '1/1',
      background: '#0A0A0A',
      borderRadius: 24,
      border: '2px solid #141210',
      boxShadow: '6px 6px 0px #141210, 0 0 60px rgba(49,92,245,0.2)',
      overflow: 'hidden',
      animation: 'hero-glow 4s ease-in-out infinite',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(49,92,245,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(49,92,245,0.06) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Retinal fundus placeholder */}
      <div style={{
        position: 'absolute', inset: 24,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 40%, #3D1200 0%, #1A0800 40%, #060300 100%)',
        border: '2px solid rgba(255,100,50,0.25)',
        boxShadow: 'inset 0 0 40px rgba(180,60,20,0.4)',
      }}>
        {/* Vessel lines */}
        <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}>
          <path d="M50 50 Q30 30 20 20" stroke="#8B3A0F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M50 50 Q70 35 80 25" stroke="#8B3A0F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M50 50 Q40 70 30 80" stroke="#8B3A0F" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M50 50 Q65 65 75 78" stroke="#8B3A0F" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M50 50 Q55 30 52 10" stroke="#8B3A0F" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M50 50 Q25 55 10 55" stroke="#8B3A0F" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="50" r="4" fill="#FFC83D" opacity="0.7" />
        </svg>

        {/* Annotation dots */}
        {!scanning && DOTS.map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${dot.x}%`, top: `${dot.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: dotIndex === i ? 1 : 0.3,
              transition: 'opacity 0.4s ease',
            }}
          >
            <div style={{
              width: dot.size, height: dot.size,
              borderRadius: '50%',
              background: dot.color,
              border: '1.5px solid white',
              boxShadow: `0 0 8px ${dot.color}`,
              animation: dotIndex === i ? 'pulse-ring 1.5s ease-out infinite' : 'none',
            }} />
            {dotIndex === i && (
              <div style={{
                position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                background: dot.color, color: '#fff',
                fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px',
                borderRadius: 4, whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.3)',
              }}>
                {dot.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scanning line */}
      <ScanLineOverlay active={scanning} />

      {/* Top-left badge */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(255,200,61,0.95)',
        border: '1.5px solid #141210',
        borderRadius: 8, padding: '4px 10px',
        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em',
        color: '#141210',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <PulseDot color="#141210" /> {scanning ? 'SCANNING...' : 'AI ACTIVE'}
      </div>

      {/* Bottom result bar */}
      {!scanning && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))',
          padding: '12px 14px 14px',
          animation: 'slide-in-left 0.5s ease',
        }}>
          <div style={{ color: '#10B981', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.06em' }}>
            ✓ ANALYSIS COMPLETE — DR Grade 2 Detected
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', marginTop: 2 }}>
            Confidence: 98.2% · Risk: Moderate · VDI: 0.318
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main HeroSection ───────────────────────────────────────────────────── */
export default function HeroSection({ t, onStartScreening, onExploreMethod }: HeroSectionProps) {
  return (
    <>
      <AnimationKeyframes />
      <section
        id="overview"
        className="container-editorial"
        style={{ paddingTop: '56px', paddingBottom: '40px', position: 'relative', zIndex: 1 }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,400px)',
          gap: '48px',
          alignItems: 'center',
        }}>

          {/* LEFT — text column */}
          <div>
            {/* Animated pill row */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { text: '⚡ 4608-D ENSEMBLE DEEP LEARNING', cls: 'pill-badge-yellow', delay: 0 },
                { text: '🔬 CLASSICAL DIP BIOMARKERS', cls: 'pill-badge-blue', delay: 100 },
                { text: '🎯 SOTA ACCURACY 98.22%', cls: 'pill-badge-white', delay: 200 },
              ].map((badge, i) => (
                <span
                  key={i}
                  className={`pill-badge ${badge.cls}`}
                  style={{ animation: `badge-pop 0.5s cubic-bezier(0.22,1,0.36,1) ${badge.delay}ms both` }}
                >
                  {badge.text}
                </span>
              ))}
            </div>

            {/* Headline */}
            <h1
              className="font-serif-display"
              style={{
                fontSize: 'clamp(2.4rem, 4.2vw, 4rem)',
                fontWeight: 900,
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                marginBottom: '22px',
                animation: 'slide-in-left 0.7s cubic-bezier(0.22,1,0.36,1) 100ms both',
              }}
            >
              {t.heroTitleLine1}
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--electric-blue)' }}>
                <Typewriter text={t.heroTitleLine2} />
              </span>
            </h1>

            {/* Subtext */}
            <p style={{
              fontSize: '1.08rem',
              color: 'var(--text-muted)',
              maxWidth: '680px',
              marginBottom: '32px',
              lineHeight: 1.65,
              animation: 'slide-in-left 0.7s cubic-bezier(0.22,1,0.36,1) 250ms both',
            }}>
              {t.heroSub}
            </p>

            {/* CTA buttons with ripple */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              marginBottom: '32px', flexWrap: 'wrap',
              animation: 'slide-in-left 0.7s cubic-bezier(0.22,1,0.36,1) 350ms both',
            }}>
              <RippleButton
                className="btn-editorial-primary"
                onClick={onStartScreening}
                style={{ padding: '14px 28px', fontSize: '0.9rem' }}
              >
                {t.ctaPrimary} <ArrowRight size={16} />
              </RippleButton>
              <RippleButton
                className="btn-editorial-secondary"
                onClick={onExploreMethod}
              >
                {t.ctaSecondary}
              </RippleButton>
            </div>

            {/* Trust / disclaimer row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              animation: 'slide-in-left 0.7s cubic-bezier(0.22,1,0.36,1) 450ms both',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px',
                background: 'var(--card-white)', border: 'var(--border-thick)',
                borderRadius: 'var(--radius-pill)', fontSize: '0.78rem',
                color: 'var(--text-muted)', boxShadow: 'var(--shadow-sm)',
              }}>
                <ShieldAlert size={15} color="var(--clinical-pink)" />
                {t.trustLine}
              </div>

              {/* Live status */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '8px 14px',
                background: '#F0FDF4', border: '2px solid #141210',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.72rem', fontWeight: 700, color: '#166534',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <PulseDot color="#10B981" />
                AI ENGINE LIVE
              </div>
            </div>
          </div>

          {/* RIGHT — visual panel */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
            animation: 'slide-in-right 0.8s cubic-bezier(0.22,1,0.36,1) 200ms both',
          }}>
            <ScanPreviewCard />

            {/* Floating mini stat cards */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <FloatingStatCard
                value="98.22%"
                label="SOTA Accuracy"
                color="#FFC83D"
                icon={<Zap size={18} color="#141210" />}
                delay={600}
              />
              <FloatingStatCard
                value="4608-D"
                label="Feature Fusion"
                color="#315CF5"
                icon={<Brain size={18} color="#ffffff" />}
                delay={800}
              />
              <FloatingStatCard
                value="0-100"
                label="Risk Score"
                color="#10B981"
                icon={<Activity size={18} color="#ffffff" />}
                delay={1000}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
