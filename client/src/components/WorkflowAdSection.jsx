import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import Button from './ui/Button.jsx';
import Icon from './ui/Icon.jsx';
import { AD_STEPS, AD_STEP_SECONDS } from './three/adTimeline.js';

/* three.js stays in its own chunk — the landing page only downloads it when
   this section actually mounts. */
const WorkflowAd = lazy(() => import('./three/WorkflowAd.jsx'));

const STEP_ICONS = ['search', 'message', 'shield', 'check', 'wallet'];

function useWebgl() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setOk(Boolean(c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

function usePrefersReducedMotion() {
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

/** Non-3D version: the same five steps as a readable storyboard. */
function Storyboard() {
  return (
    <ol className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
      {AD_STEPS.map((s, i) => (
        <li key={s.id} className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-elevated)">
              <Icon name={STEP_ICONS[i]} gradient size={18} />
            </span>
            <span className="font-(family:--font-mono) text-xs text-(--color-ink-soft)">0{i + 1}</span>
          </div>
          <p className="mt-3 text-sm font-semibold">{s.title}</p>
          <p className="mt-1 text-xs text-(--color-ink-soft)">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default function WorkflowAdSection() {
  const webgl = useWebgl();
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [started, setStarted] = useState(false);
  const holder = useRef(null);

  const use3d = webgl && !reduced;

  // Start the demo only once the section scrolls into view, and pause it when
  // it leaves — so the ad never burns CPU off-screen.
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); setPlaying(true); }
      else setPlaying(false);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const current = AD_STEPS[step];

  return (
    <section id="how-it-works" ref={holder} className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-(family:--font-mono) text-xs uppercase tracking-[0.18em] text-(--color-ink-soft)">Product demo</p>
          <h2 className="font-(family:--font-display) mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            How EZ Ads works, <span className="text-shine">in 17 seconds</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm text-(--color-ink-soft)">
          A simulated walkthrough: without a real brand and creator, the demo shows the exact platform workflow — no live Instagram data is involved.
        </p>
      </div>

      <div className="glass mt-8 overflow-hidden rounded-3xl">
        {use3d ? (
          <div className="relative">
            <div className="relative h-[22rem] sm:h-[26rem] lg:h-[30rem]">
              <div className="orb-css absolute inset-0 opacity-40" aria-hidden />
              {started && (
                <Suspense fallback={null}>
                  <WorkflowAd className="absolute inset-0" playing={playing} onStep={setStep} />
                </Suspense>
              )}

              {/* caption overlay — real DOM text, crisp and screen-reader visible */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <div className="max-w-md rounded-2xl border border-(--color-line) bg-(--color-surface)/85 p-4 backdrop-blur">
                  <p className="font-(family:--font-mono) text-[11px] uppercase tracking-widest text-(--color-ink-soft)">
                    Step {step + 1} of {AD_STEPS.length}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                    <Icon name={STEP_ICONS[step]} gradient size={20} /> {current.title}
                  </p>
                  <p className="mt-1 text-sm text-(--color-ink-soft)">{current.body}</p>
                </div>
              </div>

              <span className="absolute right-4 top-4 rounded-full border border-(--color-line) bg-(--color-surface)/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-(--color-ink-soft) backdrop-blur">
                simulated demo
              </span>
            </div>

            {/* controls */}
            <div className="flex flex-wrap items-center gap-4 border-t border-(--color-line) px-5 py-4">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700"
                aria-label={playing ? 'Pause the demo' : 'Play the demo'}
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <ol className="flex flex-1 flex-wrap items-center gap-2">
                {AD_STEPS.map((s, i) => (
                  <li key={s.id} className="flex-1 min-w-[28px]">
                    <span
                      className={`block h-1.5 rounded-full transition-colors ${
                        i < step ? 'bg-brand-400' : i === step ? 'bg-accent-500' : 'bg-(--color-elevated)'
                      }`}
                    />
                  </li>
                ))}
              </ol>
              <span className="font-mono text-[11px] text-(--color-ink-soft)">
                {AD_STEP_SECONDS}s per step · loops
              </span>
            </div>
          </div>
        ) : (
          <Storyboard />
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-(--color-line) px-5 py-4">
          <Button size="sm" to="/register/brand">Run a real campaign <Icon name="arrow" size={16} /></Button>
          <Button size="sm" variant="secondary" to="/auth/instagram">I'm a creator</Button>
          {!use3d && (
            <span className="text-xs text-(--color-ink-soft)">
              3D demo disabled on this device{reduced ? ' (reduced motion preference)' : ' (WebGL unavailable)'} — showing the storyboard instead.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
