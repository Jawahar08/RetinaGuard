'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, ArrowLeft, ArrowRight, Shield, HardDrive, PlusCircle } from 'lucide-react';
import ClinicalRecordsArchive from '../../components/ClinicalRecordsArchive';
import { ClinicalRecord, fetchDatabaseStatus, DatabaseStatus } from '../../services/clinicalRecordsStorage';
import { FloatingOrbs, EyeCursorFollower, PulseDot, RippleButton } from '../../components/AnimationKit';
import TickerBar from '../../components/TickerBar';
import SiteFooter from '../../components/SiteFooter';

export default function RecordsPage() {
  const router = useRouter();
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  useEffect(() => {
    fetchDatabaseStatus().then(status => setDbStatus(status)).catch(() => {});
  }, []);

  const handleLoadIntoWorkspace = (record: ClinicalRecord) => {
    // Store record ID and data into sessionStorage so the main screening workspace picks it up
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('retinaguard_load_record', JSON.stringify(record));
      router.push('/?load_case=' + encodeURIComponent(record.id));
    }
  };

  const handleSendToProgression = (record: ClinicalRecord) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('retinaguard_progression_baseline', JSON.stringify(record));
      router.push('/#progression');
    }
  };

  return (
    <div style={{ background: 'var(--bg-paper)', color: 'var(--ink-black)', minHeight: '100vh', position: 'relative' }}>
      <TickerBar />

      {/* Standalone Records Page Header */}
      <header style={{
        background: 'rgba(246,243,236,0.95)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1.5px solid rgba(20,18,16,0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 24px rgba(0,0,0,0.06)'
      }}>
        <div
          className="container-editorial"
          style={{
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Logo & Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'var(--ink-black)',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'var(--border-thick)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <Eye size={20} color="var(--signal-yellow)" />
              </div>
              <div>
                <h1 className="font-serif-display" style={{ fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--ink-black)' }}>
                  RetinaGuard
                </h1>
                <p className="font-grotesk-mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  CLINICAL ARCHIVE & DATABASE
                </p>
              </div>
            </Link>

            <span style={{ color: 'rgba(20,18,16,0.25)', fontSize: '1.2rem', fontWeight: 300 }}>/</span>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: '#F1F5F9',
              border: '1px solid rgba(20,18,16,0.12)',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--ink-black)'
            }}>
              <HardDrive size={13} color="#0284C7" />
              Patient Diagnostics Repository
            </div>
          </div>

          {/* Actions & Navigation CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                color: 'var(--ink-black)',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-editorial)',
                background: '#fff',
                border: '1.5px solid rgba(20,18,16,0.2)'
              }}
            >
              <ArrowLeft size={14} /> Back to Overview
            </Link>

            <Link href="/" style={{ textDecoration: 'none' }}>
              <RippleButton
                className="btn-editorial-primary"
                style={{ padding: '9px 18px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={15} /> New Patient Screening 👁️
              </RippleButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ minHeight: '80vh', paddingBottom: '60px' }}>
        <ClinicalRecordsArchive
          onLoadIntoWorkspace={handleLoadIntoWorkspace}
          onSendToProgression={handleSendToProgression}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
