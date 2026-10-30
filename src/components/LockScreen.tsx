import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ShieldIcon, AlertIcon, LockIcon } from '@/components/Icons';

export function LockScreen() {
  const { clinician, unlock, isLocked, lockoutUntil, logout } = useAuth();
  const { addToast } = useToast();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!isLocked) return null;

  const isLockedOut = Boolean(lockoutUntil && Date.now() < lockoutUntil);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setIsUnlocking(true);
    setError('');

    try {
      const res = await unlock(pin);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Station Unlocked',
          message: 'Clinical session restored.',
          duration: 2500,
        });
        setPin('');
      } else {
        setError(res.error || 'Invalid PIN.');
        setPin('');
      }
    } catch {
      setError('Unlock failed. Please retry.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Station locked"
    >
      <div className="w-full max-w-sm card bg-surface-card border border-surface-borderLight p-6 shadow-2xl space-y-5 animate-slide-up text-center">
        {/* Lock Icon Banner */}
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-950/50">
          <LockIcon className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Station Locked</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Inactivity security timeout active (HIPAA Privacy Protection)
          </p>
        </div>

        {/* Clinician Pill */}
        <div className="p-2.5 rounded-xl bg-surface border border-surface-border flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center text-white font-bold font-mono text-sm flex-shrink-0">
            {clinician?.name ? clinician.name[0] : 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{clinician?.name ?? 'Clinician'}</p>
            <p className="text-[10px] text-cyan-400 font-mono capitalize">{clinician?.role ?? 'Doctor'}</p>
          </div>
          <ShieldIcon className="w-4 h-4 text-slate-400" />
        </div>

        {/* PIN input */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-center items-center gap-2.5 py-1">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full border transition-all ${
                    idx < pin.length
                      ? 'bg-cyan-400 border-cyan-300 shadow-md shadow-cyan-500/40 scale-110'
                      : 'bg-surface border-surface-border'
                  }`}
                />
              ))}
            </div>

            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              disabled={isLockedOut || isUnlocking}
              className="input text-center text-xl tracking-[0.5em] font-mono font-bold bg-surface"
              placeholder="••••••"
              autoFocus
            />
          </div>

          {error && (
            <div className="alert-error text-xs p-2.5 rounded-xl flex items-center gap-2 text-left">
              <AlertIcon className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Quick Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                disabled={isLockedOut || isUnlocking}
                className="py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-white font-mono text-base font-bold border border-surface-border transition"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-slate-400 font-mono text-xs border border-surface-border"
            >
              Clear
            </button>
            <button
              key="0"
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isLockedOut || isUnlocking}
              className="py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-white font-mono text-base font-bold border border-surface-border transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin(prev => prev.slice(0, -1))}
              className="py-2.5 rounded-xl bg-surface hover:bg-surface-hover text-slate-400 font-mono text-xs border border-surface-border"
            >
              ⌫
            </button>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={pin.length < 4 || isLockedOut || isUnlocking}
              className="btn-primary w-full py-3"
            >
              {isUnlocking ? 'Unlocking…' : 'Unlock Station'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="btn-ghost btn-sm w-full text-xs text-slate-400 hover:text-red-400"
            >
              Sign Out & Switch Clinician
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
