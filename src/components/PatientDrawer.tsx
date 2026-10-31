import { useEffect,useRef } from 'react';
import { Link } from 'react-router-dom';
import { X,ArrowUpRight,Plus,HeartPulse,Droplets,Thermometer,Activity } from 'lucide-react';
import type { Patient,Consultation } from '@/types';
import { calcAge,formatDate } from '@/utils';
import { ClinicalBadge } from '@/components/StatusBadges';

export function PatientDrawer({patient,visits,onClose}:{patient:Patient|null;visits:Consultation[];onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(patient)dialog.current?.showModal();else dialog.current?.close();},[patient]);
  const latest=[...visits].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),notes=latest[0]?.notes||'';
  const vitals=[
    {label:'Blood pressure',value:notes.match(/\bBP:\s*(\d+\/\d+)/i)?.[1],unit:'mmHg',icon:HeartPulse},
    {label:'Heart rate',value:notes.match(/\bHR:\s*(\d+)/i)?.[1],unit:'bpm',icon:Activity},
    {label:'Oxygen',value:notes.match(/\bSpO2:\s*(\d+)/i)?.[1],unit:'%',icon:Droplets},
    {label:'Temperature',value:notes.match(/\bTemperature:\s*([\d.]+)/i)?.[1],unit:'°C',icon:Thermometer},
  ];
  return <dialog ref={dialog} className="patient-drawer" aria-label="Patient overview" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    {patient&&<div className="drawer-body"><div className="drawer-top"><span className="eyebrow">PATIENT OVERVIEW</span><button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close patient overview"><X size={20}/></button></div>
    <div className="drawer-identity"><span className="avatar-ring large-avatar">{patient.firstName[0]}{patient.lastName[0]}</span><h2>{patient.firstName} {patient.lastName}</h2><p>{patient.id} · {calcAge(patient.dateOfBirth)} years · {patient.sex.replaceAll('_',' ')}</p><span className="condition-tag">{patient.knownConditions||'No conditions documented'}</span></div>
    <div className="drawer-alert"><strong>Allergies</strong><p>{patient.knownAllergies||'Not documented'}</p></div>
    <div className="drawer-section-heading"><h3>Latest recorded vitals</h3><span>{latest[0]?formatDate(latest[0].createdAt):'No visit recorded'}</span></div>
    <div className="vitals-grid">{vitals.map(({label,value,unit,icon:Icon})=><div key={label}><Icon size={17}/><span>{label}</span><strong>{value||'Not recorded'}{value&&<small>{unit}</small>}</strong></div>)}</div>
    <div className="drawer-section-heading"><h3>Visit timeline</h3><span>{visits.length} visits</span></div>
    <div className="visit-timeline">{latest.length?latest.map(c=><Link to={`/consultations/${c.id}`} key={c.id} onClick={onClose}><i/><div><time>{formatDate(c.createdAt)}</time><strong>{c.chiefComplaint}</strong><ClinicalBadge status={c.clinicalStatus}/></div></Link>):<p>No consultations yet. Start the first visit below.</p>}</div>
    <div className="drawer-footer"><Link className="btn-primary" to={`/consultations/new?patientId=${patient.id}`}><Plus size={17}/>Start consultation</Link><Link className="btn-secondary" to={`/patients/${patient.id}`}>Full profile<ArrowUpRight size={16}/></Link></div></div>}
  </dialog>;
}

