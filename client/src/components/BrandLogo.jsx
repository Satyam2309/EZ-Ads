/**
 * EZ Ads brand mark — two interlocked rings (blue brand + orange accent), a
 * rising growth arrow through them, and a three-node creator network inside.
 *
 * Drawn as inline SVG rather than a raster file so it stays crisp at navbar
 * size (32px), costs no network request, and re-tints for dark mode through
 * currentColor. The rings genuinely interlock: the orange ring's lower-right
 * arc is redrawn last so it passes in front of the blue ring there, while the
 * blue ring sits in front at the top crossing.
 */
export function BrandMark({ className = 'h-8 w-auto' }) {
  return (
    <svg
      viewBox="0 0 60 48"
      className={className}
      role="img"
      aria-label="EZ Ads"
      fill="none"
    >
      {/* rings — orange behind, blue on top at the upper crossing */}
      <circle
        cx="40"
        cy="29"
        r="13"
        stroke="currentColor"
        strokeWidth="5.5"
        className="text-accent-600 dark:text-accent-400"
      />
      <circle
        cx="22"
        cy="29"
        r="13"
        stroke="currentColor"
        strokeWidth="5.5"
        className="text-brand-600 dark:text-brand-400"
      />
      <path
        d="M33.9 40.48A13 13 0 0 1 28.74 35.5"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        className="text-accent-600 dark:text-accent-400"
      />

      {/* growth arrow, sweeping up through both rings */}
      <g className="text-brand-600 dark:text-brand-400">
        <path
          d="M14 36 33 27 49 14"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M55 8 52.88 17.2 45.8 10.1Z" fill="currentColor" />
      </g>

      {/* creator network — drawn last so the nodes stay readable over the arrow */}
      <g className="text-neutral-800 dark:text-neutral-100">
        <path
          d="M27 24.2 21 29 27 33.8"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g fill="currentColor">
          <circle cx="27" cy="24.2" r="2" />
          <circle cx="21" cy="29" r="2" />
          <circle cx="27" cy="33.8" r="2" />
        </g>
      </g>
    </svg>
  );
}

/* md is the navbar size; lg is for footers, where the tagline has room to breathe. */
const SIZES = {
  md: { gap: 'gap-2', mark: 'h-8 w-auto shrink-0', word: 'text-lg', tag: 'mt-1 text-[9px]' },
  lg: { gap: 'gap-2.5', mark: 'h-10 w-auto shrink-0', word: 'text-xl', tag: 'mt-1.5 text-[10px]' }
};

export default function BrandLogo({ className = '', showTagline = false, size = 'md' }) {
  const s = SIZES[size] ?? SIZES.md;
  return (
    <span className={`flex items-center ${s.gap} ${className}`}>
      <BrandMark className={s.mark} />
      <span className="flex flex-col leading-none">
        <span className={`font-(family:--font-display) font-extrabold uppercase tracking-tight ${s.word}`}>
          <span className="text-brand-600 dark:text-brand-400">EZ</span>{' '}
          <span className="text-accent-600 dark:text-accent-400">ADS</span>
        </span>
        {showTagline && (
          <span className={`font-medium uppercase tracking-[0.18em] text-(--color-ink-soft) ${s.tag}`}>
            Influencer marketplace
          </span>
        )}
      </span>
    </span>
  );
}
