import { CareSculpture } from '@/components/CareSculpture';
import { PremiumMetric, EmptyIllustration } from '@/components/PremiumMotion';
import { ActivityChart, weekValues } from '@/components/ClinicalVisuals';
import { UserPlus, Stethoscope, Search, ClipboardCheck } from 'lucide-react';
import { useVisualConnection } from '@/components/VisualConnection';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useDevice } from '@/context/DeviceContext';
import { useSync } from '@/context/SyncContext';
import { calcAge, formatDate } from '@/utils';
import { SyncBadge, ClinicalBadge } from '@/components/StatusBadges';
import { UsersIcon, ClipboardIcon, PlusIcon, ClockIcon, RefreshIcon, ChevronRightIcon, HeartIcon, CheckIcon } from '@/components/Icons';

export function DashboardScreen() {
  const { preview } = useVisualConnection();
  const { device } = useDevice();
  const { pendingCount, conflictCount, isOnline } = useSync();
  const patients = useLiveQuery(() => device ? db.patients.where('orgId').equals(device.orgId).filter(p => !p.deletedAt).toArray() : [], [device?.orgId]);
  const consultations = useLiveQuery(() => device ? db.consultations.where('orgId').equals(device.orgId).filter(c => !c.deletedAt).toArray() : [], [device?.orgId]);
  const recent = [...(patients || [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const reviews = (consultations || []).filter(c => c.clinicalStatus === 'awaiting_review');
  const activity = [...(consultations || [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const stats = [
    { label: 'Registered patients', value: patients?.length, caption: 'Your community, in one place', icon: UsersIcon, tone: 'mint', to: '/patients' },
    { label: 'Consultations', value: consultations?.length, caption: 'Every conversation counts', icon: ClipboardIcon, tone: 'blue', to: '/consultations' },
    { label: 'Awaiting review', value: consultations ? reviews.length : undefined, caption: 'Ready for your attention', icon: ClockIcon, tone: 'peach', to: '/consultations?status=awaiting_review' },
    { label: 'Pending uploads', value: pendingCount, caption: 'Changes stored on this device', icon: RefreshIcon, tone: 'lavender', to: '/sync' },
  ];
  return <div className="dashboard animate-fade-in">
    <div className="page-heading"><div><p className="eyebrow">YOUR CLINIC AT A GLANCE</p><h1>{greeting}{device?.displayName ? `, ${device.displayName.replace(/^Dr\.?\s+/i, '').split(' ')[0]}` : ''}<span className="greeting-dot">.</span></h1><p>Here’s what’s happening in your care community.</p></div><div className="date-label"><ClockIcon className="w-4 h-4" />{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
    <section className="care-banner" aria-label="Start patient care">
      <div className="care-banner-content"><span className="hero-kicker"><span /> READY FOR THE NEXT PATIENT</span><h2>Closer to your patients.<br /><span>Wherever care happens.</span></h2><p>Less time on paperwork. More time on the people who matter.<br className="hidden lg:block" /> Your clinic, connected by care — even when you’re offline.</p><div className="hero-actions"><Link to="/consultations/new" className="hero-primary"><PlusIcon className="w-4 h-4" />Start consultation</Link><Link to="/patients/new" className="hero-secondary">Register patient <ChevronRightIcon className="w-4 h-4" /></Link></div></div>
      <CareSculpture />
    </section>
    <section className="metric-grid" aria-label="Clinic summary">{stats.map((stat, index) => <PremiumMetric key={stat.label} {...stat} index={index} trend={weekValues(index===0?(patients||[]).map(p=>p.updatedAt):index===2?reviews.map(c=>c.updatedAt):(consultations||[]).filter(c=>index!==3||c.syncStatus==='local').map(c=>c.updatedAt))} />)}</section>
    <div className="quick-actions-row">{[{to:"/patients/new",label:"Register patient",caption:"Welcome someone new",icon:UserPlus},{to:"/consultations/new",label:"Start consultation",caption:"Make the next visit count",icon:Stethoscope},{to:"/patients",label:"Find a patient",caption:"Their complete care story",icon:Search},{to:"/consultations?status=awaiting_review",label:"Review notes",caption:"Close the loop on care",icon:ClipboardCheck}].map(({to,label,caption,icon:Icon})=><Link to={to} key={to}><span><Icon size={19}/></span><div><strong>{label}</strong><small>{caption}</small></div><ChevronRightIcon className="w-4 h-4"/></Link>)}</div><ActivityChart consultations={consultations||[]} />
    <div className="dashboard-columns"><div className="dashboard-main">
      <section className="panel"><div className="panel-heading"><div><h2>Recent patients</h2><p>A familiar face. A complete picture.</p></div><Link to="/patients" className="text-link">View all <ChevronRightIcon className="w-4 h-4" /></Link></div>
        <div className="patient-table"><div className="patient-table-labels"><span>PATIENT</span><span>LAST UPDATED</span><span>RECORD STATUS</span><span /></div>{patients === undefined ? <div className="p-6 space-y-4" aria-label="Loading patients">{[1, 2, 3].map(n => <div key={n} className="skeleton h-12" />)}</div> : recent.length ? recent.map((p, i) => <Link className="patient-table-row" key={p.id} to={`/patients/${p.id}`}><div className="patient-identity"><span className={`patient-avatar avatar-${i % 4}`}>{p.firstName[0]}{p.lastName[0]}</span><div><strong>{p.firstName} {p.lastName}</strong><small>{calcAge(p.dateOfBirth)} years <span>·</span> {p.sex.replaceAll('_', ' ')}</small></div></div><span className="patient-updated">{formatDate(p.updatedAt)}</span><SyncBadge status={p.syncStatus} /><ChevronRightIcon className="w-4 h-4 text-slate-400" /></Link>) : <div className="designed-empty"><EmptyIllustration /><h3>Your community starts here</h3><p>Register your first patient to bring their care history together.</p><Link className="btn-primary btn-sm" to="/patients/new"><PlusIcon className="w-4 h-4" />Register a patient</Link></div>}</div>
        <div className="panel-footer"><span>{patients?.length ?? 0} patients in your clinic</span><span>Records available on this device</span></div>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Recent consultations</h2><p>Pick up where care left off.</p></div><Link to="/consultations" className="text-link">View all <ChevronRightIcon className="w-4 h-4" /></Link></div>{activity.length ? <div className="activity-list">{activity.map(c => { const p = patients?.find(patient => patient.id === c.patientId); return <Link to={`/consultations/${c.id}`} key={c.id} className="activity-row"><span className="avatar-ring compact-avatar">{p ? `${p.firstName[0]}${p.lastName[0]}` : "RC"}</span><div className="flex-1 min-w-0"><strong>{c.chiefComplaint}</strong><small>{p ? `${p.firstName} ${p.lastName}` : 'Patient record'} · {formatDate(c.updatedAt)}</small></div><ClinicalBadge status={c.clinicalStatus} /></Link>; })}</div> : <div className="quiet-empty"><ClipboardIcon className="w-6 h-6" /><div><strong>A fresh start for better care</strong><p>Your consultations will appear here as you document visits.</p></div><Link to="/consultations/new" aria-label="Start your first consultation"><ChevronRightIcon className="w-5 h-5" /></Link></div>}</section>
    </div><div className="dashboard-aside">
      <section className="review-panel"><div className="review-heading"><span className="metric-icon peach"><ClockIcon className="w-5 h-5" /></span><span className="eyebrow">CARE FOLLOW-THROUGH</span></div><h2>{reviews.length ? `${reviews.length} consultation${reviews.length === 1 ? '' : 's'} to review` : 'A little attention. A lasting difference.'}</h2><p>{reviews.length ? 'Complete your clinical reviews and keep each patient’s record moving forward.' : 'Review clinical notes in one place, with every detail ready for your attention.'}</p><Link to="/consultations?status=awaiting_review" className="review-link">{reviews.length ? 'Review consultations' : 'Open review workspace'}<ChevronRightIcon className="w-4 h-4" /></Link></section>
      <section className="panel connection-panel"><div className="panel-heading"><h2>Your workspace</h2><span className="live-dot" /></div><div className="workspace-status"><span>Internet connection</span><strong>{(preview ?? isOnline) ? 'Connected' : 'Offline'}{preview!==null?' · preview':''}</strong></div><div className="workspace-status"><span>Changes awaiting upload</span><strong>{pendingCount}</strong></div><div className="workspace-status"><span>Conflicts to review</span><strong>{conflictCount}</strong></div><div className="local-note"><CheckIcon className="w-4 h-4" /><p>Work locally, with confidence.<span>Server synchronization is not yet connected.</span></p></div><Link to="/sync" className="text-link">Manage sync queue <ChevronRightIcon className="w-4 h-4" /></Link></section>
      <div className="care-quote"><HeartIcon className="w-5 h-5" /><p>Great care begins with<br />a little more connection.</p><span>THE RURALCARE PROMISE</span></div>
    </div></div>
  </div>;
}


