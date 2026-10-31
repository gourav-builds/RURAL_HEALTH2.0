import { VisualConnectionProvider, useVisualConnection } from '@/components/VisualConnection';
import { useDevice } from '@/context/DeviceContext';
import { useToast } from '@/context/ToastContext';
import { seedPresentationClinic } from '@/data/presentationSeed';
import { NavLink } from 'react-router-dom';
import { House,Users,ClipboardList,Cloud,Settings } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { StorageWarningBanner } from '@/components/StorageWarningBanner';

function Workspace() {
  const {preview}=useVisualConnection();
  const {device}=useDevice();
  const {addToast}=useToast();
  useEffect(()=>{if(device?.orgId === "ui-qa-synthetic")void seedPresentationClinic().catch(()=>addToast({type:"error",title:"Presentation records unavailable",message:"Existing records were left intact."}));},[device?.orgId,addToast]);
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => { main.current?.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { if (menuOpen) drawer.current?.showModal(); else drawer.current?.close(); }, [menuOpen]);
  return <div className="app-layout">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="desktop-sidebar"><Sidebar /></div>
    <dialog ref={drawer} className="navigation-drawer" onCancel={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }} aria-label="Navigation"><button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation">×</button><Sidebar onNavigate={() => setMenuOpen(false)} /></dialog>
    <div className="app-workspace"><TopBar onMenu={() => setMenuOpen(true)} /><StorageWarningBanner />{preview===false && pathname!=="/sync" && <div className="global-offline-preview" role="status">Offline presentation · your records remain available on this device.</div>}<main id="main-content" ref={main} tabIndex={-1}><motion.div key={pathname} className="page-content" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3, ease: "easeOut" }}><Outlet /></motion.div><footer className="workspace-footer"><span>RuralCare · Built around better care.</span><span>Offline-first clinical workspace</span></footer></main><nav className="mobile-bottom-nav" aria-label="Mobile navigation">{[{to:"/dashboard",label:"Overview",icon:House},{to:"/patients",label:"Patients",icon:Users},{to:"/consultations",label:"Visits",icon:ClipboardList},{to:"/sync",label:"Sync",icon:Cloud},{to:"/settings",label:"Settings",icon:Settings}].map(({to,label,icon:Icon})=><NavLink key={to} to={to} className={({isActive})=>isActive?"active":""}><Icon size={19}/><span>{label}</span></NavLink>)}</nav></div>
  </div>;
}

export function AppLayout(){return <VisualConnectionProvider><Workspace/></VisualConnectionProvider>;}
