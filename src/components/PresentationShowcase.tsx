import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ClipboardIcon, CheckIcon } from '@/components/Icons';

const weeks = {
  week: { label: 'This week', total: 128, change: '+18%', values: [9,14,12,22,18,25,28], labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  month: { label: 'This month', total: 439, change: '+12%', values: [32,58,45,70,62,80,92], labels: ['1','5','10','15','20','25','30'] },
};
/** Fictional presentation fixtures; never persisted or fed into clinical metrics. */
export function PresentationShowcase() {
  const [period, setPeriod] = useState<'week'|'month'>('week');
  const reduced = useReducedMotion();
  const id = useId().replaceAll(':','');
  const data = weeks[period];
  const max = Math.max(...data.values);
  const points = data.values.map((v,i) => `${20+i*56},${125-v/max*100}`).join(' ');
  return <details className="presentation-showcase" open>
    <summary><span className="presentation-badge"><span />PRESENTATION PREVIEW</span><span>Explore a day in a connected clinic</span><small>Fictional data · never saved to records</small><span className="showcase-chevron">⌄</span></summary>
    <div className="showcase-grid">
      <section className="showcase-chart" aria-label={`Illustrative consultations: ${data.total} ${data.label.toLowerCase()}`}>
        <div className="showcase-heading"><h2>Care in motion</h2><div className="period-control">{(['week','month'] as const).map(p => <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p === 'week' ? '7 days' : '30 days'}</button>)}</div></div>
        <div className="chart-total"><strong>{data.total}</strong><span>consultations</span><b>{data.change} <span>sample trend</span></b></div>
        <svg viewBox="0 0 376 155" role="img" aria-label={`Fictional visit counts: ${data.values.join(', ')}`}>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".25" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
          {[25,75,125].map(y => <line key={y} x1="20" x2="356" y1={y} y2={y} stroke="#dce9e4" strokeDasharray="3 5" />)}
          <polygon points={`20,135 ${points} 356,135`} fill={`url(#${id})`} />
          <motion.polyline key={period} points={points} fill="none" stroke="#087f63" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" initial={reduced ? false : { pathLength:0 }} animate={{pathLength:1}} transition={{duration:.7}} />
          {data.values.map((v,i) => <circle key={i} cx={20+i*56} cy={125-v/max*100} r="3.5" fill="#fff" stroke="#087f63" strokeWidth="2" />)}
          {data.labels.map((label,i) => <text key={label} x={20+i*56} y="153" textAnchor="middle" fontSize="10" fill="#526b64">{label}</text>)}
        </svg>
      </section>
      <section className="showcase-visits"><div className="showcase-heading"><h2>Recent visits</h2><span className="sample-label">SAMPLE</span></div>
        {[['AS','Anika Sharma','Routine follow-up','09:40','Reviewed'],['RP','Ravi Patel','Blood pressure review','10:15','In review'],['MD','Meera Das','Wellness consultation','10:45','Draft']].map(([initials,name,reason,time,status],i) => <div className="showcase-visit" key={name}><span className={`patient-avatar avatar-${i}`}>{initials}</span><div><strong>{name}</strong><small>{reason}</small></div><div><time>{time}</time><span>{status}</span></div></div>)}
        <p className="showcase-footnote"><ClipboardIcon className="w-3.5 h-3.5" />A glimpse of the care journey. Not real patient records.</p>
      </section>
      <section className="showcase-sync"><div className="showcase-heading"><h2>Sync health</h2><span className="sample-label">SIMULATED</span></div><div className="sync-ring"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="57" fill="none" stroke="#e1eee8" strokeWidth="9" /><motion.circle cx="70" cy="70" r="57" fill="none" stroke="#0b9977" strokeWidth="9" strokeLinecap="round" transform="rotate(-90 70 70)" strokeDasharray="358.14" initial={reduced ? false : {strokeDashoffset:358.14}} animate={{strokeDashoffset:28.65}} transition={{duration:1}} /></svg><div><strong>92<span>%</span></strong><small>Sample completion</small></div></div><p><CheckIcon className="w-4 h-4" />184 of 200 sample changes</p><small>Illustration only. Live sync status is shown separately below.</small></section>
    </div>
  </details>;
}
