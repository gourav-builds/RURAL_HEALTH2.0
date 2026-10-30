/**
 * Sync context — tracks outbox counts, conflict counts, online status.
 * M1: read-only metrics. M3: real sync engine wired here.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface SyncContextValue {
  isOnline: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
  /** M3: will perform real sync. M1: stub. */
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline]   = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Live query — reacts to outbox changes
  const pendingCount = useLiveQuery(
    () => db.outbox.where('status').anyOf(['pending', 'sending', 'error']).count(),
    [], 0
  );
  const conflictCount = useLiveQuery(
    () => db.outbox.where('status').equals('conflict').count(),
    [], 0
  );

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const triggerSync = useCallback(() => {
    // M3: real sync engine call
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncAt(new Date().toISOString());
    }, 1500);
  }, []);

  const value: SyncContextValue = {
    isOnline,
    pendingCount:   pendingCount  ?? 0,
    conflictCount:  conflictCount ?? 0,
    lastSyncAt,
    isSyncing,
    triggerSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
