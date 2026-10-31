import { db } from '@/db';
import { sha256Hex } from '@/utils';
import type { Patient, Consultation, OutboxOperation } from '@/types';

const people = [
  ['Aarav','Sharma','1984-03-14','male','Hypertension','O+'],
  ['Meera','Patel','1992-07-21','female','Prenatal care','B+'],
  ['Ravi','Deshmukh','1968-01-10','male','Type 2 diabetes','A+'],
  ['Ananya','Rao','2001-11-03','female','Atopic dermatitis','AB+'],
  ['Vikram','Singh','1975-09-18','male','Hypertension','B-'],
  ['Kavita','Joshi','1988-04-29','female','Iron deficiency','O+'],
  ['Arjun','Nair','2012-06-08','male','Seasonal asthma','A-'],
  ['Fatima','Khan','1996-12-16','female','Migraine','B+'],
  ['Suresh','Iyer','1957-02-24','male','Osteoarthritis','O-'],
  ['Pooja','Verma','1990-08-11','female','Thyroid follow-up','A+'],
  ['Rahul','Kulkarni','1982-10-05','male','Respiratory infection','AB+'],
  ['Lakshmi','Menon','1971-05-30','female','Type 2 diabetes','B+'],
] as const;
const complaints = ['BP follow-up','Prenatal visit · 24 weeks','Diabetic foot check','Skin rash on forearms','Headache and elevated blood pressure','Fatigue and dizziness','Wheezing and seasonal cough','Recurring migraine','Knee pain on walking','Thyroid medication follow-up','Fever and cough','Blood glucose review','BP follow-up · medication review','Prenatal nutrition review','Foot care follow-up'];
const states = ['draft','awaiting_review','reviewed','amended'] as const;
function timestamp(days: number, hour = 9) {
  const date = new Date(); date.setDate(date.getDate()-days); date.setHours(hour,20,0,0); return date.toISOString();
}
export async function seedPresentationClinic(force = false): Promise<'loaded'|'occupied'|'ready'> {
  const device = await db.deviceState.get('singleton');
  if (!device) throw new Error('Set up the clinic before loading presentation records.');
  const existing = await db.patients.where('orgId').equals(device.orgId).toArray();
  if (!force && existing.some(p => p.id === 'RC-2026-0001')) return 'ready';
  // The older UI-review workspace contains only records authored for that review.
  const replaceReviewFixture = device.orgId === 'ui-qa-synthetic' && existing.every(p => p.address === 'SYNTHETIC UI TEST RECORD');
  const existingVisits = await db.consultations.where('orgId').equals(device.orgId).toArray();
  if (!force && (existing.length || existingVisits.length) && !replaceReviewFixture) return 'occupied';
  if (!force && replaceReviewFixture && !existingVisits.every(c => c.notes.startsWith('Synthetic'))) return 'occupied';
  const patients: Patient[] = people.map(([firstName,lastName,dateOfBirth,sex,knownConditions,bloodGroup],i) => ({
    id:`RC-2026-${String(i+1).padStart(4,'0')}`,orgId:device.orgId,firstName,lastName,dateOfBirth,sex,knownConditions,bloodGroup,
    address:['Kothrud, Pune','Wakad, Pune','Baner, Pune','Hadapsar, Pune','Shivajinagar, Pune'][i%5],
    phone:`+91 98${(20000000 + i * 13749).toString().slice(0, 8)}`,
    nationalId:`IN-AAD-${(1000 + i * 23).toString().padStart(4, '0')}-${(5000 + i * 17).toString().padStart(4, '0')}`,
    knownAllergies:i===2?'Penicillin':i===6?'Dust and pollen':i===9?'Sulfa drugs':'None reported',
    localVersion:1,serverVersion:i<6?null:1,syncStatus:i<6?'local':'synced',deletedAt:null,createdAt:timestamp(30+i),updatedAt:timestamp(i%7,9+i%6),
  }));
  const consultations: Consultation[] = complaints.map((chiefComplaint,i) => ({
    id:`RC-VISIT-2026-${String(i+1).padStart(4,'0')}`,patientId:patients[i%12].id,orgId:device.orgId,chiefComplaint,
    notes:`Clinician: Dr. Kavya Deshmukh\nHistory: ${patients[i%12].knownConditions}.\nBP: ${i%3===0?'138/86':'118/76'} mmHg | HR: ${72+i%8} bpm | SpO2: 98% | Temperature: ${i===10?'38.2':'36.7'} °C\nAssessment: ${chiefComplaint}.\nPlan: Clinical review and follow-up in one week.`,
    clinicalStatus:states[i%4],...(i%4>1?{reviewedBy:'Dr. Kavya Deshmukh',reviewedAt:timestamp(i%7,10+i%5)}:{}),
    localVersion:i%4===3?2:1,serverVersion:i<6?null:1,syncStatus:i<6?'local':'synced',deletedAt:null,createdAt:timestamp(i%7,9+i%6),updatedAt:timestamp(i%7,9+i%6),
  }));
  const outbox: OutboxOperation[] = await Promise.all(consultations.slice(0,6).map(async(c,i) => {
    const payload=JSON.stringify(c);return {id:`RC-QUEUE-2026-${i+1}`,orgId:device.orgId,deviceId:device.deviceId,entityId:c.id,entityType:'consultation' as const,operationType:i%2?'update' as const:'create' as const,baseVersion:0,schemaVersion:1,payload,payloadHash:await sha256Hex(payload),clientCreatedAt:c.updatedAt,status:'pending' as const,retryCount:0,nextRetryAt:null,lastError:null,dependsOn:null};
  }));
  return db.transaction('rw',[db.patients,db.consultations,db.outbox],async()=>{
    if (!force) {
      const current=await db.patients.where('orgId').equals(device.orgId).toArray();
      if(current.some(p=>p.id==='RC-2026-0001'))return 'ready' as const;
      const currentVisits=await db.consultations.where('orgId').equals(device.orgId).toArray();
      if(JSON.stringify(current)!==JSON.stringify(existing)||JSON.stringify(currentVisits)!==JSON.stringify(existingVisits)) return 'occupied' as const;
    }
    if(replaceReviewFixture || force){
      await db.patients.where('orgId').equals(device.orgId).delete();
      await db.consultations.where('orgId').equals(device.orgId).delete();
      await db.outbox.filter(op=>op.orgId===device.orgId).delete();
    }
    await db.patients.bulkAdd(patients);await db.consultations.bulkAdd(consultations);await db.outbox.bulkAdd(outbox);
    return 'loaded' as const;
  });
}


