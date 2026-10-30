import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftIcon, AlertIcon, CheckIcon,
} from '@/components/Icons';


export function ConflictResolutionScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merged'>('merged');
  const [mergedNotes, setMergedNotes] = useState(
    "Patient presented with acute dry cough (onset 48h). Prescribed Amoxicillin 500mg TDS x 5 days. [Remote addition]: Advised chest X-ray if symptoms persist past day 3."
  );

  const localData = {
    chiefComplaint: "Acute dry cough and low-grade pyrexia",
    notes: "Patient presented with acute dry cough (onset 48h). Lungs clear on auscultation. Prescribed Amoxicillin 500mg TDS x 5 days.",
    updatedAt: "Today at 09:15 AM (Local Device Node)",
    clinician: "Dr. Sarah Connor (Field Clinician)",
  };

  const remoteData = {
    chiefComplaint: "Acute respiratory symptoms (fever + cough)",
    notes: "Patient presented with cough and fatigue. Advised chest X-ray if symptoms persist past day 3. Paracetamol PRN.",
    updatedAt: "Today at 09:45 AM (Regional General Hospital)",
    clinician: "Dr. James Vance (Regional Supervisor)",
  };

  const handleResolve = () => {
    addToast({
      type: 'success',
      title: 'Conflict Reconciled',
      message: `Resolved conflict using "${selectedResolution.toUpperCase()}" strategy. Outbox marked done.`,
    });
    navigate('/sync');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sync')} className="btn-icon btn-ghost" aria-label="Back to sync">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="section-title text-2xl font-extrabold tracking-tight">3-Way Clinical Conflict Reconciliation</h2>
          <p className="text-slate-400 text-xs font-mono mt-0.5">
            Operation ID: {id ?? '7f8a92b1-09cd-7ef1-89ab-0123456789ab'}
          </p>
        </div>
      </div>

      {/* Explainer banner */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
        <AlertIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-200 text-sm">Concurrent Edit Detected</p>
          <p className="text-xs text-amber-300/90 mt-0.5 leading-relaxed">
            This record was modified on this station while disconnected, and concurrently modified at the regional hospital.
            Compare the field version against the central server revision and choose which medical records to preserve.
          </p>
        </div>
      </div>

      {/* 3-Panel Side-by-Side Diff */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Panel 1: Local Device Version */}
        <div className={`card space-y-3 transition-all ${selectedResolution === 'local' ? 'border-cyan-500 ring-2 ring-cyan-500/30' : ''}`}>
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Local Device Node (Your Changes)
              </span>
              <p className="text-[11px] text-slate-400">{localData.updatedAt}</p>
            </div>
            <button
              onClick={() => setSelectedResolution('local')}
              className={`btn-sm ${selectedResolution === 'local' ? 'btn-primary' : 'btn-secondary'}`}
            >
              {selectedResolution === 'local' ? 'Selected' : 'Choose Local'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Chief Complaint:</span>
              <p className="text-white font-semibold mt-0.5">{localData.chiefComplaint}</p>
            </div>
            <div className="divider" />
            <div>
              <span className="text-slate-400 block font-medium">Clinical Notes & Assessment:</span>
              <p className="text-slate-300 leading-relaxed mt-0.5 bg-surface p-3 rounded-xl border border-surface-border font-sans">
                {localData.notes}
              </p>
            </div>
            <p className="text-[10px] font-mono text-slate-500">Author: {localData.clinician}</p>
          </div>
        </div>

        {/* Panel 2: Remote Central Version */}
        <div className={`card space-y-3 transition-all ${selectedResolution === 'remote' ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}`}>
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Remote Central Server (Gateway Version)
              </span>
              <p className="text-[11px] text-slate-400">{remoteData.updatedAt}</p>
            </div>
            <button
              onClick={() => setSelectedResolution('remote')}
              className={`btn-sm ${selectedResolution === 'remote' ? 'btn-primary' : 'btn-secondary'}`}
            >
              {selectedResolution === 'remote' ? 'Selected' : 'Choose Remote'}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Chief Complaint:</span>
              <p className="text-white font-semibold mt-0.5">{remoteData.chiefComplaint}</p>
            </div>
            <div className="divider" />
            <div>
              <span className="text-slate-400 block font-medium">Clinical Notes & Assessment:</span>
              <p className="text-slate-300 leading-relaxed mt-0.5 bg-surface p-3 rounded-xl border border-surface-border font-sans">
                {remoteData.notes}
              </p>
            </div>
            <p className="text-[10px] font-mono text-slate-500">Author: {remoteData.clinician}</p>
          </div>
        </div>
      </div>

      {/* Panel 3: Merged Resolution Editor */}
      <div className={`card space-y-4 transition-all ${selectedResolution === 'merged' ? 'border-violet-500 ring-2 ring-violet-500/30' : ''}`}>
        <div className="flex items-center justify-between pb-2 border-b border-surface-border">
          <div>
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider">
              Merged Clinical Record (Recommended)
            </span>
            <p className="text-[11px] text-slate-400">Combines field observations with regional supervisor recommendations</p>
          </div>
          <button
            onClick={() => setSelectedResolution('merged')}
            className={`btn-sm ${selectedResolution === 'merged' ? 'btn-primary' : 'btn-secondary'}`}
          >
            {selectedResolution === 'merged' ? 'Selected' : 'Edit Merged'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="label text-xs font-medium text-slate-300">
            Resolved Clinical Notes (Editable):
          </label>
          <textarea
            className="textarea min-h-[120px] text-sm text-slate-200"
            value={mergedNotes}
            onChange={e => {
              setMergedNotes(e.target.value);
              setSelectedResolution('merged');
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <span className="text-xs text-slate-400 font-mono">
            Strategy: <strong className="text-white uppercase">{selectedResolution}</strong>
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sync')} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleResolve} className="btn-primary shadow-lg shadow-sky-900/30">
              <CheckIcon className="w-4 h-4" /> Commit Resolution & Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
