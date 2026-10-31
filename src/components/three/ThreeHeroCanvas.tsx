import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeHeroCanvasProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount?: number;
}

export function ThreeHeroCanvas({ isOnline, isSyncing, pendingCount = 0 }: ThreeHeroCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 220;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particle Sphere Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Core Sphere Wireframe
    const coreGeo = new THREE.IcosahedronGeometry(4.2, 2);
    const coreColor = isOnline ? 0x0ea5e9 : 0xf59e0b;
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // 2. Bioluminescent Constellation Particles
    const particleCount = 220;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const baseColor = isOnline ? new THREE.Color(0x38bdf8) : new THREE.Color(0xfbbf24);
    const altColor = isOnline ? new THREE.Color(0x10b981) : new THREE.Color(0xf97316);

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const radius = 5.2 + (Math.random() - 0.5) * 0.8;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      const c = Math.random() > 0.4 ? baseColor : altColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circle particle texture for soft glow
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.3, 'rgba(56,189,248,0.8)');
      gradient.addColorStop(1, 'rgba(14,165,233,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.45,
      map: particleTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(particleGeo, particleMat);
    mainGroup.add(pointCloud);

    // 3. Dynamic Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(6.4, 0.03, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: isOnline ? 0x0284c7 : 0xd97706,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    mainGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(7.2, 0.02, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: isOnline ? 0x10b981 : 0xf59e0b,
      transparent: true,
      opacity: 0.25,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 5;
    mainGroup.add(ring2);

    // Interactivity: Mouse parallax & Shockwave ripple
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let shockwave = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.6;
      mouseY = y * 0.6;
    };

    const handleClick = () => {
      shockwave = 1.0;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const speedMultiplier = isSyncing ? 3.0 : 1.0;

      // Base rotation
      mainGroup.rotation.y += 0.005 * speedMultiplier;
      mainGroup.rotation.x += 0.002 * speedMultiplier;

      // Smooth mouse follow
      targetRotationY = mouseX;
      targetRotationX = mouseY;
      mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.05;

      // Orbital rings counter-rotation
      ring1.rotation.z += 0.008 * speedMultiplier;
      ring2.rotation.z -= 0.006 * speedMultiplier;

      // Heartbeat pulse calculation (70 BPM pulse rhythm)
      const pulsePhase = (elapsedTime * 1.2) % (Math.PI * 2);
      const heartbeat = Math.sin(pulsePhase * 2) * (Math.sin(pulsePhase) > 0 ? 0.05 : 0.01);
      const scale = 1 + heartbeat + shockwave * 0.15;
      coreMesh.scale.set(scale, scale, scale);

      // Shockwave damping
      if (shockwave > 0.01) {
        shockwave *= 0.92;
      } else {
        shockwave = 0;
      }

      // Dynamic particle breathing
      const posAttr = particleGeo.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const wave = Math.sin(elapsedTime * 2 + i * 0.2) * 0.12 + (shockwave * 0.8);
        arr[idx] = basePositions[idx] * (1 + wave * 0.1);
        arr[idx + 1] = basePositions[idx + 1] * (1 + wave * 0.1);
        arr[idx + 2] = basePositions[idx + 2] * (1 + wave * 0.1);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);

      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOnline, isSyncing, pendingCount]);

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-2xl overflow-hidden cursor-pointer select-none group">
      <div ref={mountRef} className="w-full h-full absolute inset-0" />
      {/* Overlay HUD indicators */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
          isOnline
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
          {isOnline ? 'Telemetry Active' : 'Autonomous Field Mode'}
        </span>
        {isSyncing && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-950/80 border border-brand-500/40 text-brand-300 animate-pulse">
            Transmitting Packets…
          </span>
        )}
      </div>
      <div className="absolute bottom-3 right-3 text-right pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest">Interactive 3D Constellation</p>
        <p className="text-[11px] text-cyan-400/90 font-sans">Move / Click to pulse</p>
      </div>
    </div>
  );
}
