import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { CareSculpture } from '@/components/CareSculpture';
import {
  AlertIcon, CheckIcon, ArrowLeftIcon, KeyIcon,
} from '@/components/Icons';

export function ForgotPasswordScreen() {
  const { device, resetPinWithSecurityAnswer, resetStation } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'recovery_question' | 're_enroll'>('recovery_question');
  const [answer, setAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const securityQuestion = device?.securityQuestion || 'What was your first clinical posting or facility?';

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!answer.trim()) {
      setError('Please enter the answer to the security recovery question.');
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setError('New PIN must be 4 to 6 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PIN entries do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPinWithSecurityAnswer(answer.trim(), newPin);
      if (res.success) {
        setSuccess(true);
        addToast({
          type: 'success',
          title: 'PIN Reset Successfully',
          message: 'Your new clinical access PIN is active. You can now unlock your station.',
          duration: 4000,
        });
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1200);
      } else {
        setError(res.error || 'Recovery verification failed.');
      }
    } catch {
      setError('Cryptographic verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStationReEnroll = async () => {
    if (window.confirm('Resetting station enrollment will clear the clinician profile so a new one can be created. Patient and clinical consultation records in your database will remain preserved. Continue?')) {
      await resetStation();
      addToast({
        type: 'info',
        title: 'Station Reset',
        message: 'Station credentials cleared. Please proceed with setup.',
      });
      navigate('/setup', { replace: true });
    }
  };

  return (
    <div className="auth-screen min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden select-none">
      <aside className="auth-artwork">
        <span className="auth-brand">RuralCare<span>CARE WITHOUT BOUNDARIES</span></span>
        <div>
          <p className="hero-kicker">STATION CREDENTIAL RECOVERY</p>
          <h2>Lost your PIN?<br/><span>We’ve got you covered.</span></h2>
          <p>Autonomous offline recovery ensures you never lose access to patient care even when completely disconnected.</p>
        </div>
        <CareSculpture />
        <footer>100% Offline Cryptographic Verification • No Cloud Dependency</footer>
      </aside>

      <div className="relative w-full max-w-md animate-fade-in space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-100 via-sky-100 to-indigo-100 shadow-2xl shadow-slate-200/40 mb-1 border border-white/20">
            <KeyIcon className="w-8 h-8 text-ink" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight font-sans">
            Recover Access PIN
          </h1>
          <p className="text-xs text-slate-600 font-sans">
            {device?.clinicName ?? 'Rural Care Station'} • Clinician: {device?.displayName ?? 'Field Worker'}
          </p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl shadow-slate-200/40 border border-surface-borderLight space-y-5 p-6 bg-surface-card/95 backdrop-blur-md">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-surface p-1 border border-surface-border gap-1">
            <button
              type="button"
              onClick={() => { setMode('recovery_question'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 'recovery_question'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Security Question
            </button>
            <button
              type="button"
              onClick={() => { setMode('re_enroll'); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                mode === 're_enroll'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Emergency Re-Enroll
            </button>
          </div>

          {mode === 'recovery_question' ? (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Security Recovery Question
                </span>
                <p className="text-xs font-bold text-ink">
                  {securityQuestion}
                </p>
              </div>

              <div className="field">
                <label className="label text-xs font-semibold" htmlFor="rec-answer">
                  Your Secret Answer
                </label>
                <input
                  id="rec-answer"
                  type="text"
                  value={answer}
                  onChange={e => {
                    setAnswer(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter the answer you gave during setup"
                  className="input text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="label text-xs font-semibold" htmlFor="rec-new-pin">
                    New PIN (4-6 digits)
                  </label>
                  <input
                    id="rec-new-pin"
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={e => {
                      setNewPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    placeholder="••••"
                    className="input text-center text-lg tracking-[0.3em] font-sans font-bold"
                  />
                </div>
                <div className="field">
                  <label className="label text-xs font-semibold" htmlFor="rec-confirm-pin">
                    Confirm New PIN
                  </label>
                  <input
                    id="rec-confirm-pin"
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={e => {
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    placeholder="••••"
                    className="input text-center text-lg tracking-[0.3em] font-sans font-bold"
                  />
                </div>
              </div>

              {error && (
                <div className="alert-error text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-500/40 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="font-semibold">PIN reset successfully! Redirecting to login…</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || success || !answer.trim() || newPin.length < 4}
                className="btn-primary w-full py-3.5 shadow-xl text-sm font-bold tracking-wide"
              >
                {isSubmitting ? 'Verifying & Re-encrypting…' : 'Update Access PIN'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-500/40 text-left space-y-2">
                <div className="flex items-center gap-2">
                  <AlertIcon className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-900">Emergency Station Re-Provisioning</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed font-sans">
                  If you have forgotten both your access PIN and your security answer, you can reset the station configuration.
                  All previously recorded patients and consultations in IndexedDB are preserved.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStationReEnroll}
                className="btn-primary w-full py-3.5 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white border-none"
              >
                Re-Provision Clinician Profile →
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs font-sans">
            <Link to="/login" className="flex items-center gap-1.5 text-slate-600 hover:text-ink transition font-medium">
              <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
            <span className="text-slate-500 text-[11px]">SHA-256 Salted Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
}
