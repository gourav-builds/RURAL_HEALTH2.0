import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export interface BodyRegion {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const BODY_REGIONS: BodyRegion[] = [
  { id: 'head', name: 'Head & Cranial', category: 'Neurological / ENT', description: 'Headache, concussion, vision, ENT symptoms' },
  { id: 'chest', name: 'Thorax & Chest', category: 'Cardiopulmonary', description: 'Chest pain, shortness of breath, cough, palpitations' },
  { id: 'abdomen', name: 'Abdomen', category: 'Gastrointestinal', description: 'Abdominal pain, nausea, cramping, digestion' },
  { id: 'pelvis', name: 'Pelvic Region', category: 'Genitourinary', description: 'Pelvic pain, urinary symptoms' },
  { id: 'arm_l', name: 'Left Arm / Shoulder', category: 'Musculoskeletal', description: 'Joint pain, numbness, fracture, strain' },
  { id: 'arm_r', name: 'Right Arm / Shoulder', category: 'Musculoskeletal', description: 'Joint pain, numbness, fracture, strain' },
  { id: 'leg_l', name: 'Left Leg / Knee / Foot', category: 'Lower Extremity', description: 'Edema, mobility, sprain, wound' },
  { id: 'leg_r', name: 'Right Leg / Knee / Foot', category: 'Lower Extremity', description: 'Edema, mobility, sprain, wound' },
];

interface ThreeAnatomyViewerProps {
  selectedRegionId?: string | null;
  onSelectRegion?: (region: BodyRegion) => void;
  className?: string;
}

export function ThreeAnatomyViewer({
  selectedRegionId = null,
  onSelectRegion,
  className = '',
}: ThreeAnatomyViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);
  const [currentSelectedId, setCurrentSelectedId] = useState<string | null>(selectedRegionId);

  useEffect(() => {
    setCurrentSelectedId(selectedRegionId);
  }, [selectedRegionId]);

  // Three.js scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const bodyGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const bodyGroup = new THREE.Group();
    bodyGroupRef.current = bodyGroup;
    scene.add(bodyGroup);

    // Anatomical Part Meshes
    const meshes = new Map<string, THREE.Mesh>();
    meshMapRef.current = meshes;

    // Helper to create part
    const createPart = (id: string, geometry: THREE.BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        wireframe: true,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.7,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.userData = { id };
      bodyGroup.add(mesh);
      meshes.set(id, mesh);

      // Inner subtle solid core
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x0369a1,
        transparent: true,
        opacity: 0.15,
      });
      const core = new THREE.Mesh(geometry, coreMat);
      core.scale.set(0.95, 0.95, 0.95);
      mesh.add(core);

      return mesh;
    };

    // 1. Head
    createPart('head', new THREE.SphereGeometry(0.85, 16, 16), [0, 3.8, 0]);

    // 2. Chest (Thorax)
    createPart('chest', new THREE.CylinderGeometry(1.2, 1.0, 1.8, 16), [0, 2.2, 0]);

    // 3. Abdomen
    createPart('abdomen', new THREE.CylinderGeometry(0.95, 1.0, 1.5, 16), [0, 0.6, 0]);

    // 4. Pelvis
    createPart('pelvis', new THREE.CylinderGeometry(1.05, 0.85, 1.1, 16), [0, -0.65, 0]);

    // 5. Left Arm
    createPart('arm_l', new THREE.CapsuleGeometry(0.3, 2.4, 8, 16), [-1.8, 1.6, 0], [0, 0, 0.15]);

    // 6. Right Arm
    createPart('arm_r', new THREE.CapsuleGeometry(0.3, 2.4, 8, 16), [1.8, 1.6, 0], [0, 0, -0.15]);

    // 7. Left Leg
    createPart('leg_l', new THREE.CapsuleGeometry(0.4, 3.2, 8, 16), [-0.75, -2.8, 0]);

    // 8. Right Leg
    createPart('leg_r', new THREE.CapsuleGeometry(0.4, 3.2, 8, 16), [0.75, -2.8, 0]);

    // Pedestal holographic grid
    const gridHelper = new THREE.GridHelper(6, 12, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -4.6;
    scene.add(gridHelper);

    // Subtle lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Mouse drag rotation & Raycasting
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        bodyGroup.rotation.y += deltaX * 0.01;
        bodyGroup.rotation.x = Math.max(-0.4, Math.min(0.4, bodyGroup.rotation.x + deltaY * 0.005));
        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        // Raycasting highlight check
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Array.from(meshes.values()), true);

        if (intersects.length > 0) {
          let topMesh = intersects[0].object as THREE.Mesh;
          while (topMesh.parent && topMesh.parent !== bodyGroup) {
            topMesh = topMesh.parent as THREE.Mesh;
          }
          const id = topMesh.userData.id;
          const reg = BODY_REGIONS.find(r => r.id === id) || null;
          setHoveredRegion(reg);
        } else {
          setHoveredRegion(null);
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(meshes.values()), true);

      if (intersects.length > 0) {
        let topMesh = intersects[0].object as THREE.Mesh;
        while (topMesh.parent && topMesh.parent !== bodyGroup) {
          topMesh = topMesh.parent as THREE.Mesh;
        }
        const id = topMesh.userData.id;
        const reg = BODY_REGIONS.find(r => r.id === id);
        if (reg) {
          setCurrentSelectedId(id);
          onSelectRegion?.(reg);
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onClick);

    // Resize listener
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

    // Render loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Idle gentle sway if not dragging
      if (!isDragging) {
        bodyGroup.rotation.y += 0.003;
      }

      // Update part colors based on state
      meshes.forEach((mesh, id) => {
        const isSelected = id === currentSelectedId;
        const isHovered = id === hoveredRegion?.id;
        const mat = mesh.material as THREE.MeshStandardMaterial;

        if (isSelected) {
          const pulse = (Math.sin(elapsed * 6) + 1) * 0.5;
          mat.color.setHex(0x10b981); // Emerald pulse
          mat.opacity = 0.9 + pulse * 0.1;
          mesh.scale.setScalar(1.08 + pulse * 0.04);
        } else if (isHovered) {
          mat.color.setHex(0x38bdf8); // Bright cyan
          mat.opacity = 0.85;
          mesh.scale.setScalar(1.04);
        } else {
          mat.color.setHex(0x0369a1); // Deep slate cyan
          mat.opacity = 0.45;
          mesh.scale.setScalar(1.0);
        }
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
      container.removeEventListener('click', onClick);

      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentSelectedId, hoveredRegion?.id, onSelectRegion]);

  const resetView = useCallback(() => {
    if (bodyGroupRef.current) {
      bodyGroupRef.current.rotation.set(0, 0, 0);
    }
  }, []);

  return (
    <div className={`relative bg-surface-card border border-surface-border rounded-2xl p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-sans">
            3D Anatomical Pinpointer
          </span>
          <p className="text-xs text-slate-400">Click a region to tag symptom location</p>
        </div>
        <button
          onClick={resetView}
          type="button"
          className="text-[11px] font-sans px-2 py-1 rounded bg-surface border border-surface-border hover:bg-surface-hover text-slate-400 hover:text-white transition"
        >
          Reset View
        </button>
      </div>

      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-72 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden relative cursor-grab active:cursor-grabbing"
      />

      {/* Dynamic Status / Tooltip Bar */}
      <div className="mt-3 p-2.5 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs min-h-[42px]">
        {hoveredRegion || currentSelectedId ? (
          <div>
            <span className="font-semibold text-white">
              {hoveredRegion ? hoveredRegion.name : BODY_REGIONS.find(r => r.id === currentSelectedId)?.name}
            </span>
            <span className="ml-2 text-cyan-400 font-sans text-[11px]">
              [{hoveredRegion ? hoveredRegion.category : BODY_REGIONS.find(r => r.id === currentSelectedId)?.category}]
            </span>
            <p className="text-[11px] text-slate-400">
              {hoveredRegion ? hoveredRegion.description : BODY_REGIONS.find(r => r.id === currentSelectedId)?.description}
            </p>
          </div>
        ) : (
          <span className="text-slate-500 italic">Drag to rotate 3D model • Click to pinpoint symptom area</span>
        )}

        {currentSelectedId && (
          <button
            onClick={() => {
              setCurrentSelectedId(null);
            }}
            type="button"
            className="text-[10px] text-slate-400 hover:text-red-400 ml-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
