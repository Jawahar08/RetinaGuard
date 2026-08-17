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

// Seed sample patient records for standalone offline guarantee
export const BENCHMARK_SEED_RECORDS: ClinicalRecord[] = [
  {
    id: 'REC-20260817-101',
    patient_id: 'P-40192',
    patient_name: 'Maria Elena Santos',
    patient_age: '58',
    patient_gender: 'Female',
    scanned_eye: 'Right Eye (OD)',
    blood_group: 'O+',
    diabetic_status: 'Type 2 (Poorly Controlled)',
    hypertension: 'Stage 2 Hypertension',
    symptoms: 'Blurry vision, floaters, reduced night vision',
    task: 'multitask',
    model_name: 'RetinaGuard++ MultiTask Fusion',
    model_version: '2.0.0',
    top_prediction: 'Diabetic Retinopathy',
    confidence: 0.942,
    risk_score: 78.5,
    risk_level: 'Critical Risk',
    severity: 'Grade 3: Severe NPDR',
    quality_score: 0.94,
    quality_passed: 1,
    vessel_density: 0.082,
    microaneurysms: 24,
    exudate_ratio: 0.048,
    predictions_json: [
      { label: 'Diabetic Retinopathy', probability: 0.942, is_positive: true },
      { label: 'Hypertensive Retinopathy', probability: 0.680, is_positive: true },
      { label: 'Glaucoma', probability: 0.045, is_positive: false },
      { label: 'Cataract', probability: 0.012, is_positive: false },
      { label: 'Normal', probability: 0.008, is_positive: false }
    ],
    sub_scores_json: {
      vessel_density_risk: 22.5,
      lesion_risk: 28.0,
      exudate_risk: 15.0,
      ml_confidence_risk: 13.0
    },
    dip_biomarkers_json: {
      vessel_density_index: 0.082,
      microaneurysm_candidate_count: 24,
      exudate_candidate_count: 9,
      exudate_area_ratio: 0.048,
      cup_to_disc_ratio: 0.44,
      optic_disc_found: true
    },
    doctor_notes: 'Urgent retinal specialist referral sent. Advised OCT macula scan and Anti-VEGF assessment. Strict glycemic and BP control advised.',
    clinical_status: 'Urgent Referral',
    thumbnail_base64: '/samples/aptos_stage_3_severe.png',
    heatmap_overlay_base64: '',
    recommendation: 'Urgent ophthalmology referral within 2 weeks. Comprehensive dilated fundus exam and fluorescein angiography recommended.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'REC-20260816-102',
    patient_id: 'P-38821',
    patient_name: 'David K. Chen',
    patient_age: '64',
    patient_gender: 'Male',
    scanned_eye: 'Left Eye (OS)',
    blood_group: 'B+',
    diabetic_status: 'Non-Diabetic',
    hypertension: 'Stage 1 Hypertension',
    symptoms: 'Gradual loss of peripheral vision, mild eye ache',
    task: 'odir',
    model_name: '4608-d Feature Fusion Ensemble',
    model_version: '1.0.0',
    top_prediction: 'Glaucoma',
    confidence: 0.895,
    risk_score: 62.0,
    risk_level: 'High Risk',
    severity: 'Optic Nerve Cupping (CDR 0.76)',
    quality_score: 0.91,
    quality_passed: 1,
    vessel_density: 0.138,
    microaneurysms: 1,
    exudate_ratio: 0.002,
    predictions_json: [
      { label: 'Glaucoma', probability: 0.895, is_positive: true },
      { label: 'Normal', probability: 0.082, is_positive: false },
      { label: 'Cataract', probability: 0.035, is_positive: false },
      { label: 'Diabetic Retinopathy', probability: 0.011, is_positive: false }
    ],
    sub_scores_json: {
      vessel_density_risk: 8.0,
      lesion_risk: 4.0,
      anatomy_risk: 35.0,
      ml_confidence_risk: 15.0
    },
    dip_biomarkers_json: {
      vessel_density_index: 0.138,
      microaneurysm_candidate_count: 1,
      exudate_candidate_count: 0,
      exudate_area_ratio: 0.002,
      cup_to_disc_ratio: 0.76,
      optic_disc_found: true
    },
    doctor_notes: 'Visual field test (Humphrey 24-2) and pachymetry ordered. Intraocular pressure IOP measured 24 mmHg OS. Initiated Latanoprost 0.005% QHS.',
    clinical_status: 'Under Treatment',
    thumbnail_base64: '/samples/odir_glaucoma.jpg',
    heatmap_overlay_base64: '',
    recommendation: 'Gonioscopy and OCT RNFL evaluation. Follow-up visual field testing in 3 months.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'REC-20260814-103',
    patient_id: 'P-29901',
    patient_name: 'Eleanor Vance',
    patient_age: '42',
    patient_gender: 'Female',
    scanned_eye: 'Right Eye (OD)',
    blood_group: 'A-',
    diabetic_status: 'Non-Diabetic',
    hypertension: 'Normotensive',
    symptoms: 'None (Routine Executive Screening)',
    task: 'aptos',
    model_name: 'DenseNet121 + ResNet50 Classifier',
    model_version: '1.0.0',
    top_prediction: 'No DR (Normal)',
    confidence: 0.988,
    risk_score: 6.2,
    risk_level: 'Low Risk',
    severity: 'Grade 0: Normal Retina',
    quality_score: 0.96,
    quality_passed: 1,
    vessel_density: 0.162,
    microaneurysms: 0,
    exudate_ratio: 0.0,
    predictions_json: [
      { label: 'No DR', probability: 0.988, is_positive: false },
      { label: 'Mild DR', probability: 0.009, is_positive: false },
      { label: 'Moderate DR', probability: 0.002, is_positive: false }
    ],
    sub_scores_json: {
      vessel_density_risk: 2.0,
      lesion_risk: 0.0,
      ml_confidence_risk: 4.2
    },
    dip_biomarkers_json: {
      vessel_density_index: 0.162,
      microaneurysm_candidate_count: 0,
      exudate_candidate_count: 0,
      exudate_area_ratio: 0.0,
      cup_to_disc_ratio: 0.32,
      optic_disc_found: true
    },
    doctor_notes: 'Completely normal retinal fundus. Sharp disc margins, clear macula, healthy vascular geometry. Routine annual re-check advised.',
    clinical_status: 'Completed (Clear)',
    thumbnail_base64: '/samples/aptos_stage_0_normal.png',
    heatmap_overlay_base64: '',
    recommendation: 'Annual routine preventative eye examination recommended.',
    created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 86400000).toISOString()
  },
  {
    id: 'REC-20260810-104',
    patient_id: 'P-18450',
    patient_name: 'Robert S. Taylor',
    patient_age: '52',
    patient_gender: 'Male',
    scanned_eye: 'Left Eye (OS)',
    blood_group: 'A+',
    diabetic_status: 'Type 2 (Controlled)',
    hypertension: 'Stage 1 Hypertension',
    symptoms: 'Mild strain during reading, occasional glare',
    task: 'aptos',
    model_name: 'RetinaGuard++ MultiTask',
    model_version: '2.0.0',
    top_prediction: 'Diabetic Retinopathy',
    confidence: 0.812,
    risk_score: 38.4,
    risk_level: 'Elevated Risk',
    severity: 'Grade 2: Moderate NPDR',
    quality_score: 0.89,
    quality_passed: 1,
    vessel_density: 0.124,
    microaneurysms: 8,
    exudate_ratio: 0.015,
    predictions_json: [
      { label: 'Moderate DR', probability: 0.812, is_positive: true },
      { label: 'Mild DR', probability: 0.145, is_positive: false },
      { label: 'No DR', probability: 0.035, is_positive: false }
    ],
    sub_scores_json: {
      vessel_density_risk: 12.0,
      lesion_risk: 16.0,
      exudate_risk: 5.4,
      ml_confidence_risk: 5.0
    },
    dip_biomarkers_json: {
      vessel_density_index: 0.124,
      microaneurysm_candidate_count: 8,
      exudate_candidate_count: 3,
      exudate_area_ratio: 0.015,
      cup_to_disc_ratio: 0.38,
      optic_disc_found: true
    },
    doctor_notes: 'Early microvascular signs noted in paramacular area. Scheduled 3-month follow up with dilated examination.',
    clinical_status: 'Follow-up Scheduled',
    thumbnail_base64: '/samples/aptos_stage_2_moderate.png',
    heatmap_overlay_base64: '',
    recommendation: 'Follow-up screening in 3 to 6 months. Maintain HbA1c < 7.0%.',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString()
  }
];

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
  if (typeof window === 'undefined') return BENCHMARK_SEED_RECORDS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading localStorage cache:', e);
  }
  return BENCHMARK_SEED_RECORDS;
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
