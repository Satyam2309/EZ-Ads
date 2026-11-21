/**
 * EZ Ads brand lockup — the supplied artwork (interlocked rings + growth arrow,
 * "EZ ADS" wordmark, "INFLUENCER MARKETPLACE" tagline) exactly as designed: no
 * redrawn paths, no recoloured elements, no type set in CSS.
 *
 * `scripts/make-logo-assets.ps1` derives two downscales from the one PNG:
 *
 *   brand-lockup.png        the same pixels with the white background lifted out,
 *                           so the lockup sits directly on the page surface
 *   brand-lockup-plate.png  the artwork with its own white background intact,
 *                           used on the dark canvas — the tagline and network dots
 *                           are black, so they would otherwise disappear there, and
 *                           turning them white would change the brand colours
 *
 * Rendering both and letting CSS choose avoids a flash of the wrong variant.
 */
const SIZES = {
  // navbar: 36px tall -> ~108px wide at the artwork's 3:1 ratio
  md: 'h-9',
  // footers and auth screens, where there is room to breathe
  lg: 'h-12'
};

export default function BrandLogo({ className = '', size = 'md' }) {
  const height = SIZES[size] ?? SIZES.md;
  const shared = `${height} w-auto shrink-0 select-none`;
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/brand-lockup.png"
        alt="EZ Ads"
        width="560"
        height="187"
        draggable="false"
        className={`${shared} dark:hidden`}
      />
      <img
        src="/brand-lockup-dark.png"
        alt="EZ Ads"
        width="560"
        height="187"
        draggable="false"
        className={`hidden dark:block ${shared}`}
      />
    </span>
  );
}

/**
 * Brand mark only (interlocking rings + arrow, no wordmark/name).
 */
export function BrandMark({ size = 48, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <g transform="translate(-3.28 2) scale(0.88)" fill="none">
        <circle cx="40" cy="29" r="13" stroke="#ea4f15" strokeWidth="6.2" />
        <circle cx="22" cy="29" r="13" stroke="#1b6fe3" strokeWidth="6.2" />
        <path d="M33.9 40.48A13 13 0 0 1 28.74 35.5" stroke="#ea4f15" strokeWidth="6.2" strokeLinecap="round" />
        <path d="M14 36 33 27 49 14" stroke="#1b6fe3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 8 52.88 17.2 45.8 10.1Z" fill="#1b6fe3" />
      </g>
    </svg>
  );
}
