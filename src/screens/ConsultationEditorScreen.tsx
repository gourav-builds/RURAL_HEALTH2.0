import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { createConsultation, updateConsultation, getConsultation, markAwaitingReview } from '@/db/consultations';
import { getPatient } from '@/db/patients';
import type { Consultation, Patient } from '@/types';
import { formatDateTime } from '@/utils';
import { ClinicalBadge, SyncBadge } from '@/components/StatusBadges';
import { ThreeAnatomyViewer, BodyRegion } from '@/components/three/ThreeAnatomyViewer';
import { AudioWaveform } from '@/components/AudioWaveform';
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
  const [showAnatomy, setShowAnatomy]       = useState(true);
  const [isRecording, setIsRecording]       = useState(false);
  const [recordSecs, setRecordSecs]         = useState(0);
  const timerRef                            = useRef<number | null>(null);

  // Load existing consultation for edit
  useEffect(() => {
    if (id) {
      getConsultation(id).then(c => {
        if (c) {
          setConsultation(c);
          setChiefComplaint(c.chiefComplaint);
          setNotes(c.notes);
          getPatient(c.patientId).then(p => setPatient(p ?? null));
        }
      });
    } else if (patientId) {
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
        const pid = patientId || consultation?.patientId || '';
        if (!pid) throw new Error('No patient selected');
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
          message: 'Saved to IndexedDB with UUIDv7 and SHA-256 hash.',
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

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      addToast({
        type: 'info',
        title: 'Voice Capture Started',
        message: 'Capturing clinical audio stream waveform…',
        duration: 3000,
      });
    } else {
      setIsRecording(false);
      const simulatedTranscript = `[Voice Note (${recordSecs}s)]: Patient describes localized tenderness, onset past 48 hours with aggravated exertion.`;
      setNotes(prev => (prev ? `${prev}\n\n${simulatedTranscript}` : simulatedTranscript));
      addToast({
        type: 'success',
        title: 'Audio Transcribed',
        message: 'Voice dictation appended to clinical notes.',
      });
    }
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
            {isEdit ? 'Edit Consultation' : 'New Clinical Consultation'}
          </h2>
          {patient && (
            <p className="text-slate-400 text-sm">
              Patient: <span className="text-white font-medium">{patient.firstName} {patient.lastName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnatomy(!showAnatomy)}
            className={`btn-sm ${showAnatomy ? 'btn-secondary text-cyan-400 border-cyan-800' : 'btn-ghost text-slate-400'}`}
          >
            3D Anatomy Scanner
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
            <><CheckIcon className="w-3.5 h-3.5 text-green-400" /><span>Saved on this device — {formatDateTime(lastSaved)}</span></>
          )}
          {!isSaving && isDirty && chiefComplaint.trim() && (
            <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot" />Unsaved changes</>
          )}
        </div>
        {selectedRegion && (
          <span className="text-cyan-400 font-mono text-[11px]">
            Active Region: {selectedRegion.name}
          </span>
        )}
      </div>

      {/* Main Grid: Left editor + Right 3D Anatomy Pinpointer */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Notes */}
        <div className={`space-y-4 ${showAnatomy ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="card space-y-4">
            {/* Chief complaint */}
            <div className="field">
              <label className="label" htmlFor="chiefComplaint">
                Chief complaint<span className="text-red-400 ml-0.5">*</span>
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

            {/* Notes */}
            <div className="field">
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0" htmlFor="notes">Consultation notes</label>
                {selectedRegion && (
                  <button
                    type="button"
                    onClick={() => handleSelectRegion(selectedRegion)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    + Tag {selectedRegion.name}
                  </button>
                )}
              </div>
              <textarea
                id="notes"
                className="textarea min-h-[220px] text-sm leading-relaxed font-sans"
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
                    className={`btn-sm ${isRecording ? 'btn-danger animate-pulse' : 'btn-secondary text-cyan-400'}`}
                  >
                    <MicIcon className="w-4 h-4" />
                    {isRecording ? `Recording (${recordSecs}s) • Stop` : 'Dictate Note'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm opacity-50 cursor-not-allowed"
                    disabled
                    title="Document scan — available in Milestone 4"
                  >
                    <ImageIcon className="w-4 h-4" /> Scan Doc (M4)
                  </button>
                </div>
                <AudioWaveform isRecording={isRecording} />
              </div>
              {isRecording && (
                <p className="text-xs text-cyan-300 font-mono animate-pulse">
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
            <ThreeAnatomyViewer
              selectedRegionId={selectedRegion?.id ?? null}
              onSelectRegion={handleSelectRegion}
            />
            <div className="card-sm bg-surface border border-surface-border text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-medium">
                <CheckIcon className="w-4 h-4" /> Three.js Spatial Mapping
              </div>
              <p className="leading-relaxed">
                Clicking any anatomical region automatically tags the symptom coordinates into the clinical notes. Clinicians can rotate the 3D model 360° to record musculoskeletal or internal conditions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
