/** Consultation detail / view screen */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getConsultation, markReviewed, markAwaitingReview } from '@/db/consultations';
import { getPatient } from '@/db/patients';
import type { Consultation, Patient } from '@/types';
import { formatDateTime, calcAge } from '@/utils';
import { ClinicalBadge, SyncBadge } from '@/components/StatusBadges';
import {
  ArrowLeftIcon, EditIcon, CheckIcon, ClockIcon,
  ActivityIcon, UserIcon, ClipboardIcon,
} from '@/components/Icons';
import { useDevice } from '@/context/DeviceContext';

export function ConsultationDetailScreen() {
  const { id }         = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const { device }     = useDevice();
  const [consultation, setConsultation] = useState<Consultation | null | undefined>(undefined);
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [isReviewing, setIsReviewing]   = useState(false);

  const reload = async () => {
    if (!id) return;
    const c = await getConsultation(id);
    setConsultation(c ?? null);
    if (c) {
      const p = await getPatient(c.patientId);
      setPatient(p ?? null);
    }
  };

  useEffect(() => { reload(); }, [id]);

  const handleMarkReviewed = async () => {
    if (!id || !device) return;
    setIsReviewing(true);
    try {
      const updated = await markReviewed(id, device.displayName);
      setConsultation(updated);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    const updated = await markAwaitingReview(id);
    setConsultation(updated);
  };

  if (consultation === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="card space-y-4">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-4 rounded" />)}
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400">Consultation not found.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">Go back</button>
      </div>
    );
  }

  const Section = ({ title, icon: Icon, children }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Icon className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <div className="bg-surface rounded-xl p-4 border border-surface-border text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(patient ? `/patients/${patient.id}` : '/patients')}
          className="btn-icon btn-ghost mt-0.5"
          aria-label="Back"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="section-title text-xl">{consultation.chiefComplaint}</h2>
          {patient && (
            <Link to={`/patients/${patient.id}`} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5" />
              {patient.firstName} {patient.lastName} · {calcAge(patient.dateOfBirth)} yrs
            </Link>
          )}
          <p className="text-slate-500 text-xs mt-1">{formatDateTime(consultation.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ClinicalBadge status={consultation.clinicalStatus} />
          <SyncBadge status={consultation.syncStatus} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => navigate(`/consultations/${consultation.id}/edit`)}
          className="btn-secondary btn-sm"
        >
          <EditIcon className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          onClick={() => window.print()}
          className="btn-secondary btn-sm"
          title="Print or export clinical record"
        >
          Print Record
        </button>
        {consultation.clinicalStatus === 'draft' && (
          <button onClick={handleSubmitForReview} className="btn-secondary btn-sm">
            <ClockIcon className="w-3.5 h-3.5" /> Submit for review
          </button>
        )}
        {(consultation.clinicalStatus === 'awaiting_review' || consultation.clinicalStatus === 'draft') && (
          <button onClick={handleMarkReviewed} disabled={isReviewing} className="btn-primary btn-sm">
            <CheckIcon className="w-3.5 h-3.5" />
            {isReviewing ? 'Marking…' : 'Mark reviewed'}
          </button>
        )}
      </div>


      {/* Review attribution */}
      {consultation.reviewedBy && (
        <div className="alert-success text-xs">
          <CheckIcon className="w-4 h-4 flex-shrink-0" />
          <p>
            Reviewed by <strong>{consultation.reviewedBy}</strong>{' '}
            {consultation.reviewedAt ? `on ${formatDateTime(consultation.reviewedAt)}` : ''}
          </p>
        </div>
      )}
      {consultation.clinicalStatus === 'amended' && (
        <div className="alert-warning text-xs">
          <p>This record was amended after review. Original reviewed version is preserved in the audit log.</p>
        </div>
      )}

      {/* Content */}
      <div className="card space-y-5">
        <Section title="Chief Complaint" icon={ActivityIcon}>
          {consultation.chiefComplaint}
        </Section>

        {consultation.notes && (
          <Section title="Consultation Notes" icon={ClipboardIcon}>
            {consultation.notes}
          </Section>
        )}

        {consultation.transcript && (
          <Section title="Voice Transcript" icon={ActivityIcon}>
            {consultation.transcript}
          </Section>
        )}

        {consultation.ocrText && (
          <Section title="Scanned Document (OCR)" icon={ClipboardIcon}>
            {consultation.ocrText}
          </Section>
        )}
      </div>

      {/* Metadata */}
      <div className="card-sm text-xs text-slate-500 space-y-1">
        <div className="flex justify-between">
          <span>Created</span>
          <span>{formatDateTime(consultation.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Last updated</span>
          <span>{formatDateTime(consultation.updatedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Local version</span>
          <span>v{consultation.localVersion}</span>
        </div>
        <div className="flex justify-between">
          <span>Server version</span>
          <span>{consultation.serverVersion ?? 'Not synced'}</span>
        </div>
        <div className="flex justify-between">
          <span>Record ID</span>
          <span className="font-mono truncate max-w-[200px]">{consultation.id}</span>
        </div>
      </div>
    </div>
  );
}
