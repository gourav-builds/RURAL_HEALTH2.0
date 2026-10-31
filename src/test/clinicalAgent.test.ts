import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db';
import { createPatient } from '@/db/patients';
import { createConsultation } from '@/db/consultations';
import {
  searchPatientsTool,
  getPatientDetailsTool,
  clinicalTriageAuditTool,
  screenHighRiskCohortTool,
  autoDraftConsultationTool,
  reconcileOutboxQueueTool,
  clinicalKnowledgeQueryTool,
  flagConsultationReviewTool,
  runClinicalAgent,
} from '@/utils/clinicalAgent';

describe('Offline Clinical Agentic System', () => {
  beforeEach(async () => {
    await db.patients.clear();
    await db.consultations.clear();
    await db.outbox.clear();
    await db.deviceState.clear();

    await db.deviceState.put({
      id: 'singleton',
      deviceId: 'test-device-01',
      orgId: 'test-org-01',
      userId: 'test-user-01',
      displayName: 'Dr. Test Clinician',
      clinicName: 'Rampur Primary Health Center',
      enrolledAt: new Date().toISOString(),
      syncLockOwner: null,
      syncLockExpiry: null,
    });
  });

  it('searches patients locally via search_patients tool', async () => {
    const p1 = await createPatient({
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfBirth: '1988-04-12',
      sex: 'male',
      address: 'Rampur North Ward',
      knownConditions: 'Hypertension',
    });

    await createPatient({
      firstName: 'Sunita',
      lastName: 'Devi',
      dateOfBirth: '1995-07-20',
      sex: 'female',
      address: 'Kalyanpur',
      knownConditions: 'Gravida 2 Para 1 (Pregnant 28 weeks)',
    });

    const res = await searchPatientsTool.execute({ query: 'Aarav' }) as Array<{ name: string; id: string }>;
    expect(res.length).toBe(1);
    expect(res[0].name).toBe('Aarav Sharma');
    expect(res[0].id).toBe(p1.id);
  });

  it('retrieves patient details and consultation history via get_patient_details tool', async () => {
    const p = await createPatient({
      firstName: 'Meera',
      lastName: 'Patel',
      dateOfBirth: '1992-03-15',
      sex: 'female',
      address: 'Shivpur',
      knownConditions: 'Asthma',
    });

    await createConsultation({
      patientId: p.id,
      chiefComplaint: 'Mild wheezing and nighttime cough',
      notes: 'Prescribed Salbutamol inhaler 2 puffs PRN.',
    });

    const res = await getPatientDetailsTool.execute({ patientId: p.id }) as {
      found: boolean;
      patient: { name: string; conditions: string };
      consultationCount: number;
    };

    expect(res.found).toBe(true);
    expect(res.patient.name).toBe('Meera Patel');
    expect(res.consultationCount).toBe(1);
  });

  it('audits clinical consultations for acute red flags via clinical_triage_audit tool', async () => {
    const p = await createPatient({
      firstName: 'Rajesh',
      lastName: 'Kumar',
      dateOfBirth: '1965-02-10',
      sex: 'male',
    });

    // Emergency consultation
    await createConsultation({
      patientId: p.id,
      chiefComplaint: 'Crushing retrosternal chest pain radiating to left arm with diaphoresis',
      notes: 'Severe chest pain started 2 hours ago. Pale and sweating. BP 160/100.',
    });

    // Routine consultation
    await createConsultation({
      patientId: p.id,
      chiefComplaint: 'Mild seasonal sneezing',
      notes: 'Allergic rhinitis. Reassured.',
    });

    const audit = await clinicalTriageAuditTool.execute({ maxRecords: 10 }) as {
      totalAudited: number;
      emergencyCount: number;
      flaggedItems: Array<{ priority: string; redFlags: string[] }>;
    };

    expect(audit.totalAudited).toBe(2);
    expect(audit.emergencyCount).toBeGreaterThanOrEqual(1);
    const emergency = audit.flaggedItems.find(f => f.priority === 'EMERGENCY_RED');
    expect(emergency).toBeDefined();
    expect(emergency?.redFlags[0]).toContain('Acute Coronary Syndrome');
  });

  it('screens high-risk maternal cohort via screen_high_risk_cohort tool', async () => {
    await createPatient({
      firstName: 'Pooja',
      lastName: 'Kumari',
      dateOfBirth: '1998-05-10',
      sex: 'female',
      address: 'Rampur',
      knownConditions: 'Pregnant 32 weeks, ANC high risk',
    });

    const res = await screenHighRiskCohortTool.execute({ cohortType: 'maternal_risk' }) as {
      identifiedCount: number;
      candidates: Array<{ patientName: string; cohort: string }>;
    };

    expect(res.identifiedCount).toBeGreaterThanOrEqual(1);
    expect(res.candidates[0].patientName).toBe('Pooja Kumari');
    expect(res.candidates[0].cohort).toBe('Maternal Care');
  });

  it('autonomously drafts consultation and outbox entry via auto_draft_consultation tool', async () => {
    const p = await createPatient({
      firstName: 'Vikram',
      lastName: 'Singh',
      dateOfBirth: '1975-11-04',
      sex: 'male',
    });

    const initialOutboxCount = await db.outbox.count();

    const draft = await autoDraftConsultationTool.execute({
      patientId: p.id,
      chiefComplaint: 'Agent Scheduled Follow-up: Hypertension review',
      notes: 'Blood pressure check scheduled by autonomous agent.',
      clinicalStatus: 'draft',
    }) as { success: boolean; consultationId: string };

    expect(draft.success).toBe(true);
    expect(draft.consultationId).toBeDefined();

    const stored = await db.consultations.get(draft.consultationId);
    expect(stored).toBeDefined();
    expect(stored?.chiefComplaint).toBe('Agent Scheduled Follow-up: Hypertension review');

    // Outbox must have increased by 1 (atomic write)
    const newOutboxCount = await db.outbox.count();
    expect(newOutboxCount).toBe(initialOutboxCount + 1);
  });

  it('verifies SHA-256 payload integrity via reconcile_outbox_queue tool', async () => {
    await createPatient({
      firstName: 'Kavita',
      lastName: 'Verma',
      dateOfBirth: '1985-01-01',
      sex: 'female',
    });

    const report = await reconcileOutboxQueueTool.execute({ verifyHashes: true }) as {
      totalOutboxOperations: number;
      hashIntegrity: string;
      readyForImmediateSync: boolean;
    };

    expect(report.totalOutboxOperations).toBeGreaterThan(0);
    expect(report.hashIntegrity).toBe('VERIFIED_CLEAN');
    expect(report.readyForImmediateSync).toBe(true);
  });

  it('queries WHO/ICMR clinical guidelines via clinical_knowledge_query tool', async () => {
    const res = await clinicalKnowledgeQueryTool.execute({ query: 'High fever and chills in malaria area' }) as {
      matchedTopic: string;
      recommendations: string[];
      redFlags: string[];
    };

    expect(res.matchedTopic).toBe('Acute Febrile Illness Management in Rural Settings');
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(res.redFlags.length).toBeGreaterThan(0);
  });

  it('executes full autonomous ReAct agent loop for Emergency Triage Audit', async () => {
    const p = await createPatient({
      firstName: 'Amitabh',
      lastName: 'Roy',
      dateOfBirth: '1960-09-12',
      sex: 'male',
    });

    await createConsultation({
      patientId: p.id,
      chiefComplaint: 'Sudden onset chest pain with breathlessness',
      notes: 'Crushing substernal pain radiating to jaw and back. Diaphoretic.',
    });

    const result = await runClinicalAgent('Audit unreviewed consultations and triage emergencies', {
      playbookId: 'triage_audit',
    });

    expect(result.success).toBe(true);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.finalAnswer).toContain('Autonomous Clinical Triage Audit Complete');
    expect(result.actionsTaken.length).toBeGreaterThanOrEqual(1);
    expect(result.actionsTaken[0].type).toBe('triage_flagged');

    // Confirm that the consultation was marked awaiting_review
    const updatedConsult = await db.consultations.toArray();
    expect(updatedConsult[0].clinicalStatus).toBe('awaiting_review');
  });

  it('executes natural language task to draft follow-up for a patient', async () => {
    const p = await createPatient({
      firstName: 'Deepak',
      lastName: 'Joshi',
      dateOfBirth: '1980-06-25',
      sex: 'male',
      knownConditions: 'Type 2 Diabetes',
    });

    const result = await runClinicalAgent('Draft follow-up note for Deepak Joshi');

    expect(result.success).toBe(true);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.finalAnswer).toContain('Consultation Draft Created Successfully');
    expect(result.finalAnswer).toContain('Deepak Joshi');
    expect(result.actionsTaken.length).toBe(1);
    expect(result.actionsTaken[0].type).toBe('consultation_created');
    const createdConsult = await db.consultations.get(result.actionsTaken[0].entityId!);
    expect(createdConsult?.patientId).toBe(p.id);
  });

  it('marks consultation awaiting review via flag_consultation_review tool', async () => {
    const p = await createPatient({
      firstName: 'Alok',
      lastName: 'Nath',
      dateOfBirth: '1970-01-01',
      sex: 'male',
    });
    const c = await createConsultation({
      patientId: p.id,
      chiefComplaint: 'Severe headache and blurred vision',
      notes: 'BP 180/110. Immediate referral advised.',
    });
    const flagged = await flagConsultationReviewTool.execute({
      consultationId: c.id,
      reason: 'Hypertensive emergency detected',
    }) as { success: boolean; newStatus: string };

    expect(flagged.success).toBe(true);
    expect(flagged.newStatus).toBe('awaiting_review');
  });

  it('executes outbox sync reconciliation playbook', async () => {
    const result = await runClinicalAgent('Verify offline queue integrity and sync readiness', {
      playbookId: 'sync_integrity_check',
    });

    expect(result.success).toBe(true);
    expect(result.finalAnswer).toContain('Offline Queue & Data Integrity Report');
    expect(result.steps[0].toolName).toBe('reconcile_outbox_queue');
    expect(result.actionsTaken.length).toBe(1);
  });
});
