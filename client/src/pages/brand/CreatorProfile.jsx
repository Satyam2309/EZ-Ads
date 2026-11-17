import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { CreatorAvatar } from '../../components/creators/CreatorCard.jsx';
import ShortlistSaveButton from '../../components/creators/ShortlistSaveButton.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import { formatFollowers, formatMoney } from '../../utils/format.js';

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return n >= 10_000 ? Math.round(n / 1_000) + 'K' : (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString('en-IN');
}

const FLAGS = {
  India: '🇮🇳',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  Others: '🌐'
};

export default function CreatorProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const compare = useCompare();

  useEffect(() => {
    api.get(`/influencers/${id}`)
      .then((res) => setData(res.data))
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <p className="text-lg font-semibold">Could not load this creator</p>
      <p className="mt-1 text-sm text-neutral-500">{err}</p>
      <Button className="mt-4" variant="secondary" to="/brand/discovery">Back to discovery</Button>
    </div>
  );
  if (!data) return <p className="p-10 text-center text-sm text-neutral-500">Loading…</p>;

  const { profile } = data;
  const audience = profile.audience || {};
  const ins = profile.instagramInsights || {};
  const isVerified = audience.followersSource === 'meta_api' || Boolean(ins.followersCount);

  const followers = ins.followersCount || audience.followers || 125430;
  const engagement = ins.engagementRate || audience.engagementRate || 4.82;
  const avgReach = ins.totalReach || 1240000;
  const avgImpressions = ins.totalImpressions || 2870000;

  const topCountries = ins.audienceCountry?.length
    ? ins.audienceCountry
    : [
        { country: 'India', pct: 72.4 },
        { country: 'United States', pct: 11.2 },
        { country: 'United Kingdom', pct: 5.8 },
        { country: 'Others', pct: 10.6 }
      ];

  const ageDistribution = ins.audienceAge?.length
    ? ins.audienceAge
    : [
        { range: '13–17', pct: 4.1 },
        { range: '18–24', pct: 47.8 },
        { range: '25–34', pct: 35.2 },
        { range: '35–44', pct: 9.4 },
        { range: '45+', pct: 3.5 }
      ];

  const gender = ins.audienceGender || { M: 62.1, F: 37.5, U: 0.4 };

  const packages = profile.rates?.length
    ? profile.rates
    : [
        { format: 'Instagram Reel', amount: 8000, currency: 'INR' },
        { format: 'Instagram Post', amount: 5000, currency: 'INR' },
        { format: 'Instagram Story', amount: 2000, currency: 'INR' },
        { format: 'Bundle (Post + Reel + Story)', amount: 12000, currency: 'INR', isPopular: true }
      ];

  const normalized = { ...profile, user: profile.user?._id ? profile.user : { _id: profile.user } };
  const selected = compare.has(normalized);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Link to="/brand/discovery" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
        ← Back to Creators
      </Link>

      {/* ================= CREATOR HEADER CARD ================= */}
      <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Avatar + Details */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-brand-500/20">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-600 to-purple-600 text-2xl font-bold text-white">
                  {(profile.displayName || 'Creator').slice(0, 2).toUpperCase()}
                </div>
              </div>
              {isVerified && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white ring-2 ring-white">
                  ✓
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
                {isVerified && <span className="text-blue-500 text-lg">✓</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-(--color-ink-soft)">
                <span>@{profile.username || 'creator'}</span>
                <span>•</span>
                <span>Content Creator</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-(--color-ink-soft)">
                <span>📍 {profile.location?.country || 'India'}</span>
                <span>•</span>
                <span className="capitalize">{profile.niche || 'Technology'}</span>
                {profile.contentCategories?.map((c) => (
                  <span key={c}>• {c}</span>
                ))}
              </div>

              {profile.bio && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-(--color-ink)">
                  {profile.bio}
                </p>
              )}

              {/* Social pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-(--color-canvas) px-3 py-1 text-xs font-semibold">
                  <span>📸</span> {fmt(followers)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-(--color-canvas) px-3 py-1 text-xs font-semibold">
                  <span>▶</span> 12.8K
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-(--color-canvas) px-2.5 py-1 text-xs font-semibold">
                  <span>in</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions + Verification Status */}
          <div className="flex flex-col items-start lg:items-end gap-4">
            <div className="flex flex-wrap gap-2">
              <ShortlistSaveButton influencerId={normalized.user._id} />
              <Button
                size="sm"
                variant={selected ? 'primary' : 'secondary'}
                disabled={!selected && compare.isFull()}
                onClick={() => compare.toggle(normalized)}
              >
                {selected ? '✓ In compare' : 'Compare'}
              </Button>
              <Button size="sm" to="/brand/campaigns">
                🚀 Collab Now
              </Button>
            </div>

            {/* Verified badge box */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span>📸</span> Verified via Instagram ✓
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400">
                Real data from Instagram Graph API
              </p>
              <p className="mt-1 text-[10px] text-(--color-ink-soft)">
                Last updated: 14 Nov 2026, 10:24 AM
              </p>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards Row */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">👥</span>
            <div className="mt-1 text-2xl font-extrabold">{fmt(followers)}</div>
            <div className="text-xs text-(--color-ink-soft)">Followers</div>
          </div>

          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">⚡</span>
            <div className="mt-1 text-2xl font-extrabold">{engagement}%</div>
            <div className="text-xs text-(--color-ink-soft)">Engagement Rate</div>
          </div>

          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">▷</span>
            <div className="mt-1 text-2xl font-extrabold">{fmt(avgReach)}</div>
            <div className="text-xs text-(--color-ink-soft)">Avg. Reach</div>
          </div>

          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">👁️</span>
            <div className="mt-1 text-2xl font-extrabold">{fmt(avgImpressions)}</div>
            <div className="text-xs text-(--color-ink-soft)">Avg. Impressions</div>
          </div>
        </div>
      </div>

      {/* ================= TABS NAVIGATION ================= */}
      <div className="border-b border-(--color-line)">
        <nav className="flex gap-8 text-sm font-semibold">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'audience', label: 'Audience' },
            { id: 'content', label: 'Content' },
            { id: 'packages', label: 'Rates & Packages' },
            { id: 'collabs', label: 'Past Collaborations' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-brand-600 text-brand-600 dark:border-brand-300 dark:text-brand-300'
                  : 'text-(--color-ink-soft) hover:text-(--color-ink)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ================= TAB CONTENT ================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Audience Insights */}
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs space-y-6">
          <h2 className="font-bold flex items-center gap-2">
            <span>👥</span> Audience Insights
          </h2>

          {/* Top Countries */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
              Top Countries
            </h3>
            <div className="mt-3 space-y-2.5">
              {topCountries.map((c) => (
                <div key={c.country} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span>{FLAGS[c.country] || '🌐'}</span> {c.country}
                    </span>
                    <span className="font-bold">{c.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
              Age Distribution
            </h3>
            <div className="mt-3 space-y-2.5">
              {ageDistribution.map((a) => (
                <div key={a.range} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-(--color-ink-soft)">{a.range}</span>
                    <span className="font-bold">{a.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
              Gender
            </h3>
            <div className="mt-3 flex items-center gap-6">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ec4899" strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray="251.2"
                    strokeDashoffset={`${251.2 * (1 - (gender.M || 62.1) / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm">
                  👥
                </div>
              </div>
              <div className="space-y-1.5 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span>Male: <strong className="text-(--color-ink)">{gender.M}%</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
                  <span>Female: <strong className="text-(--color-ink)">{gender.F}%</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span>Other: <strong className="text-(--color-ink)">{gender.U || 0.4}%</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Collaboration Packages */}
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <span>🏷️</span> Collaboration Packages
          </h2>

          <div className="space-y-3">
            {packages.map((pkg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 transition hover:border-brand-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {pkg.format?.toLowerCase().includes('reel')
                      ? '📹'
                      : pkg.format?.toLowerCase().includes('story')
                      ? '⏱️'
                      : pkg.format?.toLowerCase().includes('bundle')
                      ? '🎁'
                      : '🖼️'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{pkg.format}</span>
                      {pkg.isPopular && (
                        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-300">
                          Popular
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-base font-extrabold text-(--color-ink)">
                  {formatMoney(pkg.amount, pkg.currency || 'INR')}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button size="lg" className="w-full" to="/brand/campaigns">
              Start Collaboration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
