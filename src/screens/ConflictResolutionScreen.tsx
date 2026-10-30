import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeftIcon, AlertIcon } from '@/components/Icons';

export function ConflictResolutionScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sync')} className="btn-icon btn-ghost" aria-label="Back to sync">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="section-title text-xl">Conflict Resolution</h2>
          <p className="text-slate-500 text-xs font-mono mt-0.5">{id}</p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="alert-warning">
          <AlertIcon className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">Conflict resolution — Milestone 3</p>
            <p className="text-sm mt-1 text-amber-400/80">
              The full three-panel diff viewer (base / local / remote), merge editor,
              and resolution submission will be implemented in Milestone 3 alongside the
              full synchronization engine.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['Base version', 'Your changes', 'Remote changes'].map((panel) => (
            <div key={panel} className="bg-surface border border-dashed border-surface-border rounded-xl p-4 text-center text-xs text-slate-500">
              <p className="font-medium text-slate-400 mb-2">{panel}</p>
              <p>Will show decrypted content here in M3</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button disabled className="btn-secondary flex-1 opacity-40 cursor-not-allowed">
            Keep mine
          </button>
          <button disabled className="btn-secondary flex-1 opacity-40 cursor-not-allowed">
            Keep remote
          </button>
          <button disabled className="btn-primary flex-1 opacity-40 cursor-not-allowed">
            Submit merged
          </button>
        </div>
      </div>
    </div>
  );
}
