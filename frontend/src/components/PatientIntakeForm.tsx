'use client';

import React, { useState } from 'react';
import { User, Activity, Heart, Shield, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export interface PatientInfoData {
  name: string;
  age: string;
  gender: string;
  bloodGroup: string;
  diabeticStatus: string;
  hypertension: string;
  symptoms: string[];
}

interface PatientIntakeFormProps {
  t: Record<string, string>;
  patientInfo: PatientInfoData;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfoData>>;
  onComplete: () => void;
}

export default function PatientIntakeForm({
  t,
  patientInfo,
  setPatientInfo,
  onComplete
}: PatientIntakeFormProps) {
  const [isSaved, setIsSaved] = useState(false);

  const safeInfo: PatientInfoData = patientInfo || {
    name: '',
    age: '',
    gender: 'Female',
    bloodGroup: 'O+',
    diabeticStatus: 'Non-Diabetic',
    hypertension: 'No',
    symptoms: ['None']
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const diabeticOptions = ['Non-Diabetic', 'Type 1 Diabetes', 'Type 2 Diabetes', 'Pre-Diabetic'];
  const symptomOptions = ['Blurry Vision', 'Floaters / Spots', 'Reduced Night Vision', 'Eye Fatigue / Strain', 'None'];

  const handleSymptomToggle = (symptom: string) => {
    setPatientInfo((prev) => {
      const current = prev || safeInfo;
      const symptomsList = current.symptoms || ['None'];
      if (symptom === 'None') {
        return { ...current, symptoms: ['None'] };
      }
      const updated = symptomsList.filter((s) => s !== 'None');
      if (updated.includes(symptom)) {
        const filtered = updated.filter((s) => s !== symptom);
        return { ...current, symptoms: filtered.length === 0 ? ['None'] : filtered };
      } else {
        return { ...current, symptoms: [...updated, symptom] };
      }
    });
  };

  const handleAutoFillDemo = () => {
    setPatientInfo({
      name: 'Maria Santos',
      age: '56',
      gender: 'Female',
      bloodGroup: 'O+',
      diabeticStatus: 'Type 2 Diabetes',
      hypertension: 'Yes (Controlled)',
      symptoms: ['Blurry Vision', 'Floaters / Spots']
    });
    setIsSaved(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="editorial-card" style={{ padding: '32px', marginBottom: '24px', background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F5 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--paper-light)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--signal-yellow)', width: '40px', height: '40px', borderRadius: '12px', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={20} color="#000000" />
          </div>
          <div>
            <h3 className="font-serif-display" style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Patient Medical Intake
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Basic demographic and physiological history for screening context
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAutoFillDemo}
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '8px 14px',
            borderRadius: '20px',
            border: 'var(--border-thick)',
            background: '#F0F9FF',
            color: '#0284C7',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={14} /> Fill Demo Patient
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Patient Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-black)' }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={safeInfo.name}
              onChange={(e) => {
                setPatientInfo({ ...safeInfo, name: e.target.value });
                setIsSaved(false);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'var(--border-thick)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: '#FFFFFF',
                outline: 'none'
              }}
            />
          </div>

          {/* Age */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-black)' }}>
              Age *
            </label>
            <input
              type="number"
              required
              min="1"
              max="120"
              placeholder="e.g. 54"
              value={safeInfo.age}
              onChange={(e) => {
                setPatientInfo({ ...safeInfo, age: e.target.value });
                setIsSaved(false);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'var(--border-thick)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: '#FFFFFF',
                outline: 'none'
              }}
            />
          </div>

          {/* Gender */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-black)' }}>
              Gender
            </label>
            <select
              value={safeInfo.gender}
              onChange={(e) => {
                setPatientInfo({ ...safeInfo, gender: e.target.value });
                setIsSaved(false);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'var(--border-thick)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other / Prefer not to say</option>
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-black)' }}>
              Blood Group *
            </label>
            <select
              value={safeInfo.bloodGroup}
              onChange={(e) => {
                setPatientInfo({ ...safeInfo, bloodGroup: e.target.value });
                setIsSaved(false);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'var(--border-thick)',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#DC2626',
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {/* Diabetic Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-black)' }}>
              Diabetes History / Status
            </label>
            <select
              value={safeInfo.diabeticStatus}
              onChange={(e) => {
                setPatientInfo({ ...safeInfo, diabeticStatus: e.target.value });
                setIsSaved(false);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'var(--border-thick)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              {diabeticOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Hypertension */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--ink-black)' }}>
              Hypertension (High BP)
            </label>
            <select
              value={safeInfo.hypertension}
              onChange={(e) => {
                setPatientInfo({ ...safeInfo, hypertension: e.target.value });
                setIsSaved(false);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'var(--border-thick)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="No">No</option>
              <option value="Yes (Controlled)">Yes (Controlled with Medication)</option>
              <option value="Yes (Uncontrolled)">Yes (Uncontrolled)</option>
            </select>
          </div>
        </div>

        {/* Symptoms */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--ink-black)' }}>
            Current Visual Symptoms
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {symptomOptions.map((symptom) => {
              const active = (safeInfo.symptoms || []).includes(symptom);
              return (
                <button
                  type="button"
                  key={symptom}
                  onClick={() => {
                    handleSymptomToggle(symptom);
                    setIsSaved(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'var(--border-thick)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: active ? 'var(--ink-black)' : '#FFFFFF',
                    color: active ? '#FFFFFF' : 'var(--ink-black)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {active ? '✓ ' : ''}{symptom}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--paper-light)', paddingTop: '16px' }}>
          {isSaved ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '0.85rem', fontWeight: 700 }}>
              <CheckCircle2 size={18} /> Medical record saved & linked to scan session
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <AlertCircle size={16} /> Save info to proceed to fundus photo upload
            </div>
          )}

          <button
            type="submit"
            className="btn-editorial-primary"
            style={{ padding: '12px 24px', fontSize: '0.88rem' }}
          >
            Save Patient Profile & Proceed <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
