import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db';
import { useDevice } from '@/context/DeviceContext';
import { useSync } from '@/context/SyncContext';
import { useToast } from '@/context/ToastContext';
import type { Patient } from '@/types';
import {
  SearchIcon, UsersIcon, ClipboardIcon, PlusIcon,
  RefreshIcon, SettingsIcon, HomeIcon, XIcon,
} from '@/components/Icons';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const { device } = useDevice();
  const { triggerSync } = useSync();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search patients as user types
  useEffect(() => {
    if (!query.trim() || !device) {
      setPatientResults([]);
      return;
    }
    const q = query.toLowerCase().trim();
    db.patients
      .where('orgId')
      .equals(device.orgId)
      .filter(p => Boolean(!p.deletedAt && (
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        (p.phone ? p.phone.includes(q) : false)
      )))
      .limit(5)
      .toArray()
      .then(setPatientResults);
  }, [query, device]);


  // Static actions
  const staticActions = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      icon: HomeIcon,
      action: () => navigate('/dashboard'),
    },
    {
      id: 'new_patient',
      label: 'Register New Patient',
      category: 'Clinical Intake',
      icon: PlusIcon,
      action: () => navigate('/patients/new'),
    },
    {
      id: 'new_consultation',
      label: 'Start New Clinical Consultation',
      category: 'Clinical Notes',
      icon: ClipboardIcon,
      action: () => navigate('/consultations/new'),
    },
    {
      id: 'sync_center',
      label: 'Open Sync Center & 3D Topology',
      category: 'Network',
      icon: RefreshIcon,
      action: () => navigate('/sync'),
    },
    {
      id: 'trigger_sync',
      label: 'Trigger Immediate Telemetry Sync',
      category: 'Network',
      icon: RefreshIcon,
      action: () => {
        addToast({ type: 'info', title: 'Sync Triggered', message: 'Reconciling outbox ledger…' });
        triggerSync();
      },
    },
    {
      id: 'settings',
      label: 'Open Station Settings & Storage',
      category: 'System',
      icon: SettingsIcon,
      action: () => navigate('/settings'),
    },
  ];

  // Filtered actions based on query
  const filteredActions = query.trim()
    ? staticActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
    : staticActions;

  // Combine results
  const allItems = [
    ...patientResults.map(p => ({
      id: `p-${p.id}`,
      label: `${p.firstName} ${p.lastName} (${p.sex}, DOB: ${p.dateOfBirth})`,
      category: 'Patient Record',
      icon: UsersIcon,
      action: () => navigate(`/patients/${p.id}`),
    })),
    ...filteredActions,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-card border border-surface-borderLight rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-surface-border">
          <SearchIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none font-sans"
            placeholder="Search patients, start consultation, jump to screen… (Esc to exit)"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface transition"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching patients or commands found.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-900/60 to-surface-hover text-white border border-brand-500/30'
                      : 'text-slate-300 hover:bg-surface hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-brand-500/20 text-cyan-400' : 'bg-surface text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider ml-2 flex-shrink-0">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-surface border-t border-surface-border flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-cyan-400">RuralCare Clinical Workstation</span>
        </div>
      </div>
    </div>
  );
}
