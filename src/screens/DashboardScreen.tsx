import { useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useDevice } from '@/context/DeviceContext';
import { useSync } from '@/context/SyncContext';
import { formatDateTime, calcAge } from '@/utils';
import { SyncBadge } from '@/components/StatusBadges';
import {
  UsersIcon, ClipboardIcon, PlusIcon, RefreshIcon,
  AlertIcon, ClockIcon, ChevronRightIcon,
} from '@/components/Icons';


export function DashboardScreen() {
  const { device } = useDevice();
  const { pendingCount, conflictCount, isSyncing, isOnline, lastSyncAt, triggerSync } = useSync();
  const navigate = useNavigate();

  const recentPatients = useLiveQuery(async () => {
    if (!device) return [];
    return db.patients
      .where('orgId').equals(device.orgId)
      .filter(p => !p.deletedAt)
      .reverse()
      .sortBy('updatedAt')
      .then(rows => rows.slice(0, 6));
  }, [device?.orgId]);

  const pendingReviews = useLiveQuery(async () => {
    if (!device) return [];
    return db.consultations
      .where('orgId').equals(device.orgId)
      .filter(c => c.clinicalStatus === 'awaiting_review' && !c.deletedAt)
      .reverse()
      .sortBy('updatedAt')
      .then(rows => rows.slice(0, 5));
  }, [device?.orgId]);

  const totalPatients = useLiveQuery(async () => {
    if (!device) return 0;
    return db.patients.where('orgId').equals(device.orgId).filter(p => !p.deletedAt).count();
  }, [device?.orgId], 0);

  const totalConsultations = useLiveQuery(async () => {
    if (!device) return 0;
    return db.consultations.where('orgId').equals(device.orgId).filter(c => !c.deletedAt).count();
  }, [device?.orgId], 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {greeting}{device ? `, ${device.displayName.split(' ')[0]}` : ''}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => navigate('/patients/new')} className="btn-primary flex-shrink-0">
          <PlusIcon className="w-4 h-4" /> New patient
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total patients',      value: totalPatients,        icon: UsersIcon,     color: 'text-brand-400',  bg: 'bg-brand-900/30' },
          { label: 'Consultations',       value: totalConsultations,   icon: ClipboardIcon, color: 'text-sky-400',    bg: 'bg-sky-900/30' },
          { label: 'Pending review',      value: pendingReviews?.length ?? 0, icon: ClockIcon, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Pending sync',        value: pendingCount,         icon: RefreshIcon,   color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card-sm flex items-center gap-4">
            <div className={`${bg} rounded-xl p-3 flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value ?? '–'}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent patients */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Recent Patients</h3>
            <Link to="/patients" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!recentPatients || recentPatients.length === 0 ? (
            <div className="card">
              <div className="empty-state py-10">
                <div className="empty-icon"><UsersIcon className="w-6 h-6" /></div>
                <p className="text-slate-400 text-sm font-medium">No patients yet</p>
                <button onClick={() => navigate('/patients/new')} className="btn-primary btn-sm mt-1">
                  <PlusIcon className="w-3.5 h-3.5" /> Register first patient
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPatients.map(patient => (
                <Link
                  key={patient.id}
                  to={`/patients/${patient.id}`}
                  className="card-sm flex items-center gap-4 hover:bg-surface-hover transition-colors cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-700 to-sky-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {calcAge(patient.dateOfBirth)} yrs · {patient.sex} · {formatDateTime(patient.updatedAt)}
                    </p>
                  </div>
                  <SyncBadge status={patient.syncStatus} />
                  <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Sync status card */}
          <div className="card space-y-3">
            <h3 className="section-title">Sync Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Connection</span>
                <span className={isOnline ? 'text-green-400 font-medium' : 'text-amber-400 font-medium'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pending ops</span>
                <span className={pendingCount > 0 ? 'text-violet-400 font-medium' : 'text-slate-300'}>{pendingCount}</span>
              </div>
              {conflictCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Conflicts</span>
                  <Link to="/sync" className="text-red-400 font-medium hover:text-red-300">{conflictCount} — resolve</Link>
                </div>
              )}
              {lastSyncAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Last synced</span>
                  <span className="text-slate-300">{formatDateTime(lastSyncAt)}</span>
                </div>
              )}
            </div>
            {isOnline && (
              <button onClick={triggerSync} disabled={isSyncing} className="btn-secondary btn-sm w-full">
                <RefreshIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin-slow' : ''}`} />
                {isSyncing ? 'Syncing…' : 'Sync now'}
              </button>
            )}
          </div>

          {/* Pending reviews */}
          {(pendingReviews?.length ?? 0) > 0 && (
            <div className="card space-y-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-amber-400" />
                <h3 className="section-title text-base">Awaiting Review</h3>
              </div>
              <div className="space-y-2">
                {pendingReviews!.map(c => (
                  <Link
                    key={c.id}
                    to={`/consultations/${c.id}`}
                    className="block p-3 rounded-xl bg-surface hover:bg-surface-hover transition-colors border border-surface-border"
                  >
                    <p className="text-sm text-white font-medium truncate">{c.chiefComplaint}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(c.updatedAt)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Conflicts alert */}
          {conflictCount > 0 && (
            <Link to="/sync" className="block">
              <div className="alert-error cursor-pointer hover:bg-red-900/50 transition-colors">
                <AlertIcon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-300">{conflictCount} sync conflict{conflictCount !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-400 mt-0.5">Clinician review required. Tap to resolve.</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
