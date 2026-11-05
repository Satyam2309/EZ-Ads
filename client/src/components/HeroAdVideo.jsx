import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon.jsx';

/**
 * HeroAdVideo — the photoreal "real people" hook for the landing page.
 *
 * Drop the produced clip into public/media and it plays automatically; until
 * then an owner-facing placeholder explains exactly what to supply. No code
 * change is needed to switch it on.
 *
 * Behaviour:
 *   - muted + autoplay + loop + playsInline (the only combination browsers allow)
 *   - preload="none" until the section scrolls into view, then loads and plays
 *   - pauses when scrolled away or when the tab is hidden
 *   - prefers-reduced-motion → poster only, no autoplay
 *   - explicitly NOT labelled as real user data: it is a marketing clip
 */
const SRC_MP4 = '/media/ezads-ad.mp4';
const SRC_WEBM = '/media/ezads-ad.webm';
const POSTER = '/media/ezads-ad-poster.jpg';

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

/** Owner-facing instructions shown until the clip exists. */
function SlotPlaceholder() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="aurora opacity-50" aria-hidden />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
        <Icon name="bolt" size={24} />
      </span>
      <div className="relative">
        <p className="font-(family:--font-display) text-lg font-bold">Photoreal ad slot — ready for your clip</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-(--color-ink-soft)">
          This is where the real-footage hook plays. Generate a short clip of people using the app,
          then drop it at <code className="rounded bg-(--color-elevated) px-1.5 py-0.5 font-mono text-xs">client/public/media/ezads-ad.mp4</code> —
          it plays here automatically, with no code change.
        </p>
      </div>
      <dl className="relative grid gap-x-6 gap-y-1 text-left font-mono text-[11px] text-(--color-ink-soft) sm:grid-cols-2">
        <div><dt className="inline">duration </dt><dd className="inline text-(--color-ink)">8–15s, seamless loop</dd></div>
        <div><dt className="inline">resolution </dt><dd className="inline text-(--color-ink)">1920×1080 (16:9)</dd></div>
        <div><dt className="inline">format </dt><dd className="inline text-(--color-ink)">MP4 H.264 (+ optional WebM)</dd></div>
        <div><dt className="inline">size target </dt><dd className="inline text-(--color-ink)">under 3 MB</dd></div>
        <div><dt className="inline">audio </dt><dd className="inline text-(--color-ink)">none needed (muted autoplay)</dd></div>
        <div><dt className="inline">poster </dt><dd className="inline text-(--color-ink)">media/ezads-ad-poster.jpg</dd></div>
      </dl>
    </div>
  );
}

export default function HeroAdVideo() {
  const reduced = useReducedMotion();
  const holder = useRef(null);
  const video = useRef(null);
  const [present, setPresent] = useState(null); // null = checking, true = clip found
  const [inView, setInView] = useState(false);

  // Is the clip there yet?
  // A plain status check is NOT enough: SPA hosts (and the Vite dev server)
  // answer 200 with index.html for any unmatched path, so a missing clip looks
  // like a success. Require a real video content-type instead — and catch a
  // cache-busting range request with a 206 partial response.
  useEffect(() => {
    let alive = true;
    fetch(SRC_MP4, { method: 'HEAD', headers: { Range: 'bytes=0-0' } })
      .then((r) => {
        const type = r.headers.get('content-type') || '';
        if (alive) setPresent(r.ok && type.startsWith('video/'));
      })
      .catch(() => { if (alive) setPresent(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play only while on screen; pause otherwise (and on tab hide via the browser).
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (inView && !reduced && present) {
      v.play().catch(() => {}); // autoplay can still be refused — poster remains
    } else {
      v.pause();
    }
  }, [inView, reduced, present]);

  return (
    <section ref={holder} className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
      <div className="glass overflow-hidden rounded-3xl">
        <div className="relative aspect-video w-full bg-(--color-elevated)">
          {present === true ? (
            <>
              <video
                ref={video}
                className="h-full w-full object-cover"
                poster={POSTER}
                muted
                loop
                playsInline
                preload="none"
                onError={() => setPresent(false)}
                aria-label="EZ Ads product advert"
              >
                <source src={SRC_MP4} type="video/mp4" />
                <source src={SRC_WEBM} type="video/webm" />
              </video>
              <span className="absolute left-4 top-4 rounded-full border border-(--color-line) bg-(--color-surface)/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-(--color-ink-soft) backdrop-blur">
                product advert
              </span>
              {reduced && (
                <p className="absolute bottom-4 left-4 rounded-lg bg-(--color-surface)/85 px-3 py-1.5 text-xs text-(--color-ink-soft) backdrop-blur">
                  Autoplay paused — reduced motion preference.
                </p>
              )}
            </>
          ) : present === null ? (
            <div className="absolute inset-0 animate-pulse-soft bg-(--color-elevated)" aria-hidden />
          ) : (
            <SlotPlaceholder />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-(--color-line) px-5 py-4">
          <p className="flex-1 min-w-[16rem] text-sm text-(--color-ink-soft)">
            <strong className="text-(--color-ink)">Real campaigns, real creators.</strong>{' '}
            Then watch the platform itself move the deal from invite to payout.
          </p>
          <a href="#how-it-works" className="text-sm font-semibold text-(--color-vz-link) hover:underline">
            Jump to the 3D walkthrough ↓
          </a>
        </div>
      </div>
    </section>
  );
}
