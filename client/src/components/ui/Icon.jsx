/**
 * Icon — hand-rolled inline SVG set (no dependency).
 * Stroke icons (Lucide-style geometry) that inherit currentColor,
 * with per-icon gradient support for the landing-page look.
 */
const paths = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  shield: <path d="M12 3l7 3v5c0 4.5-2.9 8.7-7 10-4.1-1.3-7-5.5-7-10V6l7-3z" />,
  rocket: <><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M12 15l-3-3 7.5-7.5c1.2-1.2 3-1.7 4.5-1.5.2 1.5-.3 3.3-1.5 4.5L12 15z" /><path d="M9 12H5.5L12 5.5" /></>,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M22 20H2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M17 14.5c2.5 0 4.5 1.8 4.5 4.5" /></>,
  message: <path d="M21 12a8 8 0 0 1-8 8H4l2.2-2.6A8 8 0 1 1 21 12z" />,
  wallet: <><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M16 12h4" /><path d="M3 10a3 3 0 0 1 3-3h11" /></>,
  sparkles: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <path d="m4 12.5 5 5L20 6.5" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3.5 3 14.5 0 18-3-3.5-3-14.5 0-18z" /></>
};

export default function Icon({ name, size = 22, className = '', gradientId, gradient = false }) {
  const gid = gradientId || `ig-${name}`;
  const stroke = gradient ? `url(#${gid})` : 'currentColor';
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {gradient && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-vz-top)" />
            <stop offset="60%" stopColor="var(--color-vz-2)" />
            <stop offset="100%" stopColor="var(--color-vz-3)" />
          </linearGradient>
        </defs>
      )}
      {paths[name]}
    </svg>
  );
}
