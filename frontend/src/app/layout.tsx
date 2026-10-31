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
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
