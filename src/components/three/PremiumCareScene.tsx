import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { ExtrudeGeometry, Shape, type Group } from 'three';

function MedicalSculpture({ still }: { still: boolean }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => {
    const shape = new Shape();
    const points = [[-.4,1.1],[.4,1.1],[.4,.4],[1.1,.4],[1.1,-.4],[.4,-.4],[.4,-1.1],[-.4,-1.1],[-.4,-.4],[-1.1,-.4],[-1.1,.4],[-.4,.4]];
    shape.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x,y]) => shape.lineTo(x,y));
    shape.closePath();
    const result = new ExtrudeGeometry(shape, { depth: .48, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .11, bevelThickness: .11, curveSegments: 8 });
    result.center();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state, delta) => { if (!still && group.current) { group.current.rotation.y += Math.min(delta, .04) * .15; group.current.rotation.x += (.12 + state.pointer.y * .1 - group.current.rotation.x) * .04; group.current.position.x += (state.pointer.x * .12 - group.current.position.x) * .04; } });
  return <group position={[0,.3,0]}>
    <Float speed={still ? 0 : 1.5} rotationIntensity={still ? 0 : .12} floatIntensity={still ? 0 : .3}>
      <group ref={group} rotation={[.12,-.45,-.12]}>
        <mesh geometry={geometry}><meshPhysicalMaterial color="#2ccf9a" metalness={.22} roughness={.18} clearcoat={1} clearcoatRoughness={.12} /></mesh>
        <mesh rotation={[.5,.2,0]}><torusGeometry args={[1.8,.018,8,90]} /><meshStandardMaterial color="#87ebd1" metalness={.6} roughness={.25} /></mesh>
        <mesh position={[1.65,.75,.4]}><sphereGeometry args={[.12,16,16]} /><meshPhysicalMaterial color="#e7fff7" metalness={.5} roughness={.15} /></mesh>
        <mesh position={[-1.55,-.45,.6]}><sphereGeometry args={[.08,16,16]} /><meshStandardMaterial color="#42dca8" metalness={.4} roughness={.2} /></mesh>
      </group>
    </Float>
    <mesh position={[0,-1.85,0]}><cylinderGeometry args={[1.75,1.85,.16,64]} /><meshPhysicalMaterial color="#d6f6eb" metalness={.1} roughness={.12} clearcoat={1} transparent opacity={.75} /></mesh>
    <mesh position={[0,-1.97,0]}><cylinderGeometry args={[1.9,1.9,.08,64]} /><meshStandardMaterial color="#86bfae" metalness={.25} roughness={.3} /></mesh>
    <mesh position={[0,-1.75,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.3,1.33,64]} /><meshBasicMaterial color="#4bbf99" /></mesh>
  </group>;
}

function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  return null;
}

export default function PremiumCareScene({ still, active, onFailure }: { still: boolean; active: boolean; onFailure: () => void }) {
  return <Canvas dpr={[1,1.5]} frameloop={still || !active ? 'demand' : 'always'} camera={{ position: [0,1.2,6.7], fov: 42 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} fallback={<div className="sculpture-fallback">+</div>}>
    <ambientLight intensity={1.6} />
    <directionalLight position={[3,5,4]} intensity={4} color="#e5fff5" />
    <directionalLight position={[-4,1,2]} intensity={2} color="#50d9b1" />
    <directionalLight position={[0,2,-4]} intensity={3} color="#f8ffff" />
    <MedicalSculpture still={still || !active} />
    <ContextGuard onFailure={onFailure} />
  </Canvas>;
}
