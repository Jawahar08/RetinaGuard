'use client';

import React, { useEffect, useRef, useState } from 'react';

/* ── Scroll-reveal hook ──────────────────────────────────────────────────── */
export function useScrollReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ── Staggered children fade-up ────────────────────────────────────────── */
export function RevealUp({
  children,
  delay = 0,
  duration = 600,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px)' : 'translateY(36px)',
        transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Fade-in from left ──────────────────────────────────────────────────── */
export function RevealLeft({
  children,
  delay = 0,
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0px)' : 'translateX(-50px)',
        transition: `all 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Animated counter ───────────────────────────────────────────────────── */
export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 1800,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}) {
  const { ref, visible } = useScrollReveal(0.3);
  const [count, setCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!visible || hasStarted.current) return;
    hasStarted.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target, duration, decimals]);

  return (
    <span ref={ref}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}

/* ── Floating orb background ────────────────────────────────────────────── */
export function FloatingOrbs() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Yellow orb */}
      <div style={{
        position: 'absolute',
        width: 520,
        height: 520,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,200,61,0.13) 0%, transparent 70%)',
        top: '-120px',
        right: '-80px',
        animation: 'orb-drift-a 18s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      {/* Blue orb */}
      <div style={{
        position: 'absolute',
        width: 440,
        height: 440,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(49,92,245,0.10) 0%, transparent 70%)',
        bottom: '15%',
        left: '-100px',
        animation: 'orb-drift-b 22s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
      {/* Pink orb */}
      <div style={{
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(231,53,138,0.07) 0%, transparent 70%)',
        top: '40%',
        right: '10%',
        animation: 'orb-drift-c 26s ease-in-out infinite alternate',
        willChange: 'transform',
      }} />
    </div>
  );
}

/* ── Glowing pulse dot ──────────────────────────────────────────────────── */
export function PulseDot({ color = '#10B981' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: color,
        animation: 'pulse-ring 2s ease-out infinite',
        opacity: 0.6,
      }} />
      <span style={{
        position: 'absolute',
        inset: 2,
        borderRadius: '50%',
        background: color,
      }} />
    </span>
  );
}

/* ── Shimmer loading card ───────────────────────────────────────────────── */
export function ShimmerCard({ height = 120 }: { height?: number }) {
  return (
    <div style={{
      height,
      borderRadius: 16,
      border: 'var(--border-thick)',
      background: 'linear-gradient(90deg, #F0EDE7 25%, #E8E3DA 50%, #F0EDE7 75%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite',
    }} />
  );
}

/* ── Global animation keyframes (injected in globals.css) ────────────────── */
export function AnimationKeyframes() {
  return null;
}


/* ── Scan-line overlay (retinal scanner effect) ─────────────────────────── */
export function ScanLineOverlay({ active = false }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      borderRadius: 'inherit',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, transparent, rgba(49,92,245,0.8), rgba(255,200,61,0.8), transparent)',
        animation: 'scan-line 2.5s cubic-bezier(0.4,0,0.6,1) infinite',
        boxShadow: '0 0 12px 4px rgba(49,92,245,0.5)',
      }} />
    </div>
  );
}

/* ── Gradient animated text ─────────────────────────────────────────────── */
export function GradientText({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span style={{
      background: 'linear-gradient(270deg, #315CF5, #E7358A, #FFC83D, #315CF5)',
      backgroundSize: '400% 400%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'gradient-x 5s ease infinite',
      ...style,
    }}>
      {children}
    </span>
  );
}

/* ── Magnetic hover card ────────────────────────────────────────────────── */
export function MagneticCard({
  children,
  style = {},
  className = '',
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `perspective(700px) rotateY(${x * 0.025}deg) rotateX(${-y * 0.025}deg) translateY(-4px)`;
    el.style.boxShadow = `${-x * 0.03}px ${-y * 0.03}px 0px #141210, var(--shadow-soft)`;
  }

  function handleMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = '';
    el.style.boxShadow = '';
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Ripple button wrapper ──────────────────────────────────────────────── */
export function RippleButton({
  children,
  onClick,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rip => rip.id !== id)), 700);
    onClick?.();
  }

  return (
    <button
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      onClick={handleClick}
    >
      {children}
      {ripples.map(rip => (
        <span
          key={rip.id}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            width: 100,
            height: 100,
            marginTop: -50,
            marginLeft: -50,
            top: rip.y,
            left: rip.x,
            background: 'rgba(255,255,255,0.35)',
            animation: 'ripple 0.7s linear',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
}

/* ── Interactive Eye Cursor Follower ────────────────────────────────────── */
export function EyeCursorFollower() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only run on desktop devices with hover support
    if (typeof window === 'undefined' || window.matchMedia('(hover: none)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest('button, a, input, select, textarea, [role="button"], .btn-editorial-primary, .btn-editorial-secondary, .dropzone-editorial, .pill-badge, [data-interactive="true"]')
        );
        setHovering(isInteractive);
      }
    };

    const handleMouseDown = () => setClicking(true);
    const handleMouseUp = () => setClicking(false);
    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        pointerEvents: 'none',
        zIndex: 99999,
        transform: `translate(-50%, -50%) scale(${clicking ? 0.85 : hovering ? 1.35 : 1})`,
        transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
      }}
    >
      {/* Outer Pulse/Target Ring */}
      <div
        style={{
          position: 'absolute',
          inset: hovering ? 0 : 4,
          borderRadius: '50%',
          border: hovering ? '2px solid #FFC83D' : '1.5px dashed rgba(49, 92, 245, 0.4)',
          background: hovering ? 'rgba(255, 200, 61, 0.22)' : 'rgba(49, 92, 245, 0.08)',
          boxShadow: hovering ? '0 0 14px rgba(255, 200, 61, 0.6)' : 'none',
          animation: hovering ? 'spin-slow 4s linear infinite' : 'none',
          transition: 'all 0.2s ease',
        }}
      />

      {/* Eye Emoji Symbol */}
      <span
        role="img"
        aria-label="Eye Cursor"
        style={{
          fontSize: hovering ? '20px' : '17px',
          lineHeight: 1,
          userSelect: 'none',
          filter: hovering
            ? 'drop-shadow(0 0 8px rgba(255, 200, 61, 0.9))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
          transform: clicking ? 'scale(0.9) rotate(-10deg)' : 'scale(1)',
          transition: 'font-size 0.2s ease, filter 0.2s ease, transform 0.15s ease',
        }}
      >
        👁️
      </span>
    </div>
  );
}
