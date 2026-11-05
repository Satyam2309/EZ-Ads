import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Card from '../components/ui/Card.jsx';
import Icon from '../components/ui/Icon.jsx';
import WorkflowAdSection from '../components/WorkflowAdSection.jsx';
import HeroAdVideo from '../components/HeroAdVideo.jsx';
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

/* Count-up numbers when the stat band scrolls into view. */
function useCountUp(target, started) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!started) return;
    let raf;
    const t0 = performance.now();
    const num = parseFloat(target);
    const suffix = String(target).replace(/[\d.]/g, '');
    const decimals = (String(target).split('.')[1] || '').replace(/\D/g, '').length;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1200);
      const eased = 1 - Math.pow(1 - p, 3);
      setN((num * eased).toFixed(decimals));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);
  return `${n}${String(target).replace(/[\d.]/g, '')}`;
}

function StatNumber({ value, label, started }) {
  const display = useCountUp(value, started);
  return (
    <div className="px-4 py-8 text-center">
      <p className="stat-num text-4xl font-extrabold sm:text-5xl">{display}</p>
      <p className="mt-2 text-xs text-(--color-ink-soft) sm:text-sm">{label}</p>
    </div>
  );
}

const steps = [
  { icon: 'search', title: 'Discover', body: 'Filter by niche, audience size, engagement rate, budget and location. Compare creators side by side.' },
  { icon: 'message', title: 'Invite & align', body: 'Invite creators, agree deliverables and terms in one thread, digitally signed in-app.' },
  { icon: 'rocket', title: 'Launch & track', body: 'Follow applications, content drafts and payouts from a single campaign timeline.' }
];

const trust = [
  { icon: 'shield', label: 'API-derived data only', body: 'Instagram metrics come from the official Meta authorization flow — self-reported numbers are always labeled as such.' },
  { icon: 'wallet', label: 'Escrow-style ledger', body: 'Brand funds are committed when an agreement is signed, released only against approved deliverables.' },
  { icon: 'sparkles', label: '10% flat, all-in', body: 'One transparent platform fee on every agreement. No subscription tiers, no surprise deductions.' }
];

const tickerItems = [
  '@aarav.creates · Fashion', '@maya_travels · Travel', '@buildswithsam · Tech', '@the.bowl.diaries · Food',
  '@fitnesswithrae · Health', '@pixelplayz · Gaming', '@studytok.official · Education', '@wanderlux · Lifestyle'
];

export default function Home() {
  const [statsInView, setStatsInView] = useState(false);
  const statsRef = useRef(null);
  const tiltRef = useTilt();

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setStatsInView(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
              EZ Ads connects brands with Instagram creators — real profiles, honest data labels,
              and a campaign workflow that runs from invite to payout.
            </p>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <HeroCtas />
            </div>
          </Reveal>

          {/* floating mock browser card with 3D tilt */}
          <Reveal delay={480} className="mx-auto mt-16 max-w-4xl">
            <div ref={tiltRef} className="tilt animate-float">
              <div className="glass rounded-2xl p-2 text-left">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-3 rounded-md bg-(--color-elevated) px-3 py-1 font-(family:--font-mono) text-xs text-(--color-ink-soft)">
                    ezads.app/brand/discovery
                  </span>
                </div>
                <Card className="border-transparent p-5 shadow-none">
                  <div className="flex items-start gap-4">
                    <div className="animate-pulse-soft h-12 w-12 shrink-0 rounded-full bg-linear-to-br from-vz-top to-vz-3" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">Aarav Mehta</p>
                        <Badge tone="success">API-derived</Badge>
                      </div>
                      <p className="truncate text-sm text-(--color-ink-soft)">@aarav.creates · Mumbai · Fashion &amp; Lifestyle</p>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div><dt className="text-xs text-(--color-ink-soft)">Followers</dt><dd className="text-sm font-semibold">48.2K <span className="font-normal text-(--color-ink-soft)/70">(API)</span></dd></div>
                        <div><dt className="text-xs text-(--color-ink-soft)">Engagement</dt><dd className="text-sm font-semibold">4.6%</dd></div>
                        <div><dt className="text-xs text-(--color-ink-soft)">From</dt><dd className="text-sm font-semibold">₹12K / Reel</dd></div>
                      </dl>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="secondary">View profile</Button>
                        <Button size="sm">Invite</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ PHOTOREAL HERO AD (video slot) ============ */}
      <HeroAdVideo />

      {/* ============ STATS — count-up band ============ */}
      <section ref={statsRef} className="relative">
        <div className="glass mx-auto max-w-7xl rounded-3xl px-4 py-2 sm:px-6">
          <div className="grid grid-cols-2 divide-x divide-(--color-line-soft) md:grid-cols-4">
            <StatNumber started={statsInView} value="48.2K" label="avg. creator followers" />
            <StatNumber started={statsInView} value="4.6%" label="median engagement" />
            <StatNumber started={statsInView} value="10%" label="flat platform fee" />
            <StatNumber started={statsInView} value="100%" label="honest data labels" />
          </div>
        </div>
      </section>

      {/* ============ CREATOR TICKER ============ */}
      <section className="overflow-hidden py-10">
        <div className="animate-ticker flex w-max gap-4">
          {[...tickerItems, ...tickerItems].map((item, i) => (
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

      {/* ============ CREATOR SHOWCASE ============ */}
      <section id="creators" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-(family:--font-display) text-3xl font-bold tracking-tight sm:text-4xl">Creators on EZ Ads</h2>
            <p className="mt-2 max-w-lg text-(--color-ink-soft)">Real profiles with honest labels across every niche.</p>
          </div>
          <Link to="/register/brand" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-vz-link) hover:text-(--color-vz-2)">
            Browse all creators <Icon name="arrow" size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Aarav Mehta', '@aarav.creates', 'Fashion', '48.2K', '4.6%', 'from-vz-top to-vz-2'],
            ['Maya Sharma', '@maya_travels', 'Travel', '92.1K', '3.9%', 'from-vz-3 to-vz-amber'],
            ['Sam Iyer', '@buildswithsam', 'Tech', '31.4K', '5.2%', 'from-vz-mint to-vz-top'],
            ['Rae Kapoor', '@fitnesswithrae', 'Health', '64.8K', '4.1%', 'from-vz-2 to-vz-3']
          ].map(([name, handle, niche, followers, eng, grad], i) => (
            <Reveal key={handle} delay={i * 100}>
              <Card hover className="group overflow-hidden">
                <div className={`h-20 bg-linear-to-br ${grad} opacity-80 transition-opacity group-hover:opacity-100`} aria-hidden />
                <div className="-mt-8 px-5 pb-5">
                  <div className={`h-14 w-14 rounded-full border-4 border-(--color-surface) bg-linear-to-br ${grad}`} aria-hidden />
                  <p className="mt-3 font-semibold">{name}</p>
                  <p className="text-sm text-(--color-ink-soft)">{handle} · {niche}</p>
                  <div className="mt-3 flex gap-4 text-xs font-(family:--font-mono)">
                    <span><strong className="text-sm">{followers}</strong> <span className="text-(--color-ink-soft)">followers</span></span>
                    <span><strong className="text-sm">{eng}</strong> <span className="text-(--color-ink-soft)">eng.</span></span>
                  </div>
                </div>
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
        <p className="mt-8 text-center text-xs text-(--color-ink-soft)">
          © {new Date().getFullYear()} EZ Ads · Demo workspace — payments are simulated until live checkout is enabled.
        </p>
      </section>
    </div>
  );
}
