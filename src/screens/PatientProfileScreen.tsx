import { useEffect, useState } from 'react';

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getPatient } from '@/db/patients';
import { db } from '@/db';
import { formatDate, formatDateTime, calcAge } from '@/utils';
import { SyncBadge, ClinicalBadge } from '@/components/StatusBadges';
import type { Patient } from '@/types';
import {
  ArrowLeftIcon, PlusIcon, EditIcon, ClipboardIcon,
  ChevronRightIcon, UserIcon, ActivityIcon,
} from '@/components/Icons';

export function PatientProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined | null>(undefined);

  useEffect(() => {
    if (!id) return;
    getPatient(id).then(p => setPatient(p ?? null));
  }, [id]);

  const consultations = useLiveQuery(
    () => id ? db.consultations
      .where('patientId').equals(id)
      .filter(c => !c.deletedAt)
      .reverse()
      .sortBy('createdAt') : [],
    [id], []
  );

  if (patient === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="card space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-4 w-full rounded" />)}
        </div>
      </div>
    );
  }

  if (patient === null) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400">Patient not found or not available on this device.</p>
        <button onClick={() => navigate('/patients')} className="btn-secondary mt-4">Back to patients</button>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div className="flex gap-2">
        <span className="text-slate-400 text-sm w-36 flex-shrink-0">{label}</span>
        <span className="text-white text-sm">{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back + actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/patients')} className="btn-icon btn-ghost" aria-label="Back to patients">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="section-title text-xl">{patient.firstName} {patient.lastName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <SyncBadge status={patient.syncStatus} />
            <span className="text-slate-500 text-xs">Updated {formatDateTime(patient.updatedAt)}</span>
          </div>
        </div>
        <button
          onClick={() => navigate(`/patients/${patient.id}/edit`)}
          className="btn-secondary btn-sm"
          aria-label="Edit patient"
        >
          <EditIcon className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Patient details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar + key info */}
          <div className="card flex flex-col items-center text-center gap-3 py-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-sky-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <p className="font-bold text-white text-lg">{patient.firstName} {patient.lastName}</p>
              <p className="text-slate-400 text-sm">
                {calcAge(patient.dateOfBirth)} years · {patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}
              </p>
            </div>
            <button
              onClick={() => navigate(`/consultations/new?patientId=${patient.id}`)}
              className="btn-primary w-full"
            >
              <PlusIcon className="w-4 h-4" /> New consultation
            </button>
          </div>

          {/* Details */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-brand-400" /> Details
            </h3>
            <div className="space-y-2.5 divider pt-2">
              <InfoRow label="Date of birth"   value={formatDate(patient.dateOfBirth)} />
              <InfoRow label="Blood group"     value={patient.bloodGroup} />
              <InfoRow label="Phone"           value={patient.phone} />
              <InfoRow label="National ID"     value={patient.nationalId} />
              <InfoRow label="Address"         value={patient.address} />
            </div>
            {(patient.knownAllergies || patient.knownConditions) && (
              <div className="space-y-2.5 divider pt-2">
                <InfoRow label="Allergies"       value={patient.knownAllergies} />
                <InfoRow label="Known conditions" value={patient.knownConditions} />
              </div>
            )}
          </div>
        </div>

        {/* Consultations list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title flex items-center gap-2">
              <ClipboardIcon className="w-4 h-4 text-brand-400" />
              Consultations ({consultations?.length ?? 0})
            </h3>
            <button
              onClick={() => navigate(`/consultations/new?patientId=${patient.id}`)}
              className="btn-primary btn-sm"
            >
              <PlusIcon className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {!consultations || consultations.length === 0 ? (
            <div className="card">
              <div className="empty-state py-10">
                <div className="empty-icon"><ClipboardIcon className="w-6 h-6" /></div>
                <p className="text-slate-400 text-sm font-medium">No consultations yet</p>
                <button
                  onClick={() => navigate(`/consultations/new?patientId=${patient.id}`)}
                  className="btn-primary btn-sm mt-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Start first consultation
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {consultations.map(c => (
                <Link
                  key={c.id}
                  to={`/consultations/${c.id}`}
                  className="card-sm flex items-start gap-4 hover:bg-surface-hover transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface border border-surface-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ActivityIcon className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{c.chiefComplaint}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(c.createdAt)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <ClinicalBadge status={c.clinicalStatus} />
                      <SyncBadge status={c.syncStatus} />
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
