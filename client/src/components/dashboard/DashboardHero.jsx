import { Suspense, lazy, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';

/* three.js is code-split: browsers only download it when a dashboard renders. */
const HeroScene = lazy(() => import('../three/HeroScene.jsx'));

/**
 * True once the browser is idle after mount. The 3D chunk only starts fetching
 * then, so the dashboard's paint + data fetches keep the first-load window to
 * themselves (rIC; falls back to a short timeout where unsupported).
 */
function useIdleReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return undefined;
    const hasRic = typeof window.requestIdleCallback === 'function';
    const id = hasRic
      ? window.requestIdleCallback(() => setReady(true), { timeout: 1500 })
      : setTimeout(() => setReady(true), 1200);
    return () => {
      if (hasRic) window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [ready]);
  return ready;
}

/** Cheap WebGL probe so we never mount a canvas that cannot render. */
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

/** CSS-3D stand-in shown while the 3D chunk loads (or if WebGL is missing). */
function OrbFallback() {
  return (
    <div className="orb-css h-full w-full">
      <span className="font-mono text-[11px] tracking-widest text-(--color-ink-soft)">LOADING SCENE</span>
    </div>
  );
}

function Tile({ tile, index }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--color-ink-soft)">{tile.label}</p>
        {tile.icon && (
          <span className="icon-chip h-7 w-7">
            <Icon name={tile.icon} size={15} className="text-brand-500 dark:text-brand-300" />
          </span>
        )}
      </div>
      <p className="figure mt-2.5 text-3xl tracking-tight">{tile.value}</p>
      {tile.hint && <p className="mt-1 text-[11px] text-(--color-ink-soft)">{tile.hint}</p>}
    </>
  );
  const cls =
    'tile-link group block rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)/85 p-4 shadow-[0_1px_0_rgb(255_255_255/0.5)_inset] backdrop-blur transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:scale-[1.015] hover:border-brand-500/35 hover:shadow-(--shadow-card-hover) dark:shadow-[0_1px_0_rgb(255_255_255/0.05)_inset]';
  return (
    <div key={tile.key} className="reveal" style={{ '--reveal-delay': `${index * 90}ms`, opacity: 1 }}>
      {tile.to ? (
        <Link to={tile.to} className={cls}>{inner}</Link>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </div>
  );
}

/**
 * DashboardHero — the top band of both dashboards.
 * Left: greeting + live stat tiles. Right: lazy 3D constellation (CSS orb until it loads).
 */
export default function DashboardHero({ eyebrow, title, subtitle, tiles = [], children }) {
  const webgl = useWebgl();
  const idleReady = useIdleReady();
  return (
    <section className="panel relative overflow-hidden">
      <div className="aurora opacity-40" aria-hidden />
      <div className="grid-overlay" aria-hidden />
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          {eyebrow && (
            <p className="font-(family:--font-mono) text-xs uppercase tracking-[0.18em] text-(--color-ink-soft)">{eyebrow}</p>
          )}
          <h1 className="font-(family:--font-display) mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-sm text-(--color-ink-soft)">{subtitle}</p>}

          {tiles.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {tiles.map((t, i) => <Tile key={t.key || t.label} tile={t} index={i} />)}
            </div>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>

        <div className="relative h-64 overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-canvas)/50 shadow-[0_1px_0_rgb(255_255_255/0.5)_inset] sm:h-80 lg:h-[22rem] dark:shadow-[0_1px_0_rgb(255_255_255/0.05)_inset]">
          <Suspense fallback={<OrbFallback />}>
            {webgl && idleReady ? <HeroScene className="h-full w-full" /> : <OrbFallback />}
          </Suspense>
          <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-widest text-(--color-ink-soft)/80">
            creator constellation
          </p>
        </div>
      </div>
    </section>
  );
}
