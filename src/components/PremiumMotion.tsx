import { useEffect, type ComponentType, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ChevronRightIcon } from '@/components/Icons';

export function AnimatedNumber({ value }: { value: number | undefined }) {
  const reduced = useReducedMotion();
  const count = useMotionValue(value ?? 0);
  const rounded = useTransform(count, current => Math.round(current).toLocaleString('en-IN'));
  useEffect(() => {
    if (value === undefined) return;
    if (reduced) { count.set(value); return; }
    count.set(0);
    const animation = animate(count, value, { duration: .85, ease: 'easeOut' });
    return () => animation.stop();
  }, [value, reduced, count]);
  return <><span className="sr-only">{value ?? 'Loading'}</span><motion.span aria-hidden="true">{value === undefined ? '—' : rounded}</motion.span></>;
}

interface MetricProps {
  label: string; value: number | undefined; caption: string;
  icon: ComponentType<{className?: string}>; tone: string; to: string; index: number; trend?: number[];
}
export function PremiumMetric({ label, value, caption, icon: Icon, tone, to, index, trend }: MetricProps) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const lightX = useMotionValue(50), lightY = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 210, damping: 24 });
  const rotateY = useSpring(y, { stiffness: 210, damping: 24 });
  const reflection = useMotionTemplate`radial-gradient(220px circle at ${lightX}% ${lightY}%, rgba(255,255,255,.95), transparent 75%)`;
  const move = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const py = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    x.set((.5 - py) * 12); y.set((px - .5) * 12);
    lightX.set(px * 100); lightY.set(py * 100);
  };
  return <motion.div className="metric-perspective"
    initial={reduced ? false : { opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .08 * index, duration: .4 }}>
    <motion.div className="metric-tilt" style={reduced ? {} : { rotateX, rotateY }} whileHover={reduced ? {} : { y: -5 }} whileTap={reduced ? {} : { scale: .985 }}>
      <Link to={to} className="metric-card" onPointerMove={move} onPointerLeave={() => { x.set(0); y.set(0); }} onBlur={() => { x.set(0); y.set(0); }}>
        <motion.span className="metric-reflection" aria-hidden="true" style={{ background: reflection }} />
        <div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone} ${label === 'Pending uploads' && value ? 'pending-motion' : ''}`}><Icon className="w-5 h-5" /></div></div>
        <div className="stat-value-line"><strong><AnimatedNumber value={value} /></strong>{trend&&<svg className="stat-sparkline" viewBox="0 0 100 30" aria-hidden="true"><polyline points={trend.map((n,i)=>`${i*100/Math.max(1,trend.length-1)},${27-n/Math.max(1,...trend)*24}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
        <div className="metric-caption">{caption}<ChevronRightIcon className="w-4 h-4" /></div>
      </Link>
    </motion.div>
  </motion.div>;
}

export function EmptyIllustration() {
  return <div className="empty-sculpture" aria-hidden="true"><div className="empty-orbit" /><div className="empty-record"><span /><span /><span /><b>+</b></div><div className="empty-disc" /><div className="empty-spark spark-one" /><div className="empty-spark spark-two" /></div>;
}
