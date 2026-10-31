import { canRender3D } from '@/utils/renderingSupport';
import { Component,lazy,Suspense,useState,useRef,useEffect,useCallback,type ReactNode } from 'react';
import { useReducedMotion,useInView } from 'framer-motion';
const Scene=lazy(()=>import('@/components/three/SyncOrbitScene'));
class Boundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}
  render(){return this.state.failed?<div className="sync-gradient-fallback"/>:this.props.children;}
}
export function SyncOrbit({online,running}:{online:boolean;running:boolean}){
  const ref=useRef<HTMLDivElement>(null),inView=useInView(ref),reduced=useReducedMotion();
  const [visible,setVisible]=useState(!document.hidden),[failed,setFailed]=useState(()=>!canRender3D());
  useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  const fail=useCallback(()=>setFailed(true),[]);
  return <div className="sync-orbit" aria-hidden="true" ref={ref}><Boundary><Suspense fallback={<div className="sync-gradient-fallback"/>}>{failed?<div className="sync-gradient-fallback"/>:<Scene online={online} running={running} still={!!reduced} active={visible&&inView} onFailure={fail}/>}</Suspense></Boundary><div className="orbit-labels"><span>YOUR DEVICE</span><span>CLOUD GATEWAY</span></div></div>;
}

