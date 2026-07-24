'use client';

import React from 'react';

interface DiseaseReferenceProps {
  t: Record<string, string>;
  diseaseInfoMap: Record<string, string>;
}

export default function DiseaseReference({ t, diseaseInfoMap }: DiseaseReferenceProps) {
  return (
    <section style={{ maxWidth: '1360px', margin: '0 auto', padding: '64px 32px', borderTop: '2px solid rgba(20,18,16,0.1)' }}>
      <h2 className="font-serif-display" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '28px' }}>
        {t.clinicalRefTitle}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {Object.entries(diseaseInfoMap).map(([disease, info]) => (
          <div key={disease} className="editorial-card" style={{ padding: '28px' }}>
            <h3 className="font-serif-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--electric-blue)', marginBottom: '10px' }}>
              {disease}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {info}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
