import { useState } from 'react';
import { Database, ArrowUpRight, RotateCcw } from 'lucide-react';
import { seedPresentationClinic } from '@/data/presentationSeed';
import { useToast } from '@/context/ToastContext';

export function PresentationSeedCard(){
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const load = async (force = false) => {
    setBusy(true);
    try {
      const result = await seedPresentationClinic(force);
      addToast({
        type: result === 'occupied' ? 'warning' : 'success',
        title: result === 'occupied' ? 'Existing records preserved' : 'Presentation clinic ready',
        message: result === 'occupied'
          ? 'Use "Reset & Reload" to replace existing demo records with fresh synthetic data.'
          : '12 patient profiles, 15 visits, and 6 queued changes populated.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Records could not be loaded',
        message: 'Your existing records were preserved. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card presentation-seed-card">
      <span className="metric-icon mint"><Database size={20}/></span>
      <div className="flex-1">
        <h3>Presentation clinic & synthetic records</h3>
        <p>
          Populate your workspace with a complete realistic care journey: 12 patient profiles (with contact & Aadhar info), 15 clinical consultations with triage notes, and 6 outbox queue items.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={() => load(false)} disabled={busy}>
          {busy ? 'Preparing…' : 'Load records'}
          <ArrowUpRight size={16}/>
        </button>
        <button
          className="btn-ghost text-xs text-brand-700 hover:text-brand-800 flex items-center gap-1 px-3 py-2 border border-surface-border rounded-xl"
          onClick={() => {
            if (window.confirm('Reset and repopulate all demo clinical records with fresh synthetic data?')) {
              void load(true);
            }
          }}
          disabled={busy}
          title="Force reload all presentation records"
        >
          <RotateCcw size={14}/>
          <span>Reset & Reload</span>
        </button>
      </div>
    </section>
  );
}

