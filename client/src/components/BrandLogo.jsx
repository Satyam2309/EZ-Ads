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
