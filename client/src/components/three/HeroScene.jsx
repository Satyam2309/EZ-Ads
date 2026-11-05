/**
 * HeroScene — lazy-loaded 3D hero for the dashboard surfaces.
 *
 * Design intent: a "creator constellation" — a wireframe core with orbiting
 * nodes that slowly rotates and reacts to the pointer. Deliberately cheap:
 *   - MeshBasicMaterial only (no lights, no shadows, no post-processing)
 *   - instanced-ish shared geometries, capped DPR, no textures
 *   - rendering pauses when the canvas scrolls out of view
 *   - honors prefers-reduced-motion (renders one static frame)
 *
 * Loaded through React.lazy so three.js never enters the main bundle.
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ORBITS = [
  { radius: 1.9, count: 9, size: 0.085, color: '#1b6fe3', speed: 0.28, tilt: 0.25 },
  { radius: 2.6, count: 13, size: 0.062, color: '#f96a2b', speed: -0.19, tilt: -0.35 },
  { radius: 3.3, count: 7, size: 0.05, color: '#ffd166', speed: 0.12, tilt: 0.55 }
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** Wireframe core with a soft inner glow shell. */
function Core({ animate }) {
  const group = useRef();
  useFrame((_, dt) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += dt * 0.12;
    group.current.rotation.x += dt * 0.05;
  });
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.25, 1]} />
        <meshBasicMaterial color="#1b6fe3" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color="#f96a2b" wireframe transparent opacity={0.28} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial color="#367ef0" transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

/** One ring of orbiting nodes; rotates as a unit. */
function Orbit({ radius, count, size, color, speed, tilt, animate }) {
  const group = useRef();
  const nodes = useMemo(() => {
    const out = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const jitter = ((i * 37) % 100) / 100 - 0.5; // deterministic variation
      out.push({ a, r: radius + jitter * 0.35, y: jitter * 0.5, s: size * (1 + jitter * 0.35) });
    }
    return out;
  }, [radius, count, size]);

  useFrame((_, dt) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += dt * speed;
  });

  return (
    <group ref={group} rotation={[tilt, 0, tilt * 0.5]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.006, 6, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} />
      </mesh>
      {nodes.map((n, i) => (
        <mesh key={i} position={[Math.cos(n.a) * n.r, n.y, Math.sin(n.a) * n.r]}>
          <sphereGeometry args={[n.s, 12, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** Pointer parallax — the whole scene leans slightly toward the cursor. */
function ParallaxRig({ children, animate }) {
  const ref = useRef();
  const { pointer } = useThree();
  useFrame(() => {
    if (!animate || !ref.current) return;
    ref.current.rotation.y += ((pointer.x * 0.35) - ref.current.rotation.y) * 0.05;
    ref.current.rotation.x += ((-pointer.y * 0.25) - ref.current.rotation.x) * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      const a = i * 2.399963; // golden-angle scatter
      const r = 3.6 + ((i * 53) % 100) / 26;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (((i * 29) % 100) / 100 - 0.5) * 5;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8abcfd" size={0.035} transparent opacity={0.75} sizeAttenuation />
    </points>
  );
}

export default function HeroScene({ className = '' }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const wrap = useRef(null);

  // Pause the render loop when scrolled away (saves battery on long pages).
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const animate = !reduced && visible;

  return (
    <div ref={wrap} className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.6, 7], fov: 42 }}
        frameloop={animate ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ParallaxRig animate={animate}>
          <Core animate={animate} />
          {ORBITS.map((o, i) => (
            <Orbit key={i} {...o} animate={animate} />
          ))}
          <Starfield />
        </ParallaxRig>
      </Canvas>
    </div>
  );
}
