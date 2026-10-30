/**
 * Dexie database schema — Milestone 1 (plaintext storage).
 * M2 will add encryptedData/dataIV fields and migrate existing rows.
 *
 * IMPORTANT: IndexedDB stores only typed arrays for binary data.
 * Clinical data MUST NOT go into localStorage, sessionStorage, or HTTP caches.
 */
import Dexie, { type Table } from 'dexie';
import type {
  Patient,
  Consultation,
  OutboxOperation,
  SyncCursor,
  DeviceState,
  ConflictRecord,
} from '@/types';

export class RuralCareDB extends Dexie {
  patients!:       Table<Patient,           string>;
  consultations!:  Table<Consultation,      string>;
  outbox!:         Table<OutboxOperation,   string>;
  syncCursors!:    Table<SyncCursor,        string>;
  deviceState!:    Table<DeviceState,       string>;
  conflicts!:      Table<ConflictRecord,    string>;

  constructor() {
    super('ruralcare_v1');

    this.version(1).stores({
      // Indexed fields only — non-indexed fields stored but not queried by index
      patients:      '&id, orgId, syncStatus, deletedAt, updatedAt, lastName',
      consultations: '&id, patientId, orgId, clinicalStatus, syncStatus, deletedAt, updatedAt',
      outbox:        '&id, status, entityType, entityId, nextRetryAt, clientCreatedAt',

      syncCursors:   '&id',
      deviceState:   '&id',
      conflicts:     '&id, entityId, entityType, resolvedAt',
    });
  }
}

// Singleton instance — safe to import anywhere
export const db = new RuralCareDB();

// ─── Storage quota utilities ────────────────────────────────────────────────

export interface StorageInfo {
  quota: number | null;
  usage: number | null;
  available: number | null;
  percentUsed: number | null;
  isPersistent: boolean;
}

/** Request persistent storage and return current quota info */
export async function requestPersistentStorage(): Promise<StorageInfo> {
  let isPersistent = false;

  if (navigator.storage?.persist) {
    isPersistent = await navigator.storage.persist();
  }

  return getStorageInfo(isPersistent);
}

export async function getStorageInfo(isPersistent = false): Promise<StorageInfo> {
  if (!navigator.storage?.estimate) {
    return { quota: null, usage: null, available: null, percentUsed: null, isPersistent };
  }
  const estimate = await navigator.storage.estimate();
  const quota = estimate.quota ?? null;
  const usage = estimate.usage ?? null;
  const available = quota !== null && usage !== null ? quota - usage : null;
  const percentUsed = quota && usage ? Math.round((usage / quota) * 100) : null;
  return { quota, usage, available, percentUsed, isPersistent };
}

/** Warn threshold: 85% full */
export const STORAGE_WARN_PERCENT = 85;
