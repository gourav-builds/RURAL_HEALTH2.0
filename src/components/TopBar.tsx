import { useLocation } from 'react-router-dom';

import { useSync } from '@/context/SyncContext';
import { WifiIcon, WifiOffIcon, RefreshIcon } from '@/components/Icons';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/patients':      'Patients',
  '/consultations': 'Consultations',
  '/sync':          'Sync Center',
  '/settings':      'Settings',
};

export function TopBar() {
  const { isOnline, isSyncing, pendingCount, conflictCount } = useSync();
  const { pathname } = useLocation();

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'RuralCare';

  return (
    <header className="sticky top-0 z-30 h-14 bg-surface-card/80 backdrop-blur border-b border-surface-border flex items-center px-6 gap-4">
      <h1 className="text-base font-semibold text-white flex-1">{title}</h1>

      {/* Conflict alert */}
      {conflictCount > 0 && (
        <span className="badge-conflict">
          {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
        </span>
      )}

      {/* Sync spinner */}
      {isSyncing && (
        <RefreshIcon className="w-4 h-4 text-brand-400 animate-spin-slow" aria-label="Syncing" />
      )}

      {/* Pending */}
      {!isSyncing && pendingCount > 0 && (
        <span className="badge-pending">{pendingCount} pending</span>
      )}

      {/* Online status */}
      <div className="flex items-center gap-1.5 text-xs" aria-live="polite" aria-atomic="true">
        {isOnline ? (
          <WifiIcon className="w-4 h-4 text-green-400" aria-hidden />
        ) : (
          <WifiOffIcon className="w-4 h-4 text-amber-400" aria-hidden />
        )}
        <span className={isOnline ? 'text-green-400' : 'text-amber-400 font-medium'}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
