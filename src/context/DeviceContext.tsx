/**
 * React Context for device state — auth, org, device identity.
 * M1: minimal mock state. M2: real auth + crypto.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, requestPersistentStorage, type StorageInfo } from '@/db';
import type { DeviceState } from '@/types';
import { uuidv7, now } from '@/utils';

interface DeviceContextValue {
  device: DeviceState | null;
  storageInfo: StorageInfo | null;
  isLoading: boolean;
  isSetupComplete: boolean;
  /** M1: provision device locally without server. M2: replaced by real enrollment */
  provisionDevice: (displayName: string) => Promise<void>;
  clearDevice: () => Promise<void>;
  refreshStorageInfo: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice]           = useState<DeviceState | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  const refreshStorageInfo = useCallback(async () => {
    const info = await requestPersistentStorage();
    setStorageInfo(info);
  }, []);

  useEffect(() => {
    let mounted = true;
    db.deviceState.get('singleton').then(async state => {
      if (!mounted) return;
      setDevice(state ?? null);
      setIsLoading(false);
      await refreshStorageInfo();
    });
    return () => { mounted = false; };
  }, [refreshStorageInfo]);

  const provisionDevice = useCallback(async (displayName: string) => {
    const state: DeviceState = {
      id: 'singleton',
      deviceId: uuidv7(),
      orgId: `local-org-${uuidv7()}`,
      userId: uuidv7(),
      displayName,
      enrolledAt: now(),
      syncLockOwner: null,
      syncLockExpiry: null,
    };
    await db.deviceState.put(state);
    setDevice(state);
  }, []);

  const clearDevice = useCallback(async () => {
    await db.deviceState.clear();
    setDevice(null);
  }, []);

  const value: DeviceContextValue = {
    device,
    storageInfo,
    isLoading,
    isSetupComplete: device !== null,
    provisionDevice,
    clearDevice,
    refreshStorageInfo,
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used inside <DeviceProvider>');
  return ctx;
}
