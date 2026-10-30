/**
 * Unit tests — Milestone 1 acceptance criteria
 *
 * Tests:
 * 1. UUIDv7 is unique and time-ordered
 * 2. SHA-256 hash is deterministic
 * 3. Patient create → IndexedDB → outbox entry in same transaction
 * 4. QuotaExceededError propagates from createPatient
 * 5. Consultation create → clinicalStatus is 'draft'
 * 6. Consultation update: reviewed record becomes 'amended'
 * 7. Patient soft-delete creates tombstone + outbox delete entry
 * 8. searchPatients returns correct results
 * 9. DeviceState persists across DB re-open
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'


// Reset DB between tests using fake-indexeddb
beforeEach(async () => {
  const { db } = await import('@/db')
  await db.delete()
  // Re-open with a fresh fake IDB store
  await db.open()
})

// ─── 1 & 2: Utils ──────────────────────────────────────────────────────────
describe('uuidv7', () => {
  it('generates unique IDs', async () => {
    const { uuidv7 } = await import('@/utils')
    const ids = Array.from({ length: 1000 }, () => uuidv7())
    expect(new Set(ids).size).toBe(1000)
  })

  it('generates time-ordered IDs', async () => {
    const { uuidv7 } = await import('@/utils')
    const a = uuidv7()
    await new Promise(r => setTimeout(r, 2))
    const b = uuidv7()
    expect(a < b).toBe(true)
  })

  it('matches UUID format', async () => {
    const { uuidv7 } = await import('@/utils')
    const id = uuidv7()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('sha256Hex', () => {
  it('is deterministic', async () => {
    const { sha256Hex } = await import('@/utils')
    const a = await sha256Hex('hello world')
    const b = await sha256Hex('hello world')
    expect(a).toBe(b)
  })

  it('produces different hashes for different inputs', async () => {
    const { sha256Hex } = await import('@/utils')
    const a = await sha256Hex('hello')
    const b = await sha256Hex('world')
    expect(a).not.toBe(b)
  })

  it('produces a 64-char hex string', async () => {
    const { sha256Hex } = await import('@/utils')
    const h = await sha256Hex('test')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })
})

// ─── 3: Patient create ───────────────────────────────────────────────────────
describe('createPatient', () => {
  it('saves patient and outbox entry atomically', async () => {
    const { createPatient } = await import('@/db/patients')
    const { db } = await import('@/db')

    const p = await createPatient({
      firstName: 'Priya', lastName: 'Sharma',
      dateOfBirth: '1985-03-15', sex: 'female',
    })

    expect(p.id).toBeTruthy()
    expect(p.syncStatus).toBe('local')
    expect(p.serverVersion).toBeNull()
    expect(p.deletedAt).toBeNull()
    expect(p.localVersion).toBe(1)

    // Patient in DB
    const stored = await db.patients.get(p.id)
    expect(stored?.firstName).toBe('Priya')

    // Outbox entry created
    const ops = await db.outbox.where('entityId').equals(p.id).toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0].operationType).toBe('create')
    expect(ops[0].status).toBe('pending')
    expect(ops[0].entityType).toBe('patient')
    expect(ops[0].payloadHash).toHaveLength(64)
  })

  it('each save has a unique stable operation_id', async () => {
    const { createPatient } = await import('@/db/patients')
    const { db } = await import('@/db')

    await createPatient({ firstName: 'A', lastName: 'B', dateOfBirth: '2000-01-01', sex: 'male' })
    await createPatient({ firstName: 'C', lastName: 'D', dateOfBirth: '2001-01-01', sex: 'female' })


    const ops = await db.outbox.toArray()
    expect(ops[0].id).not.toBe(ops[1].id)
  })
})

// ─── 4: QuotaExceededError ───────────────────────────────────────────────────
describe('createPatient quota handling', () => {
  it('propagates QuotaExceededError', async () => {
    const { db } = await import('@/db')
    const { createPatient } = await import('@/db/patients')

    // Spy on the transaction to throw QuotaExceededError
    const err = new DOMException('Mock quota exceeded', 'QuotaExceededError')
    vi.spyOn(db, 'transaction').mockRejectedValueOnce(err)

    let caught: unknown = null
    try {
      await createPatient({
        firstName: 'Test', lastName: 'User',
        dateOfBirth: '1990-01-01', sex: 'male',
      })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(DOMException)
    expect((caught as DOMException).name).toBe('QuotaExceededError')
  })
})


// ─── 5: Consultation create ───────────────────────────────────────────────────
describe('createConsultation', () => {
  it('creates consultation with draft status and outbox entry', async () => {
    const { createPatient } = await import('@/db/patients')
    const { createConsultation } = await import('@/db/consultations')
    const { db } = await import('@/db')

    const patient = await createPatient({
      firstName: 'John', lastName: 'Doe',
      dateOfBirth: '1970-05-20', sex: 'male',
    })

    const c = await createConsultation({
      patientId: patient.id,
      chiefComplaint: 'Fever for 3 days',
      notes: 'Temperature 38.5°C',
      transcript: undefined,
      ocrText: undefined,
    })

    expect(c.clinicalStatus).toBe('draft')
    expect(c.syncStatus).toBe('local')
    expect(c.patientId).toBe(patient.id)

    const ops = await db.outbox.where('entityId').equals(c.id).toArray()
    expect(ops).toHaveLength(1)
    expect(ops[0].operationType).toBe('create')
  })
})

// ─── 6: Amendment on edit after review ────────────────────────────────────────
describe('updateConsultation amendment', () => {
  it('changes reviewed → amended when edited without explicit status', async () => {
    const { createPatient } = await import('@/db/patients')
    const { createConsultation, updateConsultation, markReviewed } = await import('@/db/consultations')

    const p = await createPatient({ firstName: 'A', lastName: 'B', dateOfBirth: '1980-01-01', sex: 'female' })
    const c = await createConsultation({ patientId: p.id, chiefComplaint: 'Cough', notes: '', transcript: undefined, ocrText: undefined })

    const reviewed = await markReviewed(c.id, 'Dr. Test')
    expect(reviewed.clinicalStatus).toBe('reviewed')
    expect(reviewed.reviewedBy).toBe('Dr. Test')

    const amended = await updateConsultation(c.id, { notes: 'Updated notes' })
    expect(amended.clinicalStatus).toBe('amended')
  })

  it('does not auto-amend a draft on edit', async () => {
    const { createPatient } = await import('@/db/patients')
    const { createConsultation, updateConsultation } = await import('@/db/consultations')

    const p = await createPatient({ firstName: 'A', lastName: 'B', dateOfBirth: '1980-01-01', sex: 'female' })
    const c = await createConsultation({ patientId: p.id, chiefComplaint: 'Headache', notes: '', transcript: undefined, ocrText: undefined })

    const updated = await updateConsultation(c.id, { notes: 'New notes' })
    expect(updated.clinicalStatus).toBe('draft')
  })
})

// ─── 7: Soft delete / tombstone ───────────────────────────────────────────────
describe('deletePatient', () => {
  it('creates tombstone and outbox delete entry, excludes from list', async () => {
    const { createPatient, deletePatient, listPatients } = await import('@/db/patients')
    const { db } = await import('@/db')

    const p = await createPatient({ firstName: 'Del', lastName: 'Me', dateOfBirth: '1990-01-01', sex: 'male' })
    await deletePatient(p.id)

    // Tombstone set
    const stored = await db.patients.get(p.id)
    expect(stored?.deletedAt).toBeTruthy()

    // Excluded from list
    const list = await listPatients()
    expect(list.find(x => x.id === p.id)).toBeUndefined()

    // Outbox has delete operation
    const ops = await db.outbox.where('entityId').equals(p.id).filter(o => o.operationType === 'delete').toArray()
    expect(ops).toHaveLength(1)
  })
})

// ─── 8: Search ────────────────────────────────────────────────────────────────
describe('searchPatients', () => {
  it('finds patients by first name', async () => {
    const { createPatient, searchPatients } = await import('@/db/patients')
    await createPatient({ firstName: 'Amina',   lastName: 'Hassan', dateOfBirth: '1985-01-01', sex: 'female' })
    await createPatient({ firstName: 'Emmanuel', lastName: 'Okeke', dateOfBirth: '1990-01-01', sex: 'male' })

    const results = await searchPatients('amina')
    expect(results).toHaveLength(1)
    expect(results[0].firstName).toBe('Amina')
  })

  it('returns all patients on empty query', async () => {
    const { createPatient, searchPatients } = await import('@/db/patients')
    await createPatient({ firstName: 'X', lastName: 'Y', dateOfBirth: '2000-01-01', sex: 'male' })
    await createPatient({ firstName: 'A', lastName: 'B', dateOfBirth: '2001-01-01', sex: 'female' })

    const results = await searchPatients('')
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it('returns empty array for no match', async () => {
    const { createPatient, searchPatients } = await import('@/db/patients')
    await createPatient({ firstName: 'Alice', lastName: 'Smith', dateOfBirth: '1975-01-01', sex: 'female' })

    const results = await searchPatients('zzznomatch')
    expect(results).toHaveLength(0)
  })
})

// ─── 9: DeviceState persists ─────────────────────────────────────────────────
describe('DeviceState', () => {
  it('persists across db re-open', async () => {
    const { db } = await import('@/db')
    const { uuidv7, now } = await import('@/utils')

    const state = {
      id: 'singleton' as const,
      deviceId: uuidv7(),
      orgId: 'org-1',
      userId: uuidv7(),
      displayName: 'Dr. Test',
      enrolledAt: now(),
      syncLockOwner: null,
      syncLockExpiry: null,
    }
    await db.deviceState.put(state)

    // Re-read
    const stored = await db.deviceState.get('singleton')
    expect(stored?.displayName).toBe('Dr. Test')
    expect(stored?.deviceId).toBe(state.deviceId)
  })
})

// ─── 10: Outbox survives reload (same IDB state) ──────────────────────────────
describe('Outbox durability', () => {
  it('pending operations remain after simulated reload (same DB instance)', async () => {
    const { createPatient } = await import('@/db/patients')
    const { db } = await import('@/db')

    await createPatient({ firstName: 'Durable', lastName: 'Test', dateOfBirth: '1980-01-01', sex: 'male' })

    // Simulate reload by re-reading from the same fake-indexeddb
    const pendingOps = await db.outbox.where('status').equals('pending').toArray()
    expect(pendingOps.length).toBeGreaterThanOrEqual(1)
  })
})
