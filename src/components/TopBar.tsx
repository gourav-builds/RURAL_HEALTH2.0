import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useSync } from '@/context/SyncContext';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CommandPalette } from '@/components/CommandPalette';
import {
  WifiIcon, WifiOffIcon, RefreshIcon, SearchIcon,
  AlertIcon, LockIcon, ShieldIcon,
} from '@/components/Icons';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Clinical Dashboard',
  '/patients':      'Patient Directory',
  '/consultations': 'Clinical Consultations',
  '/sync':          'Sync Center & Mesh Topology',
  '/settings':      'Station Settings & Storage',
};

export function TopBar() {
  const { isOnline, isSyncing, pendingCount, conflictCount, triggerSync } = useSync();
  const { device } = useDevice();
  const { clinician, lockStation } = useAuth();
  const { addToast } = useToast();
  const { pathname } = useLocation();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-GB', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts: Ctrl+K (search), Ctrl+L (lock station)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockStation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockStation]);

  const handleQuickSync = async () => {
    addToast({
      type: 'info',
      title: 'Manual Sync Initiated',
      message: 'Reconciling local outbox with regional health gateway…',
    });
    await triggerSync();
  };

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'RuralCare';

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-surface-card/90 backdrop-blur-md border-b border-surface-border flex items-center justify-between px-6 gap-4 select-none">
        {/* Left: Title & Station identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight truncate">{title}</h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-brand-950/80 border border-brand-500/30 text-cyan-400">
                NODE-{device?.deviceId ? device.deviceId.slice(0, 6).toUpperCase() : 'EDGE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              {device?.clinicName ?? (device?.orgId ? `Station Org: ${device.orgId.slice(0, 8)}` : 'Rural Health Outpost')} • {device?.displayName ?? 'Field Clinician'}
            </p>
          </div>
        </div>

        {/* Center: Command Palette Trigger Button */}
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-surface border border-surface-border hover:border-brand-500/50 hover:bg-surface-hover text-slate-400 hover:text-white transition-all text-xs w-72 max-w-sm group shadow-inner"
          aria-label="Open command search"
        >
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          <span className="flex-1 text-left truncate text-slate-400 group-hover:text-slate-300">Quick search or command…</span>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-card border border-surface-border text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>

        {/* Right: Telemetry, Clock, Lock Station & Sync trigger */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Clinician Role Badge */}
          {clinician && (
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface border border-surface-border text-xs">
              <ShieldIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-200">{clinician.name}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                {clinician.role}
              </span>
            </div>
          )}

          {/* Clinical Field Clock */}
          <div className="hidden lg:flex flex-col items-end text-right">
            <span className="text-xs font-mono font-semibold text-slate-200">{timeStr}</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Field Time</span>
          </div>

          <div className="h-6 w-px bg-surface-border hidden lg:block" />

          {/* Conflict Alert Link */}
          {conflictCount > 0 && (
            <Link to="/sync" className="badge-conflict hover:bg-red-900 transition flex items-center gap-1.5">
              <AlertIcon className="w-3.5 h-3.5" />
              <span>{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
            </Link>
          )}

          {/* Pending Outbox pill */}
          {pendingCount > 0 && (
            <Link to="/sync" className="badge-pending hover:bg-violet-900 transition">
              {pendingCount} queued
            </Link>
          )}

          {/* Network connectivity pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm transition-all ${
              isOnline
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
            }`}
            aria-live="polite"
          >
            {isOnline ? (
              <WifiIcon className="w-3.5 h-3.5 text-emerald-400 animate-pulse" aria-hidden />
            ) : (
              <WifiOffIcon className="w-3.5 h-3.5 text-amber-400" aria-hidden />
            )}
            <span className="font-mono text-[11px]">{isOnline ? 'Online' : 'Offline Node'}</span>
          </div>

          {/* Quick sync action button */}
          <button
            onClick={handleQuickSync}
            disabled={!isOnline || isSyncing}
            className={`btn-icon btn-sm ${isOnline ? 'btn-secondary text-cyan-400' : 'btn-ghost opacity-40 cursor-not-allowed'}`}
            title={isOnline ? 'Sync telemetry now' : 'Offline — changes stored locally'}
            aria-label="Sync"
          >
            <RefreshIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin-slow text-cyan-400' : ''}`} />
          </button>

          {/* Lock Station Button */}
          <button
            onClick={lockStation}
            className="btn-icon btn-sm btn-secondary text-slate-300 hover:text-cyan-400"
            title="Lock Station (Ctrl+L) — Protects patient session immediately"
            aria-label="Lock Station"
          >
            <LockIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
}
