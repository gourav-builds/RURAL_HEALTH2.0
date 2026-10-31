import { CareSculpture } from '@/components/CareSculpture';
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
    <div className="auth-screen min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden select-none">
      <aside className="auth-artwork"><span className="auth-brand">RuralCare<span>CARE WITHOUT BOUNDARIES</span></span><div><p className="hero-kicker">BUILT FOR THE PEOPLE WHO CARE</p><h2>Exceptional care.<br/><span>Everywhere.</span></h2><p>A calmer clinical workspace. A closer connection to your community.</p></div><CareSculpture/><footer>Offline-first. Patient-focused. Always within reach.</footer></aside>
      {/* Background radial glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in space-y-6">
        {/* Brand & Station Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-100 via-sky-100 to-indigo-100 shadow-2xl shadow-slate-200/40 mb-1 border border-white/20">
            <HeartIcon className="w-8 h-8 text-ink" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight font-sans">
            RuralCare Workstation
          </h1>
          <p className="text-xs text-slate-600 font-sans">
            {device?.clinicName ?? 'Rural Health Outpost'} • Node {device?.deviceId.slice(0, 8)}
          </p>
        </div>

        {/* Login Challenge Card */}
        <div className="card shadow-2xl shadow-slate-200/40 border border-surface-borderLight space-y-5 p-6 bg-surface-card/95 backdrop-blur-md">
          {/* Clinician Profile Badge */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-surface-border">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-100 to-indigo-100 flex items-center justify-center text-ink font-extrabold text-base font-sans flex-shrink-0 shadow-inner">
              {clinician?.name ? clinician.name[0] : 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink text-sm truncate">{clinician?.name ?? 'Enrolled Clinician'}</span>
                <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 capitalize">
                  {clinician?.role ?? 'Doctor'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                {clinician?.lastLoginAt ? `Last session: ${new Date(clinician.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Station Encrypted'}
              </p>
            </div>
            <ShieldIcon className="w-5 h-5 text-cyan-700 flex-shrink-0" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 text-center font-sans">
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
                  className="input text-center text-xl tracking-[0.5em] font-sans font-bold bg-surface border-surface-borderLight"
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
                  className="py-3 rounded-xl bg-surface hover:bg-surface-hover active:bg-cyan-50 text-ink font-sans text-lg font-bold border border-surface-border transition shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                disabled={isLockedOut || isSubmitting}
                className="py-3 rounded-xl bg-surface hover:bg-surface-hover text-slate-600 hover:text-ink font-sans text-xs font-semibold border border-surface-border transition"
              >
                Clear
              </button>
              <button
                key="0"
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={isLockedOut || isSubmitting}
                className="py-3 rounded-xl bg-surface hover:bg-surface-hover active:bg-cyan-50 text-ink font-sans text-lg font-bold border border-surface-border transition shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadBackspace}
                disabled={isLockedOut || isSubmitting}
                className="py-3 rounded-xl bg-surface hover:bg-surface-hover text-slate-600 hover:text-ink font-sans text-xs font-semibold border border-surface-border transition"
                aria-label="Backspace"
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              disabled={pin.length < 4 || isLockedOut || isSubmitting}
              className="btn-primary w-full py-3.5 shadow-xl shadow-slate-200/40 text-sm font-bold tracking-wide mt-2"
            >
              {isSubmitting ? 'Verifying Keyring…' : 'Unlock Station Session'}
            </button>
          </form>

          {/* Forgot PIN / Password & Station Re-enroll Options */}
          <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs font-sans">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="font-semibold text-cyan-700 hover:text-cyan-800 transition flex items-center gap-1"
            >
              Forgot PIN / Password?
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Re-enroll station? This allows configuring a new clinician profile or PIN. Existing patient data is kept.')) {
                  navigate('/setup');
                }
              }}
              className="text-slate-600 hover:text-ink font-sans transition"
            >
              Re-enroll Station →
            </button>
          </div>
        </div>

        {/* Security & Offline Guarantees Footer */}
        <div className="flex items-center justify-center gap-4 text-xs font-sans text-slate-600">
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span>Salted PBKDF2 / SHA-256</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOffIcon className="w-3.5 h-3.5 text-cyan-700" />
            <span>100% Offline Auth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DatabaseIcon className="w-3.5 h-3.5 text-indigo-700" />
            <span>Encrypted Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
