const tones = {
  neutral: 'bg-(--color-elevated) text-(--color-ink-soft) ring-(--color-line)',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/40',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40',
  danger: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/40'
};

const DOTS = {
  neutral: 'bg-(--color-ink-soft)',
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500'
};

/** Small status label. `dot` adds the coloured pip used on live state chips. */
export default function Badge({ tone = 'neutral', children, className = '', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
        shadow-[0_1px_0_rgb(255_255_255/0.35)_inset] dark:shadow-[0_1px_0_rgb(255_255_255/0.06)_inset] ${tones[tone]} ${className}`}
    >
      {dot && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  );
}
