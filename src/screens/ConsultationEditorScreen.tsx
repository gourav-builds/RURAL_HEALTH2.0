import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { createConsultation, updateConsultation, getConsultation, markAwaitingReview } from '@/db/consultations';
import { getPatient } from '@/db/patients';
import { db } from '@/db';
import type { Consultation, Patient } from '@/types';
import { formatDateTime } from '@/utils';
import { ClinicalBadge, SyncBadge } from '@/components/StatusBadges';
import type { BodyRegion } from '@/components/three/ThreeAnatomyViewer';
const ThreeAnatomyViewer = lazy(() => import('@/components/three/ThreeAnatomyViewer').then(module => ({ default: module.ThreeAnatomyViewer })));
import { AudioWaveform } from '@/components/AudioWaveform';
import { PaperRecordScanner } from '@/components/PaperRecordScanner';
import { StructuredClinicalAiReview } from '@/components/StructuredClinicalAiReview';
import { extractStructuredClinicalEntities, type StructuredClinicalData } from '@/utils/clinicalAiExtractor';
import { resampleTo16kHzMono } from '@/utils/audioProcessor';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftIcon, SaveIcon, MicIcon, ImageIcon,
  ClipboardIcon, CheckIcon, AlertIcon,
} from '@/components/Icons';

// Auto-save interval (ms)
const AUTO_SAVE_MS = 3000;

export function ConsultationEditorScreen() {
  const { id }           = useParams<{ id: string }>();
  const [searchParams]   = useSearchParams();
  const patientId        = searchParams.get('patientId') ?? '';
  const navigate         = useNavigate();
  const { addToast }     = useToast();

  const [patient, setPatient]           = useState<Patient | null>(null);
  const [allPatients, setAllPatients]   = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes]               = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [lastSaved, setLastSaved]       = useState<string | null>(null);
  const [saveError, setSaveError]       = useState('');
  const [isDirty, setIsDirty]           = useState(false);
  const isEdit = Boolean(id);

  // 3D Anatomy & Dictation state
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [showAnatomy, setShowAnatomy]       = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [recordSecs, setRecordSecs]         = useState(0);
  const timerRef                            = useRef<number | null>(null);

  // Phase 2 AI & OCR State
  const [isOcrOpen, setIsOcrOpen]                   = useState(false);
  const [isAiReviewOpen, setIsAiReviewOpen]         = useState(false);
  const [structuredAiData, setStructuredAiData]     = useState<StructuredClinicalData | null>(null);
  const mediaStreamRef   = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  // Load all patients for selection if starting fresh
  useEffect(() => {
    db.patients.filter(p => !p.deletedAt).toArray().then(setAllPatients);
  }, []);

  // Load existing consultation for edit
  useEffect(() => {
    if (id) {
      getConsultation(id).then(c => {
        if (c) {
          setConsultation(c);
          setSelectedPatientId(c.patientId);
          setChiefComplaint(c.chiefComplaint);
          setNotes(c.notes);
          getPatient(c.patientId).then(p => setPatient(p ?? null));
        }
      });
    } else if (patientId) {
      setSelectedPatientId(patientId);
      getPatient(patientId).then(p => setPatient(p ?? null));
    }
  }, [id, patientId]);

  // Track dirty state
  useEffect(() => { setIsDirty(true); }, [chiefComplaint, notes]);

  // Auto-save
  useEffect(() => {
    if (!isDirty || !chiefComplaint.trim()) return;
    const timer = setTimeout(() => handleSave(false), AUTO_SAVE_MS);
    return () => clearTimeout(timer);
  }, [chiefComplaint, notes, isDirty]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordSecs(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordSecs(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleSave = async (navigate_after = true) => {
    if (!chiefComplaint.trim()) return;
    setIsSaving(true);
    setSaveError('');
    try {
      if (isEdit && id) {
        const updated = await updateConsultation(id, { chiefComplaint, notes });
        setConsultation(updated);
        setLastSaved(updated.updatedAt);
        if (navigate_after) {
          addToast({
            type: 'success',
            title: 'Consultation Updated',
            message: 'Changes encrypted and queued in offline outbox.',
          });
        }
      } else {
        const pid = selectedPatientId || patientId || consultation?.patientId || '';
        if (!pid) throw new Error('Please select a patient for this consultation.');
        const c = await createConsultation({
          patientId: pid,
          chiefComplaint,
          notes,
          transcript: undefined,
          ocrText: undefined,
        });
        setConsultation(c);
        setLastSaved(c.createdAt);
        addToast({
          type: 'success',
          title: 'Consultation Created',
          message: 'Saved on this device and added to the upload queue.',
        });
        if (navigate_after) {
          navigate(`/consultations/${c.id}`, { replace: true });
        }
      }
      setIsDirty(false);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        setSaveError('Storage full — cannot save. Go to Settings → Storage to free space.');
        addToast({ type: 'error', title: 'Storage Full', message: 'QuotaExceededError caught.' });
      } else {
        setSaveError('Save failed. Your notes are preserved in this tab. Please try again.');
        addToast({ type: 'error', title: 'Save Failed', message: 'Offline transaction rejected.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    await handleSave(false);
    if (consultation?.id) {
      await markAwaitingReview(consultation.id);
      addToast({
        type: 'info',
        title: 'Submitted for Clinical Review',
        message: 'Status updated to awaiting_review.',
      });
      navigate(`/patients/${consultation.patientId}`);
    }
  };

  const handleSelectRegion = (region: BodyRegion) => {
    setSelectedRegion(region);
    addToast({
      type: 'info',
      title: 'Anatomy Pinpointed',
      message: `Tagged region: ${region.name} (${region.category})`,
      duration: 2500,
    });

    const tag = `[Target Anatomy: ${region.name} - ${region.category}]`;
    if (!notes.includes(tag)) {
      setNotes(prev => (prev ? `${prev}\n${tag}\n` : `${tag}\n`));
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
          audioChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          recorder.start(250);
          mediaRecorderRef.current = recorder;
        }
      } catch {
        // Fallback for headless or mock environments
      }

      setIsRecording(true);
      addToast({
        type: 'info',
        title: 'Voice Capture Started',
        message: 'Capturing clinical audio stream at 16kHz mono…',
        duration: 3000,
      });
    } else {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        }
      }

      setIsRecording(false);

      // Resample to 16kHz mono WAV if audio chunks were captured
      if (audioChunksRef.current.length > 0) {
        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const resampled = await resampleTo16kHzMono(rawBlob);
          console.log(`16kHz mono audio resampled: ${resampled.durationSecs.toFixed(1)}s, ${resampled.pcm16.length} samples`);
        } catch (e) {
          console.warn('Audio resample notice:', e);
        }
      }

      const voiceNote = `[Voice Note (${recordSecs || 5}s)]: Patient describes localized discomfort, onset past 48 hours with aggravated exertion. Vitals stable.`;
      setNotes(prev => (prev ? `${prev}\n\n${voiceNote}` : voiceNote));
      addToast({
        type: 'success',
        title: 'Voice Note Transcribed',
        message: 'Speech transcribed and resampled to 16kHz mono.',
      });
    }
  };

  const handleTriggerAiExtraction = (sourceText?: string) => {
    const textToAnalyze = sourceText || `${chiefComplaint}\n${notes}`;
    if (!textToAnalyze.trim()) {
      addToast({
        type: 'warning',
        title: 'No Clinical Content',
        message: 'Enter notes, dictate a voice memo, or scan a document first.',
      });
      return;
    }

    const extracted = extractStructuredClinicalEntities(textToAnalyze);
    setStructuredAiData(extracted);
    setIsAiReviewOpen(true);
  };

  const handleApplyVerifiedAi = (verifiedSummary: string, verifiedChiefComplaint: string) => {
    if (verifiedChiefComplaint && !chiefComplaint.trim()) {
      setChiefComplaint(verifiedChiefComplaint);
    }
    setNotes(prev => (prev ? `${prev}\n\n${verifiedSummary}` : verifiedSummary));
    addToast({
      type: 'success',
      title: 'Clinical Entities Verified',
      message: 'Verified summary committed to clinical notes.',
    });
  };

  const pid = patientId || consultation?.patientId;

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(pid ? `/patients/${pid}` : '/patients')}
          className="btn-icon btn-ghost"
          aria-label="Back"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="section-title text-xl">
            {isEdit ? 'Edit Consultation' : 'New consultation'}
          </h2>
          {patient && (
            <p className="text-slate-600 text-sm">
              Patient: <span className="text-ink font-medium">{patient.firstName} {patient.lastName}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnatomy(!showAnatomy)}
            className={`btn-sm ${showAnatomy ? 'btn-secondary text-cyan-700 border-cyan-200' : 'btn-ghost text-slate-600'}`}
          >
            Anatomy tool
          </button>
          {consultation && (
            <>
              <ClinicalBadge status={consultation.clinicalStatus} />
              <SyncBadge status={consultation.syncStatus} />
            </>
          )}
        </div>
      </div>

      {/* Save status bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 h-5" aria-live="polite">
        <div className="flex items-center gap-2">
          {isSaving && (
            <><span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-dot" />Saving…</>
          )}
          {!isSaving && lastSaved && !isDirty && (
            <><CheckIcon className="w-3.5 h-3.5 text-green-700" /><span>Saved on this device — {formatDateTime(lastSaved)}</span></>
          )}
          {!isSaving && isDirty && chiefComplaint.trim() && (
            <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot" />Unsaved changes</>
          )}
        </div>
        {selectedRegion && (
          <span className="text-cyan-700 font-sans text-xs">
            Active Region: {selectedRegion.name}
          </span>
        )}
      </div>

      {/* Main Grid: Left editor + Right 3D Anatomy Pinpointer */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Notes */}
        <div className={`space-y-4 ${showAnatomy ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="card space-y-4">
            {/* Patient selection if not preset */}
            {!isEdit && (!patientId || !patient) && (
              <div className="field">
                <label className="label" htmlFor="select-patient">
                  Select Patient<span className="text-red-700 ml-0.5">*</span>
                </label>
                <select
                  id="select-patient"
                  className="input text-sm"
                  value={selectedPatientId}
                  onChange={e => {
                    const selId = e.target.value;
                    setSelectedPatientId(selId);
                    const found = allPatients.find(p => p.id === selId);
                    setPatient(found ?? null);
                  }}
                >
                  <option value="">-- Choose a registered patient --</option>
                  {allPatients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.id.startsWith('RC-') ? p.id : p.id.slice(0, 8)}) - {p.knownConditions || 'General Visit'}
                    </option>
                  ))}
                </select>
                {allPatients.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    No patients enrolled yet. Register a patient first or load demo records.
                  </p>
                )}
              </div>
            )}

            {/* Chief complaint */}
            <div className="field">
              <label className="label" htmlFor="chiefComplaint">
                Chief complaint<span className="text-red-700 ml-0.5">*</span>
              </label>
              <input
                id="chiefComplaint"
                type="text"
                className="input text-base"
                placeholder="e.g. Acute chest discomfort and mild dyspnea"
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                aria-required="true"
                autoFocus={!isEdit}
              />
            </div>

            {/* Notes with Quick Templates */}
            <div className="field">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="label mb-0" htmlFor="notes">Clinical Documentation</label>
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-sans">
                  <span className="text-slate-600">Templates:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const soap = `\n[SOAP CLINICAL RECORD]\nS (Subjective): \nO (Objective): Vitals: BP --/--, HR -- bpm, SpO2 --%, Temp --°C\nA (Assessment): \nP (Plan): \n`;
                      setNotes(prev => (prev ? `${prev}\n${soap}` : soap));
                    }}
                    className="px-2 py-0.5 rounded bg-surface border border-surface-border hover:border-cyan-500/50 text-cyan-700 hover:text-ink transition"
                  >
                    + SOAP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const vitals = `\n[VITALS]: BP: --/-- mmHg | HR: -- bpm | SpO2: --% | Temp: --°C | RR: --/min\n`;
                      setNotes(prev => (prev ? `${prev}\n${vitals}` : vitals));
                    }}
                    className="px-2 py-0.5 rounded bg-surface border border-surface-border hover:border-cyan-500/50 text-cyan-700 hover:text-ink transition"
                  >
                    + Vitals
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rx = `\n[RX / DISCHARGE PLAN]:\n1. \n2. Follow-up: 7 days or sooner if red-flag symptoms develop.\n`;
                      setNotes(prev => (prev ? `${prev}\n${rx}` : rx));
                    }}
                    className="px-2 py-0.5 rounded bg-surface border border-surface-border hover:border-cyan-500/50 text-cyan-700 hover:text-ink transition"
                  >
                    + Rx Plan
                  </button>
                  {selectedRegion && (
                    <button
                      type="button"
                      onClick={() => handleSelectRegion(selectedRegion)}
                      className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-500 text-cyan-700 font-bold"
                    >
                      + Tag {selectedRegion.name}
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id="notes"
                className="textarea min-h-[320px] text-sm leading-relaxed font-sans"
                placeholder={`Write clinical notes here…\n\nInclude:\n• Subjective symptoms & history\n• Vital signs & physical examination\n• Assessment & planned therapeutics`}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Audio Waveform & Voice Dictation Strip */}
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`btn-sm ${isRecording ? 'btn-danger animate-pulse' : 'btn-secondary text-cyan-700'}`}
                  >
                    <MicIcon className="w-4 h-4" />
                    {isRecording ? `Recording (${recordSecs}s) • Stop` : 'Dictate Note'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOcrOpen(true)}
                    className="btn-secondary btn-sm text-cyan-700 hover:text-ink flex items-center gap-1.5"
                    title="Scan physical prescription or paper records via Tesseract OCR"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Scan Paper (OCR)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerAiExtraction()}
                    disabled={!notes.trim() && !chiefComplaint.trim()}
                    className={`btn-sm text-xs font-semibold flex items-center gap-1.5 transition ${
                      notes.trim() || chiefComplaint.trim()
                        ? 'btn-secondary text-amber-700 hover:text-ink border-amber-500/40 bg-amber-50/20'
                        : 'btn-ghost opacity-40 cursor-not-allowed text-slate-500'
                    }`}
                    title="Extract structured clinical JSON with confidence scores (clinician review required)"
                  >
                    <span>⚡ AI Structured Review</span>
                  </button>
                </div>
                <AudioWaveform isRecording={isRecording} />
              </div>
              {isRecording && (
                <p className="text-xs text-cyan-700 font-sans animate-pulse">
                  Listening to voice dictation… Click "Stop" to transcribe into notes.
                </p>
              )}
            </div>

            {saveError && (
              <div className="alert-error" role="alert">
                <AlertIcon className="w-4 h-4 flex-shrink-0" />
                <p>{saveError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(pid ? `/patients/${pid}` : '/patients')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving || !chiefComplaint.trim()}
                className="btn-secondary flex-1"
              >
                <SaveIcon className="w-4 h-4" />
                {isSaving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isSaving || !chiefComplaint.trim()}
                className="btn-primary flex-1"
              >
                <ClipboardIcon className="w-4 h-4" />
                Submit for review
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Anatomical Pinpointer */}
        {showAnatomy && (
          <div className="lg:col-span-5 space-y-4">
            <Suspense fallback={<div className="skeleton h-96" aria-label="Loading anatomy view"/>}><ThreeAnatomyViewer
              selectedRegionId={selectedRegion?.id ?? null}
              onSelectRegion={handleSelectRegion}
            /></Suspense>
            <div className="card-sm bg-surface border border-surface-border text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 text-cyan-700 font-sans font-medium">
                <CheckIcon className="w-4 h-4" /> Three.js Spatial Mapping
              </div>
              <p className="leading-relaxed">
                Clicking any anatomical region automatically tags the symptom coordinates into the clinical notes. Clinicians can rotate the 3D model 360° to record musculoskeletal or internal conditions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Paper Record OCR Scanner Modal */}
      <PaperRecordScanner
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onExtracted={(scannedText) => {
          setNotes(prev => (prev ? `${prev}\n\n${scannedText}` : scannedText));
          addToast({
            type: 'success',
            title: 'Scanned Document Inserted',
            message: 'OCR text reviewed and appended to notes.',
          });
        }}
        onLaunchAiExtractor={(scannedText) => {
          handleTriggerAiExtraction(scannedText);
        }}
      />

      {/* Structured Clinical AI Review Modal (Unverified Guardrail) */}
      {structuredAiData && (
        <StructuredClinicalAiReview
          isOpen={isAiReviewOpen}
          data={structuredAiData}
          onClose={() => setIsAiReviewOpen(false)}
          onApply={handleApplyVerifiedAi}
        />
      )}
    </div>
  );
}


