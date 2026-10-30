/**
 * Consultation repository — atomic save with outbox entry.
 */
import { db } from '@/db';
import type { Consultation, ConsultationListItem } from '@/types';
import { uuidv7, sha256Hex, now } from '@/utils';

const SCHEMA_VERSION = 1;

async function getContext() {
  const s = await db.deviceState.get('singleton');
  return {
    orgId:    s?.orgId    ?? 'local-org',
    deviceId: s?.deviceId ?? 'local-device',
  };
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createConsultation(
  data: Pick<Consultation, 'patientId' | 'chiefComplaint' | 'notes' | 'transcript' | 'ocrText'>
): Promise<Consultation> {
  const { orgId, deviceId } = await getContext();

  const consultation: Consultation = {
    id: uuidv7(),
    orgId,
    patientId: data.patientId,
    chiefComplaint: data.chiefComplaint,
    notes: data.notes,
    transcript: data.transcript,
    ocrText: data.ocrText,
    clinicalStatus: 'draft',
    localVersion: 1,
    serverVersion: null,
    syncStatus: 'local',
    deletedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };

  const payloadJson = JSON.stringify(consultation);
  const payloadHash = await sha256Hex(payloadJson);

  await db.transaction('rw', [db.consultations, db.outbox], async () => {
    await db.consultations.add(consultation);
    await db.outbox.add({
      id: uuidv7(),
      orgId,
      deviceId,
      entityId: consultation.id,
      entityType: 'consultation',
      operationType: 'create',
      baseVersion: 0,
      schemaVersion: SCHEMA_VERSION,
      payload: payloadJson,
      payloadHash,
      clientCreatedAt: consultation.createdAt,
      status: 'pending',
      retryCount: 0,
      nextRetryAt: null,
      lastError: null,
      dependsOn: null,
    });
  });

  return consultation;
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateConsultation(
  id: string,
  changes: Partial<Omit<Consultation, 'id' | 'patientId' | 'orgId' | 'createdAt'>>
): Promise<Consultation> {
  const existing = await db.consultations.get(id);
  if (!existing) throw new Error(`Consultation ${id} not found`);
  if (existing.deletedAt) throw new Error(`Consultation ${id} is deleted`);

  const { orgId, deviceId } = await getContext();

  // Enforce: reviewed records become 'amended' on edit, not silently changed
  let clinicalStatus = changes.clinicalStatus ?? existing.clinicalStatus;
  if (existing.clinicalStatus === 'reviewed' && !changes.clinicalStatus) {
    clinicalStatus = 'amended';
  }

  const updated: Consultation = {
    ...existing,
    ...changes,
    clinicalStatus,
    localVersion: existing.localVersion + 1,
    syncStatus: existing.syncStatus === 'synced' ? 'local' : existing.syncStatus,
    updatedAt: now(),
  };

  const payloadJson = JSON.stringify(updated);
  const payloadHash = await sha256Hex(payloadJson);

  await db.transaction('rw', [db.consultations, db.outbox], async () => {
    await db.consultations.put(updated);
    await db.outbox.add({
      id: uuidv7(),
      orgId,
      deviceId,
      entityId: id,
      entityType: 'consultation',
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

// ─── Clinical status transitions ─────────────────────────────────────────────

export async function markAwaitingReview(id: string): Promise<Consultation> {
  return updateConsultation(id, { clinicalStatus: 'awaiting_review' });
}

export async function markReviewed(id: string, reviewerName: string): Promise<Consultation> {
  return updateConsultation(id, {
    clinicalStatus: 'reviewed',
    reviewedBy: reviewerName,
    reviewedAt: now(),
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getConsultation(id: string): Promise<Consultation | undefined> {
  return db.consultations.get(id);
}

export async function listConsultations(patientId: string): Promise<ConsultationListItem[]> {
  const rows = await db.consultations
    .where('patientId').equals(patientId)
    .filter(c => c.deletedAt === null)
    .sortBy('createdAt');

  rows.reverse(); // newest first

  return rows.map(c => ({
    id: c.id,
    patientId: c.patientId,
    chiefComplaint: c.chiefComplaint,
    clinicalStatus: c.clinicalStatus,
    syncStatus: c.syncStatus,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/** Search consultation notes/transcripts for a patient */
export async function searchConsultations(
  patientId: string,
  query: string
): Promise<ConsultationListItem[]> {
  const q = query.toLowerCase();
  const rows = await db.consultations
    .where('patientId').equals(patientId)
    .filter(c => {
      if (c.deletedAt) return false;
      const haystack = `${c.chiefComplaint} ${c.notes} ${c.transcript ?? ''} ${c.ocrText ?? ''}`.toLowerCase();
      return haystack.includes(q);
    })
    .toArray();

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return rows.map(c => ({
    id: c.id,
    patientId: c.patientId,
    chiefComplaint: c.chiefComplaint,
    clinicalStatus: c.clinicalStatus,
    syncStatus: c.syncStatus,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/** Pending review count for dashboard */
export async function pendingReviewCount(orgId: string): Promise<number> {
  return db.consultations
    .where('orgId').equals(orgId)
    .filter(c => c.clinicalStatus === 'awaiting_review' && !c.deletedAt)
    .count();
}
