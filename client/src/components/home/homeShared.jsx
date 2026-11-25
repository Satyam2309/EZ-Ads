import { useEffect } from 'react';
import Icon from '../ui/Icon.jsx';

/**
 * Curated visual themes per niche/industry for card cover headers when no
 * real cover photograph has been uploaded. Kept strictly within warm editorial
 * blue, amber, coral, emerald, and sand hues (no violet/lavender).
 */
const NICHE_THEMES = {
  fashion: {
    label: 'Fashion',
    gradient: 'from-rose-100 via-orange-50 to-amber-100 dark:from-[#2c191b] dark:via-[#261b18] dark:to-[#291e14]',
    accent: 'text-rose-700 bg-white/85 dark:bg-black/40 dark:text-rose-200',
    glow: 'bg-rose-400/20'
  },
  beauty: {
    label: 'Beauty',
    gradient: 'from-amber-100 via-rose-50 to-orange-100 dark:from-[#2c1e16] dark:via-[#261a1a] dark:to-[#281c14]',
    accent: 'text-orange-800 bg-white/85 dark:bg-black/40 dark:text-orange-200',
    glow: 'bg-orange-400/20'
  },
  tech: {
    label: 'Tech',
    gradient: 'from-sky-100 via-blue-50 to-cyan-100 dark:from-[#122238] dark:via-[#161e2e] dark:to-[#10262c]',
    accent: 'text-brand-700 bg-white/85 dark:bg-black/40 dark:text-brand-200',
    glow: 'bg-brand-500/20'
  },
  technology: {
    label: 'Technology',
    gradient: 'from-sky-100 via-blue-50 to-cyan-100 dark:from-[#122238] dark:via-[#161e2e] dark:to-[#10262c]',
    accent: 'text-brand-700 bg-white/85 dark:bg-black/40 dark:text-brand-200',
    glow: 'bg-brand-500/20'
  },
  food: {
    label: 'Food',
    gradient: 'from-amber-100 via-orange-100 to-yellow-50 dark:from-[#2b1f12] dark:via-[#271b13] dark:to-[#242012]',
    accent: 'text-amber-800 bg-white/85 dark:bg-black/40 dark:text-amber-200',
    glow: 'bg-amber-400/20'
  },
  food_beverage: {
    label: 'Food & Beverage',
    gradient: 'from-amber-100 via-orange-100 to-yellow-50 dark:from-[#2b1f12] dark:via-[#271b13] dark:to-[#242012]',
    accent: 'text-amber-800 bg-white/85 dark:bg-black/40 dark:text-amber-200',
    glow: 'bg-amber-400/20'
  },
  fitness: {
    label: 'Fitness',
    gradient: 'from-emerald-100 via-teal-50 to-cyan-100 dark:from-[#122820] dark:via-[#142322] dark:to-[#122229]',
    accent: 'text-emerald-800 bg-white/85 dark:bg-black/40 dark:text-emerald-200',
    glow: 'bg-emerald-500/20'
  },
  health_fitness: {
    label: 'Health & Fitness',
    gradient: 'from-emerald-100 via-teal-50 to-cyan-100 dark:from-[#122820] dark:via-[#142322] dark:to-[#122229]',
    accent: 'text-emerald-800 bg-white/85 dark:bg-black/40 dark:text-emerald-200',
    glow: 'bg-emerald-500/20'
  },
  lifestyle: {
    label: 'Lifestyle',
    gradient: 'from-orange-100 via-stone-100 to-sky-100 dark:from-[#261c17] dark:via-[#1e1b18] dark:to-[#16202e]',
    accent: 'text-stone-800 bg-white/85 dark:bg-black/40 dark:text-stone-200',
    glow: 'bg-accent-400/20'
  },
  travel: {
    label: 'Travel',
    gradient: 'from-cyan-100 via-sky-50 to-emerald-100 dark:from-[#10252d] dark:via-[#15212b] dark:to-[#132620]',
    accent: 'text-cyan-800 bg-white/85 dark:bg-black/40 dark:text-cyan-200',
    glow: 'bg-cyan-400/20'
  },
  gaming: {
    label: 'Gaming',
    gradient: 'from-blue-100 via-slate-100 to-orange-100 dark:from-[#122036] dark:via-[#1a1d24] dark:to-[#2b1b14]',
    accent: 'text-brand-800 bg-white/85 dark:bg-black/40 dark:text-brand-200',
    glow: 'bg-brand-500/20'
  },
  education: {
    label: 'Education',
    gradient: 'from-sky-100 via-amber-50 to-stone-100 dark:from-[#142234] dark:via-[#211e18] dark:to-[#1d1a18]',
    accent: 'text-sky-800 bg-white/85 dark:bg-black/40 dark:text-sky-200',
    glow: 'bg-sky-400/20'
  }
};

const DEFAULT_THEME = {
  label: 'Creator',
  gradient: 'from-brand-100 via-stone-50 to-accent-100 dark:from-[#152236] dark:via-[#1b1918] dark:to-[#2a1b14]',
  accent: 'text-(--color-ink) bg-white/85 dark:bg-black/40 dark:text-stone-200',
  glow: 'bg-brand-400/20'
};

export function getNicheTheme(niche) {
  const key = String(niche || '').toLowerCase().trim();
  if (NICHE_THEMES[key]) return NICHE_THEMES[key];
  const fallbackLabel = key
    ? key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    : DEFAULT_THEME.label;
  return { ...DEFAULT_THEME, label: fallbackLabel };
}

/**
 * Shared atmospheric hero banner + overlapping floating search bar used by both
 * the Logged-in Creator Home Page and the Logged-in Brand Home Page.
 */
export function DiscoveryHero({
  statusSlot,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  filterSlot
}) {
  return (
    <section className="relative">
      {/* Pastel atmospheric hero band */}
      <div className="relative overflow-hidden border-b border-(--color-line) bg-linear-to-r from-[#d8e8ff] via-[#eef3fc] to-[#fde4cf] pb-16 pt-10 sm:pb-20 sm:pt-12 dark:from-[#101e36] dark:via-[#161b26] dark:to-[#2c1a12]">
        <div className="grid-overlay opacity-45 dark:opacity-30" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl dark:bg-brand-500/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-accent-400/25 blur-3xl dark:bg-accent-500/15"
        />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {statusSlot && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              {statusSlot}
            </div>
          )}

          <h1 className="font-(family:--font-display) text-3xl font-extrabold tracking-tight text-(--color-ink) sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-(--color-ink-soft) sm:text-base">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Overlapping centered search bar + filter strip */}
      <div className="relative z-10 mx-auto -mt-7 max-w-4xl px-4 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.();
          }}
          className="flex items-center gap-2 rounded-2xl border border-(--color-line) bg-(--color-surface) p-1.5 shadow-[0_14px_34px_-16px_rgba(28,25,23,0.18)] ring-1 ring-black/[0.03] focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.75)] dark:ring-white/[0.04]"
        >
          <span className="pl-3 text-(--color-ink-soft)" aria-hidden>
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-(--color-ink) placeholder:text-(--color-ink-soft)/75 focus:outline-none sm:text-[15px]"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-ink-soft) transition-colors hover:bg-(--color-elevated) hover:text-(--color-ink)"
            >
              <Icon name="close" size={15} />
            </button>
          )}
          <button
            type="submit"
            className="h-10 shrink-0 rounded-xl bg-linear-to-b from-brand-500 to-brand-600 px-5 text-sm font-semibold text-white shadow-xs transition-[transform,filter] hover:-translate-y-px hover:brightness-105 active:translate-y-0"
          >
            Search
          </button>
        </form>

        {filterSlot && (
          <div className="mt-4">
            {filterSlot}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Accessible modal shell with Escape-to-close and backdrop click dismissal.
 */
export function ModalDialog({ open, onClose, title, subtitle, maxWidth = 'max-w-lg', children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-(--color-line) bg-(--color-surface) p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-(family:--font-display) text-lg font-bold tracking-tight text-(--color-ink)">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-(--color-ink-soft)">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--color-ink-soft) transition-colors hover:bg-(--color-elevated) hover:text-(--color-ink)"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
