import { useEffect,useRef,useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { motion,useReducedMotion } from 'framer-motion';
import { Cloud,HardDrive,Wifi,WifiOff,RefreshCw,Clock3,ShieldCheck,ArrowUpRight,Play,TriangleAlert } from 'lucide-react';
import { db } from '@/db';
import { useDevice } from '@/context/DeviceContext';
import { useSync } from '@/context/SyncContext';
import { useToast } from '@/context/ToastContext';
import { useVisualConnection } from '@/components/VisualConnection';
import { GlowCard,SegmentedFilter } from '@/components/ClinicalVisuals';
import { SyncOrbit } from '@/components/SyncOrbit';
import { EmptyIllustration,AnimatedNumber } from '@/components/PremiumMotion';
import { formatDateTime } from '@/utils';

export function SyncCenterScreen(){
  const {device}=useDevice(),{isOnline,isSyncing,lastSyncAt,triggerSync}=useSync(),{preview,setPreview}=useVisualConnection(),{addToast}=useToast();
  const online=preview??isOnline,reduced=useReducedMotion(),[activeTab,setTab]=useState('all'),[playing,setPlaying]=useState(false),timer=useRef<ReturnType<typeof setTimeout>>();
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const ops=useLiveQuery(async()=>{if(!device)return[];return(await db.outbox.filter(op=>op.orgId===device.orgId).toArray()).sort((a,b)=>b.clientCreatedAt.localeCompare(a.clientCreatedAt));},[device?.orgId]);
  const visits=useLiveQuery(()=>device?db.consultations.where('orgId').equals(device.orgId).toArray():[],[device?.orgId],[]);
  const counts={pending:ops?.filter(o=>['pending','sending'].includes(o.status)).length||0,done:ops?.filter(o=>o.status==='done').length||0,conflict:ops?.filter(o=>o.status==='conflict').length||0,error:ops?.filter(o=>o.status==='error').length||0};
  const visible=ops?.filter(op=>activeTab==='all'||(activeTab==='pending'?['pending','sending'].includes(op.status):op.status===activeTab));
  const previewTransfer=()=>{setPlaying(true);clearTimeout(timer.current);addToast({type:'info',title:'Transfer animation',message:'Previewing the connection. Saved records and queue status stay unchanged.'});timer.current=setTimeout(()=>setPlaying(false),3500);};
  const executeSync=async()=>{
    addToast({type:'info',title:'Synchronizing Outbox',message:'Uploading queued records to central ledger…'});
    await triggerSync();
    addToast({type:'success',title:'Synchronization Complete',message:'Local outbox operations processed and ledger updated.'});
  };
  return <div className={`page-stack sync-page ${online?'':'visual-offline'}`}><header className="page-heading"><div><p className="eyebrow">CONNECTED CARE. LOCAL CONFIDENCE.</p><h1>Sync center<span className="greeting-dot">.</span></h1><p>Your care records, ready for the next connection.</p></div><div className="network-switch"><span>Connection preview</span><button role="switch" aria-checked={online} aria-label="Preview online connection" onClick={()=>setPreview(!online)}>{online?<Wifi size={15}/>:<WifiOff size={15}/>}<span>{online?'Online':'Offline'}</span><i/></button>{preview!==null&&<button className="reset-network" onClick={()=>setPreview(null)}>Use actual connection</button>}</div></header>
    {!online&&<div className="offline-banner"><WifiOff size={19}/><div><strong>{preview===false?'Offline presentation':'You’re working offline'}</strong><p>Keep documenting care. Your saved records remain available on this device.</p></div></div>}
    <section className="sync-hero"><div className="sync-hero-copy"><span className="hero-kicker"><span/>{online?'LOCAL WORKSPACE READY':'OFFLINE MODE'}</span><h2>Care keeps moving.<br/><span>Connection can wait.</span></h2><p>{online?'Your changes are safely queued on this device.':'An interrupted connection never interrupts your care.'} Press Sync Now to transmit pending outbox changes.</p><div className="flex gap-2.5 flex-wrap"><button className="hero-primary" onClick={executeSync} disabled={!online||isSyncing}><RefreshCw size={15} className={isSyncing?'animate-spin':''}/>{isSyncing?'Syncing queue…':'Sync now'}</button><button className="btn-secondary text-xs px-3.5" onClick={previewTransfer} disabled={!online||playing}><Play size={14}/>{playing?'Previewing…':'Preview animation'}</button></div><span className="sync-last"><Clock3 size={13}/>{lastSyncAt?`Last sync: ${formatDateTime(lastSyncAt)}`:'No server sync completed'}</span></div><SyncOrbit online={online} running={online&&(playing||isSyncing)}/><div className="hero-sync-ring"><svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="61" fill="none" stroke="#ffffff1f" strokeWidth="6"/><motion.circle cx="75" cy="75" r="61" fill="none" stroke={online?'#7cf1bf':'#f8c47c'} strokeWidth="6" strokeLinecap="round" strokeDasharray="300 83" animate={reduced?{}:{rotate:online&&(playing||isSyncing)?360:0}} style={{transformOrigin:'75px 75px'}} transition={{duration:3,repeat:playing?Infinity:0,ease:'linear'}}/></svg><div><strong><AnimatedNumber value={counts.pending}/></strong><span>awaiting upload</span></div></div></section>
    <div className="sync-metrics">{[{label:'On this device',value:ops?.length||0,icon:HardDrive},{label:'Awaiting upload',value:counts.pending,icon:RefreshCw},{label:'Confirmed uploads',value:counts.done,icon:Cloud},{label:'Needs attention',value:counts.error+counts.conflict,icon:TriangleAlert}].map(({label,value,icon:Icon})=><GlowCard key={label}><Icon size={20}/><div><span>{label}</span><strong><AnimatedNumber value={value}/></strong></div></GlowCard>)}</div>
    <div className="queue-heading"><div><h2>Upload queue</h2><p>Every saved change, accounted for.</p></div><SegmentedFilter value={activeTab} onChange={setTab} options={[{id:'all',label:'All changes',count:ops?.length||0},{id:'pending',label:'Pending',count:counts.pending},{id:'conflict',label:'Conflicts',count:counts.conflict},{id:'done',label:'Complete',count:counts.done}]}/></div>
    <div className="queue-list">{ops===undefined?<div className="skeleton h-48"/>:visible?.length?visible.map((op,i)=>{
      const visit=visits.find(c=>c.id===op.entityId),done=op.status==='done',sending=op.status==='sending',problem=['conflict','error'].includes(op.status);
      return <GlowCard key={op.id} className="queue-card"><div className="queue-number">{String(i+1).padStart(2,'0')}</div><span className={`queue-icon ${problem?'queue-problem':''}`}>{done?<ShieldCheck size={20}/>:<HardDrive size={20}/>}</span><div className="queue-description"><h3>{visit?.chiefComplaint||`${op.entityType} record`}</h3><p>{op.entityId} · {op.operationType} · {formatDateTime(op.clientCreatedAt)}</p><div className={`queue-progress ${sending?'sending':''}`}><span style={{width:done?'100%':sending?'40%':'0%'}}/></div><small>{done?'Upload confirmed':sending?'Sending record…':problem?op.lastError||'Review required':online?'Queued on device · awaiting server connection':'Saved locally · waiting for connection'}</small></div><span className={done?'badge-synced':problem?'badge-conflict':'badge-pending'}>{done?'Complete':sending?'Sending':problem?'Needs review':'Queued'}</span>{op.status==='conflict'&&<Link to={`/conflicts/${op.id}`} aria-label="Resolve conflict"><ArrowUpRight size={19}/></Link>}</GlowCard>;
    }):<div className="card designed-empty"><EmptyIllustration/><h3>No changes in this view</h3><p>Changes appear here as patient records are saved.</p></div>}</div>
    <div className="local-security-note"><ShieldCheck size={18}/><p>Saved on your device. The connection preview never changes or uploads clinical records.</p></div>
  </div>;
}

