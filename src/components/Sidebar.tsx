import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon, UsersIcon, ClipboardIcon, RefreshIcon,
  SettingsIcon,
  HeartIcon, DatabaseIcon, LockIcon,
} from '@/components/Icons';
import { useSync } from '@/context/SyncContext';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import { formatBytes } from '@/utils';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  badgeColor?: string;
}

export function Sidebar() {
  const { pendingCount, conflictCount } = useSync();
  const { device, storageInfo } = useDevice();
  const { clinician, lockStation } = useAuth();

  const location = useLocation();

  const navItems: NavItem[] = [
    { to: '/dashboard',     icon: HomeIcon,      label: 'Dashboard' },
    { to: '/patients',      icon: UsersIcon,     label: 'Patients' },
    { to: '/consultations', icon: ClipboardIcon, label: 'Consultations' },
    {
      to: '/sync',
      icon: RefreshIcon,
      label: 'Sync Center',
      badge: (pendingCount + conflictCount) || undefined,
      badgeColor: conflictCount > 0 ? 'bg-red-500' : 'bg-cyan-600',
    },
    { to: '/settings',      icon: SettingsIcon,  label: 'Settings' },
  ];

  const percentUsed = storageInfo?.percentUsed ?? 1;

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col h-screen sticky top-0 select-none shadow-2xl">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-900/40 relative">
            <HeartIcon className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface-card animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-base tracking-tight font-sans">RuralCare</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Field Workstation</p>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        <p className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Core Workflows
        </p>

        {navItems.map(({ to, icon: Icon, label, badge, badgeColor }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/60 to-surface-hover text-white border border-cyan-500/30 shadow-lg shadow-cyan-950/20'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <span className="flex-1">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`${badgeColor ?? 'bg-cyan-600'} text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-mono`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Storage & Station Status Footer */}
      <div className="px-3 py-4 border-t border-surface-border space-y-3 bg-surface/50">
        {/* Local Storage Telemetry Meter */}
        <div className="p-3 rounded-xl bg-surface border border-surface-border space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <DatabaseIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Offline Cache</span>
            </div>
            <span className="font-mono text-slate-300 font-medium">
              {percentUsed}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 80 ? 'bg-amber-500' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>{storageInfo?.usage ? formatBytes(storageInfo.usage) : 'IndexedDB'}</span>
            <span>{storageInfo?.available ? `${formatBytes(storageInfo.available)} free` : 'Ready'}</span>
          </div>
        </div>

        {/* Clinician Node Identity & Quick Lock */}
        {device && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface border border-surface-border">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold font-mono flex-shrink-0 shadow-inner">
              {device.displayName ? device.displayName[0] : 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-white truncate leading-tight">{device.displayName}</p>
              </div>
              <p className="text-[10px] font-mono text-cyan-400 capitalize truncate">
                {clinician?.role ?? (device.role || 'Doctor')}
              </p>
            </div>
            <button
              onClick={lockStation}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-surface-hover transition"
              title="Lock Workstation (Ctrl+L)"
              aria-label="Lock Workstation"
            >
              <LockIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
