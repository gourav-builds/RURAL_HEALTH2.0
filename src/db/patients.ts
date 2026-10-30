/**
 * Patient repository — all database operations for patients.
 * Every write atomically creates an outbox entry in the same transaction.
 *
 * M1: plaintext. M2: encrypt payload before writing outbox entry.
 */
import { db } from '@/db';
import type { Patient, PatientListItem } from '@/types';
import { uuidv7, sha256Hex, now } from '@/utils';

const SCHEMA_VERSION = 1;
const ORG_ID_PLACEHOLDER = 'local-org';   // replaced at M2 enrollment
const DEVICE_ID_PLACEHOLDER = 'local-device';

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createPatient(
  data: Omit<Patient, 'id' | 'orgId' | 'localVersion' | 'serverVersion' |
                       'syncStatus' | 'deletedAt' | 'createdAt' | 'updatedAt'>
): Promise<Patient> {
  const deviceState = await db.deviceState.get('singleton');
  const orgId   = deviceState?.orgId   ?? ORG_ID_PLACEHOLDER;
  const deviceId = deviceState?.deviceId ?? DEVICE_ID_PLACEHOLDER;

  const patient: Patient = {
    id: uuidv7(),
    orgId,
    ...data,
    localVersion: 1,
    serverVersion: null,
    syncStatus: 'local',
    deletedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };

  const payloadJson = JSON.stringify(patient);
  const payloadHash = await sha256Hex(payloadJson);

  await db.transaction('rw', [db.patients, db.outbox], async () => {
    await db.patients.add(patient);
    await db.outbox.add({
      id: uuidv7(),
      orgId,
      deviceId,
      entityId: patient.id,
      entityType: 'patient',
      operationType: 'create',
      baseVersion: 0,
      schemaVersion: SCHEMA_VERSION,
      payload: payloadJson,
      payloadHash,
      clientCreatedAt: patient.createdAt,
      status: 'pending',
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      dependsOn: null,
    });
  });

  return patient;
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updatePatient(
  id: string,
  changes: Partial<Omit<Patient, 'id' | 'orgId' | 'createdAt'>>
): Promise<Patient> {
  const existing = await db.patients.get(id);
  if (!existing) throw new Error(`Patient ${id} not found`);
  if (existing.deletedAt) throw new Error(`Patient ${id} is deleted`);

  const deviceState = await db.deviceState.get('singleton');
  const orgId   = deviceState?.orgId   ?? ORG_ID_PLACEHOLDER;
  const deviceId = deviceState?.deviceId ?? DEVICE_ID_PLACEHOLDER;

  const updated: Patient = {
    ...existing,
    ...changes,
    localVersion: existing.localVersion + 1,
    syncStatus: existing.syncStatus === 'synced' ? 'local' : existing.syncStatus,
    updatedAt: now(),
  };

  const payloadJson = JSON.stringify(updated);
  const payloadHash = await sha256Hex(payloadJson);

  await db.transaction('rw', [db.patients, db.outbox], async () => {
    await db.patients.put(updated);
    await db.outbox.add({
      id: uuidv7(),
      orgId,
      deviceId,
      entityId: id,
      entityType: 'patient',
      operationType: 'update',
      baseVersion: existing.serverVersion ?? 0,
      schemaVersion: SCHEMA_VERSION,
      payload: payloadJson,
      payloadHash,
      clientCreatedAt: now(),
      status: 'pending',
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      dependsOn: null,
    });
  });

  return updated;
}

// ─── Soft Delete ─────────────────────────────────────────────────────────────

export async function deletePatient(id: string): Promise<void> {
  const existing = await db.patients.get(id);
  if (!existing) throw new Error(`Patient ${id} not found`);

  const deviceState = await db.deviceState.get('singleton');
  const orgId   = deviceState?.orgId   ?? ORG_ID_PLACEHOLDER;
  const deviceId = deviceState?.deviceId ?? DEVICE_ID_PLACEHOLDER;

  const tombstone = now();
  const payloadHash = await sha256Hex(JSON.stringify({ id, deletedAt: tombstone }));

  await db.transaction('rw', [db.patients, db.outbox], async () => {
    await db.patients.update(id, { deletedAt: tombstone, syncStatus: 'local', updatedAt: tombstone });
    await db.outbox.add({
      id: uuidv7(),
      orgId,
      deviceId,
      entityId: id,
      entityType: 'patient',
      operationType: 'delete',
      baseVersion: existing.serverVersion ?? 0,
      schemaVersion: SCHEMA_VERSION,
      payload: JSON.stringify({ id, deletedAt: tombstone }),
      payloadHash,
      clientCreatedAt: tombstone,
      status: 'pending',
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      dependsOn: null,
    });
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getPatient(id: string): Promise<Patient | undefined> {
  return db.patients.get(id);
}

export async function listPatients(orgId?: string): Promise<PatientListItem[]> {
  const state = await db.deviceState.get('singleton');
  const oid = orgId ?? state?.orgId ?? ORG_ID_PLACEHOLDER;

  const patients = await db.patients
    .where('orgId').equals(oid)
    .filter(p => p.deletedAt === null)
    .sortBy('updatedAt');

  // reverse to newest-first
  patients.reverse();

  // Attach consultation counts
  const counts = await Promise.all(
    patients.map(p =>
      db.consultations.where('patientId').equals(p.id).count()
    )
  );

  return patients.map((p, i) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    sex: p.sex,
    syncStatus: p.syncStatus,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    consultationCount: counts[i],
  }));
}

/** Keyword search across name fields (local only) */
export async function searchPatients(query: string, orgId?: string): Promise<PatientListItem[]> {
  if (!query.trim()) return listPatients(orgId);

  const state = await db.deviceState.get('singleton');
  const oid = orgId ?? state?.orgId ?? ORG_ID_PLACEHOLDER;
  const q = query.toLowerCase();

  const patients = await db.patients
    .where('orgId').equals(oid)
    .filter(p => {
      if (p.deletedAt) return false;
      const full = `${p.firstName} ${p.lastName} ${p.nationalId ?? ''}`.toLowerCase();
      return full.includes(q);
    })
    .toArray();

  const counts = await Promise.all(
    patients.map(p => db.consultations.where('patientId').equals(p.id).count())
  );

  return patients.map((p, i) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    sex: p.sex,
    syncStatus: p.syncStatus,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    consultationCount: counts[i],
  }));
}
