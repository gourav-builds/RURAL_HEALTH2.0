import { useState } from 'react';
import { Database,ArrowUpRight } from 'lucide-react';
import { seedPresentationClinic } from '@/data/presentationSeed';
import { useToast } from '@/context/ToastContext';
export function PresentationSeedCard(){
  const [busy,setBusy]=useState(false);const {addToast}=useToast();
  const load=async()=>{setBusy(true);try{const result=await seedPresentationClinic();addToast({type:result==='occupied'?'warning':'success',title:result==='occupied'?'Existing records preserved':'Presentation clinic ready',message:result==='occupied'?'Use an empty workspace to load presentation records.':'12 patient profiles, 15 visits, and 6 queued changes are available.'});}catch{addToast({type:'error',title:'Records could not be loaded',message:'Your existing records were preserved. Please try again.'});}finally{setBusy(false);}};
  return <section className="card presentation-seed-card"><span className="metric-icon mint"><Database size={20}/></span><div><h3>Presentation clinic</h3><p>Populate an empty workspace with a complete care journey: 12 patients, 15 consultations, and a ready-to-review queue. Existing clinical records are preserved.</p></div><button className="btn-secondary" onClick={load} disabled={busy}>{busy?'Preparing…':'Load records'}<ArrowUpRight size={16}/></button></section>;
}

