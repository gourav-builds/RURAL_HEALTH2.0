import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db';
import { useSync } from '@/context/SyncContext';
import { formatDateTime } from '@/utils';
import type { OutboxOperation } from '@/types';
import { ThreeSyncTopology } from '@/components/three/ThreeSyncTopology';
import { useToast } from '@/context/ToastContext';
import {
  RefreshIcon, AlertIcon, CheckIcon, XIcon,
  ClockIcon, WifiOffIcon, ActivityIcon,
} from '@/components/Icons';




function OpRow({ op }: { op: OutboxOperation }) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'Pending',  cls: 'badge-pending' },
    sending:  { label: 'Sending',  cls: 'badge-pending' },
    conflict: { label: 'Conflict', cls: 'badge-conflict' },
    error:    { label: 'Failed',   cls: 'badge-conflict' },
    done:     { label: 'Done',     cls: 'badge-synced' },
  };
  const s = statusMap[op.status] ?? { label: op.status, cls: 'badge-draft' };

  return (
    <div className="card-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={s.cls}>{s.label}</span>
            <span className="badge-draft capitalize">{op.operationType}</span>
            <span className="badge-draft">{op.entityType}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono truncate">{op.entityId}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">{formatDateTime(op.clientCreatedAt)}</p>
          {op.retryCount > 0 && (
            <p className="text-xs text-amber-500">Retry #{op.retryCount}</p>
          )}
        </div>
      </div>
      {op.lastError && (
        <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-1.5">
          {op.lastError}
        </p>
      )}
      {op.status === 'conflict' && (
        <Link
          to={`/conflicts/${op.id}`}
          className="btn-danger btn-sm inline-flex"
        >
          <AlertIcon className="w-3.5 h-3.5" /> Resolve conflict
        </Link>
      )}
    </div>
  );
}

export function SyncCenterScreen() {
  const { isOnline, isSyncing, triggerSync, lastSyncAt } = useSync();
  const { addToast } = useToast();

  const handleManualSync = async () => {
    addToast({
      type: 'info',
      title: 'Initiating Full Telemetry Sync',
      message: 'Processing offline queue through cryptographic pipeline…',
    });
    try {
      await triggerSync();
      addToast({
        type: 'success',
        title: 'Sync Batch Complete',
        message: 'Local operations reconciled with remote ledger.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Sync Interrupted',
        message: 'Could not connect to remote endpoint. Changes preserved safely offline.',
      });
    }
  };

  const allOps = useLiveQuery(
    () => db.outbox.orderBy('clientCreatedAt').reverse().limit(100).toArray(),
    [], []
  );

  const pending   = allOps?.filter(o => o.status === 'pending' || o.status === 'sending') ?? [];
  const failed    = allOps?.filter(o => o.status === 'error') ?? [];
  const conflicts = allOps?.filter(o => o.status === 'conflict') ?? [];
  const done      = allOps?.filter(o => o.status === 'done').slice(0, 10) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="section-title text-xl">Sync Center</h2>
          <p className="section-subtitle">
            {lastSyncAt ? `Last synced: ${formatDateTime(lastSyncAt)}` : 'Never synced'}
          </p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className="btn-primary"
          aria-label="Trigger synchronisation"
        >
          <RefreshIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin-slow' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {/* 3D Distributed Mesh Topology */}
      <ThreeSyncTopology isOnline={isOnline} isSyncing={isSyncing} operations={allOps ?? []} />

      {/* Status overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {[
          { label: 'Pending',   count: pending.length,   icon: ClockIcon,    cls: 'text-violet-400', bg: 'bg-violet-900/30' },
          { label: 'Conflicts', count: conflicts.length, icon: AlertIcon,    cls: 'text-red-400',    bg: 'bg-red-900/30' },
          { label: 'Failed',    count: failed.length,    icon: XIcon,        cls: 'text-amber-400',  bg: 'bg-amber-900/30' },
          { label: 'Done',      count: done.length,      icon: CheckIcon,    cls: 'text-green-400',  bg: 'bg-green-900/30' },
        ].map(({ label, count, icon: Icon, cls, bg }) => (
          <div key={label} className="card-sm flex items-center gap-3">
            <div className={`${bg} rounded-lg p-2 flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${cls}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="alert-warning">
          <WifiOffIcon className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">No internet connection</p>
            <p className="text-xs mt-0.5 text-amber-400/80">
              Changes are saved on this device. Sync will resume automatically when connectivity returns.
            </p>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <section aria-labelledby="conflicts-heading">
          <h3 id="conflicts-heading" className="section-title mb-3 flex items-center gap-2 text-red-400">
            <AlertIcon className="w-4 h-4" /> Conflicts requiring resolution
          </h3>
          <div className="space-y-2">
            {conflicts.map(op => <OpRow key={op.id} op={op} />)}
          </div>
        </section>
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <section aria-labelledby="failed-heading">
          <h3 id="failed-heading" className="section-title mb-3 flex items-center gap-2 text-amber-400">
            <XIcon className="w-4 h-4" /> Failed operations
          </h3>
          <div className="space-y-2">
            {failed.map(op => <OpRow key={op.id} op={op} />)}
          </div>
        </section>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section aria-labelledby="pending-heading">
          <h3 id="pending-heading" className="section-title mb-3 flex items-center gap-2 text-violet-400">
            <ClockIcon className="w-4 h-4" /> Pending ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map(op => <OpRow key={op.id} op={op} />)}
          </div>
        </section>
      )}

      {/* Done / recent */}
      {done.length > 0 && (
        <section aria-labelledby="done-heading">
          <h3 id="done-heading" className="section-title mb-3 flex items-center gap-2 text-green-400">
            <CheckIcon className="w-4 h-4" /> Recently synced
          </h3>
          <div className="space-y-2">
            {done.map(op => <OpRow key={op.id} op={op} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!allOps || allOps.length === 0) && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><ActivityIcon className="w-6 h-6" /></div>
            <p className="text-slate-300 font-medium">Nothing to sync</p>
            <p className="text-slate-500 text-sm">All changes are synchronized</p>
          </div>
        </div>
      )}

      {/* M3 note */}
      <div className="card-sm border-dashed border-surface-border bg-surface text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-400">Sync engine status (Milestone 1)</p>
        <p>✅ Outbox — operations recorded on every save</p>
        <p>✅ Live queue — real-time operation counts</p>
        <p>⏳ Server push/pull — wired in Milestone 3</p>
        <p>⏳ Conflict detection — wired in Milestone 3</p>
        <p>⏳ Exponential retry — wired in Milestone 3</p>
      </div>
    </div>
  );
}
