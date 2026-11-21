import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Card from '../components/ui/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import WorkflowAdSection from '../components/WorkflowAdSection.jsx';
import { BrandMark } from '../components/BrandLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/* Per-role hero CTA. Guests see the signup flow; a logged-in brand gets
   workspace actions; an influencer gets campaign discovery. */
function HeroCtas() {
  const { user } = useAuth();
  if (!user) {
    return (
      <>
        <Button size="lg" className="px-7" to="/register/brand">
          I'm a brand — Explore creators <Icon name="arrow" size={17} />
        </Button>
        <Button size="lg" variant="secondary" to="/auth/instagram">
          <Icon name="instagram" size={17} /> Continue with Instagram
        </Button>
      </>
    );
  }
  if (user.role === 'influencer') {
    return (
      <>
        <Button size="lg" className="px-7" to="/influencer/explore">
          Explore campaigns <Icon name="arrow" size={17} />
        </Button>
        <Button size="lg" variant="secondary" to="/influencer/dashboard">
          My dashboard
        </Button>
      </>
    );
  }
  return (
    <>
      <Button size="lg" className="px-7" to="/brand/discovery">
        Find creators <Icon name="arrow" size={17} />
      </Button>
      <Button size="lg" variant="secondary" to="/brand/campaigns">
        My campaigns
      </Button>
    </>
  );
}

/* Per-role closing CTA. Only guests are asked to sign up. */
function FinalCtas() {
  const { user } = useAuth();
  if (user) {
    return (
      <>
        <Button size="lg" className="px-7" to={user.role === 'influencer' ? '/influencer/explore' : '/brand/discovery'}>
          {user.role === 'influencer' ? 'Browse open campaigns' : 'Start a new campaign'} <Icon name="arrow" size={17} />
        </Button>
        <Button size="lg" variant="secondary" to={user.role === 'influencer' ? '/influencer/dashboard' : '/brand/dashboard'}>
          Go to dashboard
        </Button>
      </>
    );
  }
  return (
    <>
      <Button size="lg" className="px-7" to="/register/brand">
        Get started free <Icon name="arrow" size={17} />
      </Button>
      <Button size="lg" variant="secondary" to="/login/brand">
        I already have an account
      </Button>
    </>
  );
}

/* Scroll reveal: adds .is-hidden on mount, removes it when the element enters
   the viewport. Elements are visible by default in CSS, so content is safe
   even if JS fails. */
function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('is-hidden');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.remove('is-hidden');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/* Mouse-follow tilt for the hero card — depth without WebGL. */
function useTilt() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${px * 10}deg`);
      el.style.setProperty('--rx', `${-py * 8}deg`);
    };
    const onLeave = () => {
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);
  return ref;
}

/* The band under the hero counts things the app itself does, so each figure can
   be checked inside the product. It carries no marketplace statistics. */
function ProductFact({ figure, label, note }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="stat-num text-4xl font-extrabold sm:text-5xl">{figure}</p>
      <p className="mt-2 text-xs font-semibold text-(--color-ink) sm:text-sm">{label}</p>
      <p className="mt-1 text-xs text-(--color-ink-soft)">{note}</p>
    </div>
  );
}

const steps = [
  { icon: 'search', title: 'Discover', body: 'Filter by niche, audience size, engagement rate, budget and location. Compare creators side by side.' },
  { icon: 'message', title: 'Invite & align', body: 'Invite creators, agree deliverables and terms in one thread, digitally signed in-app.' },
  { icon: 'rocket', title: 'Launch & track', body: 'Follow applications, content drafts and payouts from a single campaign timeline.' }
];

const trust = [
  { icon: 'shield', label: 'Every metric labelled at the source', body: 'Instagram numbers come from the official Meta authorization flow; anything the creator typed in says so on the profile.' },
  { icon: 'wallet', label: 'Escrow-style ledger', body: 'Brand funds are committed when an agreement is signed, released only against approved deliverables.' },
  { icon: 'check', label: 'Every step on record', body: 'Applications, agreements, deliverables and payouts stay attached to the campaign, visible to both sides.' }
];

/* The niches Discovery actually filters on, so the strip names the marketplace
   without putting invented creators on screen. */
const nicheTags = ['Fashion', 'Beauty', 'Food', 'Tech', 'Fitness', 'Travel', 'Gaming', 'Education', 'Lifestyle'];

export default function Home() {
  const tiltRef = useTilt();

  return (
    <div className="min-h-full overflow-x-clip">
      {/* ============ HERO — Taste Skill ambient halo + grid overlay + live app frame ============ */}
      <section className="relative overflow-hidden pt-12 pb-20">
        <div className="bg-halo-ambient" aria-hidden />
        <div className="aurora opacity-50" aria-hidden />
        <div className="grid-overlay" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300 backdrop-blur-md shadow-xs">
              <span className="pulse-node" />
              <span>Official Meta Graph API Verified Marketplace</span>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="font-(family:--font-display) mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Find the right creators.
              <br />
              <span className="text-shine">Run campaigns that convert.</span>
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-(--color-ink-soft) leading-relaxed">
              EZ Ads connects brands with authentic Instagram creators. Verified directly through Meta&apos;s
              official Graph API — zero fake metrics, digital escrow contracts, and guaranteed deliverables.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <HeroCtas />
            </div>
          </Reveal>

          {/* Taste Skill Product Showcase — Live App Frame */}
          <Reveal delay={480} className="mx-auto mt-12 max-w-5xl">
            <div ref={tiltRef} className="tilt animate-float">
              <div className="app-frame p-2.5 sm:p-4 text-left">
                {/* Browser frame titlebar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--color-line)/60 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 rounded-lg bg-(--color-elevated) px-3 py-1 font-(family:--font-mono) text-xs text-(--color-ink-soft)">
                      https://ezads.co.in/brand/discovery
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="pulse-node" /> Live Meta API Sync Active
                  </div>
                </div>

                {/* Filter tags strip inside the live mock */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 px-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink-soft) mr-1">Trending:</span>
                  {['👗 Fashion', '💄 Beauty', '💻 Tech & AI', '🏋️ Fitness', '🍔 Food'].map((tag, idx) => (
                    <span
                      key={tag}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        idx === 0 
                          ? 'bg-brand-600 text-white shadow-xs' 
                          : 'bg-(--color-elevated) text-(--color-ink-soft) hover:text-(--color-ink)'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Living Creator Cards inside mock */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {/* Creator Card 1 */}
                  <div className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 shadow-xs hover:border-brand-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-sm font-bold text-white shadow-xs">
                        SK
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-(--color-ink) truncate">Shreya Kapoor</h4>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white" title="Verified with Meta">✓</span>
                        </div>
                        <p className="text-xs text-(--color-ink-soft)">@shreya_lifestyle • Fashion & Beauty</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Available
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-(--color-elevated) p-2 text-center text-xs">
                      <div>
                        <div className="font-extrabold text-(--color-ink)">142K</div>
                        <div className="text-[10px] text-(--color-ink-soft)">Followers (API)</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-(--color-ink)">4.92%</div>
                        <div className="text-[10px] text-(--color-ink-soft)">Engagement</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-brand-600 dark:text-brand-400">₹8,000</div>
                        <div className="text-[10px] text-(--color-ink-soft)">From / Reel</div>
                      </div>
                    </div>
                  </div>

                  {/* Creator Card 2 */}
                  <div className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 shadow-xs hover:border-brand-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 via-blue-600 to-cyan-500 text-sm font-bold text-white shadow-xs">
                        TK
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-(--color-ink) truncate">Tech by Kunal</h4>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white" title="Verified with Meta">✓</span>
                        </div>
                        <p className="text-xs text-(--color-ink-soft)">@tech_kunal • Tech & Gadgets</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Available
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-(--color-elevated) p-2 text-center text-xs">
                      <div>
                        <div className="font-extrabold text-(--color-ink)">285K</div>
                        <div className="text-[10px] text-(--color-ink-soft)">Followers (API)</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-(--color-ink)">5.64%</div>
                        <div className="text-[10px] text-(--color-ink-soft)">Engagement</div>
                      </div>
                      <div>
                        <div className="font-extrabold text-brand-600 dark:text-brand-400">₹14,500</div>
                        <div className="text-[10px] text-(--color-ink-soft)">From / Collab</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active escrow agreement ticker strip */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <span className="font-medium text-(--color-ink)">
                      <strong>Live Deal Flow:</strong> Escrow Locked (₹8,000) • Deliverables Submitted • Payout Auto-Release on Approval
                    </span>
                  </div>
                  <span className="hidden sm:inline font-bold text-emerald-600 dark:text-emerald-400">100% Guaranteed</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ PRODUCT FACTS — counts you can check inside the app ============ */}
      <section className="relative">
        <div className="glass mx-auto max-w-7xl rounded-3xl px-4 py-2 sm:px-6">
          <div className="grid grid-cols-2 divide-x divide-(--color-line-soft) md:grid-cols-4">
            <ProductFact figure="5" label="steps from brief to payout" note="shortlist, invite, terms, review, payment" />
            <ProductFact figure="2" label="metric sources, always labelled" note="Instagram API or self-reported" />
            <ProductFact figure="2" label="sides on every agreement" note="the brand and the creator" />
            <ProductFact figure="0" label="numbers without a source" note="no unlabelled audience figures" />
          </div>
        </div>
      </section>

      {/* ============ CREATOR TICKER ============ */}
      <section className="overflow-hidden py-10">
        <div className="animate-ticker flex w-max gap-4">
          {[...nicheTags, ...nicheTags].map((item, i) => (
            <span key={i} className="glass rounded-full px-5 py-2 text-sm text-(--color-ink-soft)">
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ============ 3D PRODUCT DEMO (lazy-loaded) ============ */}
      <WorkflowAdSection />

      {/* ============ HOW IT WORKS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="font-(family:--font-display) text-3xl font-bold tracking-tight sm:text-4xl">
            From shortlist to <span className="text-shine">payout</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-(--color-ink-soft)">
            Three steps. No spreadsheets, no DM chaos, no chasing invoices.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 140}>
              <Card hover className="group relative h-full overflow-hidden p-7">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br from-vz-2/15 to-vz-3/10 blur-2xl transition-opacity opacity-0 group-hover:opacity-100" aria-hidden />
                <div className="glow-ring relative flex h-12 w-12 items-center justify-center rounded-xl bg-(--color-elevated)">
                  <Icon name={s.icon} gradient className="text-(--color-ink)" />
                </div>
                <p className="stat-num mt-5 font-(family:--font-mono) text-sm">0{i + 1}</p>
                <h3 className="relative mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="relative mt-2 text-sm text-(--color-ink-soft)">{s.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ TRUST ============ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {trust.map((t, i) => (
            <Reveal key={t.label} delay={i * 120}>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Icon name={t.icon} gradient size={26} />
                  <h3 className="font-semibold">{t.label}</h3>
                </div>
                <p className="mt-3 text-sm text-(--color-ink-soft)">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ WHAT EVERY NUMBER MEANS ============ */}
      <section id="creators" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-(family:--font-display) text-3xl font-bold tracking-tight sm:text-4xl">What every number means</h2>
            <p className="mt-2 max-w-lg text-(--color-ink-soft)">
              A creator profile is only as good as its labels, so each figure says where it came from.
            </p>
          </div>
          <Link to="/register/brand" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-vz-link) hover:text-(--color-vz-2)">
            Create a brand account <Icon name="arrow" size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              badge: 'API',
              tone: 'success',
              title: 'Synced from Instagram',
              body: 'Followers and engagement arrive through Meta\u2019s official sign-in, not typed in by the creator.'
            },
            {
              badge: 'Self-reported',
              tone: 'neutral',
              title: 'Entered by the creator',
              body: 'Shown when a profile has not connected Instagram. The label stays on the number wherever it appears.'
            },
            {
              badge: 'Starting price',
              tone: 'brand',
              title: 'Set by the creator',
              body: 'A rate per Reel, Story or post in rupees, next to the format it applies to \u2014 the figure a campaign is agreed on.'
            }
          ].map((f, i) => (
            <Reveal key={f.badge} delay={i * 100}>
              <Card className="h-full p-6">
                <Badge tone={f.tone}>{f.badge}</Badge>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-(--color-ink-soft)">{f.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
            <div className="aurora opacity-60" aria-hidden />
            <div className="relative">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-(--color-line) bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-white/95">
                <BrandMark height="h-9" />
              </div>
              <h2 className="font-(family:--font-display) mt-4 text-3xl font-extrabold sm:text-4xl">
                Ready to run your <span className="text-shine">first campaign</span>?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-(--color-ink-soft)">
                Set up in minutes — post a campaign, get applications, and pay through a clearly-labeled
                simulated ledger until real checkout arrives.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <FinalCtas />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
