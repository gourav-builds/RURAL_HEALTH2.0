import { useState } from 'react';
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
    async () => {
      const items = await db.outbox.toArray();
      return items.sort((a, b) => b.clientCreatedAt.localeCompare(a.clientCreatedAt)).slice(0, 100);
    },
    [], []
  );


  const pending   = allOps?.filter(o => o.status === 'pending' || o.status === 'sending') ?? [];
  const failed    = allOps?.filter(o => o.status === 'error') ?? [];
  const conflicts = allOps?.filter(o => o.status === 'conflict') ?? [];
  const done      = allOps?.filter(o => o.status === 'done').slice(0, 10) ?? [];

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'conflicts' | 'done'>('all');

  const displayedOps = allOps?.filter(op => {
    if (activeTab === 'pending') return op.status === 'pending' || op.status === 'sending';
    if (activeTab === 'conflicts') return op.status === 'conflict';
    if (activeTab === 'done') return op.status === 'done';
    return true;
  }) ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title text-2xl font-extrabold tracking-tight">Sync Center & 3D Topology</h2>
          <p className="section-subtitle mt-0.5">
            {lastSyncAt ? `Telemetry verified: ${formatDateTime(lastSyncAt)}` : 'Offline station ledger active'}
          </p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className="btn-primary shadow-lg shadow-sky-900/30"
          aria-label="Trigger synchronisation"
        >
          <RefreshIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin-slow' : ''}`} />
          {isSyncing ? 'Reconciling…' : 'Sync Telemetry'}
        </button>
      </div>

      {/* 3D Distributed Mesh Topology */}
      <ThreeSyncTopology isOnline={isOnline} isSyncing={isSyncing} operations={allOps ?? []} />

      {/* Status overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'pending',   label: 'Pending',   count: pending.length,   icon: ClockIcon,    cls: 'text-violet-400', bg: 'bg-violet-900/30' },
          { id: 'conflicts', label: 'Conflicts', count: conflicts.length, icon: AlertIcon,    cls: 'text-red-400',    bg: 'bg-red-900/30' },
          { id: 'failed',    label: 'Failed',    count: failed.length,    icon: XIcon,        cls: 'text-amber-400',  bg: 'bg-amber-900/30' },
          { id: 'done',      label: 'Synced',    count: done.length,      icon: CheckIcon,    cls: 'text-emerald-400',bg: 'bg-emerald-900/30' },
        ].map(({ label, count, icon: Icon, cls, bg }) => (
          <div key={label} className="card-sm flex items-center gap-3 border-surface-borderLight">
            <div className={`${bg} rounded-xl p-2.5 flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${cls}`} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-white font-mono">{count}</p>
              <p className="text-xs text-slate-400 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="alert-warning">
          <WifiOffIcon className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-300">Autonomous Field Operation (Offline)</p>
            <p className="text-xs mt-0.5 text-amber-400/90 leading-relaxed">
              All clinical records are encrypted and preserved in local IndexedDB. Sync will automatically resume when network connectivity is established.
            </p>
          </div>
        </div>
      )}

      {/* Outbox Queue Section with Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-3 flex-wrap gap-2">
          <h3 className="section-title text-lg flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-cyan-400" />
            Outbox Queue Ledger ({allOps?.length ?? 0})
          </h3>
          <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-surface-border text-xs">
            {(['all', 'pending', 'conflicts', 'done'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {displayedOps.length === 0 ? (
          <div className="card text-center py-10">
            <div className="empty-state">
              <div className="empty-icon"><ActivityIcon className="w-6 h-6" /></div>
              <p className="text-slate-300 font-medium">No operations in this view</p>
              <p className="text-slate-500 text-xs">All records are up to date.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedOps.map(op => <OpRow key={op.id} op={op} />)}
          </div>
        )}
      </div>


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
