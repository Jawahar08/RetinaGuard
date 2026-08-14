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

/* ── Retinal scan preview card with Real Clinical Eye Scan ───────────────── */
function ScanPreviewCard() {
  const [scanning, setScanning] = useState(true);
  const [dotIndex, setDotIndex] = useState(0);

  // Anatomical landmarks mapped accurately to aptos_stage_2_moderate.png
  const DOTS = [
    { x: 25.5, y: 49.0, color: '#F59E0B', label: 'Optic Disc (OD)', short: 'OD', size: 14 },
    { x: 64.0, y: 45.0, color: '#EF4444', label: 'Exudates / Microaneurysms', short: 'DR Lesions', size: 12 },
    { x: 56.0, y: 51.5, color: '#315CF5', label: 'Fovea / Macula', short: 'Macula', size: 10 },
    { x: 37.0, y: 28.0, color: '#10B981', label: 'Superior Vascular Arcade', short: 'Vessels', size: 9 },
  ];

  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scanning) return;
    const i = setInterval(() => setDotIndex(d => (d + 1) % DOTS.length), 1600);
    return () => clearInterval(i);
  }, [scanning]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 360,
      aspectRatio: '1/1',
      background: '#07080B',
      borderRadius: 24,
      border: '2px solid #141210',
      boxShadow: '6px 6px 0px #141210, 0 0 60px rgba(49,92,245,0.25)',
      overflow: 'hidden',
      animation: 'hero-glow 4s ease-in-out infinite',
    }}>
      {/* Background medical grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(49,92,245,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(49,92,245,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Real Clinical Retinal Fundus Image Container */}
      <div style={{
        position: 'absolute', inset: 16,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid rgba(255,200,61,0.4)',
        boxShadow: '0 0 30px rgba(0,0,0,0.8), inset 0 0 35px rgba(0,0,0,0.85)',
        background: '#000',
        zIndex: 2,
      }}>
        {/* Real Fundus Eye Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/samples/aptos_stage_2_moderate.png"
          alt="Real Retinal Fundus Scan - Diabetic Retinopathy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'contrast(1.08) brightness(1.02)',
            transform: 'scale(1.04)',
            transition: 'transform 0.5s ease',
          }}
        />

        {/* Subtle lens flare / vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 45% 45%, transparent 60%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Anatomical Landmark Pinpoints & Overlays */}
        {!scanning && DOTS.map((dot, i) => {
          const isActive = dotIndex === i;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isActive ? 10 : 5,
                transition: 'all 0.3s ease',
              }}
            >
              {/* Target reticle for active landmark */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: dot.size * 3.2,
                  height: dot.size * 3.2,
                  borderRadius: '50%',
                  border: `1.5px dashed ${dot.color}`,
                  animation: 'spin-slow 6s linear infinite',
                  pointerEvents: 'none',
                }} />
              )}

              {/* Center point */}
              <div style={{
                width: dot.size,
                height: dot.size,
                borderRadius: '50%',
                background: dot.color,
                border: '2px solid #ffffff',
                boxShadow: `0 0 12px ${dot.color}, 0 0 4px #000`,
                cursor: 'pointer',
                transform: isActive ? 'scale(1.2)' : 'scale(0.9)',
                transition: 'transform 0.3s ease',
              }} />

              {/* Landmark Callout Tag */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: dot.y < 35 ? 18 : -26,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.92)',
                  color: '#ffffff',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  border: `1px solid ${dot.color}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  animation: 'badge-pop 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot.color }} />
                  {dot.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Crosshair HUD elements in corners */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 4, color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontFamily: 'monospace' }}>
        FOV 45° · MACULA
      </div>

      {/* Laser Scanning Line Overlay */}
      <ScanLineOverlay active={scanning} />

      {/* Top-left status badge */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        background: 'rgba(255,200,61,0.95)',
        border: '1.5px solid #141210',
        borderRadius: 8, padding: '4px 10px',
        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em',
        color: '#141210',
        display: 'flex', alignItems: 'center', gap: 5,
        zIndex: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <PulseDot color="#141210" /> {scanning ? 'SCANNING FUNDUS...' : 'CLINICAL EYE LIVE'}
      </div>

      {/* Bottom telemetry & diagnostic result bar */}
      {!scanning && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,12,16,0.92) 25%, rgba(6,7,10,0.98) 100%)',
          padding: '14px 16px 14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          animation: 'slide-in-left 0.5s ease',
          zIndex: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#10B981', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✓</span> ANALYSIS COMPLETE — DR Grade 2
            </div>
            <span style={{ fontSize: '0.6rem', color: '#FFC83D', fontWeight: 700, background: 'rgba(255,200,61,0.15)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(255,200,61,0.3)' }}>
              APTOS 2019
            </span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.65rem', marginTop: 3 }}>
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
  );
}


