import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchPatients } from '@/db/patients';
import { useDevice } from '@/context/DeviceContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, calcAge } from '@/utils';
import { SyncBadge } from '@/components/StatusBadges';
import type { PatientListItem } from '@/types';
import {
  SearchIcon, PlusIcon, UsersIcon,
  ChevronRightIcon, ClipboardIcon,
} from '@/components/Icons';

type FilterType = 'all' | 'local' | 'synced';

function PatientCard({ patient }: { patient: PatientListItem }) {
  return (
    <div className="card-sm flex items-center justify-between gap-4 hover:border-cyan-500/40 hover:bg-surface-hover transition-all duration-150 group">
      <Link
        to={`/patients/${patient.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
        aria-label={`View ${patient.firstName} ${patient.lastName}'s medical profile`}
      >
        {/* Avatar with gradient border */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-700 to-indigo-800 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-lg shadow-black/40 border border-white/10 group-hover:scale-105 transition-transform">
          {patient.firstName[0]}{patient.lastName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
              {patient.firstName} {patient.lastName}
            </p>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {calcAge(patient.dateOfBirth)} yrs • {patient.sex}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>DOB: {formatDate(patient.dateOfBirth)}</span>
            <span>•</span>
            <span className="font-mono text-slate-500 text-[11px] truncate">
              ID: {patient.id.slice(0, 8)}
            </span>
          </div>
        </div>
      </Link>

      {/* Actions & Status */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <SyncBadge status={patient.syncStatus} />
        <Link
          to={`/consultations/new?patientId=${patient.id}`}
          className="btn-ghost btn-sm text-cyan-400 hover:text-white hover:bg-cyan-950/80 border border-cyan-800/60 hidden sm:inline-flex items-center gap-1.5"
          title="Start consultation"
        >
          <ClipboardIcon className="w-3.5 h-3.5" />
          <span>Consult</span>
        </Link>
        <Link to={`/patients/${patient.id}`} className="text-slate-500 group-hover:text-cyan-400 p-1">
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export function PatientsScreen() {
  const { device } = useDevice();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const results = await searchPatients(q, device?.orgId);
      setPatients(results);
    } finally {
      setIsLoading(false);
    }
  }, [device?.orgId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => load(query), 200);
    return () => clearTimeout(timer);
  }, [query, load]);

  // Initial load
  useEffect(() => { load(''); }, [load]);

  const filteredPatients = patients.filter(p => {
    if (filter === 'local') return p.syncStatus === 'local';
    if (filter === 'synced') return p.syncStatus === 'synced';
    return true;
  });

  const handleExportCSV = () => {
    if (patients.length === 0) return;
    const headers = ['ID', 'First Name', 'Last Name', 'DOB', 'Sex', 'Sync Status', 'Created At'];
    const rows = patients.map(p => [
      p.id,
      p.firstName,
      p.lastName,
      p.dateOfBirth,
      p.sex,
      p.syncStatus,
      p.createdAt,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ruralcare_patients_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Triage CSV Exported',
      message: `${patients.length} patient records exported for field roster.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title text-2xl font-extrabold tracking-tight">Patient Directory</h2>
          <p className="section-subtitle mt-0.5">
            {patients.length} registered patient{patients.length !== 1 ? 's' : ''} stored locally in station IndexedDB
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="btn-secondary btn-sm"
            title="Export local patient roster"
          >
            Export Roster
          </button>
          <button onClick={() => navigate('/patients/new')} className="btn-primary shadow-lg shadow-sky-900/30">
            <PlusIcon className="w-4 h-4" /> New Patient
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-sm space-y-3 bg-surface-card border-surface-border">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="patient-search"
            type="search"
            className="input pl-10 bg-surface border-surface-borderLight text-white placeholder-slate-400"
            placeholder="Search by first name, last name, phone number, or clinical ID…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search patients"
            autoComplete="off"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-surface-border text-xs">
          <span className="text-slate-400 font-mono text-[11px] mr-1">Filter:</span>
          {(['all', 'local', 'synced'] as FilterType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-lg font-medium transition-all capitalize ${
                filter === tab
                  ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-surface'
              }`}
            >
              {tab === 'all' ? `All (${patients.length})` : tab === 'local' ? `Saved on device (${patients.filter(p => p.syncStatus === 'local').length})` : `Synced (${patients.filter(p => p.syncStatus === 'synced').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-sm flex items-center gap-4">
              <div className="skeleton w-12 h-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="card">
          <div className="empty-state py-12">
            <div className="empty-icon"><UsersIcon className="w-7 h-7" /></div>
            {query ? (
              <>
                <p className="text-slate-200 font-semibold text-base">No patients match "{query}"</p>
                <p className="text-slate-400 text-sm">Check spelling or try a phone number or partial name</p>
                <button onClick={() => setQuery('')} className="btn-secondary btn-sm mt-2">Clear search query</button>
              </>
            ) : (
              <>
                <p className="text-slate-200 font-semibold text-base">No patients registered in this station</p>
                <p className="text-slate-400 text-sm">Add your first patient record to begin offline consultations</p>
                <button onClick={() => navigate('/patients/new')} className="btn-primary mt-3">
                  <PlusIcon className="w-4 h-4" /> Register Patient Intake
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPatients.map(p => <PatientCard key={p.id} patient={p} />)}
        </div>
      )}
    </div>
  );
}
