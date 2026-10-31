import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import {
  ImageIcon, CheckIcon, XIcon,
  AlertIcon, FileTextIcon,
} from '@/components/Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (text: string) => void;
  onLaunchAiExtractor?: (text: string) => void;
}

// Sample rural clinic paper slips for instant offline evaluation
const SAMPLE_RECORDS = [
  {
    name: 'Primary Health Post - Prescription',
    dataUri: 'sample_prescription',
    text: `PRIMARY HEALTH CENTRE - SECTOR 4
Patient: Sunita Devi, Age: 42 F
Date: 28-Oct-2026

Chief Complaint: Severe productive cough x 4 days, low grade fever, chest heaviness.
Vitals: BP 118/76 mmHg, Pulse 82 bpm, Temp 38.1 C, SpO2 96%, RR 18/min.

Rx:
1. Tab Paracetamol 650mg TDS x 3 days
2. Tab Amoxicillin 500mg TDS x 5 days
3. Syp Ambroxol 10ml TDS

Adv: Warm fluids, steam inhalation. Review if dyspnea increases.
Signed: Dr. S. Rao, Medical Officer`,
  },
  {
    name: 'Field Outreach Screening Note',
    dataUri: 'sample_screening',
    text: `COMMUNITY HEALTH OUTREACH
Patient: Ramesh Kumar, Age: 58 M
Screening Date: 29-Oct-2026

C/O: Dizziness, intermittent headache past 2 weeks, blurred vision on standing.
Vitals: BP 162/98 mmHg, HR 88 bpm, SpO2 97%, Temp 36.6 C.

Impression: Stage 2 Hypertension, newly detected.
Plan: Refer to Medical Officer for antihypertensive initiation (Tab Amlodipine 5mg). Low salt diet, monitor BP daily.`,
  },
];

export function PaperRecordScanner({ isOpen, onClose, onExtracted, onLaunchAiExtractor }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isReviewed, setIsReviewed] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera on unmount or close
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setImageSrc(ev.target.result);
        runOcr(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert('Camera access denied or unavailable. Please use file upload.');
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImageSrc(dataUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      runOcr(dataUrl);
    }
  };

  const loadSample = (sample: typeof SAMPLE_RECORDS[0]) => {
    // Generate simple visual canvas placeholder for the sample
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(sample.name, 30, 40);
      ctx.fillStyle = '#334155';
      ctx.font = '12px monospace';
      const lines = sample.text.split('\n');
      lines.slice(0, 14).forEach((line, i) => {
        ctx.fillText(line.slice(0, 65), 30, 75 + i * 22);
      });
      setImageSrc(canvas.toDataURL('image/png'));
    }

    setRecognizedText(sample.text);
    setIsReviewed(true);
  };

  const runOcr = async (image: string) => {
    setIsProcessing(true);
    setProgressStatus('Initializing Tesseract OCR core…');
    setProgressPercent(15);
    setRecognizedText('');

    try {
      const worker = await createWorker('eng');
      setProgressStatus('Processing image and recognizing text…');
      setProgressPercent(50);

      const ret = await worker.recognize(image);
      setProgressPercent(100);
      setProgressStatus('Recognition complete');

      setRecognizedText(ret.data.text.trim());
      setIsReviewed(true);
      await worker.terminate();
    } catch {
      setProgressStatus('OCR error. Please edit manually.');
      setRecognizedText('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToNotes = () => {
    if (!recognizedText.trim()) return;
    onExtracted(`[SCANNED PAPER RECORD]:\n${recognizedText.trim()}`);
    onClose();
  };

  const handleSendToAi = () => {
    if (!recognizedText.trim()) return;
    if (onLaunchAiExtractor) {
      onLaunchAiExtractor(recognizedText);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-scanner-title"
    >
      <div className="w-full max-w-5xl max-h-[92vh] card bg-surface-card border border-surface-borderLight p-6 shadow-2xl flex flex-col space-y-4 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-100 to-indigo-100 flex items-center justify-center text-ink shadow-md shadow-cyan-950">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ocr-scanner-title" className="text-lg font-bold text-ink tracking-tight">
                  Paper Medical Record Scanner (Tesseract OCR)
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-sans bg-cyan-50 border border-cyan-200 text-cyan-700">
                  OFFLINE OCR
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Scan physical paper charts, lab slips, and prescriptions. OCR output is never auto-saved.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon btn-ghost btn-sm" aria-label="Close">
            <XIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Camera or Image Picker Toolbar */}
        {!imageSrc && !cameraActive && (
          <div className="p-8 border-2 border-dashed border-surface-borderLight rounded-2xl bg-surface/40 text-center space-y-5 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-cyan-50/80 border border-cyan-500/40 text-cyan-700 flex items-center justify-center mx-auto shadow-lg shadow-slate-200/40">
              <FileTextIcon className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-ink">Capture or Upload Paper Medical Record</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Upload a photo or scan of a paper chart, handwritten vitals slip, or diagnostic printout.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary text-xs py-2.5 px-5 font-bold flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Upload Paper Photo / Document</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={startCamera}
                className="btn-secondary text-xs py-2.5 px-4 font-semibold flex items-center gap-2"
              >
                <span>Use Device Camera</span>
              </button>
            </div>

            {/* Quick Rural Presets */}
            <div className="pt-4 border-t border-surface-border text-left">
              <p className="text-xs font-sans text-slate-600 uppercase tracking-wider mb-2">
                Or test with sample rural clinical slips:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_RECORDS.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => loadSample(s)}
                    className="p-3 rounded-xl bg-surface hover:bg-surface-hover border border-surface-border text-left transition group"
                  >
                    <span className="text-xs font-bold text-cyan-700 group-hover:text-ink block">{s.name}</span>
                    <span className="text-xs text-slate-600 font-sans line-clamp-1 mt-0.5">{s.text.slice(0, 60)}…</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        {cameraActive && (
          <div className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center p-2">
            <video ref={videoRef} className="w-full max-h-[380px] object-contain rounded-xl" autoPlay playsInline />
            <div className="flex items-center gap-4 py-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="btn-primary py-2.5 px-8 font-bold text-sm shadow-xl"
              >
                Capture Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                  setCameraActive(false);
                }}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
            <div className="flex justify-between text-xs font-sans">
              <span className="text-cyan-700 font-semibold">{progressStatus}</span>
              <span className="text-ink">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-100 to-indigo-100 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Editable Review Screen (SPEC: NEVER AUTO-SAVE) */}
        {isReviewed && imageSrc && (
          <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
            {/* Safety Mandate Banner */}
            <div className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-500/40 flex items-center gap-2.5 text-xs text-amber-700 flex-shrink-0">
              <AlertIcon className="w-4 h-4 flex-shrink-0 text-amber-700" />
              <span>
                <strong>Editable Review Screen:</strong> Verify and correct OCR readings below. Extracted data is <strong>never auto-saved</strong> to medical records until explicitly confirmed.
              </span>
            </div>

            {/* Side-by-side view: Original Image Left, Editable OCR Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
              {/* Left: Original Record Image */}
              <div className="rounded-xl border border-surface-border bg-black/60 p-2 flex flex-col overflow-hidden">
                <span className="text-xs font-sans text-slate-600 uppercase tracking-wider mb-1 block px-1">
                  Original Scanned Document
                </span>
                <div className="flex-1 flex items-center justify-center overflow-auto rounded-lg bg-black/40">
                  <img
                    src={imageSrc}
                    alt="Scanned clinical record"
                    className="max-h-[320px] object-contain rounded shadow"
                  />
                </div>
              </div>

              {/* Right: Editable OCR Output */}
              <div className="rounded-xl border border-surface-border bg-surface p-3 flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans text-slate-600 uppercase tracking-wider">
                    Editable OCR Output (Review & Edit)
                  </span>
                  <span className="text-xs font-sans text-slate-500">
                    {recognizedText.length} characters
                  </span>
                </div>
                <textarea
                  value={recognizedText}
                  onChange={e => setRecognizedText(e.target.value)}
                  className="textarea flex-1 min-h-[220px] font-sans text-xs leading-relaxed bg-surface-card"
                  placeholder="Recognized OCR text will appear here. Edit and verify against the original image."
                />
              </div>
            </div>

            {/* Bottom Review Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-border flex-shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setIsReviewed(false);
                  setRecognizedText('');
                }}
                className="btn-secondary btn-sm text-xs"
              >
                Scan Another Document
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendToAi}
                  disabled={!recognizedText.trim()}
                  className="btn-secondary btn-sm text-cyan-700 hover:text-ink border-cyan-500/40 text-xs font-semibold"
                >
                  ⚡ Send to Clinical AI Extractor
                </button>
                <button
                  type="button"
                  onClick={handleApplyToNotes}
                  disabled={!recognizedText.trim()}
                  className="btn-primary btn-sm text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Insert into Consultation Notes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
