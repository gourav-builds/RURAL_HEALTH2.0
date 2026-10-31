// ─── Type Definitions for the full RuralCare data model ───────────────────────
// Milestone 1: Patient, Consultation, Outbox (plaintext — encryption added M2)

export type SyncStatus = 'local' | 'synced' | 'conflict';
export type ClinicalStatus = 'draft' | 'awaiting_review' | 'reviewed' | 'amended';
export type OperationType = 'create' | 'update' | 'delete';
export type EntityType = 'patient' | 'consultation' | 'attachment';
export type OutboxStatus = 'pending' | 'sending' | 'conflict' | 'error' | 'done';

export interface Patient {
  /** UUIDv7 — generated offline */
  id: string;
  orgId: string;
  // M1: plaintext. M2: replaced by encryptedData + dataIV
  firstName: string;
  lastName: string;
  dateOfBirth: string;        // ISO date YYYY-MM-DD
  sex: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
  address?: string;
  nationalId?: string;
  bloodGroup?: string;
  knownAllergies?: string;
  knownConditions?: string;
  localVersion: number;
  serverVersion: number | null;
  syncStatus: SyncStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  orgId: string;
  chiefComplaint: string;
  notes: string;
  transcript?: string;
  ocrText?: string;
  clinicalStatus: ClinicalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  localVersion: number;
  serverVersion: number | null;
  syncStatus: SyncStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxOperation {
  /** Stable across retries — set once on creation */
  id: string;
  orgId: string;
  deviceId: string;
  entityId: string;
  entityType: EntityType;
  operationType: OperationType;
  baseVersion: number;
  schemaVersion: number;
  payload: string;            // JSON string of the delta (M2: encrypted)
  payloadHash: string;        // SHA-256 of plaintext payload
  clientCreatedAt: string;
  status: OutboxStatus;
  retryCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  dependsOn: string | null;
}

export interface SyncCursor {
  id: string;                 // entityType as key
  cursor: string | null;
  updatedAt: string;
}

export type ClinicianRole = 'doctor' | 'nurse' | 'health_worker' | 'admin';

export interface ClinicianProfile {
  id: string;
  name: string;
  role: ClinicianRole;
  pinSalt: string;      // Cryptographic salt
  pinHash: string;      // Salted SHA-256 hash of PIN
  clinicName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  clinician: ClinicianProfile;
  authenticatedAt: number;
  expiresAt: number;
  isLocked: boolean;
}

export interface DeviceState {
  id: 'singleton';
  deviceId: string;
  orgId: string;
  userId: string;
  displayName: string;
  enrolledAt: string;
  clinicName?: string;
  role?: ClinicianRole;
  pinSalt?: string;
  pinHash?: string;
  lastLoginAt?: string;
  // Security Recovery fields:
  securityQuestion?: string;
  securityAnswerHash?: string;
  recoveryKeyHash?: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  syncLockOwner: string | null;
  syncLockExpiry: string | null;
}


export interface ConflictRecord {
  id: string;
  operationId: string;
  entityId: string;
  entityType: EntityType;
  localSnapshot: unknown;
  remoteSnapshot: unknown;
  baseSnapshot: unknown;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: 'local' | 'remote' | 'merged' | null;
}

// ─── View Models (UI-facing) ───────────────────────────────────────────────────

export interface PatientListItem extends Pick<Patient,
  'id' | 'firstName' | 'lastName' | 'dateOfBirth' | 'sex' |
  'syncStatus' | 'createdAt' | 'updatedAt'
> {
  consultationCount?: number;
}

export interface ConsultationListItem extends Pick<Consultation,
  'id' | 'patientId' | 'chiefComplaint' | 'clinicalStatus' |
  'syncStatus' | 'createdAt' | 'updatedAt'
> {}
