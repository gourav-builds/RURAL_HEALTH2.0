import { useState, useEffect } from 'react';

import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { createConsultation, updateConsultation, getConsultation, markAwaitingReview } from '@/db/consultations';
import { getPatient } from '@/db/patients';
import type { Consultation, Patient } from '@/types';
import { formatDateTime } from '@/utils';
import { ClinicalBadge, SyncBadge } from '@/components/StatusBadges';
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

  const [patient, setPatient]           = useState<Patient | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes]               = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [lastSaved, setLastSaved]       = useState<string | null>(null);
  const [saveError, setSaveError]       = useState('');
  const [isDirty, setIsDirty]           = useState(false);
  const isEdit = Boolean(id);

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

  // Mark dirty on changes
  useEffect(() => { setIsDirty(true); }, [chiefComplaint, notes]);

  // Auto-save
  useEffect(() => {
    if (!isDirty || !chiefComplaint.trim()) return;
    const timer = setTimeout(() => handleSave(false), AUTO_SAVE_MS);
    return () => clearTimeout(timer);
  }, [chiefComplaint, notes, isDirty]);

  const handleSave = async (navigate_after = true) => {
    if (!chiefComplaint.trim()) return;
    setIsSaving(true);
    setSaveError('');
    try {
      if (isEdit && id) {
        const updated = await updateConsultation(id, { chiefComplaint, notes });
        setConsultation(updated);
        setLastSaved(updated.updatedAt);
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
        if (navigate_after) {
          navigate(`/consultations/${c.id}`, { replace: true });
        }
      }
      setIsDirty(false);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        setSaveError('Storage full — cannot save. Go to Settings → Storage to free space.');
      } else {
        setSaveError('Save failed. Your notes are preserved in this tab. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    await handleSave(false);
    if (consultation?.id) {
      await markAwaitingReview(consultation.id);
      navigate(`/patients/${consultation.patientId}`);
    }
  };

  const pid = patientId || consultation?.patientId;

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
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
            {isEdit ? 'Edit Consultation' : 'New Consultation'}
          </h2>
          {patient && (
            <p className="text-slate-400 text-sm">
              {patient.firstName} {patient.lastName}
            </p>
          )}
        </div>
        {consultation && (
          <div className="flex items-center gap-2">
            <ClinicalBadge status={consultation.clinicalStatus} />
            <SyncBadge status={consultation.syncStatus} />
          </div>
        )}
      </div>

      {/* Save status bar */}
      <div className="flex items-center gap-2 text-xs text-slate-500 h-5" aria-live="polite">
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

      {/* Main editor card */}
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
            placeholder="e.g. Fever and cough for 3 days"
            value={chiefComplaint}
            onChange={e => setChiefComplaint(e.target.value)}
            aria-required="true"
            autoFocus={!isEdit}
          />
        </div>

        {/* Notes */}
        <div className="field">
          <label className="label" htmlFor="notes">Consultation notes</label>
          <textarea
            id="notes"
            className="textarea min-h-[200px] text-sm leading-relaxed"
            placeholder={`Write your consultation notes here…\n\nInclude:\n• Symptoms and duration\n• Vital signs\n• Examination findings\n• Assessment and plan`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Placeholder buttons for M4 features */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn-ghost btn-sm opacity-50 cursor-not-allowed"
            disabled
            title="Voice transcription — available in Milestone 4"
          >
            <MicIcon className="w-4 h-4" /> Voice (M4)
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm opacity-50 cursor-not-allowed"
            disabled
            title="Document scan — available in Milestone 4"
          >
            <ImageIcon className="w-4 h-4" /> Scan doc (M4)
          </button>
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

      {/* M2/M4/M5 placeholders — informational */}
      <div className="card-sm bg-surface border border-dashed border-surface-border space-y-1 text-xs text-slate-500">
        <p className="font-medium text-slate-400">Coming in future milestones:</p>
        <p>🎙 Voice recording + Whisper transcription (M4)</p>
        <p>📷 Document scan + Tesseract OCR (M4)</p>
        <p>🤖 AI-structured extraction with WebLLM (M5)</p>
        <p>🔐 End-to-end encryption of all fields (M2)</p>
      </div>
    </div>
  );
}
