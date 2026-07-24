'use client';

import React from 'react';

export default function SiteFooter() {
  return (
    <footer style={{ background: 'var(--ink-black)', color: '#FFFFFF', padding: '64px 32px 40px', borderTop: 'var(--border-heavy)' }}>
      <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
        <div>
          <h3 className="font-serif-display" style={{ fontSize: '1.6rem', color: 'var(--signal-yellow)', marginBottom: '12px' }}>
            RetinaGuard
          </h3>
          <p style={{ color: '#A0988E', fontSize: '0.9rem', maxWidth: '480px', lineHeight: 1.6 }}>
            An Explainable Ensemble Deep Learning System for Multi-Disease Retinal Screening. Built with 4608-dimensional feature fusion, automated physical quality gating, and Grad-CAM visual attention mapping.
          </p>
        </div>

        <div>
          <h4 className="font-grotesk-mono" style={{ fontSize: '0.8rem', color: 'var(--signal-yellow)', marginBottom: '16px' }}>RESOURCES</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#D0C8BE' }}>
            <a href="https://github.com/Jawahar08/RetinaGuard" target="_blank" rel="noreferrer" style={{ color: '#D0C8BE', textDecoration: 'none' }}>GitHub Repository</a>
            <a href="#research" style={{ color: '#D0C8BE', textDecoration: 'none' }}>IEEE Research Paper Draft</a>
            <a href="#method" style={{ color: '#D0C8BE', textDecoration: 'none' }}>Model Cards & Specifications</a>
          </div>
        </div>

        <div>
          <h4 className="font-grotesk-mono" style={{ fontSize: '0.8rem', color: 'var(--signal-yellow)', marginBottom: '16px' }}>ETHICAL BOUNDARIES</h4>
          <p style={{ fontSize: '0.8rem', color: '#A0988E', lineHeight: 1.6 }}>
            For research and educational screening support only. Not a medical diagnosis or standalone treatment decision system.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1360px', margin: '0 auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#766F68' }}>
        <span>© 2026 RetinaGuard. All rights reserved.</span>
        <span>Version 2.0.0-SOTA (98.22% Accuracy Benchmark)</span>
      </div>
    </footer>
  );
}
