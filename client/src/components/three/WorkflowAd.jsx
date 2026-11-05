/**
 * WorkflowAd — a looping 3D "product ad" for the landing page.
 *
 * It plays the EZ Ads workflow as a 16-second cinematic: a creator grid is
 * filtered, a brand invites one creator, terms are signed, deliverables are
 * reviewed, and the payout travels back to the creator.
 *
 * Performance rules (same as HeroScene):
 *   - MeshBasicMaterial only: no lights, no shadows, no post-processing
 *   - one shared geometry per shape, capped DPR, no textures
 *   - React state is touched only when the STEP changes (5x per loop), never
 *     per frame; all motion is written through refs inside a single useFrame
 *   - rendering stops when offscreen, when the tab is hidden, or when paused
 *
 * The parent owns play/pause and the caption overlay; this file only draws.
 */
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AD_STEPS, AD_STEP_SECONDS, AD_TOTAL_SECONDS } from './adTimeline.js';

/* Timeline metadata lives in ./adTimeline.js (three-free) so the caption
   overlay can read it without pulling three.js into the main bundle. */
const TOTAL = AD_TOTAL_SECONDS;

const BRAND_X = 3.6;
const CREATOR_X = -3.2;

/* Camera stations — one per step, so the "camera" dollies like a real ad. */
const STATIONS = [
  { pos: [-3.0, 1.1, 4.4], look: [-3.2, 0.1, 0] },
  { pos: [-0.2, 1.6, 5.8], look: [0.1, 0.05, 0] },
  { pos: [0.1, 0.5, 3.1], look: [0.05, 0.05, 0] },
  { pos: [2.1, 1.0, 4.5], look: [1.7, 0.05, 0] },
  { pos: [-0.3, 1.4, 5.2], look: [-1.2, 0.05, 0] }
];

const CREATOR_GRID = (() => {
  const out = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      out.push({ x: -5.6 + col * 0.72, y: -0.75 + row * 0.75, s: 0.13 });
    }
  }
  return out; // 15 nodes; index 8 is the one the story highlights
})();
const HIGHLIGHT_INDEX = 8;

const COIN_COUNT = 12;

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function Director({ playing, onStep }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const lastStep = useRef(-1);

  const refs = {
    grid: useRef([]),
    beam: useRef(),
    beamGlow: useRef(),
    brand: useRef(),
    brandLabel: useRef(),
    contract: useRef(),
    stamps: useRef([]),
    deliverables: useRef([]),
    coins: useRef([]),
    ring: useRef(),
    pulse: useRef()
  };

  useFrame((_, rawDelta) => {
    // clamp delta so a backgrounded tab never jumps the timeline forward
    const delta = Math.min(rawDelta, 0.05);
    if (playing) elapsed.current = (elapsed.current + delta) % TOTAL;

    const t = elapsed.current;
    const index = Math.min(AD_STEPS.length - 1, Math.floor(t / AD_STEP_SECONDS));
    const local = (t % AD_STEP_SECONDS) / AD_STEP_SECONDS;

    if (index !== lastStep.current) {
      lastStep.current = index;
      onStep?.(index);
    }

    /* ---- camera dolly between stations ---- */
    const move = ease(clamp01(local / 0.35));
    const from = STATIONS[index];
    const to = STATIONS[Math.min(index + 1, STATIONS.length - 1)];
    camera.position.set(
      from.pos[0] + (to.pos[0] - from.pos[0]) * move * 0.25,
      from.pos[1] + (to.pos[1] - from.pos[1]) * move * 0.25,
      from.pos[2] + (to.pos[2] - from.pos[2]) * move * 0.25
    );
    camera.lookAt(from.look[0], from.look[1], from.look[2]);

    /* ---- step 1: creator grid, one node lights up ---- */
    const searchP = index === 0 ? clamp01(local / 0.6) : 1;
    refs.grid.current.forEach((m, i) => {
      if (!m) return;
      const isPick = i === HIGHLIGHT_INDEX;
      const appear = clamp01((searchP - i * 0.012) * 3);
      const scale = isPick ? 1 + appear * 0.9 : 0.35 + appear * 0.65;
      m.scale.setScalar(scale);
      m.material.opacity = 0.25 + appear * 0.6;
      m.material.color.set(isPick && index >= 0 ? '#f96a2b' : '#5b9cf8');
    });

    /* ---- step 2: invitation beam connects brand → creator ---- */
    const beamP = index === 1 ? clamp01((local - 0.1) / 0.55) : index > 1 ? 1 : 0;
    if (refs.beam.current) {
      const len = (BRAND_X - CREATOR_X) * beamP;
      refs.beam.current.scale.set(Math.max(len, 0.001), 1, 1);
      refs.beam.current.position.x = CREATOR_X + len / 2;
      refs.beam.current.material.opacity = 0.15 + beamP * 0.5;
    }
    if (refs.beamGlow.current) {
      refs.beamGlow.current.scale.set(Math.max((BRAND_X - CREATOR_X) * beamP, 0.001), 1, 1);
      refs.beamGlow.current.position.x = CREATOR_X + ((BRAND_X - CREATOR_X) * beamP) / 2;
      refs.beamGlow.current.material.opacity = beamP * 0.2;
    }
    if (refs.brand.current) {
      refs.brand.current.rotation.y = index === 1 ? Math.sin(t * 2.2) * 0.12 : 0;
      refs.brand.current.material.opacity = index === 0 ? 0.55 : 1;
    }

    /* ---- step 3: contract appears, then both signatures stamp ---- */
    if (refs.contract.current) {
      const cP = index < 2 ? 0 : index === 2 ? clamp01((local - 0.05) / 0.35) : 1;
      refs.contract.current.scale.setScalar(0.001 + cP * 1);
      refs.contract.current.rotation.z = (1 - cP) * 0.5 - 0.05;
      refs.contract.current.material.opacity = cP * 0.95;
      refs.contract.current.visible = cP > 0.01;
    }
    refs.stamps.current.forEach((s, i) => {
      if (!s) return;
      const start = 0.45 + i * 0.22;
      const sP = index < 2 ? 0 : index === 2 ? clamp01((local - start) / 0.25) : 1;
      s.scale.setScalar(0.001 + sP);
      s.material.opacity = sP;
    });

    /* ---- step 4: deliverable cards slide in, progress ring sweeps ---- */
    refs.deliverables.current.forEach((d, i) => {
      if (!d) return;
      const start = i * 0.14;
      const dP = index < 3 ? 0 : index === 3 ? clamp01((local - start) / 0.4) : 1;
      d.scale.setScalar(0.001 + dP);
      d.position.y = 0.02 + dP * 0.06;
      d.material.opacity = dP * 0.95;
    });
    if (refs.ring.current) {
      const rP = index < 3 ? 0 : index === 3 ? clamp01((local - 0.15) / 0.8) : 1;
      refs.ring.current.scale.setScalar(0.001 + rP);
      refs.ring.current.rotation.z -= delta * 1.2;
      refs.ring.current.material.opacity = rP * 0.9;
    }

    /* ---- step 5: payout travels creator-ward, then the node flares ---- */
    const payBase = index < 4 ? 0 : clamp01((local - 0.05) / 0.8);
    refs.coins.current.forEach((c, i) => {
      if (!c) return;
      const stagger = i / COIN_COUNT;
      const p = clamp01((payBase - stagger * 0.35) / 0.65);
      c.visible = p > 0.001 && p < 0.999;
      c.position.x = BRAND_X + (CREATOR_X - BRAND_X) * p;
      c.position.y = 0.02 + Math.sin(p * Math.PI) * 0.55 + (i % 2 ? 0.1 : -0.1);
      c.position.z = 0.3 + (i % 3) * 0.06;
      c.scale.setScalar(0.5 + Math.sin(p * Math.PI) * 0.6);
    });
    if (refs.pulse.current) {
      const fP = index < 4 ? 0 : clamp01((local - 0.8) / 0.2);
      refs.pulse.current.scale.setScalar(0.6 + fP * 2.6);
      refs.pulse.current.material.opacity = fP > 0 ? (1 - fP) * 0.7 : 0;
    }
  });

  return (
    <group>
      {/* creator grid (step 1) */}
      {CREATOR_GRID.map((n, i) => (
        <mesh key={`n${i}`} ref={(el) => (refs.grid.current[i] = el)} position={[n.x, n.y, 0]}>
          <sphereGeometry args={[n.s, 12, 12]} />
          <meshBasicMaterial color="#5b9cf8" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* brand node (the advertiser side) */}
      <mesh ref={refs.brand} position={[BRAND_X, 0.05, 0]}>
        <boxGeometry args={[1.15, 0.75, 0.16]} />
        <meshBasicMaterial color="#1b6fe3" transparent opacity={1} />
      </mesh>
      <mesh ref={refs.brandLabel} position={[BRAND_X, 0.05, 0.11]}>
        <planeGeometry args={[0.5, 0.12]} />
        <meshBasicMaterial color="#eef6ff" transparent opacity={0.92} />
      </mesh>

      {/* invitation beam (step 2) — a unit-length bar scaled from the creator side */}
      <mesh ref={refs.beam} position={[CREATOR_X, 0.05, 0]}>
        <boxGeometry args={[1, 0.035, 0.035]} />
        <meshBasicMaterial color="#f96a2b" transparent opacity={0} />
      </mesh>
      <mesh ref={refs.beamGlow} position={[CREATOR_X, 0.05, 0]}>
        <boxGeometry args={[1, 0.16, 0.02]} />
        <meshBasicMaterial color="#fb814c" transparent opacity={0} />
      </mesh>

      {/* contract + two signature stamps (step 3) */}
      <mesh ref={refs.contract} position={[0.05, 0.08, 0.35]}>
        <planeGeometry args={[1.5, 1.0]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
      {[-0.42, 0.42].map((x, i) => (
        <mesh key={`s${i}`} ref={(el) => (refs.stamps.current[i] = el)} position={[x, -0.22, 0.42]}>
          <planeGeometry args={[0.34, 0.1]} />
          <meshBasicMaterial color={i === 0 ? '#1b6fe3' : '#f96a2b'} transparent opacity={0} />
        </mesh>
      ))}

      {/* deliverable cards + review ring (step 4) */}
      {[1.15, 1.75, 2.35].map((x, i) => (
        <mesh key={`d${i}`} ref={(el) => (refs.deliverables.current[i] = el)} position={[x, 0.05, 0.2]}>
          <planeGeometry args={[0.5, 0.66]} />
          <meshBasicMaterial color={['#8abcfd', '#ffd166', '#fda67b'][i]} transparent opacity={0} />
        </mesh>
      ))}
      <mesh ref={refs.ring} position={[1.75, 0.05, 0.55]}>
        <torusGeometry args={[0.42, 0.022, 8, 48, Math.PI * 1.6]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0} />
      </mesh>

      {/* payout particles (step 5) */}
      {Array.from({ length: COIN_COUNT }).map((_, i) => (
        <mesh key={`c${i}`} ref={(el) => (refs.coins.current[i] = el)} visible={false}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.95} />
        </mesh>
      ))}
      <mesh ref={refs.pulse} position={[CREATOR_X, 0.1, 0.1]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0} />
      </mesh>
    </group>
  );
}

export default function WorkflowAd({ playing = true, onStep, className = '' }) {
  const wrap = useRef(null);
  const [onScreen, setOnScreen] = useState(false);

  // Only run the timeline while the section is on screen (battery + CPU).
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = playing && onScreen;

  return (
    <div ref={wrap} className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: STATIONS[0].pos, fov: 45 }}
        frameloop={running ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Director playing={running} onStep={onStep} />
      </Canvas>
    </div>
  );
}
