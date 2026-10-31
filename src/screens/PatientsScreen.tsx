import { useState,useEffect,useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search,Plus,LayoutGrid,List,Download,ArrowUpRight,CalendarDays } from 'lucide-react';
import { db } from '@/db';
import { searchPatients } from '@/db/patients';
import { useDevice } from '@/context/DeviceContext';
import { useToast } from '@/context/ToastContext';
import { calcAge,formatDate } from '@/utils';
import { SyncBadge } from '@/components/StatusBadges';
import { EmptyIllustration } from '@/components/PremiumMotion';
import { GlowCard,SummaryStrip,SegmentedFilter,weekValues } from '@/components/ClinicalVisuals';
import { PatientDrawer } from '@/components/PatientDrawer';
import type { PatientListItem } from '@/types';

export function PatientsScreen(){
  const {device}=useDevice(),{addToast}=useToast();
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[view,setView]=useState<'list'|'grid'>('list');
  const [selected,setSelected]=useState<string|null>(null),[rows,setRows]=useState<PatientListItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const all=useLiveQuery(()=>device?db.patients.where('orgId').equals(device.orgId).filter(p=>!p.deletedAt).toArray():[],[device?.orgId]);
  const visits=useLiveQuery(()=>device?db.consultations.where('orgId').equals(device.orgId).filter(c=>!c.deletedAt).toArray():[],[device?.orgId],[]);
  const load=useCallback(async(q:string)=>{setLoading(true);setError('');try{setRows(await searchPatients(q,device?.orgId));}catch{setError('Patient records could not be loaded. Please try again.');}finally{setLoading(false);}},[device?.orgId]);
  useEffect(()=>{const timer=setTimeout(()=>void load(query),200);return()=>clearTimeout(timer);},[query,load,all?.length]);
  const follow=new Set(visits.filter(c=>c.clinicalStatus==='awaiting_review').map(c=>c.patientId));
  const patients=(all||[]),local=patients.filter(p=>p.syncStatus==='local'),synced=patients.filter(p=>p.syncStatus==='synced');
  const visible=rows.filter(p=>filter==='all'||(filter==='follow'?follow.has(p.id):p.syncStatus===filter));
  const exportRoster=()=>{
    if(!rows.length)return;
    const data=[['ID','First Name','Last Name','DOB','Sex','Sync Status','Created At'],...rows.map(p=>[p.id,p.firstName,p.lastName,p.dateOfBirth,p.sex,p.syncStatus,p.createdAt])];
    const url=URL.createObjectURL(new Blob([data.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='ruralcare-patients.csv';link.click();URL.revokeObjectURL(url);
    addToast({type:'success',title:'Patient roster exported',message:`${rows.length} records included.`});
  };
  return <div className="page-stack patient-page"><header className="page-heading"><div><p className="eyebrow">YOUR COMMUNITY OF CARE</p><h1>Patients<span className="greeting-dot">.</span></h1><p>Every person. A complete care story.</p></div><div className="heading-actions"><button className="btn-secondary" onClick={exportRoster} disabled={!rows.length}><Download size={16}/>Export</button><Link className="btn-primary" to="/patients/new"><Plus size={17}/>Register patient</Link></div></header>
    <SummaryStrip items={[{label:'Total patients',value:patients.length,values:weekValues(patients.map(p=>p.updatedAt))},{label:'On this device',value:local.length,values:weekValues(local.map(p=>p.updatedAt))},{label:'Synced records',value:synced.length,values:weekValues(synced.map(p=>p.updatedAt))},{label:'Follow-up reviews',value:follow.size,values:weekValues(visits.filter(c=>c.clinicalStatus==='awaiting_review').map(c=>c.updatedAt))}]}/>
    <div className="directory-toolbar"><div className="search-field"><Search size={18}/><input className="input" aria-label="Search patients" placeholder="Search a patient by name or phone…" type="search" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="view-control"><button aria-label="List view" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={18}/></button><button aria-label="Grid view" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><LayoutGrid size={18}/></button></div></div>
    <div className="filter-row"><SegmentedFilter value={filter} onChange={setFilter} options={[{id:'all',label:'All patients',count:patients.length},{id:'local',label:'On device',count:local.length},{id:'synced',label:'Synced',count:synced.length},{id:'follow',label:'Follow-up',count:follow.size}]}/><span>{visible.length} records</span></div>
    {error?<div className="alert-error" role="alert"><p>{error}</p><button className="btn-secondary" onClick={()=>void load(query)}>Try again</button></div>:loading?<div className="patient-list">{[0,1,2].map(n=><div className="skeleton h-28" key={n}/>)}</div>:visible.length?<div className={`patient-list ${view==='grid'?'patient-grid':''}`}>{visible.map((p,i)=>{
      const full=patients.find(v=>v.id===p.id),last=[...visits].filter(c=>c.patientId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
      return <GlowCard key={p.id} className="patient-record-card"><button className="patient-record-main" onClick={()=>setSelected(p.id)} aria-label={`Open ${p.firstName} ${p.lastName} overview`}><span className={`avatar-ring avatar-tone-${i%4}`}>{p.firstName[0]}{p.lastName[0]}</span><div className="patient-name-block"><h3>{p.firstName} {p.lastName}</h3><span className="record-id">{p.id.startsWith('RC-')?p.id:p.id.slice(0,8)}</span><div className="demographic-chips"><span>{calcAge(p.dateOfBirth)} years</span><span>{p.sex.replaceAll('_',' ')}</span></div></div><div className="patient-condition"><span className="condition-tag">{full?.knownConditions||'No conditions documented'}</span><small><CalendarDays size={13}/>{last?formatDate(last.createdAt):'No visits yet'}</small></div></button><div className="patient-record-actions"><SyncBadge status={p.syncStatus}/><Link className="quick-consult" to={`/consultations/new?patientId=${p.id}`}><Plus size={15}/>Consult</Link><button onClick={()=>setSelected(p.id)} className="record-open" aria-label={`View ${p.firstName}'s care history`}><ArrowUpRight size={19}/></button></div></GlowCard>;
    })}</div>:<div className="card designed-empty"><EmptyIllustration/><h3>{patients.length?'No matching patients':'Your next care story starts here'}</h3><p>{patients.length?'Try another name or a different filter.':'Register a patient to bring their care history together.'}</p>{patients.length?<button className="btn-secondary" onClick={()=>{setQuery('');setFilter('all');}}>Clear filters</button>:<Link className="btn-primary" to="/patients/new"><Plus size={17}/>Register patient</Link>}</div>}
    <PatientDrawer patient={patients.find(p=>p.id===selected)||null} visits={visits.filter(c=>c.patientId===selected)} onClose={()=>setSelected(null)}/>
  </div>;
}

