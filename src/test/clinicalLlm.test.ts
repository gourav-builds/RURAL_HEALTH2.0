import { describe, it, expect } from 'vitest';
import { queryClinicalAssistant, CLINICAL_KNOWLEDGE_BASE } from '@/utils/clinicalLlmEngine';

describe('Clinical LLM Trained Support Engine', () => {
  it('contains comprehensive rural primary care guidelines and red flags', () => {
    expect(CLINICAL_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(6);
    CLINICAL_KNOWLEDGE_BASE.forEach(entity => {
      expect(entity.keywords.length).toBeGreaterThan(0);
      expect(entity.differential.length).toBeGreaterThan(0);
      expect(entity.recommendations.length).toBeGreaterThan(0);
      expect(entity.redFlags.length).toBeGreaterThan(0);
    });
  });

  it('matches fever presentation with malaria/dengue guidelines and antipyretic dosing', () => {
    const res = queryClinicalAssistant('Patient has high fever and chills for 3 days');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.answer).toContain('Acute Febrile Illness');
    expect(res.answer).toContain('Paracetamol');
    expect(res.matchedEntity?.id).toBe('fever_acute');
    expect(res.matchedEntity?.redFlags).toContain('Respiratory distress (RR > 30/min or SpO2 < 92%)');
  });

  it('matches chest pain emergency with acute coronary syndrome triage protocol', () => {
    const res = queryClinicalAssistant('Elderly patient with acute chest pain and sweating');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.answer).toContain('Acute Coronary Syndrome');
    expect(res.answer).toContain('Aspirin 300mg');
    expect(res.matchedEntity?.id).toBe('chest_pain');
  });

  it('matches pediatric diarrhea with WHO-ORS and Zinc supplementation protocols', () => {
    const res = queryClinicalAssistant('Child with watery diarrhea and vomiting');
    expect(res.confidence).toBeGreaterThan(0.7);
    expect(res.answer).toContain('Gastroenteritis');
    expect(res.answer).toContain('WHO-ORS');
    expect(res.answer).toContain('Zinc');
    expect(res.matchedEntity?.id).toBe('gastro_diarrhea');
  });

  it('provides safe standard primary care fallback for unlisted inquiries', () => {
    const res = queryClinicalAssistant('Patient has unusual ear pain');
    expect(res.confidence).toBeGreaterThanOrEqual(0.7);
    expect(res.answer).toContain('Clinical Decision Support Guidance');
    expect(res.answer).toContain('Triage Vitals Check');
  });
});
