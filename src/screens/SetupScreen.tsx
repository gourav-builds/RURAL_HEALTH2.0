/** First-time setup / device provisioning screen with Clinician PIN & Role Setup */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import type { ClinicianRole } from '@/types';
import {
  HeartIcon, ShieldIcon, WifiOffIcon, DatabaseIcon,
  CheckIcon, LockIcon, AlertIcon,
} from '@/components/Icons';

const STEPS = [
  { id: 'welcome',  title: 'Welcome to RuralCare' },
  { id: 'profile',  title: 'Clinician Profile' },
  { id: 'security', title: 'Security PIN Setup' },
  { id: 'storage',  title: 'Offline Storage' },
  { id: 'ready',    title: 'Workstation Ready' },
];

const ROLES: { id: ClinicianRole; label: string; desc: string }[] = [
  { id: 'doctor',        label: 'Medical Officer / Doctor', desc: 'Full clinical diagnostics, prescriptions & authorizations' },
  { id: 'nurse',         label: 'Staff Nurse / ANM',       desc: 'Triage, vitals, vaccinations, and consultation notes' },
  { id: 'health_worker', label: 'Community Health Worker', desc: 'Patient registration, field screening, local outreach' },
  { id: 'admin',         label: 'Station Administrator',   desc: 'Device management, mesh telemetry, data exports' },
];

export function SetupScreen() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [clinicName, setClinicName] = useState('Rural Health Outpost');
  const [role, setRole] = useState<ClinicianRole>('doctor');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  const { storageInfo, refreshStorageInfo, reloadDevice } = useDevice();
  const { enrollClinician } = useAuth();
  const navigate = useNavigate();

  const next = () => {
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleStorageStep = async () => {
    await refreshStorageInfo();
    next();
  };

  const validateProfileStep = () => {
    if (!displayName.trim()) {
      setError('Please enter your full name');
      return;
    }
    next();
  };

  const validateSecurityStep = () => {
    if (pin.length < 4 || pin.length > 6) {
      setError('PIN must be 4 to 6 numeric digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please verify your entry.');
      return;
    }
    next();
  };

  const handleFinish = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (pin.length < 4) {
      setError('Valid PIN is required');
      return;
    }

    setError('');
    setIsProvisioning(true);
    try {
      await enrollClinician(
        displayName.trim(),
        role,
        pin,
        clinicName.trim() || 'Rural Health Outpost'
      );
      await reloadDevice();
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Station enrollment failed. Please retry.');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-in">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 shadow-2xl shadow-cyan-900/60 mb-3 border border-white/20">
            <HeartIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">RuralCare Workstation</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-mono">Offline-First Healthcare OS • Node Provisioning</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6 px-3">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  i < step
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                    : i === step
                    ? 'bg-cyan-400 text-black ring-4 ring-cyan-500/20'
                    : 'bg-surface-card border border-surface-border text-slate-500'
                }`}
              >
                {i < step ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 transition-all ${
                    i < step ? 'bg-cyan-500' : 'bg-surface-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-black/50 border border-surface-borderLight p-6 bg-surface-card/95 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
            <h2 className="section-title text-base">{STEPS[step].title}</h2>
            <span className="text-[11px] font-mono text-slate-500">Step {step + 1} of {STEPS.length}</span>
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed">
                RuralCare works fully <strong className="text-cyan-400">without internet connectivity</strong>.
                Patient records and consultation histories are stored directly in an encrypted
                IndexedDB vault and synchronize safely once a network or peer mesh is detected.
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: WifiOffIcon, label: '100% Offline Resilience', sub: 'Create, search, and edit records anywhere in the field' },
                  { icon: ShieldIcon,  label: 'Salted Cryptographic Auth', sub: 'Zero-knowledge PIN protection with rate-limited cooldowns' },
                  { icon: DatabaseIcon, label: 'Distributed Outbox Engine', sub: 'Conflict-safe Lamport timestamp sync and audit logs' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                    <Icon className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">{label}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={next} className="btn-primary w-full mt-4 py-3 text-sm font-bold">
                Begin Provisioning →
              </button>
            </div>
          )}

          {/* Step 1: Profile & Role */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-xs">
                Configure your clinician profile and health post facility.
              </p>

              <div className="field">
                <label className="label text-xs" htmlFor="setup-name">Clinician Full Name</label>
                <input
                  id="setup-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && validateProfileStep()}
                  autoFocus
                />
              </div>

              <div className="field">
                <label className="label text-xs" htmlFor="setup-clinic">Primary Facility / Clinic Post</label>
                <input
                  id="setup-clinic"
                  type="text"
                  className="input"
                  placeholder="e.g. Primary Health Centre - Dharavi Post 4"
                  value={clinicName}
                  onChange={e => setClinicName(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label text-xs">Clinical Role & Authority</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {ROLES.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        role === r.id
                          ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500/50'
                          : 'bg-surface border-surface-border hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${role === r.id ? 'text-cyan-300' : 'text-white'}`}>
                          {r.label}
                        </span>
                        {role === r.id && <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                        {r.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="alert-error text-xs p-2.5 rounded-xl flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button onClick={validateProfileStep} className="btn-primary flex-1 font-bold">
                  Continue to Security →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Security PIN */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                <LockIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <p className="text-xs text-slate-300 leading-snug">
                  Choose a <strong className="text-white">4 to 6-digit numeric PIN</strong>.
                  This encrypts your local session and unlocks the tablet quickly during field shifts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="label text-xs" htmlFor="setup-pin">Set Access PIN (4-6 digits)</label>
                  <input
                    id="setup-pin"
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={e => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    className="input text-center text-lg tracking-[0.4em] font-mono font-bold"
                    placeholder="••••"
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label className="label text-xs" htmlFor="setup-confirm-pin">Confirm Access PIN</label>
                  <input
                    id="setup-confirm-pin"
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={e => {
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    onKeyDown={e => e.key === 'Enter' && validateSecurityStep()}
                    className="input text-center text-lg tracking-[0.4em] font-mono font-bold"
                    placeholder="••••"
                  />
                </div>
              </div>

              {/* Security features callout */}
              <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-1.5 text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold">Security Guardrails Activated:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                  <li>PBKDF2/SHA-256 with 16-byte random cryptographic salt</li>
                  <li>Inactivity auto-lock after 10 minutes without interaction</li>
                  <li>30s cooldown penalty enforced after 5 failed PIN attempts</li>
                </ul>
              </div>

              {error && (
                <div className="alert-error text-xs p-2.5 rounded-xl flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={validateSecurityStep} className="btn-primary flex-1 font-bold">
                  Continue to Storage →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Storage */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-xs leading-relaxed">
                RuralCare requests persistent local browser quota so clinical records, audio dictation,
                and synchronization logs are protected from automatic browser eviction.
              </p>
              {storageInfo && (
                <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs space-y-2.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available Storage</span>
                    <span className="text-white font-semibold">
                      {storageInfo.available !== null ? `${(storageInfo.available / 1e9).toFixed(1)} GB Available` : 'System Managed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Persistence Permission</span>
                    <span className={storageInfo.isPersistent ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {storageInfo.isPersistent ? '✓ Granted' : '⚠ Standard Cache'}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleStorageStep} className="btn-primary flex-1 font-bold">
                  Grant & Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Ready */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-2 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                  <CheckIcon className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-white">Workstation Ready for Service</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Device configured with cryptographic offline authentication.
                  </p>
                </div>
              </div>

              {/* Station Summary Pill */}
              <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-surface-border">
                  <span className="text-slate-400">Clinician</span>
                  <span className="text-white font-bold">{displayName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-surface-border">
                  <span className="text-slate-400">Role</span>
                  <span className="text-cyan-300 font-mono capitalize">{role}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-surface-border">
                  <span className="text-slate-400">Facility</span>
                  <span className="text-slate-200">{clinicName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Authentication</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Salted PIN Protection (Active)</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={handleFinish}
                  disabled={isProvisioning}
                  className="btn-primary flex-1 py-3 font-bold"
                >
                  {isProvisioning ? 'Enrolling Station…' : 'Launch RuralCare →'}
                </button>
              </div>
              {error && <p className="text-red-400 text-xs text-center font-mono">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
