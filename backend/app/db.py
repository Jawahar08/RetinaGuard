"""
Database management module for RetinaGuard Clinical Records Archive.
Supports dual storage:
1. Supabase Cloud (PostgreSQL) via REST/SQL API (Primary if SUPABASE_URL & SUPABASE_KEY configured)
2. SQLite Local Database (data/retinaguard.db) as automatic local mirror and offline fallback.
"""

import os
import json
import sqlite3
import datetime
import logging
from typing import Dict, List, Optional, Any
import httpx

logger = logging.getLogger("retinal-backend-db")

# Paths and Environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
SQLITE_DB_PATH = os.environ.get("SQLITE_DB_PATH", os.path.join(DATA_DIR, "retinaguard.db"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip() or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

os.makedirs(DATA_DIR, exist_ok=True)


def get_sqlite_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_sqlite_db():
    """Create clinical_records table and indexes in SQLite if they do not exist."""
    conn = get_sqlite_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clinical_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        patient_name TEXT,
        patient_age TEXT,
        patient_gender TEXT,
        scanned_eye TEXT,
        blood_group TEXT,
        diabetic_status TEXT,
        hypertension TEXT,
        symptoms TEXT,
        task TEXT,
        model_name TEXT,
        model_version TEXT,
        top_prediction TEXT,
        confidence REAL,
        risk_score REAL,
        risk_level TEXT,
        severity TEXT,
        quality_score REAL,
        quality_passed INTEGER,
        vessel_density REAL,
        microaneurysms INTEGER,
        exudate_ratio REAL,
        predictions_json TEXT,
        sub_scores_json TEXT,
        dip_biomarkers_json TEXT,
        doctor_notes TEXT,
        clinical_status TEXT,
        thumbnail_base64 TEXT,
        heatmap_overlay_base64 TEXT,
        recommendation TEXT,
        created_at TEXT,
        updated_at TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_patient_name ON clinical_records (patient_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_top_pred ON clinical_records (top_prediction);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_score ON clinical_records (risk_score);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON clinical_records (created_at);")
    conn.close()
    logger.info(f"SQLite database initialized at {SQLITE_DB_PATH}")


def seed_benchmark_records(cursor: sqlite3.Cursor):
    """Seed initial realistic clinical patient records for demonstration."""
    sample_records = [
        {
            "id": "REC-20260817-101",
            "patient_id": "P-40192",
            "patient_name": "Maria Elena Santos",
            "patient_age": "58",
            "patient_gender": "Female",
            "scanned_eye": "Right Eye (OD)",
            "blood_group": "O+",
            "diabetic_status": "Type 2 (Poorly Controlled)",
            "hypertension": "Stage 2 Hypertension",
            "symptoms": "Blurry vision, floaters, reduced night vision",
            "task": "multitask",
            "model_name": "RetinaGuard++ MultiTask Fusion",
            "model_version": "2.0.0",
            "top_prediction": "Diabetic Retinopathy",
            "confidence": 0.942,
            "risk_score": 78.5,
            "risk_level": "Critical Risk",
            "severity": "Grade 3: Severe NPDR",
            "quality_score": 0.94,
            "quality_passed": 1,
            "vessel_density": 0.082,
            "microaneurysms": 24,
            "exudate_ratio": 0.048,
            "predictions_json": json.dumps([
                {"label": "Diabetic Retinopathy", "probability": 0.942, "is_positive": True},
                {"label": "Hypertensive Retinopathy", "probability": 0.680, "is_positive": True},
                {"label": "Glaucoma", "probability": 0.045, "is_positive": False},
                {"label": "Cataract", "probability": 0.012, "is_positive": False},
                {"label": "Normal", "probability": 0.008, "is_positive": False}
            ]),
            "sub_scores_json": json.dumps({
                "vessel_density_risk": 22.5,
                "lesion_risk": 28.0,
                "exudate_risk": 15.0,
                "ml_confidence_risk": 13.0
            }),
            "dip_biomarkers_json": json.dumps({
                "vessel_density_index": 0.082,
                "microaneurysm_candidate_count": 24,
                "exudate_candidate_count": 9,
                "exudate_area_ratio": 0.048,
                "cup_to_disc_ratio": 0.44,
                "optic_disc_found": True
            }),
            "doctor_notes": "Urgent retinal specialist referral sent. Advised OCT macula scan and Anti-VEGF assessment. Strict glycemic and BP control advised.",
            "clinical_status": "Urgent Referral",
            "thumbnail_base64": "",
            "heatmap_overlay_base64": "",
            "recommendation": "Urgent ophthalmology referral within 2 weeks. Comprehensive dilated fundus exam and fluorescein angiography recommended.",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat(),
            "updated_at": (datetime.datetime.now() - datetime.timedelta(days=2)).isoformat()
        },
        {
            "id": "REC-20260816-102",
            "patient_id": "P-38821",
            "patient_name": "David K. Chen",
            "patient_age": "64",
            "patient_gender": "Male",
            "scanned_eye": "Left Eye (OS)",
            "blood_group": "B+",
            "diabetic_status": "Non-Diabetic",
            "hypertension": "Stage 1 Hypertension",
            "symptoms": "Gradual loss of peripheral vision, mild eye ache",
            "task": "odir",
            "model_name": "4608-d Feature Fusion Ensemble",
            "model_version": "1.0.0",
            "top_prediction": "Glaucoma",
            "confidence": 0.895,
            "risk_score": 62.0,
            "risk_level": "High Risk",
            "severity": "Optic Nerve Cupping (CDR 0.76)",
            "quality_score": 0.91,
            "quality_passed": 1,
            "vessel_density": 0.138,
            "microaneurysms": 1,
            "exudate_ratio": 0.002,
            "predictions_json": json.dumps([
                {"label": "Glaucoma", "probability": 0.895, "is_positive": True},
                {"label": "Normal", "probability": 0.082, "is_positive": False},
                {"label": "Cataract", "probability": 0.035, "is_positive": False},
                {"label": "Diabetic Retinopathy", "probability": 0.011, "is_positive": False}
            ]),
            "sub_scores_json": json.dumps({
                "vessel_density_risk": 8.0,
                "lesion_risk": 4.0,
                "anatomy_risk": 35.0,
                "ml_confidence_risk": 15.0
            }),
            "dip_biomarkers_json": json.dumps({
                "vessel_density_index": 0.138,
                "microaneurysm_candidate_count": 1,
                "exudate_candidate_count": 0,
                "exudate_area_ratio": 0.002,
                "cup_to_disc_ratio": 0.76,
                "optic_disc_found": True
            }),
            "doctor_notes": "Visual field test (Humphrey 24-2) and pachymetry ordered. Intraocular pressure IOP measured 24 mmHg OS. Initiated Latanoprost 0.005% QHS.",
            "clinical_status": "Under Treatment",
            "thumbnail_base64": "",
            "heatmap_overlay_base64": "",
            "recommendation": "Gonioscopy and OCT RNFL evaluation. Follow-up visual field testing in 3 months.",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=5)).isoformat(),
            "updated_at": (datetime.datetime.now() - datetime.timedelta(days=5)).isoformat()
        },
        {
            "id": "REC-20260814-103",
            "patient_id": "P-29901",
            "patient_name": "Eleanor Vance",
            "patient_age": "42",
            "patient_gender": "Female",
            "scanned_eye": "Right Eye (OD)",
            "blood_group": "A-",
            "diabetic_status": "Non-Diabetic",
            "hypertension": "Normotensive",
            "symptoms": "None (Routine Executive Screening)",
            "task": "aptos",
            "model_name": "DenseNet121 + ResNet50 Classifier",
            "model_version": "1.0.0",
            "top_prediction": "No DR (Normal)",
            "confidence": 0.988,
            "risk_score": 6.2,
            "risk_level": "Low Risk",
            "severity": "Grade 0: Normal Retina",
            "quality_score": 0.96,
            "quality_passed": 1,
            "vessel_density": 0.162,
            "microaneurysms": 0,
            "exudate_ratio": 0.0,
            "predictions_json": json.dumps([
                {"label": "No DR", "probability": 0.988, "is_positive": False},
                {"label": "Mild DR", "probability": 0.009, "is_positive": False},
                {"label": "Moderate DR", "probability": 0.002, "is_positive": False}
            ]),
            "sub_scores_json": json.dumps({
                "vessel_density_risk": 2.0,
                "lesion_risk": 0.0,
                "ml_confidence_risk": 4.2
            }),
            "dip_biomarkers_json": json.dumps({
                "vessel_density_index": 0.162,
                "microaneurysm_candidate_count": 0,
                "exudate_candidate_count": 0,
                "exudate_area_ratio": 0.0,
                "cup_to_disc_ratio": 0.32,
                "optic_disc_found": True
            }),
            "doctor_notes": "Completely normal retinal fundus. Sharp disc margins, clear macula, healthy vascular geometry. Routine annual re-check advised.",
            "clinical_status": "Completed (Clear)",
            "thumbnail_base64": "",
            "heatmap_overlay_base64": "",
            "recommendation": "Annual routine preventative eye examination recommended.",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=9)).isoformat(),
            "updated_at": (datetime.datetime.now() - datetime.timedelta(days=9)).isoformat()
        },
        {
            "id": "REC-20260810-104",
            "patient_id": "P-18450",
            "patient_name": "Robert S. Taylor",
            "patient_age": "52",
            "patient_gender": "Male",
            "scanned_eye": "Left Eye (OS)",
            "blood_group": "A+",
            "diabetic_status": "Type 2 (Controlled)",
            "hypertension": "Stage 1 Hypertension",
            "symptoms": "Mild strain during reading, occasional glare",
            "task": "aptos",
            "model_name": "RetinaGuard++ MultiTask",
            "model_version": "2.0.0",
            "top_prediction": "Diabetic Retinopathy",
            "confidence": 0.812,
            "risk_score": 38.4,
            "risk_level": "Elevated Risk",
            "severity": "Grade 2: Moderate NPDR",
            "quality_score": 0.89,
            "quality_passed": 1,
            "vessel_density": 0.124,
            "microaneurysms": 8,
            "exudate_ratio": 0.015,
            "predictions_json": json.dumps([
                {"label": "Moderate DR", "probability": 0.812, "is_positive": True},
                {"label": "Mild DR", "probability": 0.145, "is_positive": False},
                {"label": "No DR", "probability": 0.035, "is_positive": False}
            ]),
            "sub_scores_json": json.dumps({
                "vessel_density_risk": 12.0,
                "lesion_risk": 16.0,
                "exudate_risk": 5.4,
                "ml_confidence_risk": 5.0
            }),
            "dip_biomarkers_json": json.dumps({
                "vessel_density_index": 0.124,
                "microaneurysm_candidate_count": 8,
                "exudate_candidate_count": 3,
                "exudate_area_ratio": 0.015,
                "cup_to_disc_ratio": 0.38,
                "optic_disc_found": True
            }),
            "doctor_notes": "Early microvascular signs noted in paramacular area. Scheduled 3-month follow up with dilated examination.",
            "clinical_status": "Follow-up Scheduled",
            "thumbnail_base64": "",
            "heatmap_overlay_base64": "",
            "recommendation": "Follow-up screening in 3 to 6 months. Maintain HbA1c < 7.0%.",
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=14)).isoformat(),
            "updated_at": (datetime.datetime.now() - datetime.timedelta(days=14)).isoformat()
        }
    ]

    for rec in sample_records:
        cursor.execute("""
        INSERT OR IGNORE INTO clinical_records (
            id, patient_id, patient_name, patient_age, patient_gender,
            scanned_eye, blood_group, diabetic_status, hypertension, symptoms,
            task, model_name, model_version, top_prediction, confidence,
            risk_score, risk_level, severity, quality_score, quality_passed,
            vessel_density, microaneurysms, exudate_ratio, predictions_json,
            sub_scores_json, dip_biomarkers_json, doctor_notes, clinical_status,
            thumbnail_base64, heatmap_overlay_base64, recommendation,
            created_at, updated_at
        ) VALUES (
            :id, :patient_id, :patient_name, :patient_age, :patient_gender,
            :scanned_eye, :blood_group, :diabetic_status, :hypertension, :symptoms,
            :task, :model_name, :model_version, :top_prediction, :confidence,
            :risk_score, :risk_level, :severity, :quality_score, :quality_passed,
            :vessel_density, :microaneurysms, :exudate_ratio, :predictions_json,
            :sub_scores_json, :dip_biomarkers_json, :doctor_notes, :clinical_status,
            :thumbnail_base64, :heatmap_overlay_base64, :recommendation,
            :created_at, :updated_at
        )
        """, rec)


class ClinicalDatabaseManager:
    """Manager providing dual Supabase (Cloud PostgreSQL) + SQLite (Local Backup) integration."""

    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.supabase_key = SUPABASE_KEY
        self.has_supabase = bool(self.supabase_url and self.supabase_key)
        init_sqlite_db()

    def get_database_status(self) -> Dict[str, Any]:
        """Return status of primary Supabase and secondary SQLite databases."""
        sqlite_count = 0
        try:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM clinical_records;")
            sqlite_count = cursor.fetchone()["count"]
            conn.close()
            sqlite_ok = True
        except Exception as e:
            sqlite_ok = False
            logger.error(f"SQLite status check error: {e}")

        supabase_status = "Not Configured (Running in Offline/Local Mode)"
        if self.has_supabase:
            try:
                # Test Supabase connection
                headers = {
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}"
                }
                url = f"{self.supabase_url}/rest/v1/clinical_records?select=id&limit=1"
                resp = httpx.get(url, headers=headers, timeout=3.0)
                if resp.status_code in (200, 206):
                    supabase_status = "Connected & Active (Cloud PostgreSQL)"
                else:
                    supabase_status = f"HTTP {resp.status_code} (Table check needed)"
            except Exception as e:
                supabase_status = f"Offline / Unreachable ({str(e)[:30]})"

        return {
            "primary_engine": "Supabase (Cloud PostgreSQL)" if self.has_supabase else "SQLite (Local Database)",
            "backup_engine": "SQLite (data/retinaguard.db)",
            "supabase_configured": self.has_supabase,
            "supabase_status": supabase_status,
            "sqlite_status": "Healthy" if sqlite_ok else "Error",
            "total_records_count": sqlite_count,
            "sqlite_path": SQLITE_DB_PATH,
        }

    def save_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Save record into SQLite and sync to Supabase if configured."""
        now = datetime.datetime.now().isoformat()
        if "created_at" not in record or not record["created_at"]:
            record["created_at"] = now
        record["updated_at"] = now

        # Convert dict/lists to JSON strings for SQL persistence if needed
        rec_data = dict(record)
        for key in ["predictions_json", "sub_scores_json", "dip_biomarkers_json"]:
            val = rec_data.get(key)
            if val is not None and not isinstance(val, str):
                rec_data[key] = json.dumps(val)
            elif key not in rec_data:
                rec_data[key] = "{}"

        # Ensure all columns exist with defaults
        fields = [
            "id", "patient_id", "patient_name", "patient_age", "patient_gender",
            "scanned_eye", "blood_group", "diabetic_status", "hypertension", "symptoms",
            "task", "model_name", "model_version", "top_prediction", "confidence",
            "risk_score", "risk_level", "severity", "quality_score", "quality_passed",
            "vessel_density", "microaneurysms", "exudate_ratio", "predictions_json",
            "sub_scores_json", "dip_biomarkers_json", "doctor_notes", "clinical_status",
            "thumbnail_base64", "heatmap_overlay_base64", "recommendation",
            "created_at", "updated_at"
        ]
        params = {f: rec_data.get(f, None) for f in fields}

        # 1. Save to SQLite (Immediate guarantee)
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
        INSERT OR REPLACE INTO clinical_records (
            {", ".join(fields)}
        ) VALUES (
            {", ".join([f":{f}" for f in fields])}
        )
        """, params)
        conn.commit()
        conn.close()

        # 2. Sync to Supabase if active
        if self.has_supabase:
            try:
                headers = {
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates"
                }
                url = f"{self.supabase_url}/rest/v1/clinical_records"
                httpx.post(url, headers=headers, json=rec_data, timeout=4.0)
            except Exception as e:
                logger.warning(f"Supabase sync warning (SQLite local copy is intact): {e}")

        return self.get_record_by_id(params["id"]) or params

    def get_all_records(
        self,
        query: Optional[str] = None,
        disease: Optional[str] = None,
        risk_level: Optional[str] = None,
        eye: Optional[str] = None,
        sort_by: str = "newest",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Retrieve records from SQLite with optional filtering and search."""
        conn = get_sqlite_connection()
        cursor = conn.cursor()

        sql = "SELECT * FROM clinical_records WHERE 1=1"
        args = []

        if query and query.strip():
            q = f"%{query.strip().lower()}%"
            sql += " AND (LOWER(patient_name) LIKE ? OR LOWER(patient_id) LIKE ? OR LOWER(symptoms) LIKE ? OR LOWER(doctor_notes) LIKE ? OR LOWER(id) LIKE ?)"
            args.extend([q, q, q, q, q])

        if disease and disease != "all":
            sql += " AND LOWER(top_prediction) LIKE ?"
            args.append(f"%{disease.lower()}%")

        if risk_level and risk_level != "all":
            sql += " AND LOWER(risk_level) LIKE ?"
            args.append(f"%{risk_level.lower()}%")

        if eye and eye != "all":
            sql += " AND LOWER(scanned_eye) LIKE ?"
            args.append(f"%{eye.lower()}%")

        if sort_by == "newest":
            sql += " ORDER BY created_at DESC"
        elif sort_by == "oldest":
            sql += " ORDER BY created_at ASC"
        elif sort_by == "risk_high":
            sql += " ORDER BY risk_score DESC"
        elif sort_by == "risk_low":
            sql += " ORDER BY risk_score ASC"
        elif sort_by == "confidence":
            sql += " ORDER BY confidence DESC"
        else:
            sql += " ORDER BY created_at DESC"

        sql += f" LIMIT {max(1, min(limit, 500))}"

        cursor.execute(sql, args)
        rows = cursor.fetchall()
        records = [self._format_row(dict(r)) for r in rows]
        conn.close()
        return records

    def get_record_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Get single record by ID."""
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clinical_records WHERE id = ? LIMIT 1;", (record_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return self._format_row(dict(row))

    def update_doctor_notes(self, record_id: str, doctor_notes: str, clinical_status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update clinician notes and status for a record."""
        now = datetime.datetime.now().isoformat()
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        if clinical_status:
            cursor.execute("""
            UPDATE clinical_records
            SET doctor_notes = ?, clinical_status = ?, updated_at = ?
            WHERE id = ?;
            """, (doctor_notes, clinical_status, now, record_id))
        else:
            cursor.execute("""
            UPDATE clinical_records
            SET doctor_notes = ?, updated_at = ?
            WHERE id = ?;
            """, (doctor_notes, now, record_id))
        conn.commit()
        conn.close()

        # Sync to Supabase
        if self.has_supabase:
            try:
                headers = {
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json"
                }
                payload = {"doctor_notes": doctor_notes, "updated_at": now}
                if clinical_status:
                    payload["clinical_status"] = clinical_status
                url = f"{self.supabase_url}/rest/v1/clinical_records?id=eq.{record_id}"
                httpx.patch(url, headers=headers, json=payload, timeout=3.0)
            except Exception as e:
                logger.warning(f"Supabase update error: {e}")

        return self.get_record_by_id(record_id)

    def delete_record(self, record_id: str) -> bool:
        """Delete record from database."""
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clinical_records WHERE id = ?;", (record_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()

        if self.has_supabase:
            try:
                headers = {
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}"
                }
                url = f"{self.supabase_url}/rest/v1/clinical_records?id=eq.{record_id}"
                httpx.delete(url, headers=headers, timeout=3.0)
            except Exception as e:
                logger.warning(f"Supabase delete error: {e}")

        return affected > 0

    def clear_all_records(self) -> int:
        """Purge all clinical records from the database."""
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clinical_records;")
        affected = cursor.rowcount
        conn.commit()
        conn.close()

        if self.has_supabase:
            try:
                headers = {
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}"
                }
                url = f"{self.supabase_url}/rest/v1/clinical_records"
                httpx.delete(url, headers=headers, timeout=3.0)
            except Exception as e:
                logger.warning(f"Supabase clear error: {e}")

        return affected

    def _format_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Parse JSON fields in row for clean API output."""
        for key in ["predictions_json", "sub_scores_json", "dip_biomarkers_json"]:
            raw = row.get(key)
            if raw and isinstance(raw, str):
                try:
                    row[key] = json.loads(raw)
                except Exception:
                    pass
        return row


# Global singleton instance
db_manager = ClinicalDatabaseManager()
