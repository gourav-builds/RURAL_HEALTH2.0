import { useVisualConnection } from '@/components/VisualConnection';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSync } from '@/context/SyncContext';
import { useDevice } from '@/context/DeviceContext';
import { useAuth } from '@/context/AuthContext';
import { CommandPalette } from '@/components/CommandPalette';
import { ClinicalAiAssistantModal } from '@/components/ClinicalAiAssistantModal';
import { SearchIcon, WifiOffIcon, LockIcon } from '@/components/Icons';

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { preview } = useVisualConnection();
  const { pathname } = useLocation();
  const { isOnline, pendingCount } = useSync();
  const online = preview ?? isOnline;
  const { device } = useDevice();
  const { lockStation } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'agent' | 'qa'>('agent');
  const [autoPlaybookId, setAutoPlaybookId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(value => !value); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        setModalTab('agent');
        setAutoPlaybookId(undefined);
        setAssistantOpen(value => !value);
      }
    };
    const openAgentHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: 'agent' | 'qa'; playbookId?: string }>;
      if (customEvent.detail?.tab) setModalTab(customEvent.detail.tab);
      setAutoPlaybookId(customEvent.detail?.playbookId);
      setAssistantOpen(true);
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('open-agent-modal', openAgentHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('open-agent-modal', openAgentHandler);
    };
  }, []);
  const section = pathname.startsWith('/patients') ? 'Patients' : pathname.startsWith('/consultations') ? 'Consultations' : pathname.startsWith('/sync') ? 'Sync center' : pathname.startsWith('/settings') ? 'Settings' : pathname.startsWith('/conflicts') ? 'Conflict review' : 'Overview';
  return <>
    <header className="app-topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
      <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{section}</strong></div>
      <button className="header-search" onClick={() => setSearchOpen(true)} aria-label="Search patients and commands"><SearchIcon className="w-4 h-4" /><span>Search anything...</span><kbd>Ctrl K</kbd></button>
      <div className="header-actions">
        <button
          onClick={() => {
            setModalTab('agent');
            setAutoPlaybookId(undefined);
            setAssistantOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-indigo-50 border border-cyan-300 text-cyan-800 hover:border-cyan-500 font-sans text-xs font-bold transition shadow-sm"
          title="Clinical AI Agent & Copilot (Ctrl+J)"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span>AI Agent</span>
        </button>
        <Link to="/sync" className={`connection-chip ${online ? '' : 'is-offline'}`} title={`${pendingCount} changes awaiting upload. Internet connection is separate from server sync.`}>{online ? <span className="connected-pulse" aria-hidden="true" /> : <WifiOffIcon className="w-4 h-4" />}<span>{online ? 'Connected' : 'Offline'}{preview!==null ? ' · preview' : ''}</span></Link><button className="header-lock" onClick={lockStation} aria-label="Lock workstation"><LockIcon className="w-4 h-4" /></button><span className="header-avatar" title={device?.displayName}>{device?.displayName?.slice(0, 1) || 'C'}</span>
      </div>
    </header>
    <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    <ClinicalAiAssistantModal
      isOpen={assistantOpen}
      onClose={() => {
        setAssistantOpen(false);
        setAutoPlaybookId(undefined);
      }}
      initialTab={modalTab}
      autoPlaybookId={autoPlaybookId}
    />
  </>;
}
