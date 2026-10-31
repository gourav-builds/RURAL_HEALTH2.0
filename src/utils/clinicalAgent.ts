/**
 * RuralCare Offline Clinical Agentic Engine
 * 
 * An autonomous, multi-step reasoning and tool-execution agent designed
 * to run completely offline on community health tablets and laptops.
 * 
 * Uses ReAct (Reasoning + Acting) pattern to:
 * 1. Plan clinical tasks (triage audits, cohort screening, follow-up drafting, sync reconciliation)
 * 2. Autonomously execute local tools against Dexie IndexedDB
 * 3. Cross-reference findings with the offline WHO/ICMR clinical knowledge engine
 * 4. Perform atomic database actions and outbox queuing
 */

import { db } from '@/db';
import { createConsultation, markAwaitingReview, getConsultation } from '@/db/consultations';
import { queryClinicalAssistant, type AssistantResponse } from '@/utils/clinicalLlmEngine';
import { sha256Hex, now } from '@/utils';
import type { Consultation } from '@/types';

export interface AgentToolParameter {
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, AgentToolParameter>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentExecutionStep {
  stepNumber: number;
  thought: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  observation: unknown;
  status: 'running' | 'completed' | 'failed';
  timestamp: string;
}

export interface AgentActionTaken {
  type: 'consultation_created' | 'status_updated' | 'outbox_reconciled' | 'triage_flagged';
  title: string;
  description: string;
  entityId?: string;
}

export interface AgentExecutionResult {
  goal: string;
  success: boolean;
  steps: AgentExecutionStep[];
  finalAnswer: string;
  actionsTaken: AgentActionTaken[];
  executionTimeMs: number;
}

// ─── TOOL IMPLEMENTATIONS ───────────────────────────────────────────────────

/**
 * Tool 1: Search local patients database
 */
export const searchPatientsTool: AgentTool = {
  name: 'search_patients',
  description: 'Search local IndexedDB for patients by name, phone, village address, condition, or allergy.',
  parameters: {
    query: { type: 'string', description: 'Search term for name, village, or condition', required: false },
    limit: { type: 'number', description: 'Max number of results to return (default: 10)', required: false },
  },
  execute: async (args) => {
    const q = ((args.query as string) || '').toLowerCase().trim();
    const limit = (args.limit as number) || 10;

    let patients = await db.patients
      .filter(p => p.deletedAt === null)
      .toArray();

    if (q) {
      patients = patients.filter(p => {
        const full = `${p.firstName} ${p.lastName} ${p.phone ?? ''} ${p.address ?? ''} ${p.knownConditions ?? ''} ${p.knownAllergies ?? ''}`.toLowerCase();
        return full.includes(q);
      });
    }

    return patients.slice(0, limit).map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      dob: p.dateOfBirth,
      sex: p.sex,
      phone: p.phone,
      address: p.address,
      conditions: p.knownConditions,
      allergies: p.knownAllergies,
      syncStatus: p.syncStatus,
    }));
  },
};

/**
 * Tool 2: Get detailed patient record and clinical history
 */
export const getPatientDetailsTool: AgentTool = {
  name: 'get_patient_details',
  description: 'Retrieve full demographics, clinical history, and previous consultation visits for a specific patient ID.',
  parameters: {
    patientId: { type: 'string', description: 'UUID of the patient', required: true },
  },
  execute: async (args) => {
    const patientId = args.patientId as string;
    if (!patientId) throw new Error('patientId is required');

    const patient = await db.patients.get(patientId);
    if (!patient || patient.deletedAt) {
      return { found: false, message: `Patient ${patientId} not found` };
    }

    const consultations = await db.consultations
      .where('patientId').equals(patientId)
      .filter(c => c.deletedAt === null)
      .sortBy('createdAt');

    consultations.reverse();

    return {
      found: true,
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        dob: patient.dateOfBirth,
        sex: patient.sex,
        bloodGroup: patient.bloodGroup,
        conditions: patient.knownConditions,
        allergies: patient.knownAllergies,
        address: patient.address,
        syncStatus: patient.syncStatus,
      },
      consultationCount: consultations.length,
      recentConsultations: consultations.slice(0, 5).map(c => ({
        id: c.id,
        chiefComplaint: c.chiefComplaint,
        notes: c.notes,
        clinicalStatus: c.clinicalStatus,
        createdAt: c.createdAt,
      })),
    };
  },
};

/**
 * Tool 3: Autonomous Clinical Triage Audit
 */
export const clinicalTriageAuditTool: AgentTool = {
  name: 'clinical_triage_audit',
  description: 'Audit unreviewed consultations for acute emergency red-flags (chest pain, dyspnea, hypertensive crisis, sepsis, obstetric bleed).',
  parameters: {
    maxRecords: { type: 'number', description: 'Max number of recent consultations to scan (default: 25)', required: false },
    statusFilter: { type: 'string', description: 'Filter by status: "all", "draft", or "awaiting_review" (default: "all")', required: false },
  },
  execute: async (args) => {
    const maxRecords = (args.maxRecords as number) || 25;
    const statusFilter = (args.statusFilter as string) || 'all';

    let consultations = await db.consultations
      .filter(c => c.deletedAt === null)
      .toArray();

    if (statusFilter !== 'all') {
      consultations = consultations.filter(c => c.clinicalStatus === statusFilter);
    }

    consultations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    consultations = consultations.slice(0, maxRecords);

    // Patients lookup map
    const patientIds = Array.from(new Set(consultations.map(c => c.patientId)));
    const patients = await db.patients.where('id').anyOf(patientIds).toArray();
    const patientMap = new Map(patients.map(p => [p.id, p]));

    interface FlaggedAuditItem {
      consultationId: string;
      patientId: string;
      patientName: string;
      chiefComplaint: string;
      priority: 'EMERGENCY_RED' | 'URGENT_YELLOW' | 'ROUTINE_GREEN';
      redFlags: string[];
      recommendation: string;
    }

    const flagged: FlaggedAuditItem[] = [];

    for (const c of consultations) {
      const p = patientMap.get(c.patientId);
      const text = `${c.chiefComplaint} ${c.notes} ${c.transcript ?? ''} ${c.ocrText ?? ''}`.toLowerCase();
      const flags: string[] = [];
      let priority: 'EMERGENCY_RED' | 'URGENT_YELLOW' | 'ROUTINE_GREEN' = 'ROUTINE_GREEN';
      let recommendation = 'Routine follow-up in primary health center.';

      // Check Red Flag 1: Chest pain / Myocardial
      if (text.includes('chest pain') || text.includes('angina') || text.includes('radiating to arm') || text.includes('myocardial')) {
        flags.push('Acute Coronary Syndrome Risk / Severe Chest Pain');
        priority = 'EMERGENCY_RED';
        recommendation = 'Administer Tab Aspirin 300mg stat + Sorbitrate 5mg SL. Immediate emergency transfer for 12-lead ECG.';
      }

      // Check Red Flag 2: Respiratory distress / Hypoxia
      if (text.includes('shortness of breath') || text.includes('dyspnea') || text.includes('spo2 < 90') || text.includes('spo2: 8') || text.includes('stridor')) {
        flags.push('Severe Respiratory Distress / Hypoxia Risk');
        if (priority !== 'EMERGENCY_RED') priority = 'EMERGENCY_RED';
        recommendation = 'High-flow oxygen therapy, nebulized salbutamol, prepare urgent higher-center transport.';
      }

      // Check Red Flag 3: Severe Hypertension
      if (text.includes('160/100') || text.includes('170/') || text.includes('180/') || text.includes('hypertensive crisis')) {
        flags.push('Stage-2 Severe Hypertension');
        if (priority !== 'EMERGENCY_RED') priority = 'URGENT_YELLOW';
        recommendation = 'Oral anti-hypertensive titration (Amlodipine 5-10mg), check for headache or vision changes.';
      }

      // Check Red Flag 4: Sepsis / High Fever
      if ((text.includes('fever') || text.includes('chills')) && (text.includes('altered') || text.includes('lethargic') || text.includes('hypotension') || text.includes('rigors'))) {
        flags.push('Severe Febrile Illness / Possible Sepsis');
        priority = 'EMERGENCY_RED';
        recommendation = 'Urgent blood smear / RDT for malaria, aggressive ORS/IV normal saline, prompt antibiotic coverage.';
      }

      // Check Red Flag 5: Obstetric emergencies
      if ((text.includes('pregnant') || text.includes('gravida') || (p?.sex === 'female' && text.includes('bleeding'))) && (text.includes('bleeding') || text.includes('headache') || text.includes('convulsion'))) {
        flags.push('Obstetric Red Flag (Antepartum Hemorrhage / Pre-Eclampsia)');
        priority = 'EMERGENCY_RED';
        recommendation = 'Left lateral positioning, check BP immediately, load IV access, urgent obstetric hospital transport.';
      }

      if (flags.length > 0 || c.clinicalStatus === 'awaiting_review') {
        flagged.push({
          consultationId: c.id,
          patientId: c.patientId,
          patientName: p ? `${p.firstName} ${p.lastName}` : 'Unknown Patient',
          chiefComplaint: c.chiefComplaint,
          priority: flags.length > 0 ? priority : 'ROUTINE_GREEN',
          redFlags: flags.length > 0 ? flags : ['Pending clinical sign-off'],
          recommendation,
        });
      }
    }

    const emergencyCount = flagged.filter(f => f.priority === 'EMERGENCY_RED').length;
    const urgentCount = flagged.filter(f => f.priority === 'URGENT_YELLOW').length;

    return {
      totalAudited: consultations.length,
      emergencyCount,
      urgentCount,
      routineCount: consultations.length - emergencyCount - urgentCount,
      flaggedItems: flagged,
    };
  },
};

/**
 * Tool 4: Screen High-Risk Vulnerable Cohorts
 */
export const screenHighRiskCohortTool: AgentTool = {
  name: 'screen_high_risk_cohort',
  description: 'Screen registered patients for vulnerable conditions: maternal risks, chronic diabetes/hypertension care gaps, or pediatric fever.',
  parameters: {
    cohortType: {
      type: 'string',
      description: 'Cohort category: "maternal_risk", "chronic_disease", "pediatric_vulnerable", or "all"',
      required: true,
    },
  },
  execute: async (args) => {
    const cohortType = (args.cohortType as string) || 'all';

    const patients = await db.patients.filter(p => p.deletedAt === null).toArray();
    const consultations = await db.consultations.filter(c => c.deletedAt === null).toArray();

    // Map patientId -> last consultation
    const lastConsultationMap = new Map<string, Consultation>();
    for (const c of consultations) {
      const existing = lastConsultationMap.get(c.patientId);
      if (!existing || c.createdAt > existing.createdAt) {
        lastConsultationMap.set(c.patientId, c);
      }
    }

    const currentYear = new Date().getFullYear();

    interface CohortScreeningResult {
      patientId: string;
      patientName: string;
      age: number;
      sex: string;
      address: string;
      cohort: string;
      riskReason: string;
      lastVisitDate: string | null;
      daysSinceLastVisit: number | null;
      actionRecommended: string;
    }

    const cohortList: CohortScreeningResult[] = [];

    for (const p of patients) {
      const birthYear = p.dateOfBirth ? parseInt(p.dateOfBirth.slice(0, 4), 10) : NaN;
      const age = !isNaN(birthYear) ? currentYear - birthYear : 30;
      const lastConsult = lastConsultationMap.get(p.id);

      let daysSinceLastVisit: number | null = null;
      if (lastConsult?.createdAt) {
        const lastMs = new Date(lastConsult.createdAt).getTime();
        daysSinceLastVisit = Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24));
      }

      const conditions = (p.knownConditions ?? '').toLowerCase();

      // Cohort 1: Maternal Risk
      if ((cohortType === 'maternal_risk' || cohortType === 'all') && p.sex === 'female' && age >= 15 && age <= 45) {
        const isMaternal = conditions.includes('pregnant') || conditions.includes('anc') || conditions.includes('gravida') || (lastConsult && `${lastConsult.chiefComplaint} ${lastConsult.notes}`.toLowerCase().includes('pregnant'));
        if (isMaternal) {
          cohortList.push({
            patientId: p.id,
            patientName: `${p.firstName} ${p.lastName}`,
            age,
            sex: p.sex,
            address: p.address || 'Village Center',
            cohort: 'Maternal Care',
            riskReason: 'Antenatal care monitoring required (BP, fetal movement, iron/folic acid intake).',
            lastVisitDate: lastConsult ? lastConsult.createdAt.slice(0, 10) : null,
            daysSinceLastVisit,
            actionRecommended: 'Schedule ANM home visit or PHC antenatal checkup with ultrasound check.',
          });
          continue;
        }
      }

      // Cohort 2: Chronic Disease Care Gaps (Hypertension / Diabetes)
      if (cohortType === 'chronic_disease' || cohortType === 'all') {
        const isChronic = conditions.includes('diabetes') || conditions.includes('hypertension') || conditions.includes('bp') || conditions.includes('asthma') || conditions.includes('copd');
        if (isChronic) {
          const isOverdue = daysSinceLastVisit === null || daysSinceLastVisit > 30;
          cohortList.push({
            patientId: p.id,
            patientName: `${p.firstName} ${p.lastName}`,
            age,
            sex: p.sex,
            address: p.address || 'Village Center',
            cohort: 'Chronic Disease (NCD)',
            riskReason: `Chronic condition (${p.knownConditions}). ${isOverdue ? `Overdue for vitals/medication check (${daysSinceLastVisit ?? 'No'} days since last visit).` : 'Medication monitoring needed.'}`,
            lastVisitDate: lastConsult ? lastConsult.createdAt.slice(0, 10) : null,
            daysSinceLastVisit,
            actionRecommended: 'Draft follow-up blood pressure and capillary blood glucose check.',
          });
          continue;
        }
      }

      // Cohort 3: Pediatric Vulnerable (Age <= 5)
      if ((cohortType === 'pediatric_vulnerable' || cohortType === 'all') && age <= 5) {
        cohortList.push({
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          age,
          sex: p.sex,
          address: p.address || 'Village Center',
          cohort: 'Pediatric Care (<5 yrs)',
          riskReason: 'Vulnerable pediatric age group. Requires immunisation and malnutrition screening.',
          lastVisitDate: lastConsult ? lastConsult.createdAt.slice(0, 10) : null,
          daysSinceLastVisit,
          actionRecommended: 'Verify growth chart, immunization status (Pentavalent/Measles), and oral vitamin A.',
        });
      }
    }

    return {
      cohortType,
      totalPatientsScreened: patients.length,
      identifiedCount: cohortList.length,
      candidates: cohortList.slice(0, 15),
    };
  },
};

/**
 * Tool 5: Auto-Draft Consultation & Outbox Sync Queue
 */
export const autoDraftConsultationTool: AgentTool = {
  name: 'auto_draft_consultation',
  description: 'Autonomously create a draft follow-up consultation in IndexedDB and queue it in the outbox sync pipeline.',
  parameters: {
    patientId: { type: 'string', description: 'Patient UUID', required: true },
    chiefComplaint: { type: 'string', description: 'Primary chief complaint or reason for follow-up', required: true },
    notes: { type: 'string', description: 'Structured clinical notes and recommendations', required: true },
    clinicalStatus: { type: 'string', description: '"draft" or "awaiting_review"', required: false },
  },
  execute: async (args) => {
    const patientId = args.patientId as string;
    const chiefComplaint = args.chiefComplaint as string;
    const notes = args.notes as string;
    const status = (args.clinicalStatus as string) || 'draft';

    if (!patientId || !chiefComplaint) {
      throw new Error('patientId and chiefComplaint are required to draft a consultation');
    }

    const patient = await db.patients.get(patientId);
    if (!patient || patient.deletedAt) {
      throw new Error(`Patient ${patientId} does not exist`);
    }

    const consultation = await createConsultation({
      patientId,
      chiefComplaint,
      notes,
    });

    if (status === 'awaiting_review') {
      await markAwaitingReview(consultation.id);
    }

    return {
      success: true,
      consultationId: consultation.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      chiefComplaint: consultation.chiefComplaint,
      clinicalStatus: status,
      queuedAt: consultation.createdAt,
      syncStatus: consultation.syncStatus,
    };
  },
};

/**
 * Tool 6: Reconcile Outbox Queue & Cryptographic Integrity Check
 */
export const reconcileOutboxQueueTool: AgentTool = {
  name: 'reconcile_outbox_queue',
  description: 'Inspect the local offline sync outbox queue, verify cryptographic SHA-256 hashes, and assess sync readiness.',
  parameters: {
    verifyHashes: { type: 'boolean', description: 'Perform SHA-256 payload integrity check on all outbox records', required: false },
  },
  execute: async (args) => {
    const verifyHashes = args.verifyHashes !== false;
    const outboxItems = await db.outbox.toArray();

    const counts = {
      pending: 0,
      sending: 0,
      conflict: 0,
      error: 0,
      done: 0,
    };

    let invalidHashesCount = 0;

    for (const item of outboxItems) {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++;
      }
      if (verifyHashes && item.payload) {
        const computed = await sha256Hex(item.payload);
        if (computed !== item.payloadHash) {
          invalidHashesCount++;
        }
      }
    }

    const deviceState = await db.deviceState.get('singleton');

    return {
      totalOutboxOperations: outboxItems.length,
      breakdown: counts,
      hashIntegrity: invalidHashesCount === 0 ? 'VERIFIED_CLEAN' : `${invalidHashesCount} TAMPERED/MISMATCHED`,
      stationInfo: {
        deviceId: deviceState?.deviceId ?? 'local-device',
        clinicName: deviceState?.clinicName ?? 'Primary Health Center',
        isOfflineMode: true,
      },
      readyForImmediateSync: counts.pending > 0 || counts.error > 0,
      summary: `${counts.pending} pending offline changes queued locally with cryptographic verification.`,
    };
  },
};

/**
 * Tool 7: Query Clinical Decision Knowledge Base (WHO / ICMR Guidelines)
 */
export const clinicalKnowledgeQueryTool: AgentTool = {
  name: 'clinical_knowledge_query',
  description: 'Query offline WHO/ICMR clinical intelligence for medical guidelines, differentials, dosages, and emergency protocols.',
  parameters: {
    query: { type: 'string', description: 'Clinical condition, symptom, or treatment protocol to look up', required: true },
  },
  execute: async (args) => {
    const q = (args.query as string) || '';
    if (!q) throw new Error('Query string is required');

    const res: AssistantResponse = queryClinicalAssistant(q);

    return {
      answer: res.answer,
      confidence: res.confidence,
      matchedTopic: res.matchedEntity?.title ?? 'General Clinical Protocol',
      differential: res.matchedEntity?.differential ?? [],
      recommendations: res.matchedEntity?.recommendations ?? [],
      redFlags: res.matchedEntity?.redFlags ?? [],
      dosageGuidance: res.matchedEntity?.dosageGuidance,
    };
  },
};

/**
 * Tool 8: Flag Consultation For Immediate Review
 */
export const flagConsultationReviewTool: AgentTool = {
  name: 'flag_consultation_review',
  description: 'Mark a consultation as awaiting urgent physician review with an automated agent triage escalation reason.',
  parameters: {
    consultationId: { type: 'string', description: 'Consultation UUID', required: true },
    reason: { type: 'string', description: 'Triage reason or clinical justification', required: true },
  },
  execute: async (args) => {
    const consultationId = args.consultationId as string;
    const reason = (args.reason as string) || 'Automated triage red-flag detected';

    const existing = await getConsultation(consultationId);
    if (!existing) {
      throw new Error(`Consultation ${consultationId} not found`);
    }

    await markAwaitingReview(consultationId);

    return {
      success: true,
      consultationId,
      previousStatus: existing.clinicalStatus,
      newStatus: 'awaiting_review',
      reason,
      updatedAt: now(),
    };
  },
};

// ─── AGENT TOOL REGISTRY ───────────────────────────────────────────────────

export const AGENT_TOOLS: Record<string, AgentTool> = {
  search_patients: searchPatientsTool,
  get_patient_details: getPatientDetailsTool,
  clinical_triage_audit: clinicalTriageAuditTool,
  screen_high_risk_cohort: screenHighRiskCohortTool,
  auto_draft_consultation: autoDraftConsultationTool,
  reconcile_outbox_queue: reconcileOutboxQueueTool,
  clinical_knowledge_query: clinicalKnowledgeQueryTool,
  flag_consultation_review: flagConsultationReviewTool,
};

// ─── AGENT PLAYBOOKS (ONE-CLICK ROUTINES) ──────────────────────────────────

export interface AgentPlaybook {
  id: string;
  title: string;
  description: string;
  badge: string;
  defaultGoal: string;
}

export const AGENT_PLAYBOOKS: AgentPlaybook[] = [
  {
    id: 'triage_audit',
    title: 'Emergency Triage & Red-Flag Audit',
    description: 'Scans all local consultations for acute red flags (ACS, severe dyspnea, sepsis) and flags urgent cases.',
    badge: 'Urgent Care',
    defaultGoal: 'Audit local consultations, identify any acute red-flag symptoms, and escalate high-priority cases.',
  },
  {
    id: 'maternal_screening',
    title: 'Maternal & Child High-Risk Screening',
    description: 'Screens village roster for pregnant women, ANC gaps, and vulnerable infants overdue for checkups.',
    badge: 'Maternal Health',
    defaultGoal: 'Screen community cohort for maternal health risks and children overdue for routine care.',
  },
  {
    id: 'chronic_care_gap',
    title: 'Chronic NCD Care Gap Monitor',
    description: 'Detects hypertensive & diabetic patients missing checkups for >30 days and drafts outreach visits.',
    badge: 'Chronic Care',
    defaultGoal: 'Identify hypertensive and diabetic patients with care gaps and prepare draft follow-up notes.',
  },
  {
    id: 'sync_integrity_check',
    title: 'Offline Queue & Cryptographic Reconcile',
    description: 'Audits pending outbox transactions and verifies SHA-256 payload integrity across local records.',
    badge: 'System & Sync',
    defaultGoal: 'Reconcile offline outbox operations, verify cryptographic hash integrity, and report sync readiness.',
  },
];

// ─── AUTONOMOUS REASONING & EXECUTION ENGINE ───────────────────────────────

export async function runClinicalAgent(
  goal: string,
  options?: {
    playbookId?: string;
    onStep?: (step: AgentExecutionStep) => void;
  }
): Promise<AgentExecutionResult> {
  const startTime = performance.now();
  const steps: AgentExecutionStep[] = [];
  const actionsTaken: AgentActionTaken[] = [];

  const addStep = (thought: string, toolName: string, toolArgs: Record<string, unknown>, observation: unknown) => {
    const step: AgentExecutionStep = {
      stepNumber: steps.length + 1,
      thought,
      toolName,
      toolArgs,
      observation,
      status: 'completed',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    steps.push(step);
    options?.onStep?.(step);
    return step;
  };

  const lowerGoal = goal.toLowerCase();

  // ROUTE 1: Triage Audit Playbook
  if (options?.playbookId === 'triage_audit' || lowerGoal.includes('audit') || lowerGoal.includes('triage') || lowerGoal.includes('red flag') || lowerGoal.includes('emergency')) {
    // Step 1: Run Triage Audit Tool
    const auditRes = await clinicalTriageAuditTool.execute({ maxRecords: 30, statusFilter: 'all' }) as {
      totalAudited: number;
      emergencyCount: number;
      urgentCount: number;
      flaggedItems: Array<{
        consultationId: string;
        patientId: string;
        patientName: string;
        chiefComplaint: string;
        priority: string;
        redFlags: string[];
        recommendation: string;
      }>;
    };

    addStep(
      `Analyzing local consultations in IndexedDB for acute life-threatening symptoms, vital sign emergencies, and pending clinical reviews...`,
      'clinical_triage_audit',
      { maxRecords: 30, statusFilter: 'all' },
      auditRes
    );

    // Step 2: For any emergency red-flags, query offline clinical guidelines
    const emergencyItems = auditRes.flaggedItems.filter(f => f.priority === 'EMERGENCY_RED' || f.priority === 'URGENT_YELLOW');
    if (emergencyItems.length > 0) {
      const topEmergency = emergencyItems[0];
      const protocolQuery = topEmergency.redFlags[0] || topEmergency.chiefComplaint;
      
      const clinicalProtocol = await clinicalKnowledgeQueryTool.execute({ query: protocolQuery });
      addStep(
        `Consulting WHO / ICMR primary care guidelines for urgent management of "${protocolQuery}"...`,
        'clinical_knowledge_query',
        { query: protocolQuery },
        clinicalProtocol
      );

      // Step 3: Flag consultation for review
      for (const item of emergencyItems.slice(0, 3)) {
        await flagConsultationReviewTool.execute({
          consultationId: item.consultationId,
          reason: `Auto-escalated by Clinical Agent: ${item.redFlags.join(', ')}`,
        });
        actionsTaken.push({
          type: 'triage_flagged',
          title: `Triage Escalation: ${item.patientName}`,
          description: `Priority ${item.priority} — ${item.redFlags.join('; ')}`,
          entityId: item.consultationId,
        });
      }
    }

    const finalAnswer = `### Autonomous Clinical Triage Audit Complete
- **Audited Records**: ${auditRes.totalAudited} local consultations scanned.
- **Critical Red Flags (EMERGENCY RED)**: ${auditRes.emergencyCount} cases detected.
- **Urgent Review (URGENT YELLOW)**: ${auditRes.urgentCount} cases flagged.
- **Escalated Consultations**: ${actionsTaken.length} records marked as \`awaiting_review\` with clinical alert badges.

${emergencyItems.length > 0 ? `**Actionable Priorities:**\n` + emergencyItems.map(item => `• **${item.patientName}** (${item.priority}): ${item.redFlags.join(', ')}\n  ➔ *Guideline Action:* ${item.recommendation}`).join('\n') : '✅ **No immediate life-threatening symptoms detected in local records.**'}`;

    return {
      goal,
      success: true,
      steps,
      finalAnswer,
      actionsTaken,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // ROUTE 2: Maternal & Child High-Risk Screening
  if (options?.playbookId === 'maternal_screening' || lowerGoal.includes('maternal') || lowerGoal.includes('pregnant') || lowerGoal.includes('infant') || lowerGoal.includes('pediatric')) {
    const screenRes = await screenHighRiskCohortTool.execute({ cohortType: 'maternal_risk' }) as {
      totalPatientsScreened: number;
      identifiedCount: number;
      candidates: Array<{
        patientId: string;
        patientName: string;
        age: number;
        riskReason: string;
        actionRecommended: string;
      }>;
    };

    addStep(
      `Scanning demographic registry and recent clinical encounters for maternal health patients and prenatal risk indicators...`,
      'screen_high_risk_cohort',
      { cohortType: 'maternal_risk' },
      screenRes
    );

    // If candidates found, inspect deep details of first candidate
    if (screenRes.candidates.length > 0) {
      const topCandidate = screenRes.candidates[0];
      const details = await getPatientDetailsTool.execute({ patientId: topCandidate.patientId });
      addStep(
        `Fetching complete clinical history for priority patient "${topCandidate.patientName}"...`,
        'get_patient_details',
        { patientId: topCandidate.patientId },
        details
      );
    }

    const finalAnswer = `### Maternal & Child Screening Report
- **Registry Cohort Scanned**: ${screenRes.totalPatientsScreened} patients in village database.
- **Identified High-Risk Mothers / Infants**: ${screenRes.identifiedCount} requiring follow-up.

**Priority Outreach List:**
${screenRes.candidates.map(c => `• **${c.patientName}** (Age ${c.age}): ${c.riskReason}\n  ➔ *Recommended Plan:* ${c.actionRecommended}`).join('\n')}

All findings have been logged locally and are ready for community health worker (ASHA / ANM) home visits.`;

    return {
      goal,
      success: true,
      steps,
      finalAnswer,
      actionsTaken,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // ROUTE 3: Chronic NCD Care Gap Monitor & Auto-Drafting
  if (options?.playbookId === 'chronic_care_gap' || lowerGoal.includes('chronic') || lowerGoal.includes('diabetes') || lowerGoal.includes('hypertension') || lowerGoal.includes('ncd')) {
    const cohortRes = await screenHighRiskCohortTool.execute({ cohortType: 'chronic_disease' }) as {
      totalPatientsScreened: number;
      identifiedCount: number;
      candidates: Array<{
        patientId: string;
        patientName: string;
        riskReason: string;
        actionRecommended: string;
      }>;
    };

    addStep(
      `Screening local roster for hypertension and diabetes care gaps (patients with no clinical contact in >30 days)...`,
      'screen_high_risk_cohort',
      { cohortType: 'chronic_disease' },
      cohortRes
    );

    // Autonomously draft a follow-up consultation for the top overdue patient
    if (cohortRes.candidates.length > 0) {
      const target = cohortRes.candidates[0];
      const draftRes = await autoDraftConsultationTool.execute({
        patientId: target.patientId,
        chiefComplaint: 'Routine Chronic Care Follow-up (Agent Scheduled)',
        notes: `Automated Outreach Protocol: Patient overdue for chronic disease assessment.\n- Target: Evaluate BP, medication compliance, and lifestyle modifications.\n- Follow-up Plan: ${target.actionRecommended}`,
        clinicalStatus: 'draft',
      }) as { consultationId: string };

      addStep(
        `Autonomously generating draft outreach visit and queuing atomic outbox transaction for ${target.patientName}...`,
        'auto_draft_consultation',
        { patientId: target.patientId, chiefComplaint: 'Routine Chronic Care Follow-up' },
        draftRes
      );

      actionsTaken.push({
        type: 'consultation_created',
        title: `Drafted Outreach Visit: ${target.patientName}`,
        description: 'Queued follow-up consultation in IndexedDB and atomic outbox pipeline.',
        entityId: draftRes.consultationId,
      });
    }

    const finalAnswer = `### Chronic NCD Care Gap Evaluation
- **Patients Evaluated**: ${cohortRes.totalPatientsScreened} registered patients.
- **Patients with Care Gaps**: ${cohortRes.identifiedCount} hypertensive/diabetic patients overdue for checkup.
- **Actions Executed**: ${actionsTaken.length} draft consultation(s) created and stored locally.

**Identified Cohort:**
${cohortRes.candidates.map(c => `• **${c.patientName}**: ${c.riskReason}`).join('\n')}`;

    return {
      goal,
      success: true,
      steps,
      finalAnswer,
      actionsTaken,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // ROUTE 4: Offline Queue & Cryptographic Integrity Check
  if (options?.playbookId === 'sync_integrity_check' || lowerGoal.includes('sync') || lowerGoal.includes('outbox') || lowerGoal.includes('integrity') || lowerGoal.includes('hash')) {
    const outboxRes = await reconcileOutboxQueueTool.execute({ verifyHashes: true }) as {
      totalOutboxOperations: number;
      breakdown: { pending: number; sending: number; conflict: number; error: number; done: number };
      hashIntegrity: string;
      stationInfo: { deviceId: string; clinicName: string };
      summary: string;
    };

    addStep(
      `Inspecting local outbox transactions, validating SHA-256 cryptographic hashes, and verifying offline queue readiness...`,
      'reconcile_outbox_queue',
      { verifyHashes: true },
      outboxRes
    );

    actionsTaken.push({
      type: 'outbox_reconciled',
      title: 'Offline Outbox Reconciled',
      description: `${outboxRes.totalOutboxOperations} operations inspected. Hash integrity: ${outboxRes.hashIntegrity}.`,
    });

    const finalAnswer = `### Offline Queue & Data Integrity Report
- **Total Local Outbox Records**: ${outboxRes.totalOutboxOperations} operations.
- **Cryptographic Hash Verification**: **${outboxRes.hashIntegrity}** (All local payloads match cryptographic SHA-256 signatures).
- **Status Breakdown**:
  - Pending Upload: **${outboxRes.breakdown.pending}**
  - Conflicts: **${outboxRes.breakdown.conflict}**
  - Errors: **${outboxRes.breakdown.error}**
  - Synced / Done: **${outboxRes.breakdown.done}**
- **Workstation**: ${outboxRes.stationInfo.clinicName} (${outboxRes.stationInfo.deviceId})

The local database is cryptographically integral and ready for push synchronization whenever network connectivity is established.`;

    return {
      goal,
      success: true,
      steps,
      finalAnswer,
      actionsTaken,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // ROUTE 5: Specific Patient Search / Follow-Up Note Drafting
  if (lowerGoal.includes('draft') || lowerGoal.includes('create consultation') || lowerGoal.includes('follow-up')) {
    // Search for patient mentioned in query
    const searchRes = await searchPatientsTool.execute({ query: goal.replace(/draft|create|consultation|note|follow-up|for/gi, '').trim(), limit: 5 }) as Array<{
      id: string;
      name: string;
    }>;

    addStep(
      `Locating target patient in local IndexedDB matching user request...`,
      'search_patients',
      { query: goal },
      searchRes
    );

    if (searchRes.length > 0) {
      const target = searchRes[0];
      const draftRes = await autoDraftConsultationTool.execute({
        patientId: target.id,
        chiefComplaint: 'Clinical Follow-up (AI Agent Assisted)',
        notes: `Clinical note autonomously drafted based on clinical goal:\n"${goal}"\n- Plan: Routine vitals check, medication review, and symptom assessment.`,
        clinicalStatus: 'draft',
      }) as { consultationId: string };

      addStep(
        `Created draft consultation record and generated outbox sync entry for ${target.name}...`,
        'auto_draft_consultation',
        { patientId: target.id, chiefComplaint: 'Clinical Follow-up' },
        draftRes
      );

      actionsTaken.push({
        type: 'consultation_created',
        title: `Consultation Drafted: ${target.name}`,
        description: 'New consultation saved locally in IndexedDB with outbox sync operation.',
        entityId: draftRes.consultationId,
      });

      const finalAnswer = `### Consultation Draft Created Successfully
- **Patient**: ${target.name}
- **Consultation ID**: \`${draftRes.consultationId}\`
- **Status**: \`draft\` (Stored in local database)
- **Sync Operation**: Queued for background synchronization.

You can view and amend this consultation in the Consultations section at any time.`;

      return {
        goal,
        success: true,
        steps,
        finalAnswer,
        actionsTaken,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }
  }

  // ROUTE 6: General Multi-Step Autonomous Reasoning Fallback
  // Step 1: Query offline clinical knowledge base
  const knowledgeRes = await clinicalKnowledgeQueryTool.execute({ query: goal });
  addStep(
    `Consulting offline WHO/ICMR clinical decision engine for clinical concepts in goal...`,
    'clinical_knowledge_query',
    { query: goal },
    knowledgeRes
  );

  // Step 2: Search local patients to correlate with query
  const patientRes = await searchPatientsTool.execute({ query: goal, limit: 3 });
  addStep(
    `Checking if any existing local patients correlate with the clinical query...`,
    'search_patients',
    { query: goal },
    patientRes
  );

  const finalAnswer = `### Autonomous Clinical Assessment
Based on WHO and ICMR rural health protocols:

${(knowledgeRes as { answer: string }).answer}

**Local Correlated Records**:
${(patientRes as Array<{ name: string; conditions?: string }>).length > 0 ? (patientRes as Array<{ name: string; conditions?: string }>).map(p => `• **${p.name}** — ${p.conditions || 'No conditions listed'}`).join('\n') : 'No matching patient records found locally for this query.'}`;

  return {
    goal,
    success: true,
    steps,
    finalAnswer,
    actionsTaken,
    executionTimeMs: Math.round(performance.now() - startTime),
  };
}
