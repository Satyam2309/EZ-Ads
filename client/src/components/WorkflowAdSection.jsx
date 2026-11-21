import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button.jsx';
import Icon from './ui/Icon.jsx';
import { AD_STEPS } from './workflowSteps.js';

/* The real walkthrough clip. Replacing this file updates the section — no code
   change needed. It is 10s, 1280x720, H.264 at 2.3 MB, so it can autoplay muted
   anywhere; the poster covers the gap before the first frame decodes. */
const SRC_MP4 = '/media/ezads-ad.mp4?v=2';
const POSTER = '/media/ezads-ad-poster.jpg';

const STEP_ICONS = ['search', 'message', 'shield', 'check', 'wallet'];

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

/** The same five steps as readable text, under the clip. */
function Storyboard() {
  return (
    <ol className="grid gap-4 border-t border-(--color-line) p-6 sm:grid-cols-2 lg:grid-cols-5">
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
  const reduced = usePrefersReducedMotion();
  const holder = useRef(null);
  const video = useRef(null);
  const [inView, setInView] = useState(false);

  // Play only while the section is on screen, so the clip never burns CPU or
  // data off-screen.
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (inView && !reduced) {
      v.play().catch(() => {}); // autoplay can be refused — the first frame stays
    } else {
      v.pause();
    }
  }, [inView, reduced]);

  return (
    <section id="how-it-works" ref={holder} className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-(family:--font-display) text-3xl font-bold tracking-tight sm:text-4xl">
          Real creators. Real campaigns. <span className="text-shine">No guesswork.</span>
        </h2>
        <p className="max-w-sm text-sm text-(--color-ink-soft)">
          Creators who fit the brief, and five steps that carry a campaign from shortlist to payout.
        </p>
      </div>

      <div className="glass mt-8 overflow-hidden rounded-3xl">
        <div className="relative aspect-video w-full bg-(--color-elevated)">
          <video
            ref={video}
            className="h-full w-full object-cover"
            poster={POSTER}
            muted
            loop
            playsInline
            preload="metadata"
            controls={reduced}
            aria-label="EZ Ads product demo"
          >
            <source src={SRC_MP4} type="video/mp4" />
          </video>
          <span className="absolute right-4 top-4 rounded-full border border-(--color-line) bg-(--color-surface)/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-(--color-ink-soft) backdrop-blur">
            product demo
          </span>
        </div>

        <Storyboard />

        <div className="flex flex-wrap items-center gap-3 border-t border-(--color-line) px-5 py-4">
          <Button size="sm" to="/register/brand">Run a real campaign <Icon name="arrow" size={16} /></Button>
          <Button size="sm" variant="secondary" to="/auth/instagram">I'm a creator</Button>
        </div>
      </div>
    </section>
  );
}
