import { useEffect,useRef } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { type Group,type Mesh } from 'three';

function OrbitObjects({online,running,still}:{online:boolean;running:boolean;still:boolean}){
  const particles=useRef<Group>(null),cloud=useRef<Group>(null),phase=useRef(0);
  const color=online?'#10b981':'#e9aa56';
  useFrame((_,delta)=>{
    if(still)return;
    phase.current+=Math.min(delta,.04);
    if(cloud.current)cloud.current.position.y=.45+Math.sin(phase.current*.8)*.07;
    if(running&&online&&particles.current)particles.current.children.forEach((child,i)=>{
      const mesh=child as Mesh,t=(phase.current*.3+i/12)%1;
      mesh.position.set(-1.65+t*3.3,Math.sin(t*Math.PI)*.55-.1,Math.cos(t*Math.PI)*.25);
    });
  });
  return <group rotation={[.06,-.1,0]}>
    <group position={[-1.8,0,0]} rotation={[0,.25,-.06]}>
      <RoundedBox args={[1.12,1.8,.16]} radius={.1} smoothness={4}><meshPhysicalMaterial color="#c6e7dd" metalness={.4} roughness={.2} clearcoat={1}/></RoundedBox>
      <RoundedBox args={[.94,1.48,.04]} position={[0,.05,.1]} radius={.06} smoothness={4}><meshStandardMaterial color="#164f49" metalness={.2} roughness={.25}/></RoundedBox>
      <mesh position={[0,.05,.14]}><boxGeometry args={[.12,.55,.02]}/><meshBasicMaterial color={color}/></mesh>
      <mesh position={[0,.05,.14]}><boxGeometry args={[.5,.12,.02]}/><meshBasicMaterial color={color}/></mesh>
    </group>
    <group ref={cloud} position={[1.8,.45,0]}>
      {[[-.5,0,0,.48],[0,.2,0,.65],[.55,0,0,.45],[0,-.12,0,.6]].map(([x,y,z,r],i)=><mesh key={i} position={[x,y,z]}><sphereGeometry args={[r,28,20]}/><meshPhysicalMaterial color={online?'#c8f8e8':'#f1debf'} metalness={.1} roughness={.22} clearcoat={1}/></mesh>)}
    </group>
    <mesh rotation={[Math.PI/2.5,0,0]} position={[0,-.5,0]}><torusGeometry args={[2.6,.018,8,100]}/><meshStandardMaterial color={color} transparent opacity={.45}/></mesh>
    <group ref={particles} visible={online&&running}>{Array.from({length:12},(_,i)=><mesh key={i} position={[-1.65+i*.3,.2,0]}><sphereGeometry args={[.04,8,8]}/><meshBasicMaterial color="#8fffd7"/></mesh>)}</group>
    <mesh position={[0,-1.15,0]}><cylinderGeometry args={[2.8,2.9,.1,64]}/><meshPhysicalMaterial color="#abcfc3" transparent opacity={.25} metalness={.15} roughness={.3}/></mesh>
  </group>;
}
function Guard({onFailure}:{onFailure:()=>void}){
  const {gl}=useThree();useEffect(()=>{const canvas=gl.domElement;const lost=(e:Event)=>{e.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onFailure]);return null;
}
export default function SyncOrbitScene({online,running,still,active,onFailure}:{online:boolean;running:boolean;still:boolean;active:boolean;onFailure:()=>void}){
  return <Canvas dpr={[1,1.5]} frameloop={still||!active?'demand':'always'} camera={{position:[0,1.4,7.8],fov:42}} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={<div className="sync-gradient-fallback"/>}><ambientLight intensity={1.8}/><directionalLight position={[3,5,5]} intensity={3}/><directionalLight position={[-4,2,1]} color="#6ae8c0" intensity={2}/><OrbitObjects online={online} running={running} still={still||!active}/><Guard onFailure={onFailure}/></Canvas>;
}

