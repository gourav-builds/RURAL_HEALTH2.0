import { useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus,Search,ArrowUpRight,Clock3,Stethoscope,CheckCheck,FilePenLine,ClipboardCheck } from 'lucide-react';
import { db } from '@/db';
import { useDevice } from '@/context/DeviceContext';
import { ClinicalBadge,SyncBadge } from '@/components/StatusBadges';
import { EmptyIllustration,AnimatedNumber } from '@/components/PremiumMotion';
import { GlowCard,SegmentedFilter } from '@/components/ClinicalVisuals';
import { formatDate } from '@/utils';

const steps=[{id:'draft',label:'Draft',icon:FilePenLine},{id:'awaiting_review',label:'Awaiting review',icon:Clock3},{id:'reviewed',label:'Reviewed',icon:ClipboardCheck},{id:'amended',label:'Amended',icon:CheckCheck}];
export function ConsultationsScreen(){
  const {device}=useDevice(),[params,setParams]=useSearchParams(),[query,setQuery]=useState('');
  const status=params.get('status')||'all';
  const records=useLiveQuery(async()=>{
    if(!device)return[];
    const [visits,patients]=await Promise.all([db.consultations.where('orgId').equals(device.orgId).filter(c=>!c.deletedAt).toArray(),db.patients.where('orgId').equals(device.orgId).filter(p=>!p.deletedAt).toArray()]);
    const names=new Map(patients.map(p=>[p.id,`${p.firstName} ${p.lastName}`]));
    return visits.map(c=>({...c,patientName:names.get(c.patientId)||'Patient record unavailable'})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  },[device?.orgId]);
  const filtered=records?.filter(c=>(status==='all'||c.clinicalStatus===status)&&`${c.patientName} ${c.chiefComplaint}`.toLowerCase().includes(query.toLowerCase()));
  const today=records?.filter(c=>new Date(c.updatedAt).toDateString()===new Date().toDateString())||[];
  const change=(value:string)=>setParams(value==='all'?{}:{status:value});
  return <div className="page-stack consultations-page"><header className="page-heading"><div><p className="eyebrow">THOUGHTFUL CARE. COMPLETE RECORDS.</p><h1>Consultations<span className="greeting-dot">.</span></h1><p>From the first conversation to the final review.</p></div><Link className="btn-primary" to="/consultations/new"><Plus size={17}/>New consultation</Link></header>
    <div className="clinical-pipeline">{steps.map(({id,label,icon:Icon},i)=><button className={`pipeline-step status-${id} ${status===id?'selected':''}`} key={id} onClick={()=>change(status===id?'all':id)} aria-pressed={status===id}><span className="pipeline-icon"><Icon size={20}/></span><span><small>0{i+1} · {label}</small><strong><AnimatedNumber value={records?.filter(c=>c.clinicalStatus===id).length}/></strong></span><span className="pipeline-arrow" aria-hidden="true">→</span></button>)}</div>
    <div className="directory-toolbar"><div className="search-field"><Search size={18}/><input className="input" type="search" aria-label="Search consultations" placeholder="Search patient or chief complaint…" value={query} onChange={e=>setQuery(e.target.value)}/></div><SegmentedFilter value={status} onChange={change} options={[{id:'all',label:'All visits'},...steps.map(s=>({id:s.id,label:s.label}))]}/></div>
    <div className="consultation-columns"><div className="consultation-cards">{records===undefined?<div className="skeleton h-64"/>:filtered?.length?filtered.map(c=>{
      const doctor=c.reviewedBy||c.notes.match(/Clinician:\s*([^\n]+)/)?.[1]||'Care team';
      return <GlowCard key={c.id} className={`consultation-card status-${c.clinicalStatus}`}><div className="consult-card-top"><ClinicalBadge status={c.clinicalStatus}/><time>{formatDate(c.updatedAt)}</time></div><Link className="consultation-title" to={`/consultations/${c.id}`}><h3>{c.chiefComplaint}</h3><ArrowUpRight size={19}/></Link><p>{c.patientName}<span> · </span>{c.patientId.startsWith('RC-')?c.patientId:c.patientId.slice(0,8)}</p><div className="consult-card-bottom"><span className="doctor-avatar"><Stethoscope size={15}/></span><span>{doctor}</span><SyncBadge status={c.syncStatus}/></div></GlowCard>;
    }):<div className="card designed-empty"><EmptyIllustration/><h3>{records.length?'No visits in this view':'A fresh start for better care'}</h3><p>{records.length?'Choose another status or adjust your search.':'Create a consultation and document the next step in care.'}</p><button className="btn-secondary" onClick={()=>{setQuery('');change('all');}}>Clear filters</button><Link className="btn-primary" to="/consultations/new">Start consultation</Link></div>}</div>
    <aside className="today-feed card"><div className="feed-heading"><span className="metric-icon mint"><Clock3 size={18}/></span><div><h2>Today</h2><span>{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long'})}</span></div><b>{today.length}</b></div><div className="feed-list">{today.length?today.map(c=><Link key={c.id} to={`/consultations/${c.id}`}><i className={`status-${c.clinicalStatus}`}/><div><time>{new Date(c.updatedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</time><strong>{c.patientName}</strong><p>{c.chiefComplaint}</p><ClinicalBadge status={c.clinicalStatus}/></div></Link>):<div className="quiet-feed"><EmptyIllustration/><p>Your next consultation will appear here.</p></div>}</div><div className="feed-footnote">Every update is part of a better care story.</div></aside></div>
  </div>;
}

