import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retinal Image Disease Screening | Deep Learning Ensemble',
  description: 'AI-Powered Retinal Fundus-Image Screening System for ODIR & APTOS Analysis with Grad-CAM Explainability.',
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
