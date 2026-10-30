import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OutboxOperation } from '@/types';

interface ThreeSyncTopologyProps {
  isOnline: boolean;
  isSyncing: boolean;
  operations: OutboxOperation[];
}

export function ThreeSyncTopology({ isOnline, isSyncing, operations }: ThreeSyncTopologyProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Central Local Node (Your Device)
    const localGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const localMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const localMesh = new THREE.Mesh(localGeo, localMat);
    localMesh.position.set(-3.5, 0, 0);
    rootGroup.add(localMesh);

    // Radar ring around local device
    const radarGeo = new THREE.RingGeometry(1.4, 1.5, 32);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const radarMesh = new THREE.Mesh(radarGeo, radarMat);
    radarMesh.position.set(-3.5, 0, 0);
    radarMesh.rotation.x = Math.PI / 2;
    rootGroup.add(radarMesh);

    // 2. Remote Cloud Gateway Node
    const cloudGeo = new THREE.DodecahedronGeometry(1.2);
    const cloudColor = isOnline ? 0x10b981 : 0xef4444;
    const cloudMat = new THREE.MeshStandardMaterial({
      color: cloudColor,
      emissive: cloudColor,
      emissiveIntensity: isOnline ? 0.5 : 0.2,
      wireframe: true,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.set(3.5, 1.2, 0);
    rootGroup.add(cloudMesh);

    // 3. Energy Beam Curve connecting Local to Cloud
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-3.5, 0, 0),
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(3.5, 1.2, 0)
    );

    const curvePoints = curve.getPoints(50);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: isOnline ? (isSyncing ? 0x38bdf8 : 0x059669) : 0x64748b,
      transparent: true,
      opacity: isOnline ? 0.7 : 0.2,
    });
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    rootGroup.add(lineMesh);

    // 4. Outbox Packet Orbits
    const packetGroup = new THREE.Group();
    rootGroup.add(packetGroup);

    const packetMeshes: THREE.Mesh[] = [];
    const maxDisplayedPackets = Math.min(operations.length, 12);

    for (let i = 0; i < maxDisplayedPackets; i++) {
      const op = operations[i];
      let pColor = 0xa78bfa; // pending violet
      if (op.status === 'conflict') pColor = 0xef4444;
      if (op.status === 'done') pColor = 0x22c55e;
      if (op.status === 'sending') pColor = 0x38bdf8;

      const pGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const pMat = new THREE.MeshBasicMaterial({ color: pColor });
      const pMesh = new THREE.Mesh(pGeo, pMat);

      packetGroup.add(pMesh);
      packetMeshes.push(pMesh);
    }

    // Grid Floor
    const grid = new THREE.GridHelper(16, 16, 0x1e293b, 0x0f172a);
    grid.position.y = -2;
    scene.add(grid);

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(amb);
    const pointLight = new THREE.PointLight(0x38bdf8, 2, 20);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);

    // Drag to rotate
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      rootGroup.rotation.y += dx * 0.008;
      rootGroup.rotation.x = Math.max(-0.3, Math.min(0.5, rootGroup.rotation.x + dy * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Cloud rotation
      cloudMesh.rotation.x += 0.01;
      cloudMesh.rotation.y += 0.015;

      // Radar pulse
      const radarScale = 1 + (elapsed * 0.8) % 0.8;
      radarMesh.scale.set(radarScale, radarScale, 1);
      (radarMesh.material as THREE.Material).opacity = Math.max(0, 0.6 - (radarScale - 1) * 0.8);

      // Packet orbit calculations
      packetMeshes.forEach((mesh, idx) => {
        const offset = (idx / packetMeshes.length) * Math.PI * 2;
        const orbitRadius = 2.0 + (idx % 3) * 0.4;
        const speed = isSyncing ? 1.5 : 0.6;
        const angle = elapsed * speed + offset;

        // Orbit around local device or travel across curve if syncing
        if (isSyncing && isOnline) {
          const t = (elapsed * 0.4 + idx / packetMeshes.length) % 1;
          const pos = curve.getPoint(t);
          mesh.position.copy(pos);
        } else {
          mesh.position.x = -3.5 + Math.cos(angle) * orbitRadius;
          mesh.position.z = Math.sin(angle) * orbitRadius;
          mesh.position.y = Math.sin(elapsed * 2 + idx) * 0.3;
        }

        mesh.rotation.x += 0.02;
        mesh.rotation.y += 0.02;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      localGeo.dispose();
      localMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      radarGeo.dispose();
      radarMat.dispose();
      packetMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOnline, isSyncing, operations]);

  return (
    <div className="relative w-full h-64 rounded-2xl bg-slate-950/80 border border-surface-border overflow-hidden cursor-grab active:cursor-grabbing select-none">
      <div ref={mountRef} className="w-full h-full absolute inset-0" />

      {/* 3D Topology HUD Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="text-xs font-mono font-semibold text-cyan-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-cyan-800/60">
          3D Distributed Mesh Topology
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          {operations.length} outbox queue packets
        </span>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[11px] font-mono pointer-events-none bg-slate-900/80 px-3 py-1.5 rounded-lg border border-surface-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-300">Local Device Node</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-slate-300">{isOnline ? 'Cloud Relay Active' : 'Cloud Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}
