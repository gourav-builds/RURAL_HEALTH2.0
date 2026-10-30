/** Sidebar navigation component */
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon, UsersIcon, ClipboardIcon, RefreshIcon,
  SettingsIcon, ShieldIcon, WifiIcon, WifiOffIcon,
  HeartIcon,
} from '@/components/Icons';

import { useSync } from '@/context/SyncContext';
import { useDevice } from '@/context/DeviceContext';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}

export function Sidebar() {
  const { isOnline, pendingCount, conflictCount, isSyncing, triggerSync } = useSync();
  const { device } = useDevice();
  const location = useLocation();

  const navItems: NavItem[] = [
    { to: '/dashboard',   icon: HomeIcon,      label: 'Dashboard' },
    { to: '/patients',    icon: UsersIcon,     label: 'Patients' },
    { to: '/consultations', icon: ClipboardIcon, label: 'Consultations' },
    { to: '/sync',        icon: RefreshIcon,   label: 'Sync',     badge: (pendingCount + conflictCount) || undefined },
    { to: '/settings',    icon: SettingsIcon,  label: 'Settings' },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-900/50">
            <HeartIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">RuralCare</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Offline Healthcare</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={isActive ? 'nav-item-active' : 'nav-item'}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status bar */}
      <div className="px-3 py-4 border-t border-surface-border space-y-2">
        {/* Online status */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface text-xs">
          {isOnline ? (
            <WifiIcon className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOffIcon className="w-4 h-4 text-amber-400" />
          )}
          <span className={isOnline ? 'text-green-400' : 'text-amber-400'}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
          {pendingCount > 0 && (
            <span className="ml-auto text-slate-500">{pendingCount} pending</span>
          )}
        </div>

        {/* Sync button */}
        {isOnline && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="w-full btn-ghost btn-sm flex items-center gap-2"
            aria-label="Trigger synchronisation"
          >
            <RefreshIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin-slow' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}

        {/* Device identity */}
        {device && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface text-xs text-slate-500">
            <ShieldIcon className="w-4 h-4 text-brand-500" />
            <span className="truncate">{device.displayName}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
