import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Card from '../components/ui/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import WorkflowAdSection from '../components/WorkflowAdSection.jsx';
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
      {/* ============ HERO — aurora mesh + grid overlay + glass ============ */}
      <section className="relative">
        <div className="aurora" aria-hidden />
        <div className="grid-overlay" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 text-center sm:px-6 lg:px-8">
          <Reveal>
            <Badge tone="brand" className="glass border-transparent px-4 py-1.5 text-[13px]">
              <Icon name="sparkles" size={15} gradient className="mr-1.5 inline" />
              Influencer marketing, done right
            </Badge>
          </Reveal>

          <Reveal delay={120}>
            <h1 className="font-(family:--font-display) mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              Find the right creators.
              <br />
              <span className="text-shine">Run campaigns that convert.</span>
            </h1>
          </Reveal>

          <Reveal delay={240}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-(--color-ink-soft)">
              EZ Ads connects brands with Instagram creators. Creators link their own account through
              Instagram, and every metric says where it came from.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <HeroCtas />
            </div>
          </Reveal>

          {/* floating mock browser card with 3D tilt */}
          <Reveal delay={480} className="mx-auto mt-12 max-w-4xl">
            <div ref={tiltRef} className="tilt animate-float">
              <div className="glass rounded-2xl p-2 text-left">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-3 rounded-md bg-(--color-elevated) px-3 py-1 font-(family:--font-mono) text-xs text-(--color-ink-soft)">
                    ezads.co.in/brand/discovery
                  </span>
                </div>
                <Card className="border-transparent p-4 shadow-none">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* the Discovery filter rail, as it is in the app, with nothing filled in.
                        On a phone the labelling panel carries the screen instead — it is the
                        point of the mock, and a two-panel stack does not fit a 844px screen. */}
                    <div className="hidden sm:block">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--color-ink-soft)">Filters</p>
                      <dl className="mt-3 space-y-1.5 text-sm">
                        {[
                          ['Niche', 'Any niche'],
                          ['Followers', 'min – max'],
                          ['Engagement', 'min %'],
                          ['Budget (₹)', 'min – max']
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-(--color-line) bg-(--color-surface) px-3 py-1.5">
                            <dt className="text-(--color-ink-soft)">{label}</dt>
                            <dd className="font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* the promise the product keeps: each number says where it came from */}
                    <div className="sm:border-l sm:border-(--color-line) sm:pl-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--color-ink-soft)">Where the numbers come from</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Badge tone="success">API</Badge>
                          <span className="text-(--color-ink-soft)">Synced from the creator&apos;s Instagram account.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Badge tone="neutral">Self-reported</Badge>
                          <span className="text-(--color-ink-soft)">Entered by the creator, never shown as verified.</span>
                        </li>
                      </ul>
                      <p className="mt-2 text-xs text-(--color-ink-soft)">
                        Starting price and availability are always the creator&apos;s own figures.
                      </p>
                    </div>
                  </div>
                </Card>
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
              <Icon name="bolt" gradient size={40} className="mx-auto" />
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
