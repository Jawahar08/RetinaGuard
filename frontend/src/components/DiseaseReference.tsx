'use client';

import React from 'react';

interface DiseaseReferenceProps {
  t: Record<string, string>;
  diseaseInfoMap: Record<string, string>;
}

export default function DiseaseReference({ t, diseaseInfoMap }: DiseaseReferenceProps) {
  return (
    <section className="container-editorial" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1.5px solid rgba(20,18,16,0.1)' }}>
      <h2 className="font-serif-display" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.15 }}>
        {t.clinicalRefTitle}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {Object.entries(diseaseInfoMap).map(([disease, info]) => (
          <div key={disease} className="editorial-card" style={{ padding: '24px' }}>
            <h3 className="font-serif-display" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--electric-blue)', marginBottom: '8px' }}>
              {disease}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {info}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
