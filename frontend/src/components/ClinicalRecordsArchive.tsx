'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  User,
  Eye,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
  Trash2,
  Edit3,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  HardDrive
} from 'lucide-react';
import {
  ClinicalRecord,
  RecordFilterOptions,
  DatabaseStatus,
  fetchClinicalRecords,
  fetchDatabaseStatus,
  updateRecordNotesInDatabase,
  deleteRecordFromDatabase,
  exportRecordsToCSV,
  saveClinicalRecordToDatabase,
  BENCHMARK_SEED_RECORDS
} from '../services/clinicalRecordsStorage';

interface ClinicalRecordsArchiveProps {
  onLoadIntoWorkspace?: (record: ClinicalRecord) => void;
  onSendToProgression?: (record: ClinicalRecord) => void;
  onGenerateReport?: (record: ClinicalRecord) => void;
  refreshTrigger?: number;
}

export default function ClinicalRecordsArchive({
  onLoadIntoWorkspace,
  onSendToProgression,
  onGenerateReport,
  refreshTrigger = 0
}: ClinicalRecordsArchiveProps) {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedRecord, setSelectedRecord] = useState<ClinicalRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDisease, setSelectedDisease] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedEye, setSelectedEye] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'risk_high' | 'risk_low' | 'confidence'>('newest');

  // Doctor Note editing state in modal
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [editedStatus, setEditedStatus] = useState<string>('Completed');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statusData, recordsData] = await Promise.all([
        fetchDatabaseStatus(),
        fetchClinicalRecords({
          query: searchQuery,
          disease: selectedDisease,
          risk_level: selectedRisk,
          eye: selectedEye,
          sort_by: sortBy
        })
      ]);
      setDbStatus(statusData);
      setRecords(recordsData.length > 0 ? recordsData : BENCHMARK_SEED_RECORDS);
    } catch (e) {
      console.error('Error loading clinical archive records:', e);
      setRecords(BENCHMARK_SEED_RECORDS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedDisease, selectedRisk, selectedEye, sortBy, refreshTrigger]);

  const handleOpenModal = (record: ClinicalRecord) => {
    setSelectedRecord(record);
    setEditedNotes(record.doctor_notes || '');
    setEditedStatus(record.clinical_status || 'Completed');
    setSaveSuccessMsg(null);
  };

  const handleSaveNotes = async () => {
    if (!selectedRecord) return;
    setIsSavingNotes(true);
    setSaveSuccessMsg(null);
    try {
      await updateRecordNotesInDatabase(selectedRecord.id, editedNotes, editedStatus);
      setSaveSuccessMsg('Doctor notes & status updated successfully');
      // Update local state
      setSelectedRecord(prev => prev ? { ...prev, doctor_notes: editedNotes, clinical_status: editedStatus } : null);
      setRecords(prev => prev.map(r => r.id === selectedRecord.id ? { ...r, doctor_notes: editedNotes, clinical_status: editedStatus } : r));
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Error saving notes:', e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this clinical record from the database?')) return;
    try {
      await deleteRecordFromDatabase(id);
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Error deleting record:', e);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportRecordsToCSV(records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RetinaGuard_Clinical_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RetinaGuard_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            await saveClinicalRecordToDatabase(item);
          }
          alert(`Successfully imported ${parsed.length} clinical records into database.`);
          loadData();
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Compute stats
  const totalPatients = records.length;
  const highRiskCount = records.filter(r => r.risk_score >= 55 || r.risk_level.includes('High') || r.risk_level.includes('Critical')).length;
  const followUpCount = records.filter(r => (r.clinical_status || '').includes('Referral') || (r.clinical_status || '').includes('Scheduled') || (r.clinical_status || '').includes('Treatment')).length;
  const normalCount = records.filter(r => r.top_prediction.toLowerCase().includes('normal') || r.top_prediction.toLowerCase().includes('no dr')).length;

  const getRiskBadgeColor = (score: number, level?: string) => {
    if (score >= 70 || level?.includes('Critical')) return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' };
    if (score >= 50 || level?.includes('High')) return { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' };
    if (score >= 25 || level?.includes('Elevated') || level?.includes('Moderate')) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
    return { bg: '#DCFCE7', border: '#10B981', text: '#166534' };
  };

  const getStatusBadgeColor = (status?: string) => {
    if (!status) return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
    if (status.includes('Urgent') || status.includes('Referral')) return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
    if (status.includes('Scheduled') || status.includes('Treatment')) return { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' };
    if (status.includes('Clear') || status.includes('Completed')) return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
    return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
  };

  return (
    <section id="past-records" style={{ padding: '60px 0', borderTop: '1.5px solid rgba(20,18,16,0.12)' }}>
      <div className="container-editorial">

        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', background: '#F8FAFC', border: '1.5px solid var(--ink-black)', borderRadius: 'var(--radius-pill)', marginBottom: '12px' }}>
              <HardDrive size={15} color="var(--ink-black)" />
              <span className="font-grotesk-mono" style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                DATA STORAGE SPACE & CLINICAL ARCHIVE
              </span>
            </div>
            <h2 className="font-serif-display" style={{ fontSize: '2.3rem', fontWeight: 900, lineHeight: 1.15, color: 'var(--ink-black)' }}>
              Past Patient Checks & Diagnoses
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '680px' }}>
              Instant repository for ophthalmologists and screening clinicians. Review past fundus scans, multi-class predictions, Grad-CAM++ lesion heatmaps, classical DIP biomarkers, and doctor notes.
            </p>
          </div>

          {/* Database Live Status Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: 'var(--border-thick)',
            borderRadius: 'var(--radius-card)',
            padding: '14px 18px',
            boxShadow: 'var(--shadow-sm)',
            minWidth: '280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                DATABASE ENGINE
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '0.68rem', fontWeight: 800,
                color: dbStatus?.supabase_configured ? '#166534' : '#0369A1',
                background: dbStatus?.supabase_configured ? '#DCFCE7' : '#E0F2FE',
                padding: '2px 8px', borderRadius: '12px'
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dbStatus?.supabase_configured ? '#10B981' : '#0284C7' }} />
                {dbStatus?.supabase_configured ? 'Supabase Cloud (PostgreSQL)' : 'SQLite Local Backup'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-black)' }}>
              Storage: <span style={{ color: '#166534' }}>{dbStatus?.sqlite_status === 'Healthy' ? 'Active & Synced' : 'Online'}</span> ({records.length} records stored)
            </div>
            <div className="font-grotesk-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Backup path: {dbStatus?.sqlite_path ? dbStatus.sqlite_path.split('\\').pop() : 'data/retinaguard.db'}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div style={{ background: 'var(--bg-card)', border: 'var(--border-thick)', borderRadius: 'var(--radius-card)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>
              <span>TOTAL SCREENED</span>
              <User size={16} />
            </div>
            <div className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px', color: 'var(--ink-black)' }}>
              {totalPatients}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Historical fundus check records
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-thick)', borderRadius: 'var(--radius-card)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#991B1B', fontSize: '0.75rem', fontWeight: 800 }}>
              <span>HIGH / CRITICAL RISK</span>
              <AlertTriangle size={16} color="#EF4444" />
            </div>
            <div className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px', color: '#EF4444' }}>
              {highRiskCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Requires urgent ophthalmic action
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-thick)', borderRadius: 'var(--radius-card)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0369A1', fontSize: '0.75rem', fontWeight: 800 }}>
              <span>FOLLOW-UPS & REFERRALS</span>
              <TrendingUp size={16} color="#0284C7" />
            </div>
            <div className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px', color: '#0284C7' }}>
              {followUpCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Under active tracking or therapy
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-thick)', borderRadius: 'var(--radius-card)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#166534', fontSize: '0.75rem', fontWeight: 800 }}>
              <span>NORMAL / CLEAR SCANS</span>
              <CheckCircle2 size={16} color="#10B981" />
            </div>
            <div className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '4px', color: '#10B981' }}>
              {normalCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Clear margins & normal arcade
            </div>
          </div>
        </div>

        {/* Search, Filter & Action Toolbar */}
        <div style={{
          background: 'var(--bg-card)',
          border: 'var(--border-thick)',
          borderRadius: 'var(--radius-card)',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '260px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search patient name, ID, symptoms, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 'var(--radius-editorial)',
                  border: '1.5px solid rgba(20,18,16,0.2)',
                  fontSize: '0.85rem',
                  background: '#fff',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Disease Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Condition:</span>
              <select
                value={selectedDisease}
                onChange={e => setSelectedDisease(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-editorial)',
                  border: '1.5px solid rgba(20,18,16,0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Conditions</option>
                <option value="Diabetic Retinopathy">Diabetic Retinopathy</option>
                <option value="Glaucoma">Glaucoma</option>
                <option value="Cataract">Cataract</option>
                <option value="AMD">AMD / Macular</option>
                <option value="Normal">Normal Retina</option>
              </select>
            </div>

            {/* Risk Severity Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Risk:</span>
              <select
                value={selectedRisk}
                onChange={e => setSelectedRisk(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-editorial)',
                  border: '1.5px solid rgba(20,18,16,0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Elevated">Elevated / Moderate</option>
                <option value="High">High Risk</option>
                <option value="Critical">Critical Risk</option>
              </select>
            </div>

            {/* Scanned Eye Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Eye:</span>
              <select
                value={selectedEye}
                onChange={e => setSelectedEye(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-editorial)',
                  border: '1.5px solid rgba(20,18,16,0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Eyes (OD / OS)</option>
                <option value="Right">Right Eye (OD)</option>
                <option value="Left">Left Eye (OS)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-editorial)',
                  border: '1.5px solid rgba(20,18,16,0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="risk_high">Risk Score (High → Low)</option>
                <option value="risk_low">Risk Score (Low → High)</option>
                <option value="confidence">Confidence (%)</option>
              </select>
            </div>

            {/* View Mode & Export Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* View Toggle */}
              <div style={{ display: 'flex', border: '1.5px solid var(--ink-black)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: 'none',
                    background: viewMode === 'grid' ? 'var(--ink-black)' : '#fff',
                    color: viewMode === 'grid' ? '#fff' : 'var(--ink-black)',
                    cursor: 'pointer'
                  }}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: 'none',
                    background: viewMode === 'table' ? 'var(--ink-black)' : '#fff',
                    color: viewMode === 'table' ? '#fff' : 'var(--ink-black)',
                    cursor: 'pointer'
                  }}
                >
                  Table
                </button>
              </div>

              {/* CSV Export */}
              <button
                onClick={handleExportCSV}
                title="Export Records to CSV"
                style={{
                  padding: '7px 12px',
                  background: '#fff',
                  border: '1.5px solid rgba(20,18,16,0.25)',
                  borderRadius: 'var(--radius-editorial)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Download size={14} /> CSV
              </button>

              {/* JSON Backup */}
              <button
                onClick={handleExportJSON}
                title="Backup Records to JSON"
                style={{
                  padding: '7px 12px',
                  background: '#fff',
                  border: '1.5px solid rgba(20,18,16,0.25)',
                  borderRadius: 'var(--radius-editorial)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Database size={14} /> Backup
              </button>

              {/* Refresh */}
              <button
                onClick={loadData}
                title="Refresh database"
                style={{
                  padding: '7px 10px',
                  background: '#fff',
                  border: '1.5px solid rgba(20,18,16,0.25)',
                  borderRadius: 'var(--radius-editorial)',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

          </div>
        </div>

        {/* Records Display */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="spin-animation" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700 }}>Querying database records...</p>
          </div>
        ) : records.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: 'var(--border-thick)',
            borderRadius: 'var(--radius-card)',
            padding: '60px 20px',
            textAlign: 'center'
          }}>
            <Database size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>No Clinical Records Matched</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
              Try adjusting your search query or filter criteria.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* CARD GRID VIEW */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            {records.map(record => {
              const riskColor = getRiskBadgeColor(record.risk_score, record.risk_level);
              const statusColor = getStatusBadgeColor(record.clinical_status);

              return (
                <div
                  key={record.id}
                  onClick={() => handleOpenModal(record)}
                  style={{
                    background: 'var(--bg-card)',
                    border: 'var(--border-thick)',
                    borderRadius: 'var(--radius-card)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div>
                    {/* Top Row: Patient ID & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="font-grotesk-mono" style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', background: '#F1F5F9', padding: '2px 7px', borderRadius: '4px' }}>
                        {record.id}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Patient Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <h3 className="font-serif-display" style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--ink-black)' }}>
                          {record.patient_name}
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {record.patient_age ? `${record.patient_age} yrs` : 'Age N/A'} • {record.patient_gender || 'Gender N/A'} • <span style={{ fontWeight: 700, color: '#0369A1' }}>{record.scanned_eye || 'OD'}</span>
                        </p>
                      </div>

                      {/* Status Tag */}
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: statusColor.bg,
                        color: statusColor.text,
                        border: `1px solid ${statusColor.border}`,
                        whiteSpace: 'nowrap'
                      }}>
                        {record.clinical_status || 'Completed'}
                      </span>
                    </div>

                    {/* Primary Diagnosis & Risk Row */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1.5px solid rgba(20,18,16,0.1)',
                      borderRadius: 'var(--radius-editorial)',
                      padding: '12px 14px',
                      marginBottom: '14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Top Diagnosis
                          </div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--ink-black)', marginTop: '2px' }}>
                            {record.top_prediction}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: riskColor.bg,
                            color: riskColor.text,
                            border: `1px solid ${riskColor.border}`,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {record.risk_score.toFixed(0)}/100 Risk
                          </span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {(record.confidence * 100).toFixed(1)}% Conf
                          </div>
                        </div>
                      </div>

                      {/* Risk Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(record.risk_score, 100)}%`, height: '100%', background: riskColor.border, borderRadius: '3px' }} />
                      </div>
                    </div>

                    {/* Biomarkers Highlights */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '14px', textAlign: 'center' }}>
                      <div style={{ background: '#fff', border: '1px solid rgba(20,18,16,0.08)', borderRadius: '6px', padding: '6px 4px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>Vessel Density</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '2px' }}>
                          {record.vessel_density ? `${(record.vessel_density * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid rgba(20,18,16,0.08)', borderRadius: '6px', padding: '6px 4px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>Microaneurysms</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '2px', color: (record.microaneurysms || 0) > 5 ? '#EF4444' : 'inherit' }}>
                          {record.microaneurysms ?? 0}
                        </div>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid rgba(20,18,16,0.08)', borderRadius: '6px', padding: '6px 4px' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>Exudate Area</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, marginTop: '2px', color: (record.exudate_ratio || 0) > 0.02 ? '#F59E0B' : 'inherit' }}>
                          {record.exudate_ratio ? `${(record.exudate_ratio * 100).toFixed(1)}%` : '0.0%'}
                        </div>
                      </div>
                    </div>

                    {/* Doctor Notes Preview */}
                    {record.doctor_notes && (
                      <div style={{ fontSize: '0.76rem', color: '#475569', background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #0284C7', marginBottom: '14px', fontStyle: 'italic' }}>
                        "{record.doctor_notes.length > 90 ? `${record.doctor_notes.substring(0, 90)}...` : record.doctor_notes}"
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(20,18,16,0.08)', paddingTop: '12px', marginTop: '4px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onLoadIntoWorkspace) onLoadIntoWorkspace(record);
                      }}
                      className="btn-editorial-primary"
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      title="Load this case into live screening workspace"
                    >
                      <Eye size={13} /> Load in Workspace
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(record);
                      }}
                      style={{
                        padding: '7px 10px',
                        background: '#fff',
                        border: '1.5px solid rgba(20,18,16,0.2)',
                        borderRadius: 'var(--radius-editorial)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Inspect full diagnostic details"
                    >
                      Details
                    </button>

                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      style={{
                        padding: '7px 8px',
                        background: '#fff',
                        border: '1.5px solid rgba(239,68,68,0.3)',
                        color: '#EF4444',
                        borderRadius: 'var(--radius-editorial)',
                        cursor: 'pointer'
                      }}
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div style={{
            background: 'var(--bg-card)',
            border: 'var(--border-thick)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid rgba(20,18,16,0.15)', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Record ID / Date</th>
                    <th style={{ padding: '12px 16px' }}>Patient Profile</th>
                    <th style={{ padding: '12px 16px' }}>Scanned Eye</th>
                    <th style={{ padding: '12px 16px' }}>Top Diagnosis</th>
                    <th style={{ padding: '12px 16px' }}>Risk Score</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, i) => {
                    const riskColor = getRiskBadgeColor(record.risk_score, record.risk_level);
                    const statusColor = getStatusBadgeColor(record.clinical_status);

                    return (
                      <tr
                        key={record.id}
                        onClick={() => handleOpenModal(record)}
                        style={{
                          borderBottom: '1px solid rgba(20,18,16,0.06)',
                          background: i % 2 === 0 ? '#fff' : '#FAFAF9',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAF9'}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div className="font-grotesk-mono" style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--ink-black)' }}>{record.id}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(record.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--ink-black)' }}>{record.patient_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {record.patient_age} yrs • {record.patient_gender} • {record.blood_group}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '2px 7px', background: '#E0F2FE', color: '#0369A1', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {record.scanned_eye || 'OD'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800 }}>{record.top_prediction}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {(record.confidence * 100).toFixed(1)}% confidence
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: riskColor.bg,
                            color: riskColor.text,
                            border: `1px solid ${riskColor.border}`,
                            fontSize: '0.74rem',
                            fontWeight: 800
                          }}>
                            {record.risk_score.toFixed(0)}/100
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            background: statusColor.bg,
                            color: statusColor.text
                          }}>
                            {record.clinical_status || 'Completed'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                if (onLoadIntoWorkspace) onLoadIntoWorkspace(record);
                              }}
                              className="btn-editorial-primary"
                              style={{ padding: '4px 8px', fontSize: '0.68rem' }}
                              title="Load in Workspace"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => handleOpenModal(record)}
                              style={{ padding: '4px 8px', background: '#fff', border: '1px solid rgba(20,18,16,0.2)', borderRadius: '4px', cursor: 'pointer' }}
                              title="Details"
                            >
                              <FileText size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              style={{ padding: '4px 8px', background: '#fff', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', borderRadius: '4px', cursor: 'pointer' }}
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* DOCTOR DIAGNOSTIC INSPECTOR MODAL */}
      {selectedRecord && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,18,16,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              background: '#fff',
              border: 'var(--border-thick)',
              borderRadius: 'var(--radius-card)',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '28px',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid rgba(20,18,16,0.12)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="font-grotesk-mono" style={{ fontSize: '0.72rem', fontWeight: 800, background: '#E2E8F0', padding: '2px 7px', borderRadius: '4px' }}>
                    {selectedRecord.id}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Saved on {new Date(selectedRecord.created_at).toLocaleString()}
                  </span>
                </div>
                <h2 className="font-serif-display" style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--ink-black)', lineHeight: 1.1 }}>
                  {selectedRecord.patient_name}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Patient ID: <span className="font-grotesk-mono" style={{ fontWeight: 700 }}>{selectedRecord.patient_id || 'N/A'}</span> • {selectedRecord.patient_age} yrs ({selectedRecord.patient_gender}) • Laterality: <strong style={{ color: '#0369A1' }}>{selectedRecord.scanned_eye}</strong>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Patient Clinical Intake Card */}
            <div style={{
              background: '#EFF6FF',
              border: '1.5px solid #BFDBFE',
              borderRadius: 'var(--radius-editorial)',
              padding: '14px 16px',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: '#1E3A8A'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Clinical Profile & Medical History
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div><strong>Blood Group:</strong> <span style={{ background: '#DC2626', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700 }}>{selectedRecord.blood_group || 'N/A'}</span></div>
                <div><strong>Diabetes Status:</strong> {selectedRecord.diabetic_status || 'Unspecified'}</div>
                <div><strong>Hypertension:</strong> {selectedRecord.hypertension || 'Unspecified'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Visual Symptoms:</strong> {selectedRecord.symptoms || 'None reported'}</div>
              </div>
            </div>

            {/* Diagnostic Inference & Risk Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              
              {/* Primary Prediction */}
              <div style={{ background: '#F8FAFC', border: '1.5px solid rgba(20,18,16,0.12)', borderRadius: 'var(--radius-editorial)', padding: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AI Screening Diagnosis
                </div>
                <div className="font-serif-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink-black)', marginTop: '4px' }}>
                  {selectedRecord.top_prediction}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#0369A1', fontWeight: 700, marginTop: '2px' }}>
                  Calibrated Confidence: {(selectedRecord.confidence * 100).toFixed(1)}%
                </div>
                {selectedRecord.severity && (
                  <div style={{ fontSize: '0.78rem', color: '#991B1B', fontWeight: 700, marginTop: '4px' }}>
                    Severity: {selectedRecord.severity}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Model: {selectedRecord.model_name || 'RetinaGuard++ Ensemble'} (v{selectedRecord.model_version || '2.0'})
                </div>
              </div>

              {/* Clinical Risk Score */}
              <div style={{ background: '#F8FAFC', border: '1.5px solid rgba(20,18,16,0.12)', borderRadius: 'var(--radius-editorial)', padding: '16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Composite Clinical Risk (0–100)
                </div>
                <div className="font-serif-display" style={{ fontSize: '1.8rem', fontWeight: 900, color: getRiskBadgeColor(selectedRecord.risk_score, selectedRecord.risk_level).border, marginTop: '2px' }}>
                  {selectedRecord.risk_score.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: getRiskBadgeColor(selectedRecord.risk_score, selectedRecord.risk_level).bg,
                  color: getRiskBadgeColor(selectedRecord.risk_score, selectedRecord.risk_level).text,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  marginTop: '4px'
                }}>
                  {selectedRecord.risk_level}
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(selectedRecord.risk_score, 100)}%`, height: '100%', background: getRiskBadgeColor(selectedRecord.risk_score, selectedRecord.risk_level).border }} />
                </div>
              </div>

            </div>

            {/* Classical DIP Biomarkers */}
            <div style={{ background: '#FAF5FF', border: '1.5px solid #E9D5FF', borderRadius: 'var(--radius-editorial)', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#6B21A8', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Classical DIP Structural Biomarkers
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Vessel Density</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>
                    {selectedRecord.vessel_density ? `${(selectedRecord.vessel_density * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Microaneurysms</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: (selectedRecord.microaneurysms || 0) > 5 ? '#EF4444' : 'inherit' }}>
                    {selectedRecord.microaneurysms ?? 0}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Exudate Area</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: (selectedRecord.exudate_ratio || 0) > 0.02 ? '#F59E0B' : 'inherit' }}>
                    {selectedRecord.exudate_ratio ? `${(selectedRecord.exudate_ratio * 100).toFixed(1)}%` : '0.0%'}
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Quality Score</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px', color: '#166534' }}>
                    {selectedRecord.quality_score ? `${(selectedRecord.quality_score * 100).toFixed(0)}%` : '100%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor's Notes & Case Status Editor */}
            <div style={{
              background: '#FFFBEB',
              border: '1.5px solid #FDE68A',
              borderRadius: 'var(--radius-editorial)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#92400E', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit3 size={14} /> Doctor's Clinical Observations & Notes
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E' }}>Clinical Status:</span>
                  <select
                    value={editedStatus}
                    onChange={e => setEditedStatus(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #D97706',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#fff'
                    }}
                  >
                    <option value="Completed">Completed (Clear)</option>
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Follow-up Scheduled">Follow-up Scheduled</option>
                    <option value="Urgent Referral">Urgent Referral</option>
                    <option value="Pending OCT Scan">Pending OCT Scan</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                value={editedNotes}
                onChange={e => setEditedNotes(e.target.value)}
                placeholder="Type doctor's clinical impressions, prescribed medications (e.g. Anti-VEGF, IOP drops), or follow-up schedule..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1.5px solid #FCD34D',
                  fontSize: '0.82rem',
                  fontFamily: 'inherit',
                  background: '#fff',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                {saveSuccessMsg ? (
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>
                    ✅ {saveSuccessMsg}
                  </span>
                ) : <span />}

                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="btn-editorial-primary"
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  {isSavingNotes ? 'Saving Notes...' : 'Save Doctor Notes 💾'}
                </button>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', borderTop: '1.5px solid rgba(20,18,16,0.12)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (onLoadIntoWorkspace) onLoadIntoWorkspace(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="btn-editorial-primary"
                  style={{ padding: '9px 16px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Eye size={15} /> Load in Live Screening Workspace
                </button>

                {onSendToProgression && (
                  <button
                    onClick={() => {
                      onSendToProgression(selectedRecord);
                      setSelectedRecord(null);
                    }}
                    style={{
                      padding: '9px 14px',
                      background: '#fff',
                      border: '1.5px solid rgba(20,18,16,0.3)',
                      borderRadius: 'var(--radius-editorial)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <TrendingUp size={15} color="#0284C7" /> Compare in Progression Tracker
                  </button>
                )}

                {onGenerateReport && (
                  <button
                    onClick={() => onGenerateReport(selectedRecord)}
                    style={{
                      padding: '9px 14px',
                      background: '#fff',
                      border: '1.5px solid rgba(20,18,16,0.3)',
                      borderRadius: 'var(--radius-editorial)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={15} color="#166534" /> Diagnostic PDF Report
                  </button>
                )}
              </div>

              <button
                onClick={() => handleDelete(selectedRecord.id)}
                style={{
                  padding: '9px 14px',
                  background: '#FEE2E2',
                  border: '1.5px solid #EF4444',
                  color: '#991B1B',
                  borderRadius: 'var(--radius-editorial)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} /> Delete Record
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
