'use client';

import React from 'react';

export default function TickerBar() {
  const tickerItems = [
    '⚡ EXPLAINABLE MULTI-DISEASE RETINAL SCREENING',
    '🧠 4608-D FEATURE FUSION ENSEMBLE (RESNET50 + DENSENET121 + EFFICIENTNETB3)',
    '🔬 CLASSICAL DIP STRUCTURAL BIOMARKERS (VDI + MICROANEURYSMS + EXUDATES)',
    '🎯 GRAD-CAM++ SPATIAL ATTENTION MAPPING',
    '📊 0–100 CONTINUOUS CLINICAL COMPOSITE RISK ENGINE',
    '📈 LONGITUDINAL SERIAL PROGRESSION TRACKING',
    '🛡️ ADAPTIVE IMAGE RESTORATION (CLAHE + GUIDED FILTER)',
    '📑 AUTOMATED DIAGNOSTIC PDF REPORT GENERATION',
    '🔒 RESEARCH & SCREENING SUPPORT ONLY — NOT A CLINICAL DIAGNOSIS'
  ];

  const contentString = tickerItems.join('   ✦   ') + '   ✦   ';

  return (
    <div className="ticker-bar" role="region" aria-label="Screening system summary marquee">
      <div className="ticker-track">
        <span>{contentString}</span>
      </div>
      <div className="ticker-track" aria-hidden="true">
        <span>{contentString}</span>
      </div>
    </div>
  );
}
