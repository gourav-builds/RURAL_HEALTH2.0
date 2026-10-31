import { canRender3D } from '@/utils/renderingSupport';
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
const Scene = lazy(() => import('@/components/three/PremiumCareScene'));
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="sculpture-fallback">+</div> : this.props.children; }
}
export function CareSculpture() {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, { margin: '40px' });
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(!document.hidden);
  const [failed, setFailed] = useState(()=>!canRender3D());
  const onFailure = useCallback(() => setFailed(true), []);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return <div className="care-sculpture" ref={host} aria-hidden="true">
    <div className="sculpture-aura" />
    <div className="sculpture-canvas"><SceneBoundary><Suspense fallback={<div className="sculpture-fallback">+</div>}>{failed ? <div className="sculpture-fallback">+</div> : <Scene still={Boolean(reduced)} active={inView && visible} onFailure={onFailure} />}</Suspense></SceneBoundary></div>
    <div className="sculpture-caption"><span />BUILT AROUND HUMAN CARE</div>
  </div>;
}
