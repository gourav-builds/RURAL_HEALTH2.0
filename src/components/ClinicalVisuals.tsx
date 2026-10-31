import { useId, type ReactNode, type PointerEvent } from 'react';
import { AreaChart,Area,ResponsiveContainer,Tooltip,XAxis,CartesianGrid } from 'recharts';
import { motion,useReducedMotion } from 'framer-motion';
import { Activity,Users,CloudCheck,HardDrive,ArrowUpRight } from 'lucide-react';
import { AnimatedNumber } from '@/components/PremiumMotion';
import type { Consultation } from '@/types';

export function GlowCard({children,className=''}:{children:ReactNode;className?:string}){
  const reduced=useReducedMotion();
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    if(reduced||event.pointerType!=='mouse')return;
    const el=event.currentTarget,r=el.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
    el.style.setProperty('--light-x',`${x*100}%`);el.style.setProperty('--light-y',`${y*100}%`);
    el.style.setProperty('--tilt-x',`${(.5-y)*10}deg`);el.style.setProperty('--tilt-y',`${(x-.5)*10}deg`);
  };
  return <div className={`glow-card ${className}`} onPointerMove={move} onPointerLeave={e=>{e.currentTarget.style.setProperty('--tilt-x','0deg');e.currentTarget.style.setProperty('--tilt-y','0deg');}}>{children}</div>;
}
export function Sparkline({values,color='#108669'}:{values:number[];color?:string}){
  const max=Math.max(1,...values),min=Math.min(0,...values);
  return <svg className="mini-spark" viewBox="0 0 120 30" aria-hidden="true"><polyline points={values.map((n,i)=>`${i*120/Math.max(1,values.length-1)},${27-(n-min)/(max-min)*23}`).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}
export function weekValues(dates:string[]){
  return Array.from({length:7},(_,i)=>{const day=new Date();day.setDate(day.getDate()-6+i);const key=day.toLocaleDateString();return dates.filter(d=>new Date(d).toLocaleDateString()===key).length;});
}
export function SummaryStrip({items}:{items:{label:string;value:number;values:number[]}[]}){
  const icons=[Users,HardDrive,CloudCheck,Activity];
  return <div className="summary-strip">{items.map((item,i)=>{const Icon=icons[i%4];return <GlowCard key={item.label} className={`summary-card tone-${i}`}><div><span className="summary-icon"><Icon size={18}/></span><span>{item.label}</span></div><strong><AnimatedNumber value={item.value}/></strong><Sparkline values={item.values}/><small>Last 7 days</small></GlowCard>;})}</div>;
}
export function ActivityChart({consultations}:{consultations:Consultation[]}){
  const id=useId().replaceAll(':',''),reduced=useReducedMotion();
  const counts=weekValues(consultations.map(c=>c.createdAt));
  const data=counts.map((visits,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return{day:d.toLocaleDateString('en-IN',{weekday:'short'}),visits};});
  return <GlowCard className="activity-chart-card"><div className="panel-heading"><div><p className="eyebrow">A WEEK OF BETTER CARE</p><h2>Activity this week</h2></div><span className="chart-date-chip">Last 7 days <ArrowUpRight size={14}/></span></div><div className="chart-stat"><strong>{counts.reduce((a,b)=>a+b,0)}</strong><span>consultations recorded</span></div><div className="rechart-container" role="img" aria-label={data.map(d=>`${d.day}: ${d.visits} consultations`).join(', ')}><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={data} margin={{top:15,right:20,left:20,bottom:0}}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={.3}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#d9e8df" strokeDasharray="3 6"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#48685a',fontSize:11}} dy={6}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #d0e8d9',boxShadow:'0 10px 30px #0b3b3c15'}}/><Area type="monotone" dataKey="visits" stroke="#088466" strokeWidth={3} fill={`url(#${id})`} isAnimationActive={!reduced} animationDuration={700}/></AreaChart></ResponsiveContainer></div></GlowCard>;
}
export function SegmentedFilter({options,value,onChange}:{options:{id:string;label:string;count?:number}[];value:string;onChange:(value:string)=>void}){
  const id=useId(),reduced=useReducedMotion();
  return <div className="segment-control">{options.map(option=><button key={option.id} aria-pressed={value===option.id} onClick={()=>onChange(option.id)}>{value===option.id&&<motion.span layoutId={id} className="segment-active" transition={{duration:reduced?0:.18}}/>}<span>{option.label}{option.count!==undefined&&<b>{option.count}</b>}</span></button>)}</div>;
}

