import { Link } from 'react-router-dom';
import { LEGAL_LINKS } from './footerLinks.js';

/**
 * Slim legal row for the signed-in app, where the full marketing footer would
 * break the full-bleed layouts. Same links, one quiet line.
 */
export default function LegalStrip() {
  return (
    <nav
      aria-label="Legal"
      data-app-legal
      className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 pb-6 pt-2 text-xs text-(--color-ink-soft) sm:px-6 lg:px-8"
    >
      <span>© {new Date().getFullYear()} EZ Ads</span>
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="rounded transition-colors hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:hover:text-brand-300"
        >
          {link.label}
        </Link>
      ))}
      <Link
        to="/contact"
        className="rounded transition-colors hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:hover:text-brand-300"
      >
        Contact
      </Link>
    </nav>
  );
}
