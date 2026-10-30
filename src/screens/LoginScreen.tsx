import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  HeartIcon, ShieldIcon, AlertIcon, CheckIcon,
  WifiOffIcon, DatabaseIcon,
} from '@/components/Icons';

export function LoginScreen() {
  const { clinician, device, login, isEnrolled, isAuthenticated, lockoutUntil } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEnrolled) {
      navigate('/setup', { replace: true });
    } else if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isEnrolled, isAuthenticated, navigate]);

  if (!isEnrolled || isAuthenticated) {
    return null;
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your clinical access PIN');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await login(pin);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Authentication Successful',
          message: `Welcome back, ${clinician?.name ?? 'Clinician'}. Workstation session active.`,
        });
        navigate('/dashboard', { replace: true });
      } else {
        setError(res.error || 'Authentication rejected. Incorrect PIN.');
        setPin('');
      }
    } catch {
      setError('Unexpected cryptographic error. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
    }
  };

  const handleKeypadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const isLockedOut = Boolean(lockoutUntil && Date.now() < lockoutUntil);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background radial glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in space-y-6">
        {/* Brand & Station Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 shadow-2xl shadow-cyan-900/50 mb-1 border border-white/20">
            <HeartIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-sans">
            RuralCare Workstation
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {device?.clinicName ?? 'Rural Health Outpost'} • Node {device?.deviceId.slice(0, 8)}
          </p>
        </div>

        {/* Login Challenge Card */}
        <div className="card shadow-2xl shadow-black/60 border border-surface-borderLight space-y-5 p-6 bg-surface-card/95 backdrop-blur-md">
          {/* Clinician Profile Badge */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-base font-mono flex-shrink-0 shadow-inner">
              {clinician?.name ? clinician.name[0] : 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm truncate">{clinician?.name ?? 'Enrolled Clinician'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 capitalize">
                  {clinician?.role ?? 'Doctor'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {clinician?.lastLoginAt ? `Last session: ${new Date(clinician.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Station Encrypted'}
              </p>
            </div>
            <ShieldIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 text-center font-mono">
                Enter Clinical Access PIN
              </label>

              {/* PIN Dots Display */}
              <div className="flex justify-center items-center gap-3 py-2">
                {[0, 1, 2, 3, 4, 5].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      idx < pin.length
                        ? 'bg-cyan-400 border-cyan-300 shadow-md shadow-cyan-500/50 scale-110'
                        : 'bg-surface border-surface-border'
                    }`}
                  />
                ))}
              </div>

              {/* Standard text input (hidden or accessible fallback) */}
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    setError('');
                  }}
                  disabled={isLockedOut || isSubmitting}
                  className="input text-center text-xl tracking-[0.5em] font-mono font-bold bg-surface border-surface-borderLight"
                  placeholder="••••••"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="alert-error text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertIcon className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Tactile Touch Keypad for Tablets & Field Devices */}
            <div className="grid grid-cols-3 gap-2 pt-1 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  disabled={isLockedOut || isSubmitting}
                  className="py-3 rounded-xl bg-surface hover:bg-surface-hover active:bg-cyan-950 text-white font-mono text-lg font-bold border border-surface-border transition shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                disabled={isLockedOut || isSubmitting}
                className="py-3 rounded-xl bg-surface hover:bg-surface-hover text-slate-400 hover:text-white font-mono text-xs font-semibold border border-surface-border transition"
              >
                Clear
              </button>
              <button
                key="0"
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={isLockedOut || isSubmitting}
                className="py-3 rounded-xl bg-surface hover:bg-surface-hover active:bg-cyan-950 text-white font-mono text-lg font-bold border border-surface-border transition shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                disabled={isLockedOut || isSubmitting}
                className="py-3 rounded-xl bg-surface hover:bg-surface-hover text-slate-400 hover:text-white font-mono text-xs font-semibold border border-surface-border transition"
                aria-label="Backspace"
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              disabled={pin.length < 4 || isLockedOut || isSubmitting}
              className="btn-primary w-full py-3.5 shadow-xl shadow-cyan-950/40 text-sm font-bold tracking-wide mt-2"
            >
              {isSubmitting ? 'Verifying Keyring…' : 'Unlock Station Session'}
            </button>
          </form>

          {/* Quick Setup / Re-enroll Option */}
          <div className="pt-2 border-t border-surface-border text-center">
            <button
              onClick={() => {
                if (window.confirm('Re-enroll station? This allows configuring a new clinician profile or PIN.')) {
                  navigate('/setup');
                }
              }}
              className="text-xs text-slate-400 hover:text-cyan-400 font-mono transition"
            >
              Switch Clinician / Re-enroll Station →
            </button>
          </div>
        </div>

        {/* Security & Offline Guarantees Footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Salted PBKDF2 / SHA-256</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOffIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>100% Offline Auth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DatabaseIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Encrypted Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
