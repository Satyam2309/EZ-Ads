import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import Icon from './ui/Icon.jsx';
import { COMPANY_LINKS, LEGAL_LINKS } from './footerLinks.js';

const linkClass =
  'inline-flex w-fit rounded-md text-sm text-(--color-ink-soft) transition-colors hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:hover:text-brand-300';

function Column({ title, items }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-ink-soft)">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className={linkClass}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Site-wide footer. It sits on its own rounded card in a warm surface colour so
 * it reads as a distinct pane under every page, on both themes.
 */
export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
      <div className="rounded-[1.75rem] border border-(--color-line) bg-(--color-elevated) px-6 py-9 shadow-card sm:px-10 sm:py-11">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-xs">
            <Link to="/" aria-label="EZ Ads — home" className="inline-flex transition-opacity hover:opacity-90">
              <BrandLogo size="lg" />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-(--color-ink-soft)">
              Brief, shortlist, negotiate and pay qualified creators in one place — with every number
              labelled by where it came from.
            </p>
            {/* Social handles */}
            <div className="mt-5 flex items-center gap-2.5">
              <a
                href="https://www.linkedin.com/company/ezads-co-in"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) text-(--color-ink-soft) shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#0a66c2] hover:text-[#0a66c2] hover:shadow-xs dark:hover:border-[#0a66c2] dark:hover:text-[#70b5f9]"
                title="LinkedIn"
              >
                <Icon name="linkedin" size={17} />
              </a>
              <a
                href="https://www.instagram.com/ezads.co.in/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) text-(--color-ink-soft) shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#e1306c] hover:text-[#e1306c] hover:shadow-xs dark:hover:border-[#e1306c] dark:hover:text-[#f7779c]"
                title="Instagram"
              >
                <Icon name="instagram" size={17} />
              </a>
              <a
                href="https://www.facebook.com/share/1FXMcPeUio/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-(--color-line) bg-(--color-surface) text-(--color-ink-soft) shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#1877f2] hover:text-[#1877f2] hover:shadow-xs dark:hover:border-[#1877f2] dark:hover:text-[#4599ff]"
                title="Facebook"
              >
                <Icon name="facebook" size={17} />
              </a>
            </div>
          </div>

          <nav aria-label="Company" className="sm:justify-self-start">
            <Column title="Company" items={COMPANY_LINKS} />
          </nav>
          <nav aria-label="Legal" className="sm:justify-self-start">
            <Column title="Legal" items={LEGAL_LINKS} />
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-(--color-line) pt-6 text-xs text-(--color-ink-soft) sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} EZ Ads</p>
          <div className="flex items-center gap-3 text-xs font-medium">
            <a href="https://www.linkedin.com/company/ezads-co-in" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">LinkedIn</a>
            <span className="opacity-30">•</span>
            <a href="https://www.instagram.com/ezads.co.in/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">Instagram</a>
            <span className="opacity-30">•</span>
            <a href="https://www.facebook.com/share/1FXMcPeUio/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">Facebook</a>
          </div>
          <p>Demo workspace — payments are simulated until live checkout is enabled.</p>
        </div>
      </div>
    </footer>
  );
}
