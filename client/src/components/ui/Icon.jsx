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
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3.5 3 14.5 0 18-3-3.5-3-14.5 0-18z" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M10.4 5.2A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 4" /><path d="M6.3 6.7A16.9 16.9 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.1-.9" /><path d="m3 3 18 18" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" /></>,
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 10v9h12v-9" /></>,
  bell: <><path d="M18 15V10a6 6 0 1 0-12 0v5l-1.6 2.2a.6.6 0 0 0 .5 1h14.2a.6.6 0 0 0 .5-1L18 15z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8l1.4 2.2 2.6-.5.5 2.6 2.2 1.4-1 2.5 1 2.5-2.2 1.4-.5 2.6-2.6-.5L12 21.2l-1.4-2.2-2.6.5-.5-2.6-2.2-1.4 1-2.5-1-2.5 2.2-1.4.5-2.6 2.6.5L12 2.8z" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8L12 3.5z" />,
  megaphone: <><path d="M4 10v4l12 5V5L4 10z" /><path d="M16 8a4 4 0 0 1 0 8" /><path d="M7 14.5V19" /></>,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  inbox: <><path d="M3.5 13.5 6 5h12l2.5 8.5V19h-17v-5.5z" /><path d="M3.5 13.5h4l1 2h7l1-2h4" /></>,
  filter: <path d="M4 5h16l-6 7v7l-4-2v-5L4 5z" />
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
