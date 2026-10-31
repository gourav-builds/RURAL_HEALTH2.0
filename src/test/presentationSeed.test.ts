import { beforeEach,describe,it,expect } from 'vitest';
import { db } from '@/db';
import { seedPresentationClinic } from '@/data/presentationSeed';

beforeEach(async()=>{await db.delete();await db.open();await db.deviceState.put({id:'singleton',deviceId:'test-device',orgId:'presentation-test',userId:'test-clinician',displayName:'Clinician',enrolledAt:new Date().toISOString(),syncLockOwner:null,syncLockExpiry:null});});
describe('presentation seed safety',()=>{
 it('creates the requested linked clinic and is idempotent',async()=>{
  expect(await seedPresentationClinic()).toBe('loaded');
  const patients=await db.patients.toArray(),visits=await db.consultations.toArray(),queue=await db.outbox.toArray();
  expect(patients).toHaveLength(12);expect(visits).toHaveLength(15);expect(queue).toHaveLength(6);
  expect(new Set(visits.map(c=>c.clinicalStatus)).size).toBe(4);
  expect(visits.every(c=>patients.some(p=>p.id===c.patientId))).toBe(true);
  expect(queue.every(op=>op.status==='pending'&&visits.some(c=>c.id===op.entityId))).toBe(true);
  expect(await seedPresentationClinic()).toBe('ready');expect(await db.patients.count()).toBe(12);
 });
 it('does not replace an occupied workspace',async()=>{
  await seedPresentationClinic();const first=await db.patients.get('RC-2026-0001');
  await db.patients.delete('RC-2026-0001');await db.patients.add({...first!,id:'existing-patient',firstName:'Existing'});
  const before=await db.patients.toArray();expect(await seedPresentationClinic()).toBe('occupied');expect(await db.patients.toArray()).toEqual(before);expect(await db.consultations.count()).toBe(15);
 });
 it('rolls back the entire seed if an ID collides with another organization',async()=>{
  await seedPresentationClinic();await db.deviceState.update('singleton',{orgId:'another-clinic'});
  await expect(seedPresentationClinic()).rejects.toBeDefined();expect(await db.patients.count()).toBe(12);expect(await db.patients.where('orgId').equals('another-clinic').count()).toBe(0);
 });
});
