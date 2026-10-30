/** First-time setup / device provisioning screen */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/context/DeviceContext';
import { HeartIcon, ShieldIcon, WifiOffIcon, DatabaseIcon, CheckIcon } from '@/components/Icons';

const STEPS = [
  { id: 'welcome',  title: 'Welcome to RuralCare' },
  { id: 'profile',  title: 'Your Name' },
  { id: 'storage',  title: 'Offline Storage' },
  { id: 'ready',    title: "You're Ready" },
];

export function SetupScreen() {
  const [step, setStep]             = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [error, setError]           = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const { provisionDevice, storageInfo, refreshStorageInfo } = useDevice();
  const navigate = useNavigate();

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));

  const handleStorageStep = async () => {
    await refreshStorageInfo();
    next();
  };

  const handleFinish = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    setIsProvisioning(true);
    try {
      await provisionDevice(displayName.trim());
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError('Setup failed. Please try again.');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-sky-400 shadow-2xl shadow-brand-900/60 mb-4">
            <HeartIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RuralCare</h1>
          <p className="text-slate-400 text-sm mt-1">Offline-first healthcare records</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                i < step ? 'bg-brand-600 text-white' :
                i === step ? 'bg-brand-500 text-white ring-2 ring-brand-400 ring-offset-2 ring-offset-surface' :
                'bg-surface-card border border-surface-border text-slate-500'
              }`}>
                {i < step ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-brand-600' : 'bg-surface-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-black/40">
          <h2 className="section-title mb-1">{STEPS[step].title}</h2>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4 mt-4">
              <p className="text-slate-400 text-sm leading-relaxed">
                RuralCare works fully <strong className="text-white">without internet access</strong>.
                Patient records are saved directly on this device, encrypted,
                and synchronized to the server when connectivity returns.
              </p>
              <div className="space-y-3">
                {[
                  { icon: WifiOffIcon, label: 'Works 100% offline',            sub: 'Create and view records without internet' },
                  { icon: ShieldIcon,  label: 'Encrypted local storage',        sub: 'Clinical data never leaves the device unencrypted' },
                  { icon: DatabaseIcon, label: 'Conflict-safe synchronization', sub: 'Concurrent edits are detected and resolved' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                    <Icon className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={next} className="btn-primary w-full mt-2">Get started</button>
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-4 mt-4">
              <p className="text-slate-400 text-sm">
                Enter your name as it will appear on consultation records and audit logs.
              </p>
              <div className="field">
                <label className="label" htmlFor="setup-name">Your full name</label>
                <input
                  id="setup-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && displayName.trim() && next()}
                  autoFocus
                  autoComplete="name"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                <button
                  onClick={() => { if (!displayName.trim()) { setError('Please enter your name'); return; } setError(''); next(); }}
                  className="btn-primary flex-1"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Storage */}
          {step === 2 && (
            <div className="space-y-4 mt-4">
              <p className="text-slate-400 text-sm leading-relaxed">
                RuralCare needs permission to store data persistently on this device.
                Without it, the browser may delete records when storage runs low.
              </p>
              {storageInfo && (
                <div className="p-3 rounded-xl bg-surface border border-surface-border text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available storage</span>
                    <span className="text-white font-medium">
                      {storageInfo.available !== null ? `${(storageInfo.available / 1e9).toFixed(1)} GB` : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Persistent storage</span>
                    <span className={storageInfo.isPersistent ? 'text-green-400 font-medium' : 'text-amber-400 font-medium'}>
                      {storageInfo.isPersistent ? '✓ Granted' : '⚠ Not granted'}
                    </span>
                  </div>
                </div>
              )}
              {!storageInfo?.isPersistent && (
                <div className="alert-warning text-xs">
                  <p>Persistent storage was not granted. Records may be cleared by the browser under storage pressure. You can allow it in browser settings.</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleStorageStep} className="btn-primary flex-1">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center">
                  <CheckIcon className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-slate-300 text-sm text-center">
                  This device is provisioned for <strong className="text-white">{displayName}</strong>.
                  You can now create patient records offline.
                </p>
                <div className="alert-info w-full text-xs">
                  <p>
                    <strong>M2 note:</strong> Full authentication, end-to-end encryption, and server
                    enrollment will be added in Milestone 2. Records saved now are in plaintext.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleFinish} disabled={isProvisioning} className="btn-primary flex-1">
                  {isProvisioning ? 'Setting up…' : 'Open RuralCare'}
                </button>
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
