import { useState } from 'react';
import type { StructuredClinicalData } from '@/utils/clinicalAiExtractor';
import {
  ShieldIcon, AlertIcon, CheckIcon, XIcon,
} from '@/components/Icons';

interface Props {
  isOpen: boolean;
  data: StructuredClinicalData;
  onClose: () => void;
  onApply: (verifiedSummary: string, verifiedChiefComplaint: string) => void;
}

export function StructuredClinicalAiReview({ isOpen, data: initialData, onClose, onApply }: Props) {
  const [data, setData] = useState<StructuredClinicalData>(initialData);

  if (!isOpen) return null;

  const toggleVerifyChiefComplaint = () => {
    setData(prev => ({
      ...prev,
      chiefComplaint: { ...prev.chiefComplaint, verified: !prev.chiefComplaint.verified },
    }));
  };

  const toggleVerifyAssessment = () => {
    setData(prev => ({
      ...prev,
      assessment: { ...prev.assessment, verified: !prev.assessment.verified },
    }));
  };

  const toggleVerifyPlan = () => {
    setData(prev => ({
      ...prev,
      plan: { ...prev.plan, verified: !prev.plan.verified },
    }));
  };

  const toggleVerifyMed = (idx: number) => {
    setData(prev => {
      const nextMeds = [...prev.medications];
      nextMeds[idx] = { ...nextMeds[idx], verified: !nextMeds[idx].verified };
      return { ...prev, medications: nextMeds };
    });
  };

  const verifyAllFields = () => {
    setData(prev => ({
      ...prev,
      chiefComplaint: { ...prev.chiefComplaint, verified: true },
      symptoms: { ...prev.symptoms, verified: true },
      history: { ...prev.history, verified: true },
      assessment: { ...prev.assessment, verified: true },
      plan: { ...prev.plan, verified: true },
      medications: prev.medications.map(m => ({ ...m, verified: true })),
      vitals: Object.fromEntries(
        Object.entries(prev.vitals).map(([k, v]) => [k, v ? { ...v, verified: true } : undefined])
      ),
      isAllVerified: true,
    }));
  };

  const handleApply = () => {
    // Generate clean clinical note block from verified data
    const parts: string[] = [];

    parts.push(`[VERIFIED CLINICAL AI SUMMARY]`);
    parts.push(`Chief Complaint: ${data.chiefComplaint.value}`);

    if (data.symptoms.value.length > 0) {
      parts.push(`Symptoms Identified: ${data.symptoms.value.join(', ')}`);
    }

    const vitalsList: string[] = [];
    if (data.vitals.bloodPressure?.value) vitalsList.push(`BP: ${data.vitals.bloodPressure.value} mmHg`);
    if (data.vitals.heartRate?.value) vitalsList.push(`HR: ${data.vitals.heartRate.value} bpm`);
    if (data.vitals.temperature?.value) vitalsList.push(`Temp: ${data.vitals.temperature.value}°C`);
    if (data.vitals.spO2?.value) vitalsList.push(`SpO2: ${data.vitals.spO2.value}%`);
    if (data.vitals.respiratoryRate?.value) vitalsList.push(`RR: ${data.vitals.respiratoryRate.value}/min`);

    if (vitalsList.length > 0) {
      parts.push(`Vitals: ${vitalsList.join(' | ')}`);
    }

    if (data.medications.length > 0) {
      parts.push(`Medications / Rx:\n${data.medications.map((m, i) => `  ${i + 1}. ${m.drug} ${m.dosage || ''} ${m.frequency || ''}`.trim()).join('\n')}`);
    }

    if (data.assessment.value) {
      parts.push(`Assessment: ${data.assessment.value}`);
    }

    if (data.plan.value) {
      parts.push(`Plan & Recommendations: ${data.plan.value}`);
    }

    parts.push(`(Verified by attending clinician: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);

    const summary = parts.join('\n\n');
    onApply(summary, data.chiefComplaint.value);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-review-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] card bg-surface-card border border-surface-borderLight p-6 shadow-2xl flex flex-col space-y-4 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg shadow-amber-950/40">
              <ShieldIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-review-title" className="text-lg font-bold text-white tracking-tight">
                  Clinical AI Structured Extraction Review
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 border border-amber-600/80 text-amber-300">
                  UNVERIFIED AI OUTPUT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every field requires clinician verification before entering the legal medical record.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-surface border border-surface-border flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Confidence:</span>
              <span className={`font-bold ${data.overallConfidence >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data.overallConfidence}%
              </span>
            </div>
            <button onClick={onClose} className="btn-icon btn-ghost btn-sm" aria-label="Close">
              <XIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Safety Callout */}
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
            <AlertIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-amber-300">Clinical Safety Mandate:</span> Review, modify, or reject AI-extracted values below. Once approved, the verified data will be formatted into your consultation notes.
            </div>
            <button
              type="button"
              onClick={verifyAllFields}
              className="btn-sm btn-secondary text-xs text-emerald-400 hover:text-white flex-shrink-0 whitespace-nowrap ml-auto"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Verify All Fields
            </button>
          </div>

          {/* 1. Chief Complaint */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                1. Chief Complaint
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                  {Math.round(data.chiefComplaint.confidence * 100)}% Confidence
                </span>
                <button
                  type="button"
                  onClick={toggleVerifyChiefComplaint}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    data.chiefComplaint.verified
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                      : 'bg-surface-card border border-surface-border text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  {data.chiefComplaint.verified ? 'Verified' : 'Verify'}
                </button>
              </div>
            </div>
            <input
              type="text"
              value={data.chiefComplaint.value}
              onChange={e => setData(prev => ({
                ...prev,
                chiefComplaint: { ...prev.chiefComplaint, value: e.target.value, edited: true },
              }))}
              className="input text-sm font-semibold text-white bg-surface-card"
            />
          </div>

          {/* 2. Extracted Vitals */}
          <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              2. Parsed Vital Signs
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[
                { label: 'Blood Pressure', val: data.vitals.bloodPressure?.value, unit: 'mmHg', conf: data.vitals.bloodPressure?.confidence },
                { label: 'Heart Rate', val: data.vitals.heartRate?.value, unit: 'bpm', conf: data.vitals.heartRate?.confidence },
                { label: 'Temperature', val: data.vitals.temperature?.value, unit: '°C', conf: data.vitals.temperature?.confidence },
                { label: 'SpO2 Sat', val: data.vitals.spO2?.value, unit: '%', conf: data.vitals.spO2?.confidence },
                { label: 'Resp Rate', val: data.vitals.respiratoryRate?.value, unit: '/min', conf: data.vitals.respiratoryRate?.confidence },
              ].map(vital => (
                <div key={vital.label} className="p-2.5 rounded-xl bg-surface-card border border-surface-border text-center space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">{vital.label}</span>
                  <span className="text-sm font-bold text-white block">
                    {vital.val !== undefined ? `${vital.val} ${vital.unit}` : '—'}
                  </span>
                  {vital.conf && (
                    <span className="text-[9px] font-mono text-cyan-400">
                      {Math.round(vital.conf * 100)}% conf
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Symptoms */}
          {data.symptoms.value.length > 0 && (
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                3. Detected Symptoms
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {data.symptoms.value.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs bg-cyan-950/70 border border-cyan-800 text-cyan-300 capitalize flex items-center gap-1.5 font-mono">
                    <span>{s}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4. Medications */}
          {data.medications.length > 0 && (
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                4. Extracted Medications
              </span>
              <div className="space-y-2">
                {data.medications.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-card border border-surface-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white text-xs">{med.drug}</span>
                      {med.dosage && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-300">
                          {med.dosage}
                        </span>
                      )}
                      {med.frequency && (
                        <span className="text-[11px] font-mono text-cyan-400">
                          {med.frequency}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleVerifyMed(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        med.verified
                          ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                          : 'bg-surface border border-surface-border text-slate-400 hover:text-white'
                      }`}
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      {med.verified ? 'Verified' : 'Verify'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Clinical Assessment & Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  5. Clinical Assessment
                </span>
                <button
                  type="button"
                  onClick={toggleVerifyAssessment}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    data.assessment.verified ? 'text-emerald-400 bg-emerald-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {data.assessment.verified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
              <textarea
                value={data.assessment.value}
                onChange={e => setData(prev => ({
                  ...prev,
                  assessment: { ...prev.assessment, value: e.target.value, edited: true },
                }))}
                rows={3}
                className="textarea text-xs bg-surface-card"
              />
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  6. Treatment & Rx Plan
                </span>
                <button
                  type="button"
                  onClick={toggleVerifyPlan}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    data.plan.verified ? 'text-emerald-400 bg-emerald-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {data.plan.verified ? '✓ Verified' : 'Verify'}
                </button>
              </div>
              <textarea
                value={data.plan.value}
                onChange={e => setData(prev => ({
                  ...prev,
                  plan: { ...prev.plan, value: e.target.value, edited: true },
                }))}
                rows={3}
                className="textarea text-xs bg-surface-card"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Discard AI Output
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="btn-primary py-2.5 px-6 text-xs font-bold shadow-xl shadow-cyan-950/50 flex items-center gap-2"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Confirm & Apply to Consultation Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}
