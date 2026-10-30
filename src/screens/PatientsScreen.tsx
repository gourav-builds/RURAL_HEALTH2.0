import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchPatients } from '@/db/patients';
import { useDevice } from '@/context/DeviceContext';
import { formatDate, calcAge } from '@/utils';
import { SyncBadge } from '@/components/StatusBadges';
import type { PatientListItem } from '@/types';
import {
  SearchIcon, PlusIcon, UsersIcon,
  ChevronRightIcon,
} from '@/components/Icons';


function PatientCard({ patient }: { patient: PatientListItem }) {
  return (
    <Link
      to={`/patients/${patient.id}`}
      className="card-sm flex items-center gap-4 hover:bg-surface-hover transition-all duration-150 cursor-pointer group"
      aria-label={`View ${patient.firstName} ${patient.lastName}'s profile`}
    >
      {/* Avatar */}
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-700 to-sky-700 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm shadow-md">
        {patient.firstName[0]}{patient.lastName[0]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">
          {patient.firstName} {patient.lastName}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {calcAge(patient.dateOfBirth)} yrs · {patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)} ·{' '}
          DOB: {formatDate(patient.dateOfBirth)}
        </p>
        {patient.consultationCount !== undefined && (
          <p className="text-xs text-slate-600 mt-0.5">
            {patient.consultationCount} consultation{patient.consultationCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <SyncBadge status={patient.syncStatus} />
        <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
      </div>
    </Link>
  );
}

export function PatientsScreen() {
  const { device } = useDevice();
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="section-title text-xl">Patients</h2>
          <p className="section-subtitle mt-0.5">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} on this device
          </p>
        </div>
        <button onClick={() => navigate('/patients/new')} className="btn-primary flex-shrink-0">
          <PlusIcon className="w-4 h-4" /> Register
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          id="patient-search"
          type="search"
          className="input pl-10"
          placeholder="Search by name or ID…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search patients"
          autoComplete="off"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="card-sm flex items-center gap-4">
              <div className="skeleton w-11 h-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-40 rounded" />
                <div className="skeleton h-2.5 w-28 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><UsersIcon className="w-6 h-6" /></div>
            {query ? (
              <>
                <p className="text-slate-300 font-medium">No patients match "{query}"</p>
                <p className="text-slate-500 text-sm">Try a different name or clear the search</p>
                <button onClick={() => setQuery('')} className="btn-ghost btn-sm mt-1">Clear search</button>
              </>
            ) : (
              <>
                <p className="text-slate-300 font-medium">No patients registered yet</p>
                <p className="text-slate-500 text-sm">Start by registering your first patient</p>
                <button onClick={() => navigate('/patients/new')} className="btn-primary btn-sm mt-1">
                  <PlusIcon className="w-3.5 h-3.5" /> Register patient
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map(p => <PatientCard key={p.id} patient={p} />)}
        </div>
      )}
    </div>
  );
}
