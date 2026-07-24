'use client';

import React, { useState, useRef } from 'react';
import TickerBar from '../components/TickerBar';
import SiteHeader from '../components/SiteHeader';
import HeroSection from '../components/HeroSection';
import AnalysisWorkspace from '../components/AnalysisWorkspace';
import EnsemblePipeline from '../components/EnsemblePipeline';
import ResearchMetrics from '../components/ResearchMetrics';
import DiseaseReference from '../components/DiseaseReference';
import SiteFooter from '../components/SiteFooter';

interface ClassPrediction {
  label: string;
  probability: number;
  is_positive: boolean;
}

interface QualityGateResult {
  passed: boolean;
  quality_score: number;
  rejection_reason?: string;
  flags: string[];
}

interface PredictionResponse {
  request_id: string;
  task: string;
  model_name: string;
  model_version: string;
  quality_gate: QualityGateResult;
  predictions: ClassPrediction[];
  top_prediction: string;
  calibrated_confidence: number;
  abstain: boolean;
  abstention_reason?: string;
  disclaimer: string;
}

interface HeatmapResponse {
  request_id: string;
  target_label: string;
  architecture: string;
  target_layer: string;
  original_image_base64: string;
  heatmap_base64: string;
  overlay_base64: string;
  disclaimer: string;
}

const TRANSLATIONS: Record<'en' | 'ph', Record<string, string>> = {
  en: {
    heroTitleLine1: 'See the signal.',
    heroTitleLine2: 'Understand the decision.',
    heroSub: 'RetinaGuard analyzes retinal fundus images using an ensemble of deep-learning models and visualizes the regions influencing its prediction.',
    trustLine: 'Research and screening support only. Not a medical diagnosis.',
    ctaPrimary: 'Analyze a Retinal Image',
    ctaSecondary: 'Explore the Method',
    step1Title: '1. Select Screening Task',
    taskOdirTitle: 'ODIR Multi-Label Screening',
    taskOdirSub: 'Normal, DR, Glaucoma, Cataract, AMD',
    taskAptosTitle: 'APTOS DR Severity Grading',
    taskAptosSub: '5-Class DR Severity (No DR to Severe)',
    step2Title: '2. Upload Retinal Photograph',
    dropzoneText: 'Upload an image. Explore the evidence.',
    dropzoneSub: 'Drag and drop fundus photo or click to browse (PNG, JPG up to 15MB)',
    mockModeLabel: 'Mock Demo Mode (Offline)',
    runBtn: 'Analyze Retinal Image',
    processingBtn: 'Checking Quality & 4608d Fusion...',
    qualityFailedTitle: 'Low-Quality Rejection — Human Review Required',
    abstainTitle: 'Low Confidence — Flagged for Expert Review',
    confidenceLabel: 'Calibrated Confidence',
    downloadReportBtn: 'Download Summary Report (JSON)',
    heatmapTitle: 'What Influenced the Model?',
    heatmapSub: 'Visual attention maps generated via Grad-CAM layer activation.',
    tabBlended: 'Blended Overlay',
    tabHeatmap: 'Heatmap Only',
    tabOriginal: 'Original Image',
    ensembleTitle: 'Three Models. One Interpretable View.',
    ensembleSub: 'Multi-backbone feature concatenation combined with an out-of-fold stacking meta-classifier.',
    researchTitle: 'SOTA Validation Metrics',
    researchSub: 'Evaluated on 3,662 APTOS fundus images and 6,392 ODIR multi-label records.',
    clinicalRefTitle: 'Clinical Condition Reference',
    disclaimerGradcam: 'This visualization shows regions that influenced the model. It is not proof of a lesion, disease location, or clinical diagnosis.'
  },
  ph: {
    heroTitleLine1: 'Tignan ang hudyat.',
    heroTitleLine2: 'Unawain ang desisyon.',
    heroSub: 'Pino-proseso ng RetinaGuard ang mga litrato ng retina gamit ang pinagsamang AI ensemble upang maipakita ang mga bahaging nakaimpluwensya sa pagsusuri.',
    trustLine: 'Pang-pananaliksik at suporta lamang. Hindi ito pinal na diagnosis ng doktor.',
    ctaPrimary: 'Suriin ang Litrato ng Retina',
    ctaSecondary: 'Tignan ang Paraan ng AI',
    step1Title: '1. Pumili ng Uri ng Pagsusuri',
    taskOdirTitle: 'ODIR Pagsusuri sa Maraming Sakit',
    taskOdirSub: 'Normal, DR, Glaucoma, Cataract, AMD',
    taskAptosTitle: 'APTOS Antas ng Severity ng DR',
    taskAptosSub: '5-Antas ng Severity (Walang DR hanggang Malubha)',
    step2Title: '2. Mag-upload ng Litrato ng Retina',
    dropzoneText: 'Mag-upload ng litrato. Tignan ang patunay.',
    dropzoneSub: 'I-drag at i-drop ang litrato o i-click para mag-browse (PNG, JPG hanggang 15MB)',
    mockModeLabel: 'Mock Demo Mode (Offline)',
    runBtn: 'Simulan ang Pagsusuri',
    processingBtn: 'Pino-proseso ang Quality Gate at 4608d Fusion...',
    qualityFailedTitle: 'Bagsak sa Quality Check — Kinakailangan ang Doktor',
    abstainTitle: 'Mababang Kompiyansa — Naipatala para sa Eksperto',
    confidenceLabel: 'Kompirmadong Kompiyansa',
    downloadReportBtn: 'I-download ang Ulat (JSON)',
    heatmapTitle: 'Ano ang Nakaimpluwensya sa AI Model?',
    heatmapSub: 'Grad-CAM visual attention map sa mga bahagi ng retina.',
    tabBlended: 'Pinagsamang Overlay',
    tabHeatmap: 'Heatmap Lamang',
    tabOriginal: 'Orihinal na Litrato',
    ensembleTitle: 'Tatlong Model. Isang Malinaw na Pagsusuri.',
    ensembleSub: 'Pagsasama ng 4608d feature vectors mula sa tatlong malalakas na deep-learning backbones.',
    researchTitle: 'Mga Resulta ng Pananaliksik (SOTA)',
    researchSub: 'Sinubukan sa 3,662 APTOS litrato at 6,392 ODIR na mga tala.',
    clinicalRefTitle: 'Sanggunian sa mga Sakit sa Mata',
    disclaimerGradcam: 'Ipinapakita lamang ng visual na ito kung saang bahagi nakatutok ang AI. Hindi ito pinal na patunay ng sugat o sakit sa mata.'
  }
};

const DISEASE_INFO_MAP: Record<'en' | 'ph', Record<string, string>> = {
  en: {
    'Normal Retina': 'Retinal fundus structure demonstrates sharp optic disc margins, healthy macula, and normal vascular arcade geometry.',
    'Diabetic Retinopathy': 'Microvascular complication causing capillary non-perfusion, microaneurysms, hard exudates, and intraretinal hemorrhages.',
    'Glaucoma': 'Progressive optic neuropathy characterized by optic nerve head cupping and retinal nerve fiber layer thinning.',
    'Cataract': 'Opacification of the crystalline lens causing light scatter and reduced sharpness of retinal image capture.',
    'Age-Related Macular Degeneration': 'Degenerative disorder of the retinal pigment epithelium and macula leading to central visual field loss.'
  },
  ph: {
    'Normal Retina': 'Malinaw na optic disc, malusog na macula, at maayos na daloy ng dugo sa mga ugat ng mata.',
    'Diabetic Retinopathy': 'Komplikasyon ng diyabetes na nagdudulot ng paglitaw ng microaneurysms, pagdurugo, at exudates sa retina.',
    'Glaucoma': 'Progresibong pinsala sa optic nerve na nagdudulot ng paglawak ng cupping at pagkasira ng bahagi ng paningin.',
    'Cataract': 'Paglabo ng lente ng mata na humahadlang sa liwanag patungo sa retina.',
    'Age-Related Macular Degeneration': 'Pagkasira ng macula sanhi ng edad na nagdudulot ng paglabo ng gitnang paningin.'
  }
};

export default function OphthaFusionDashboard() {
  const [lang, setLang] = useState<'en' | 'ph'>('en');
  const t = TRANSLATIONS[lang];

  const [task, setTask] = useState<'odir' | 'aptos'>('odir');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useMock, setUseMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [activeHeatmapTab, setActiveHeatmapTab] = useState<'overlay' | 'heatmap' | 'original'>('overlay');

  const workspaceRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMethod = () => {
    methodRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File size exceeds 15MB limit.');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPrediction(null);
    setHeatmapData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const runPrediction = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setErrorMsg(null);

    if (useMock) {
      setTimeout(() => {
        const mockPred: PredictionResponse = {
          request_id: 'retinaguard-9822-sota',
          task: task,
          model_name: 'RetinaGuard 4608d Stacking Ensemble',
          model_version: '2.0.0-SOTA (98.22% Test Acc)',
          quality_gate: {
            passed: true,
            quality_score: 0.98,
            flags: []
          },
          predictions: task === 'odir' ? [
            { label: 'Normal', probability: 0.04, is_positive: false },
            { label: 'Diabetic Retinopathy', probability: 0.962, is_positive: true },
            { label: 'Glaucoma', probability: 0.02, is_positive: false },
            { label: 'Cataract', probability: 0.01, is_positive: false },
            { label: 'AMD', probability: 0.01, is_positive: false }
          ] : [
            { label: 'No DR', probability: 0.02, is_positive: false },
            { label: 'Mild DR', probability: 0.08, is_positive: false },
            { label: 'Moderate DR', probability: 0.884, is_positive: true },
            { label: 'Severe DR', probability: 0.02, is_positive: false },
            { label: 'Proliferative DR', probability: 0.01, is_positive: false }
          ],
          top_prediction: task === 'odir' ? 'Diabetic Retinopathy' : 'Moderate DR',
          calibrated_confidence: 0.9822,
          abstain: false,
          disclaimer: t.trustLine
        };
        setPrediction(mockPred);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('task', task);

      const res = await fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Prediction request failed.');
      }

      const data: PredictionResponse = await res.json();
      setPrediction(data);

      if (data.quality_gate.passed) {
        fetchHeatmap(data.predictions[0]?.label || 'Diabetic Retinopathy');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to connect to backend server. Try enabling Mock Mode.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeatmap = async (labelToExplain: string) => {
    if (!selectedFile || useMock) return;
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_label', labelToExplain);
      formData.append('task', task);

      const res = await fetch(`${apiBaseUrl}/generate-heatmap`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data: HeatmapResponse = await res.json();
        setHeatmapData(data);
      }
    } catch (err) {
      console.error('Heatmap generation error:', err);
    }
  };

  const downloadReport = () => {
    if (!prediction) return;
    const reportContent = {
      product: 'RetinaGuard Retinal Screening System',
      request_id: prediction.request_id,
      timestamp: new Date().toISOString(),
      task: prediction.task.toUpperCase(),
      top_prediction: prediction.top_prediction,
      calibrated_confidence: `${(prediction.calibrated_confidence * 100).toFixed(2)}%`,
      quality_gate: prediction.quality_gate,
      predictions: prediction.predictions,
      disclaimer: prediction.disclaimer
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retinaguard_report_${prediction.request_id.slice(0, 8)}.json`;
    a.click();
  };

  return (
    <div style={{ background: 'var(--bg-paper)', color: 'var(--ink-black)', minHeight: '100vh' }}>
      <TickerBar />

      <SiteHeader
        lang={lang}
        setLang={setLang}
        onStartScreening={scrollToWorkspace}
        onExploreMethod={scrollToMethod}
      />

      <HeroSection
        t={t}
        onStartScreening={scrollToWorkspace}
        onExploreMethod={scrollToMethod}
      />

      <AnalysisWorkspace
        t={t}
        task={task}
        setTask={setTask}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        isLoading={isLoading}
        useMock={useMock}
        setUseMock={setUseMock}
        errorMsg={errorMsg}
        prediction={prediction}
        heatmapData={heatmapData}
        activeHeatmapTab={activeHeatmapTab}
        setActiveHeatmapTab={setActiveHeatmapTab}
        handleFileSelect={handleFileSelect}
        handleDrop={handleDrop}
        runPrediction={runPrediction}
        downloadReport={downloadReport}
        workspaceRef={workspaceRef}
      />

      <EnsemblePipeline
        t={t}
        methodRef={methodRef}
      />

      <ResearchMetrics
        t={t}
      />

      <DiseaseReference
        t={t}
        diseaseInfoMap={DISEASE_INFO_MAP[lang]}
      />

      <SiteFooter />
    </div>
  );
}
