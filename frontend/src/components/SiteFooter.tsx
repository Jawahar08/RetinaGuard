'use client';

import React from 'react';
import { Eye, Github, FileText, Shield } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer style={{ background: 'var(--ink-black)', color: '#FFFFFF', padding: '56px 0 32px', borderTop: 'var(--border-heavy)' }}>
      <div className="container-editorial">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '36px', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Eye size={22} color="var(--signal-yellow)" />
              <h3 className="font-serif-display" style={{ fontSize: '1.4rem', color: 'var(--signal-yellow)', margin: 0 }}>
                RetinaGuard
              </h3>
            </div>
            <p style={{ color: '#A0988E', fontSize: '0.85rem', maxWidth: '440px', lineHeight: 1.6 }}>
              An Explainable Ensemble Deep Learning System for Multi-Disease Retinal Screening. Powered by 4608-d feature fusion, DIP biomarker extraction, and Grad-CAM++ spatial explainability.
            </p>
          </div>

          <div>
            <h4 className="font-grotesk-mono" style={{ fontSize: '0.78rem', color: 'var(--signal-yellow)', marginBottom: '14px', letterSpacing: '0.06em' }}>
              PLATFORM RESOURCES
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#D0C8BE' }}>
              <a href="https://github.com/Jawahar08/RetinaGuard" target="_blank" rel="noreferrer" style={{ color: '#D0C8BE', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Github size={14} /> GitHub Open Source Repository
              </a>
              <a href="#research" style={{ color: '#D0C8BE', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} /> IEEE Research Paper & Benchmarks
              </a>
              <a href="#method" style={{ color: '#D0C8BE', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} /> Model Cards & Specifications
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-grotesk-mono" style={{ fontSize: '0.78rem', color: 'var(--signal-yellow)', marginBottom: '14px', letterSpacing: '0.06em' }}>
              ETHICAL NOTICE
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#A0988E', lineHeight: 1.6 }}>
              Designed exclusively for clinical research, triage assistance, and educational support. Not a standalone medical diagnosis device.
            </p>
          </div>
        </div>

        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: '#766F68' }}>
          <span>© 2026 RetinaGuard AI Screening Platform. MIT Research License.</span>
          <span>Version 2.0.0-SOTA (98.22% Benchmark)</span>
        </div>
      </div>
    </footer>
  );
}
