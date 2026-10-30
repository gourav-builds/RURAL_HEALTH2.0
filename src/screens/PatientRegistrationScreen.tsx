/** Patient registration form */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '@/db/patients';
import { ArrowLeftIcon, SaveIcon, UserIcon } from '@/components/Icons';
import type { Patient } from '@/types';

type FormData = Omit<Patient,
  'id' | 'orgId' | 'localVersion' | 'serverVersion' |
  'syncStatus' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

const DEFAULT: FormData = {
  firstName: '', lastName: '', dateOfBirth: '', sex: 'prefer_not_to_say',
  phone: '', address: '', nationalId: '', bloodGroup: '',
  knownAllergies: '', knownConditions: '',
};

export function PatientRegistrationScreen() {
  const navigate = useNavigate();
  const [form, setForm]       = useState<FormData>(DEFAULT);
  const [errors, setErrors]   = useState<Partial<FormData>>({});
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState('');

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.dateOfBirth)      e.dateOfBirth = 'Date of birth is required';
    if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) {
      e.dateOfBirth = 'Date of birth cannot be in the future';
    }
    setErrors(e as Partial<FormData>);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');
    try {
      const patient = await createPatient(form);
      navigate(`/patients/${patient.id}`, { replace: true });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        setSaveError('Storage is full. Cannot save patient. Please free up space in Settings → Storage.');
      } else {
        setSaveError('Failed to save patient. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ id, label, required, error, children }: {
    id: string; label: string; required?: boolean; error?: string; children: React.ReactNode;
  }) => (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1" role="alert">{error}</p>}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon btn-ghost" aria-label="Go back">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="section-title text-xl">Register Patient</h2>
          <p className="section-subtitle">Saved locally · Synced when online</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={e => { e.preventDefault(); handleSave(); }}
        noValidate
        aria-label="Patient registration form"
      >
        <div className="card space-y-5">
          <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
            <UserIcon className="w-4 h-4 text-brand-400" /> Personal Information
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="firstName" label="First name" required error={errors.firstName as string}>
              <input
                id="firstName" type="text" className="input" autoFocus
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                autoComplete="given-name"
                aria-required="true"
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              />
            </Field>
            <Field id="lastName" label="Last name" required error={errors.lastName as string}>
              <input
                id="lastName" type="text" className="input"
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                autoComplete="family-name"
                aria-required="true"
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="dateOfBirth" label="Date of birth" required error={errors.dateOfBirth as string}>
              <input
                id="dateOfBirth" type="date" className="input"
                max={new Date().toISOString().split('T')[0]}
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                aria-required="true"
              />
            </Field>
            <Field id="sex" label="Sex">
              <select
                id="sex" className="input bg-surface"
                value={form.sex}
                onChange={e => set('sex', e.target.value as FormData['sex'])}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="phone" label="Phone number">
              <input
                id="phone" type="tel" className="input"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                autoComplete="tel"
              />
            </Field>
            <Field id="nationalId" label="National ID / Patient ID">
              <input
                id="nationalId" type="text" className="input"
                value={form.nationalId}
                onChange={e => set('nationalId', e.target.value)}
              />
            </Field>
          </div>

          <Field id="address" label="Address">
            <textarea
              id="address" className="textarea min-h-[70px]"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              autoComplete="street-address"
            />
          </Field>

          <div className="divider" />

          <h3 className="font-semibold text-white text-sm">Medical Information</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="bloodGroup" label="Blood group">
              <select id="bloodGroup" className="input bg-surface" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                <option value="">Unknown</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field id="knownAllergies" label="Known allergies">
            <textarea
              id="knownAllergies" className="textarea min-h-[70px]"
              placeholder="e.g. Penicillin, Sulfa drugs"
              value={form.knownAllergies}
              onChange={e => set('knownAllergies', e.target.value)}
            />
          </Field>

          <Field id="knownConditions" label="Known conditions / past medical history">
            <textarea
              id="knownConditions" className="textarea min-h-[70px]"
              placeholder="e.g. Type 2 diabetes (diagnosed 2018), hypertension"
              value={form.knownConditions}
              onChange={e => set('knownConditions', e.target.value)}
            />
          </Field>

          {saveError && (
            <div className="alert-error" role="alert">
              <p>{saveError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              <SaveIcon className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save patient'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
