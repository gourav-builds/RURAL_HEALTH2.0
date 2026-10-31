import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getPatient } from '@/db/patients';
import { db } from '@/db';
import { formatDate, formatDateTime, calcAge } from '@/utils';
import { SyncBadge, ClinicalBadge } from '@/components/StatusBadges';
import { useToast } from '@/context/ToastContext';
import type { Patient } from '@/types';
import {
  ArrowLeftIcon, PlusIcon, EditIcon, ClipboardIcon,
  ChevronRightIcon, ActivityIcon, AlertIcon,
} from '@/components/Icons';


export function PatientProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
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

  const copyPatientId = () => {
    if (patient?.id) {
      navigator.clipboard.writeText(patient.id);
      addToast({
        type: 'success',
        title: 'Patient ID Copied',
        message: `${patient.id} copied to clipboard.`,
        duration: 2500,
      });
    }
  };

  if (patient === undefined) {
    return (
      <div className="space-y-4 animate-pulse max-w-5xl">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (patient === null) {
    return (
      <div className="card text-center py-16 max-w-xl mx-auto">
        <p className="text-slate-700 font-semibold text-lg">Patient record not found</p>
        <p className="text-slate-500 text-sm mt-1">This record may have been deleted or purged from local cache.</p>
        <button onClick={() => navigate('/patients')} className="btn-secondary mt-4">
          Return to Patient Directory
        </button>
      </div>
    );
  }

  return (
    <div className="clinical-detail-page space-y-6 animate-fade-in max-w-6xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/patients')}
            className="btn-icon btn-ghost"
            aria-label="Back to patients directory"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="section-title text-2xl font-extrabold tracking-tight">
                {patient.firstName} {patient.lastName}
              </h2>
              <SyncBadge status={patient.syncStatus} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-sans">
              <span>MRN:</span>
              <button
                onClick={copyPatientId}
                className="hover:text-cyan-700 transition underline underline-offset-2 flex items-center gap-1"
                title="Click to copy ID"
              >
                {patient.id.slice(0, 12)}…
              </button>
              <span>•</span>
              <span>Updated {formatDateTime(patient.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/patients/${patient.id}/edit`)}
            className="btn-secondary btn-sm"
          >
            <EditIcon className="w-4 h-4" /> Edit Demographics
          </button>
          <button
            onClick={() => navigate(`/consultations/new?patientId=${patient.id}`)}
            className="btn-primary shadow-lg shadow-slate-200/40"
          >
            <PlusIcon className="w-4 h-4" /> Start Consultation
          </button>
        </div>
      </div>

      {/* Allergies Critical Alert if present */}
      {patient.knownAllergies && (
        <div className="p-4 rounded-2xl bg-red-50/40 border border-red-500/40 flex items-start gap-3 shadow-lg shadow-red-950/20">
          <AlertIcon className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-700 uppercase tracking-wider">Critical Known Allergies</h4>
            <p className="text-sm text-red-700 font-medium mt-0.5">{patient.knownAllergies}</p>
          </div>
        </div>
      )}

      {/* Main 2-Column Medical Chart Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Demographics & Clinical Profile */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-100 via-sky-100 to-indigo-100 flex items-center justify-center text-ink font-extrabold text-2xl shadow-xl shadow-slate-200/40 border border-white/10">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{patient.firstName} {patient.lastName}</p>
                <p className="text-xs text-slate-600 font-sans">
                  {calcAge(patient.dateOfBirth)} yrs • {patient.sex}
                </p>
                {patient.bloodGroup && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-sans font-bold bg-rose-50 border border-rose-600/50 text-rose-700">
                    Blood: {patient.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            <div className="divider" />

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Date of Birth</span>
                <span className="font-sans text-slate-800">{formatDate(patient.dateOfBirth)}</span>
              </div>
              {patient.phone && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Phone Contact</span>
                  <span className="font-sans text-cyan-700">{patient.phone}</span>
                </div>
              )}
              {patient.nationalId && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">National ID</span>
                  <span className="font-sans text-slate-800">{patient.nationalId}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Residential Address</span>
                  <span className="text-slate-800 text-right max-w-[180px]">{patient.address}</span>
                </div>
              )}
              {patient.knownConditions && (
                <div className="pt-2 border-t border-surface-border">
                  <span className="text-slate-600 block mb-1">Pre-existing Conditions:</span>
                  <span className="text-amber-700 bg-amber-50/60 border border-amber-200/60 px-2 py-1 rounded inline-block">
                    {patient.knownConditions}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Consultation Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title text-lg flex items-center gap-2">
                <ClipboardIcon className="w-5 h-5 text-cyan-700" />
                Clinical Consultations ({consultations?.length ?? 0})
              </h3>
              <p className="text-xs text-slate-600">Chronological consultation record on this device</p>
            </div>
          </div>

          {!consultations || consultations.length === 0 ? (
            <div className="card text-center py-12">
              <div className="empty-state">
                <div className="empty-icon"><ClipboardIcon className="w-7 h-7" /></div>
                <p className="text-slate-800 font-semibold text-base">No consultation records yet</p>
                <p className="text-slate-600 text-sm max-w-md">
                  Capture clinical notes, vital signs, and 3D anatomical symptom coordinates.
                </p>
                <button
                  onClick={() => navigate(`/consultations/new?patientId=${patient.id}`)}
                  className="btn-primary mt-2"
                >
                  <PlusIcon className="w-4 h-4" /> Start Initial Consultation
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map(c => (
                <Link
                  key={c.id}
                  to={`/consultations/${c.id}`}
                  className="card-sm flex items-start gap-4 hover:border-cyan-500/40 hover:bg-surface-hover transition-all group block"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface border border-surface-border flex items-center justify-center flex-shrink-0 text-cyan-700 group-hover:scale-105 transition-transform mt-0.5">
                    <ActivityIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-ink text-base group-hover:text-cyan-700 transition-colors truncate">
                        {c.chiefComplaint}
                      </p>
                      <span className="text-xs font-sans text-slate-600 flex-shrink-0">
                        {formatDateTime(c.createdAt)}
                      </span>
                    </div>

                    {c.notes && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {c.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <ClinicalBadge status={c.clinicalStatus} />
                      <SyncBadge status={c.syncStatus} />
                      {c.reviewedBy && (
                        <span className="text-xs font-sans text-slate-600">
                          Reviewed by {c.reviewedBy}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-cyan-700 flex-shrink-0 mt-2" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
