import { PresentationSeedCard } from '@/components/PresentationSeedCard';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/context/DeviceContext';
import { formatBytes, formatDateTime } from '@/utils';
import { db } from '@/db';
import {
  SettingsIcon, DatabaseIcon, ShieldIcon, AlertIcon,
  TrashIcon, LogOutIcon,
} from '@/components/Icons';


export function SettingsScreen() {
  const { device, storageInfo, refreshStorageInfo, clearDevice } = useDevice();
  const navigate = useNavigate();
  const [clearing, setClearing]   = useState(false);
  const [clearError, setClearError] = useState('');
  const [showDanger, setShowDanger] = useState(false);

  const handleClearData = async () => {
    if (!window.confirm('This will delete all local patient data on this device. This cannot be undone. Continue?')) return;
    setClearing(true);
    setClearError('');
    try {
      await db.patients.clear();
      await db.consultations.clear();
      await db.outbox.clear();
      await db.conflicts.clear();
      await refreshStorageInfo();
    } catch {
      setClearError('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const handleResetDevice = async () => {
    if (!window.confirm('This will remove all local data AND device provisioning. You will need to set up again. Continue?')) return;
    await db.delete();
    await clearDevice();
    navigate('/setup', { replace: true });
  };

  const Row = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-surface-border last:border-0">
      <span className="text-slate-600 text-sm">{label}</span>
      <span className={`text-ink text-sm ${mono ? 'font-sans text-xs' : ''}`}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in settings-page">
      <header className="page-heading"><div><p className="eyebrow">MAKE ROOM FOR BETTER CARE</p><h1>Workspace settings<span className="greeting-dot">.</span></h1><p>Your clinic, your device, your preferences.</p></div></header>

      {/* Device info */}
      <div className="card space-y-1">
        <h3 className="font-semibold text-ink text-sm flex items-center gap-2 mb-3">
          <ShieldIcon className="w-4 h-4 text-brand-700" /> Device
        </h3>
        {device ? (
          <>
            <Row label="Name"          value={device.displayName} />
            <Row label="Device ID"     value={device.deviceId}   mono />
            <Row label="Organisation"  value={device.orgId}      mono />
            <Row label="Enrolled"      value={formatDateTime(device.enrolledAt)} />
          </>
        ) : (
          <p className="text-slate-500 text-sm">Not provisioned</p>
        )}
      </div>

      {/* Storage */}
      <div className="card space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ink text-sm flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4 text-brand-700" /> Storage
          </h3>
          <button onClick={refreshStorageInfo} className="btn-ghost btn-sm text-xs">Refresh</button>
        </div>

        {storageInfo ? (
          <>
            <Row label="Persistent storage" value={storageInfo.isPersistent ? '✓ Yes' : '⚠ No'} />
            <Row label="Quota"     value={storageInfo.quota    !== null ? formatBytes(storageInfo.quota)    : 'Unknown'} />
            <Row label="Used"      value={storageInfo.usage    !== null ? formatBytes(storageInfo.usage)    : 'Unknown'} />
            <Row label="Available" value={storageInfo.available !== null ? formatBytes(storageInfo.available) : 'Unknown'} />

            {/* Usage bar */}
            {storageInfo.percentUsed !== null && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Storage used</span>
                  <span>{storageInfo.percentUsed}%</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      storageInfo.percentUsed >= 85 ? 'bg-red-500' :
                      storageInfo.percentUsed >= 60 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${storageInfo.percentUsed}%` }}
                    role="progressbar"
                    aria-valuenow={storageInfo.percentUsed}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Storage: ${storageInfo.percentUsed}% used`}
                  />
                </div>
              </div>
            )}

            {!storageInfo.isPersistent && (
              <div className="alert-warning mt-2 text-xs">
                <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <p>Storage is not persistent. Allow it in browser site settings to protect patient data.</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-sm">Loading storage info…</p>
        )}
      </div>

      {/* Feature status */}
      <div className="card space-y-2">
        <h3 className="font-semibold text-ink text-sm flex items-center gap-2 mb-3">
          <SettingsIcon className="w-4 h-4 text-brand-700" /> Feature Status
        </h3>
        {[
          { feature: 'Offline patient records',     status: 'Active',     m: 1 },
          { feature: 'Consultation editor',          status: 'Active',     m: 1 },
          { feature: 'Outbox / sync queue',          status: 'Active',     m: 1 },
          { feature: 'End-to-end encryption',        status: 'Milestone 2', m: 2 },
          { feature: 'Server sync (push/pull)',       status: 'Milestone 3', m: 3 },
          { feature: 'Conflict resolution',          status: 'Milestone 3', m: 3 },
          { feature: 'Voice transcription',          status: 'Milestone 4', m: 4 },
          { feature: 'Document OCR',                 status: 'Milestone 4', m: 4 },
          { feature: 'AI structured extraction',     status: 'Milestone 5', m: 5 },
          { feature: 'History search',               status: 'Milestone 6', m: 6 },
        ].map(({ feature, status, m }) => (
          <div key={feature} className="flex justify-between py-1.5 border-b border-surface-border last:border-0">
            <span className="text-slate-600 text-sm">{feature}</span>
            <span className={`text-xs font-medium ${m === 1 ? 'text-green-700' : 'text-slate-500'}`}>{status}</span>
          </div>
        ))}
      </div>

      <PresentationSeedCard/>
      {/* Danger zone */}
      <div className="card border-red-200/50">
        <button
          onClick={() => setShowDanger(d => !d)}
          className="flex items-center gap-2 text-red-700 font-semibold text-sm w-full text-left"
        >
          <AlertIcon className="w-4 h-4" />
          Danger zone {showDanger ? '▲' : '▼'}
        </button>
        {showDanger && (
          <div className="mt-4 space-y-3">
            <div className="alert-error text-xs">
              <AlertIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <p>These actions are irreversible. Unsynced patient data will be permanently lost.</p>
            </div>
            {clearError && <p className="text-red-700 text-xs">{clearError}</p>}
            <button
              onClick={handleClearData}
              disabled={clearing}
              className="btn-danger btn-sm w-full"
            >
              <TrashIcon className="w-4 h-4" />
              {clearing ? 'Clearing…' : 'Clear all local patient data'}
            </button>
            <button
              onClick={handleResetDevice}
              className="btn-danger btn-sm w-full opacity-80 hover:opacity-100"
            >
              <LogOutIcon className="w-4 h-4" />
              Reset device &amp; re-run setup
            </button>
          </div>
        )}
      </div>

      {/* M2–M6 placeholders */}
      <div className="card-sm border-dashed border-surface-border bg-surface text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">Coming in future milestones:</p>
        <p>🔐 Device PIN lock &amp; biometric unlock (M2)</p>
        <p>🌐 Language packs &amp; model downloads (M4)</p>
        <p>🤖 AI model management &amp; storage (M5)</p>
        <p>🔑 Key rotation &amp; recovery (M2)</p>
      </div>
    </div>
  );
}
