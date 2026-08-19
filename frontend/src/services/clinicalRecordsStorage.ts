/**
 * Clinical Records & Diagnostics Storage Service
 * Handles persistence for patient screenings, biomarker metrics, Grad-CAM overlays, and doctor notes.
 * Syncs seamlessly between FastAPI Backend (Supabase Cloud / SQLite) and Browser IndexedDB.
 */

export interface ClassPrediction {
  label: string;
  probability: number;
  is_positive: boolean;
}

export interface DIPBiomarkers {
  vessel_density_index?: number;
  microaneurysm_candidate_count?: number;
  exudate_candidate_count?: number;
  exudate_area_ratio?: number;
  cup_to_disc_ratio?: number;
  optic_disc_found?: boolean;
  macula_center?: [number, number];
  tortuosity_index?: number;
}

export interface SubScores {
  vessel_density_risk?: number;
  lesion_risk?: number;
  exudate_risk?: number;
  ml_confidence_risk?: number;
  anatomy_risk?: number;
}

export interface ClinicalRecord {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_age?: string;
  patient_gender?: string;
  scanned_eye?: string; // 'Right Eye (OD)' | 'Left Eye (OS)' | string
  blood_group?: string;
  diabetic_status?: string;
  hypertension?: string;
  symptoms?: string;
  task: 'multitask' | 'odir' | 'aptos';
  model_name?: string;
  model_version?: string;
  top_prediction: string;
  confidence: number;
  risk_score: number;
  risk_level: string; // 'Low Risk' | 'Moderate Risk' | 'Elevated Risk' | 'High Risk' | 'Critical Risk'
  severity?: string;
  quality_score?: number;
  quality_passed?: boolean | number;
  vessel_density?: number;
  microaneurysms?: number;
  exudate_ratio?: number;
  predictions_json?: ClassPrediction[];
  sub_scores_json?: SubScores;
  dip_biomarkers_json?: DIPBiomarkers;
  doctor_notes?: string;
  clinical_status?: string; // 'Completed' | 'Urgent Referral' | 'Follow-up Scheduled' | 'Under Treatment'
  thumbnail_base64?: string;
  heatmap_overlay_base64?: string;
  recommendation?: string;
  created_at: string;
  updated_at?: string;
}

export interface RecordFilterOptions {
  query?: string;
  disease?: string;
  risk_level?: string;
  eye?: string;
  sort_by?: 'newest' | 'oldest' | 'risk_high' | 'risk_low' | 'confidence';
}

export interface DatabaseStatus {
  primary_engine: string;
  backup_engine: string;
  supabase_configured: boolean;
  supabase_status: string;
  sqlite_status: string;
  total_records_count: number;
  sqlite_path?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const LOCAL_STORAGE_KEY = 'retinaguard_clinical_records_cache_v1';

/// Seed sample patient records (initialized empty for clean user testing)
export const BENCHMARK_SEED_RECORDS: ClinicalRecord[] = [];

export async function fetchDatabaseStatus(): Promise<DatabaseStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/database/status`, { method: 'GET' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend database status fetch failed, returning local mode:', e);
  }
  return {
    primary_engine: 'SQLite (Local Database)',
    backup_engine: 'SQLite (data/retinaguard.db)',
    supabase_configured: false,
    supabase_status: 'Offline / Browser Cached',
    sqlite_status: 'Healthy',
    total_records_count: getLocalCacheRecords().length,
  };
}

function getLocalCacheRecords(): ClinicalRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading localStorage cache:', e);
  }
  return [];
}

function saveLocalCacheRecords(records: ClinicalRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving to localStorage cache:', e);
  }
}

export async function fetchClinicalRecords(filters?: RecordFilterOptions): Promise<ClinicalRecord[]> {
  const queryParams = new URLSearchParams();
  if (filters?.query) queryParams.append('query', filters.query);
  if (filters?.disease && filters.disease !== 'all') queryParams.append('disease', filters.disease);
  if (filters?.risk_level && filters.risk_level !== 'all') queryParams.append('risk_level', filters.risk_level);
  if (filters?.eye && filters.eye !== 'all') queryParams.append('eye', filters.eye);
  if (filters?.sort_by) queryParams.append('sort_by', filters.sort_by);

  try {
    const res = await fetch(`${API_BASE_URL}/api/records?${queryParams.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.records)) {
        // Update local cache
        saveLocalCacheRecords(data.records);
        return data.records;
      }
    }
  } catch (e) {
    console.warn('Could not fetch from backend records API, applying client-side filtering:', e);
  }

  // Fallback to local cache with client-side filtering
  let records = getLocalCacheRecords();
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    records = records.filter(r =>
      r.patient_name.toLowerCase().includes(q) ||
      (r.patient_id && r.patient_id.toLowerCase().includes(q)) ||
      (r.symptoms && r.symptoms.toLowerCase().includes(q)) ||
      (r.doctor_notes && r.doctor_notes.toLowerCase().includes(q)) ||
      r.id.toLowerCase().includes(q)
    );
  }
  if (filters?.disease && filters.disease !== 'all') {
    records = records.filter(r => r.top_prediction.toLowerCase().includes(filters.disease!.toLowerCase()));
  }
  if (filters?.risk_level && filters.risk_level !== 'all') {
    records = records.filter(r => r.risk_level.toLowerCase().includes(filters.risk_level!.toLowerCase()));
  }
  if (filters?.eye && filters.eye !== 'all') {
    records = records.filter(r => (r.scanned_eye || '').toLowerCase().includes(filters.eye!.toLowerCase()));
  }

  // Sort
  if (filters?.sort_by === 'newest') {
    records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (filters?.sort_by === 'oldest') {
    records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (filters?.sort_by === 'risk_high') {
    records.sort((a, b) => b.risk_score - a.risk_score);
  } else if (filters?.sort_by === 'risk_low') {
    records.sort((a, b) => a.risk_score - b.risk_score);
  } else if (filters?.sort_by === 'confidence') {
    records.sort((a, b) => b.confidence - a.confidence);
  }

  return records;
}

export async function saveClinicalRecordToDatabase(record: Partial<ClinicalRecord>): Promise<ClinicalRecord> {
  const newRec: ClinicalRecord = {
    id: record.id || `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    patient_id: record.patient_id || `P-${Math.floor(10000 + Math.random() * 90000)}`,
    patient_name: record.patient_name || 'Anonymous Patient',
    patient_age: record.patient_age || 'N/A',
    patient_gender: record.patient_gender || 'N/A',
    scanned_eye: record.scanned_eye || 'Right Eye (OD)',
    blood_group: record.blood_group || 'N/A',
    diabetic_status: record.diabetic_status || 'Unspecified',
    hypertension: record.hypertension || 'Unspecified',
    symptoms: record.symptoms || 'None reported',
    task: record.task || 'multitask',
    model_name: record.model_name || 'RetinaGuard++ MultiTask',
    model_version: record.model_version || '2.0.0',
    top_prediction: record.top_prediction || 'Normal',
    confidence: record.confidence ?? 0.95,
    risk_score: record.risk_score ?? 10.0,
    risk_level: record.risk_level || 'Low Risk',
    severity: record.severity || '',
    quality_score: record.quality_score ?? 0.95,
    quality_passed: record.quality_passed ? 1 : 0,
    vessel_density: record.vessel_density ?? 0.14,
    microaneurysms: record.microaneurysms ?? 0,
    exudate_ratio: record.exudate_ratio ?? 0.0,
    predictions_json: record.predictions_json || [],
    sub_scores_json: record.sub_scores_json || {},
    dip_biomarkers_json: record.dip_biomarkers_json || {},
    doctor_notes: record.doctor_notes || '',
    clinical_status: record.clinical_status || 'Completed',
    thumbnail_base64: record.thumbnail_base64 || '',
    heatmap_overlay_base64: record.heatmap_overlay_base64 || '',
    recommendation: record.recommendation || '',
    created_at: record.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Try backend API
  try {
    const res = await fetch(`${API_BASE_URL}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRec),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.record) {
        // Also update local cache
        const local = getLocalCacheRecords();
        const updated = [data.record, ...local.filter(r => r.id !== data.record.id)];
        saveLocalCacheRecords(updated);
        return data.record;
      }
    }
  } catch (e) {
    console.warn('Backend save failed, saving to local cache:', e);
  }

  // 2. Fallback to local storage
  const local = getLocalCacheRecords();
  const updated = [newRec, ...local.filter(r => r.id !== newRec.id)];
  saveLocalCacheRecords(updated);
  return newRec;
}

export async function updateRecordNotesInDatabase(id: string, doctor_notes: string, clinical_status?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/records/${id}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_notes, clinical_status }),
    });
    if (res.ok) {
      // update local cache too
      const local = getLocalCacheRecords();
      const idx = local.findIndex(r => r.id === id);
      if (idx !== -1) {
        local[idx].doctor_notes = doctor_notes;
        if (clinical_status) local[idx].clinical_status = clinical_status;
        local[idx].updated_at = new Date().toISOString();
        saveLocalCacheRecords(local);
      }
      return true;
    }
  } catch (e) {
    console.warn('Backend notes update failed, updating local cache:', e);
  }

  // Fallback
  const local = getLocalCacheRecords();
  const idx = local.findIndex(r => r.id === id);
  if (idx !== -1) {
    local[idx].doctor_notes = doctor_notes;
    if (clinical_status) local[idx].clinical_status = clinical_status;
    local[idx].updated_at = new Date().toISOString();
    saveLocalCacheRecords(local);
    return true;
  }
  return false;
}

export async function deleteRecordFromDatabase(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/records/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const local = getLocalCacheRecords().filter(r => r.id !== id);
      saveLocalCacheRecords(local);
      return true;
    }
  } catch (e) {
    console.warn('Backend delete failed, removing from local cache:', e);
  }

  const local = getLocalCacheRecords().filter(r => r.id !== id);
  saveLocalCacheRecords(local);
  return true;
}

export async function clearAllClinicalRecords(): Promise<boolean> {
  // 1. Clear local storage cache
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }

  // 2. Clear backend database
  try {
    const res = await fetch(`${API_BASE_URL}/api/records`, { method: 'DELETE' });
    return res.ok;
  } catch (e) {
    console.warn('Backend clear all records failed:', e);
    return false;
  }
}

export function exportRecordsToCSV(records: ClinicalRecord[]): string {
  const headers = [
    'Record ID', 'Patient ID', 'Patient Name', 'Age', 'Gender', 'Scanned Eye',
    'Blood Group', 'Diabetes', 'Hypertension', 'Top Prediction', 'Confidence (%)',
    'Risk Score (0-100)', 'Risk Level', 'Severity', 'Vessel Density',
    'Microaneurysms', 'Exudate Area', 'Clinical Status', 'Date Created', 'Doctor Notes'
  ];

  const rows = records.map(r => [
    `"${r.id}"`,
    `"${r.patient_id || ''}"`,
    `"${r.patient_name.replace(/"/g, '""')}"`,
    `"${r.patient_age || ''}"`,
    `"${r.patient_gender || ''}"`,
    `"${r.scanned_eye || ''}"`,
    `"${r.blood_group || ''}"`,
    `"${r.diabetic_status || ''}"`,
    `"${r.hypertension || ''}"`,
    `"${r.top_prediction.replace(/"/g, '""')}"`,
    `${(r.confidence * 100).toFixed(1)}`,
    `${r.risk_score.toFixed(1)}`,
    `"${r.risk_level}"`,
    `"${(r.severity || '').replace(/"/g, '""')}"`,
    `${r.vessel_density ?? ''}`,
    `${r.microaneurysms ?? ''}`,
    `${r.exudate_ratio ?? ''}`,
    `"${r.clinical_status || 'Completed'}"`,
    `"${new Date(r.created_at).toLocaleString()}"`,
    `"${(r.doctor_notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
