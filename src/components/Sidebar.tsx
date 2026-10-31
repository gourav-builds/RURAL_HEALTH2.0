import { NavLink } from 'react-router-dom';
import { HomeIcon, UsersIcon, ClipboardIcon, RefreshIcon, SettingsIcon, HeartIcon, LockIcon, ChevronRightIcon } from '@/components/Icons';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { device } = useDevice();
  const { clinician, lockStation } = useAuth();
  const { pendingCount } = useSync();
  return <aside className="app-sidebar">
    <NavLink to="/dashboard" className="brand-lockup" onClick={onNavigate}><span className="brand-mark"><HeartIcon className="w-6 h-6" /></span><span>RuralCare<span className="brand-caption">CARE WITHOUT BOUNDARIES</span></span></NavLink>
    <div className="clinic-switcher"><span className="clinic-symbol">+</span><div><strong>{device?.clinicName || 'Your clinic'}</strong><span>Clinical workspace</span></div></div>
    <p className="nav-caption">WORKSPACE</p>
    <nav aria-label="Main navigation" className="sidebar-nav">
      {[
        { to: '/dashboard', label: 'Overview', icon: HomeIcon },
        { to: '/patients', label: 'Patients', icon: UsersIcon },
        { to: '/consultations', label: 'Consultations', icon: ClipboardIcon },
        { to: '/sync', label: 'Sync center', icon: RefreshIcon },
      ].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon className={`w-5 h-5 ${to === "/sync" && pendingCount > 0 ? "pending-motion" : ""}`} /><span>{label}</span>{to === '/sync' && pendingCount > 0 ? <b className="nav-count">{pendingCount}</b> : null}</NavLink>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="offline-note"><span className="offline-note-icon"><HeartIcon className="w-5 h-5" /></span><strong>Care goes on.<br />Even offline.</strong><p>Your clinical workspace stays available, wherever care takes you.</p><NavLink to="/sync" onClick={onNavigate}>View local records <ChevronRightIcon className="w-4 h-4" /></NavLink></div>
      <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><SettingsIcon className="w-5 h-5" />Settings</NavLink>
      <div className="sidebar-profile"><div className="profile-avatar">{(clinician?.name || device?.displayName || 'C').slice(0, 1)}</div><div><strong>{clinician?.name || device?.displayName || 'Clinician'}</strong><span>{(clinician?.role || 'Care team').replaceAll('_', ' ')}</span></div><button onClick={lockStation} aria-label="Lock workstation"><LockIcon className="w-4 h-4" /></button></div>
    </div>
  </aside>;
}
