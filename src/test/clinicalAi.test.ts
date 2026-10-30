import { describe, it, expect } from 'vitest';
import { extractStructuredClinicalEntities, createEmptyStructuredData } from '@/utils/clinicalAiExtractor';

describe('Phase 2 On-Device AI Pipeline: Clinical Entity Extraction', () => {
  it('extracts chief complaint and symptoms with field-level confidence', () => {
    const note = `Patient presents with high fever, persistent dry cough, and shortness of breath for the past 3 days.`;
    const res = extractStructuredClinicalEntities(note);

    expect(res.chiefComplaint.value).toBeTruthy();
    expect(res.chiefComplaint.confidence).toBeGreaterThan(0.5);
    expect(res.chiefComplaint.verified).toBe(false); // Safety guardrail: unverified by default

    expect(res.symptoms.value).toContain('fever');
    expect(res.symptoms.value).toContain('cough');
    expect(res.symptoms.value).toContain('shortness of breath');
    expect(res.symptoms.verified).toBe(false);
  });

  it('correctly parses vital signs (BP, Pulse, Temp, SpO2) into structured numbers', () => {
    const note = `Vitals recorded at triage: BP 130/85 mmHg, HR: 88 bpm, Temp: 38.4 C, SpO2 95%, RR: 18/min.`;
    const res = extractStructuredClinicalEntities(note);

    expect(res.vitals.bloodPressure?.value).toBe('130/85');
    expect(res.vitals.bloodPressure?.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res.vitals.bloodPressure?.verified).toBe(false);

    expect(res.vitals.heartRate?.value).toBe(88);
    expect(res.vitals.temperature?.value).toBe(38.4);
    expect(res.vitals.spO2?.value).toBe(95);
    expect(res.vitals.respiratoryRate?.value).toBe(18);
  });

  it('extracts medications with dosage and frequency', () => {
    const note = `Prescription: Tab Paracetamol 650mg TDS x 3 days. Tab Amoxicillin 500mg BID.`;
    const res = extractStructuredClinicalEntities(note);

    expect(res.medications.length).toBeGreaterThanOrEqual(2);
    const paracetamol = res.medications.find(m => m.drug.toLowerCase().includes('paracetamol'));
    expect(paracetamol).toBeDefined();
    expect(paracetamol?.dosage).toContain('650mg');
    expect(paracetamol?.verified).toBe(false); // Safety invariant
  });

  it('enforces safety invariant: all fields default to unverified', () => {
    const rawSample = `
Chief Complaint: Acute epigastric pain
BP: 120/80, HR 72
Assessment: Suspected peptic ulcer disease
Plan: Tab Pantoprazole 40mg OD before food.
    `;
    const res = extractStructuredClinicalEntities(rawSample);

    expect(res.isAllVerified).toBe(false);
    expect(res.chiefComplaint.verified).toBe(false);
    expect(res.assessment.verified).toBe(false);
    expect(res.plan.verified).toBe(false);
    res.medications.forEach(m => expect(m.verified).toBe(false));
  });

  it('handles empty input gracefully', () => {
    const empty = createEmptyStructuredData();
    expect(empty.chiefComplaint.value).toBe('');
    expect(empty.overallConfidence).toBe(0);
    expect(empty.isAllVerified).toBe(false);
  });
});
