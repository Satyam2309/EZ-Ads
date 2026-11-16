import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../BrandLogo.jsx';

const WELCOME = ['Welcome', 'to', 'EZ', 'Ads'];
const TAGLINE = ['the', 'marketing', 'OS.'];

// Hopping between login and signup re-runs the reveal, which reads as a flicker.
// A short-lived marker lets the second page start with the headline already settled.
const SEEN_KEY = 'ezads-welcome-at';
const CONTINUITY_MS = 4000;

function seenRecently() {
  try {
    const at = Number(sessionStorage.getItem(SEEN_KEY)) || 0;
    return Date.now() - at < CONTINUITY_MS;
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* storage blocked — animation just replays, nothing breaks */
  }
}

function Words({ words, animate, delay = 0, step = 70 }) {
  return words.map((word, i) => (
    <Fragment key={word}>
      <span
        className={animate ? 'inline-block animate-word' : 'inline-block'}
        style={animate ? { animationDelay: `${delay + i * step}ms` } : undefined}
      >
        {word}
      </span>
      {i < words.length - 1 ? ' ' : null}
    </Fragment>
  ));
}

/* Fades the current auth page out, then routes. Returns [leaving, swapTo]. */
export function useAuthSwap() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  function swapTo(to) {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      navigate(to);
      return;
    }
    setLeaving(true);
    setTimeout(() => navigate(to), 220);
  }

  return [leaving, swapTo];
}

export default function AuthStory({ points = [], footnote }) {
  // "Welcome to EZ Ads" lands first; "the marketing OS." follows one beat later.
  const [animate] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
    return !seenRecently();
  });
  const [showTagline, setShowTagline] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      markSeen();
      return;
    }
    const t = setTimeout(() => {
      setShowTagline(true);
      markSeen();
    }, 1000);
    return () => clearTimeout(t);
  }, [animate]);

  return (
    <div className="relative flex h-full flex-col justify-center gap-12 p-12">
      <div className="aurora" aria-hidden />
      <div className="grid-overlay" aria-hidden />

      <div className="relative">
        <BrandLogo size="lg" />
      </div>

      <div className="relative max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--color-ink-soft)">
          Influencer marketing, done right
        </p>
        <h2 className="mt-4 font-(family:--font-display) text-[2.6rem] font-extrabold leading-[1.06] tracking-tight">
          <span className="block">
            <Words words={WELCOME} animate={animate} />
          </span>
          {showTagline && (
            // the gradient has to sit on the line itself — background-clip:text does not
            // clip through inline-block word spans, which renders the text invisible
            <span
              className={`mt-1 block ${animate ? 'animate-word' : ''}`}
              style={animate ? { animationDelay: '220ms' } : undefined}
            >
              <span className="text-shine">{TAGLINE.join(' ')}</span>
            </span>
          )}
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-(--color-ink-soft)">
          Find creators, run a campaign from brief to payout, and keep every number labelled
          by where it came from — all in one workspace.
        </p>

        {points.length > 0 && (
          <ul className="mt-8 space-y-3 text-sm">
            {points.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800">
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m4 10.5 4 4 8-9" />
                  </svg>
                </span>
                <span className="text-(--color-ink-soft)">{line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {footnote && (
        <p className="absolute bottom-10 left-12 right-12 text-xs text-(--color-ink-soft)">{footnote}</p>
      )}
    </div>
  );
}
