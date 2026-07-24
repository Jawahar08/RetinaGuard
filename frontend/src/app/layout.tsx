import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RetinaGuard | Explainable Retinal Screening System',
  description: 'An Explainable Ensemble Deep Learning System for Multi-Disease Retinal Screening with 4608d Feature Fusion, Calibrated Confidence, and Grad-CAM Visual Explainability.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
