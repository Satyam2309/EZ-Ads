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
  if (n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000) return n >= 10_000 ? Math.round(n / 1_000) + 'K' : (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString('en-IN');
}

const FLAGS = {
  India: '🇮🇳',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  Canada: '🇨🇦',
  Australia: '🇦🇺',
  Germany: '🇩🇪',
  France: '🇫🇷',
  UAE: '🇦🇪',
  Others: '🌐'
};

function formatPackageTitle(format) {
  const map = {
    reel: 'Instagram Reel',
    post: 'Instagram Post',
    story: 'Instagram Story',
    video: 'Dedicated Video',
    custom: 'Custom Collaboration'
  };
  return map[format] || format;
}

function packageIcon(format) {
  const f = (format || '').toLowerCase();
  if (f.includes('reel')) return '📹';
  if (f.includes('story')) return '⏱️';
  if (f.includes('video')) return '🎬';
  if (f.includes('bundle')) return '🎁';
  return '🖼️';
}

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
      <p className="text-lg font-semibold text-(--color-ink)">Could not load this creator</p>
      <p className="mt-1 text-sm text-(--color-ink-soft)">{err}</p>
      <Button className="mt-4" variant="secondary" to="/brand/discovery">Back to discovery</Button>
    </div>
  );
  if (!data) return <p className="p-10 text-center text-sm text-(--color-ink-soft)">Loading…</p>;

  const { profile, socialAccounts = [] } = data;
  const audience = profile.audience || {};
  const ins = profile.instagramInsights || {};

  // Real verification check — only verified if synced via Meta API with confirmed timestamp
  const isVerified = audience.followersSource === 'meta_api' || Boolean(ins.syncedAt && ins.followersCount > 0);

  // Real follower count
  const followers = ins.followersCount ?? audience.followers ?? 0;

  // Real engagement rate (only show if actually recorded)
  const engagement = (ins.engagementRate && ins.engagementRate > 0)
    ? Number(ins.engagementRate).toFixed(2)
    : (audience.engagementRate && audience.engagementRate > 0 ? Number(audience.engagementRate).toFixed(2) : null);

  // Real reach & impressions (Meta Graph API metrics only — null if not connected)
  const avgReach = ins.avgReach || (ins.totalReach ? Math.round(ins.totalReach / 30) : null);
  const avgImpressions = ins.avgImpressions || (ins.totalImpressions ? Math.round(ins.totalImpressions / 30) : null);

  // Real demographics (only what Meta API returns)
  const topCountries = ins.audienceCountry?.filter((c) => c && c.country && c.pct > 0) || [];
  const ageDistribution = ins.audienceAge?.filter((a) => a && a.range && a.pct > 0) || [];
  const gender = (ins.audienceGender && (ins.audienceGender.M || ins.audienceGender.F || ins.audienceGender.U))
    ? ins.audienceGender
    : null;
  const hasDemographics = topCountries.length > 0 || ageDistribution.length > 0 || gender != null;

  // Real packages configured by creator
  const packages = profile.rates?.filter((r) => r && r.amount > 0) || [];

  // Social handles list
  const socialList = [];
  const igHandle = profile.username || profile.user?.instagram?.username;
  if (igHandle || followers > 0) {
    socialList.push({
      icon: '📸',
      platform: 'Instagram',
      label: igHandle ? `@${igHandle}` : 'Instagram',
      detail: followers > 0 ? fmt(followers) : null,
      url: igHandle ? `https://instagram.com/${igHandle}` : null
    });
  }
  const seenPlatforms = new Set(['instagram']);
  (socialAccounts.length > 0 ? socialAccounts : profile.otherProfiles || []).forEach((s) => {
    const p = (s.platform || '').toLowerCase();
    if (p && !seenPlatforms.has(p)) {
      seenPlatforms.add(p);
      socialList.push({
        icon: p === 'youtube' ? '▶' : p === 'linkedin' ? 'in' : p === 'twitter' || p === 'x' ? '𝕏' : '🌐',
        platform: s.platform,
        label: s.username ? `@${s.username}` : s.platform,
        detail: s.stats?.followers ? fmt(s.stats.followers) : null,
        url: s.url || null
      });
    }
  });

  const syncedDateStr = ins.syncedAt
    ? new Date(ins.syncedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : null;

  const normalized = { ...profile, user: profile.user?._id ? profile.user : { _id: profile.user } };
  const selected = compare.has(normalized);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Link to="/brand/discovery" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
        ← Back to Creators
      </Link>

      {/* ================= CREATOR HEADER CARD ================= */}
      <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Avatar + Details */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-brand-500/20">
                {profile.user?.avatarUrl ? (
                  <img src={profile.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-600 to-accent-500 text-2xl font-bold text-white">
                    {(profile.displayName || 'Creator').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {isVerified && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white ring-2 ring-(--color-surface)" title="Verified via Instagram Graph API">
                  ✓
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-(--color-ink)">{profile.displayName}</h1>
                {isVerified && <span className="text-blue-500 text-lg" title="Verified Creator">✓</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-(--color-ink-soft)">
                {igHandle && <span>@{igHandle}</span>}
                {igHandle && <span>•</span>}
                <span>Content Creator</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-(--color-ink-soft)">
                <span>📍 {profile.location?.city ? `${profile.location.city}, ` : ''}{profile.location?.country || 'India'}</span>
                <span>•</span>
                <span className="capitalize">{profile.niche || 'General'}</span>
                {profile.contentCategories?.map((c) => (
                  <span key={c}>• {c}</span>
                ))}
              </div>

              {profile.bio && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-(--color-ink)">
                  {profile.bio}
                </p>
              )}

              {/* Social pills — only real platforms */}
              <div className="flex flex-wrap gap-2 pt-2">
                {socialList.length > 0 ? (
                  socialList.map((s, idx) => (
                    s.url ? (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-(--color-canvas) px-3 py-1 text-xs font-semibold text-(--color-ink) hover:border-brand-500/50 transition-colors"
                      >
                        <span>{s.icon}</span> {s.label}
                        {s.detail && <span className="text-(--color-ink-soft)">({s.detail})</span>}
                      </a>
                    ) : (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-(--color-canvas) px-3 py-1 text-xs font-semibold text-(--color-ink)"
                      >
                        <span>{s.icon}</span> {s.label}
                        {s.detail && <span className="text-(--color-ink-soft)">({s.detail})</span>}
                      </span>
                    )
                  ))
                ) : (
                  <span className="text-xs text-(--color-ink-soft)">No social handles added</span>
                )}
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

            {/* Honest verification status badge */}
            {isVerified ? (
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span>📸</span> Verified via Meta API ✓
                </div>
                <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400">
                  Real data synced from Meta Graph API
                </p>
                {syncedDateStr && (
                  <p className="mt-1 text-[10px] text-(--color-ink-soft)">
                    Last synced: {syncedDateStr}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-(--color-ink)">
                  <span>📝</span> Self-reported metrics
                </div>
                <p className="mt-0.5 text-[11px] text-(--color-ink-soft)">
                  Stats entered by creator (unverified)
                </p>
                <p className="mt-1 text-[10px] text-(--color-ink-soft)">
                  Meta Graph API not connected
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4 Stats Cards Row — 100% Real Numbers */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">👥</span>
            <div className="mt-1 text-2xl font-extrabold text-(--color-ink)">{fmt(followers)}</div>
            <div className="text-xs text-(--color-ink-soft)">Followers</div>
            <div className="mt-1">
              <Badge tone={isVerified ? 'success' : 'neutral'}>
                {isVerified ? 'Meta API' : 'Self-reported'}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">⚡</span>
            <div className="mt-1 text-2xl font-extrabold text-(--color-ink)">{engagement != null ? `${engagement}%` : '—'}</div>
            <div className="text-xs text-(--color-ink-soft)">Engagement Rate</div>
            <div className="mt-1">
              <Badge tone={engagement != null ? (ins.engagementRate ? 'success' : 'neutral') : 'neutral'}>
                {engagement != null ? (ins.engagementRate ? 'API' : 'Self-reported') : 'Not set'}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">▷</span>
            <div className="mt-1 text-2xl font-extrabold text-(--color-ink)">{avgReach != null ? fmt(avgReach) : '—'}</div>
            <div className="text-xs text-(--color-ink-soft)">Avg. Reach</div>
            <div className="mt-1">
              <Badge tone={avgReach != null ? 'success' : 'neutral'}>
                {avgReach != null ? 'Last 30d' : 'Requires API'}
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 text-center">
            <span className="text-sm">👁️</span>
            <div className="mt-1 text-2xl font-extrabold text-(--color-ink)">{avgImpressions != null ? fmt(avgImpressions) : '—'}</div>
            <div className="text-xs text-(--color-ink-soft)">Avg. Impressions</div>
            <div className="mt-1">
              <Badge tone={avgImpressions != null ? 'success' : 'neutral'}>
                {avgImpressions != null ? 'Last 30d' : 'Requires API'}
              </Badge>
            </div>
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
                  ? 'border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'text-(--color-ink-soft) hover:text-(--color-ink)'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ================= TAB CONTENT ================= */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Audience Insights Card */}
          <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs space-y-6">
            <h2 className="font-bold flex items-center gap-2 text-(--color-ink)">
              <span>👥</span> Audience Insights
            </h2>

            {hasDemographics ? (
              <>
                {topCountries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
                      Top Countries
                    </h3>
                    <div className="mt-3 space-y-2.5">
                      {topCountries.map((c) => (
                        <div key={c.country} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="flex items-center gap-2 text-(--color-ink)">
                              <span>{FLAGS[c.country] || '🌐'}</span> {c.country}
                            </span>
                            <span className="font-bold text-(--color-ink)">{c.pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(c.pct, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ageDistribution.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
                      Age Distribution
                    </h3>
                    <div className="mt-3 space-y-2.5">
                      {ageDistribution.map((a) => (
                        <div key={a.range} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-(--color-ink-soft)">{a.range}</span>
                            <span className="font-bold text-(--color-ink)">{a.pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(a.pct, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gender && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
                      Gender
                    </h3>
                    <div className="mt-3 flex items-center gap-6">
                      <div className="space-y-1.5 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          <span>Male: <strong className="text-(--color-ink)">{gender.M || 0}%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
                          <span>Female: <strong className="text-(--color-ink)">{gender.F || 0}%</strong></span>
                        </div>
                        {gender.U > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                            <span>Other: <strong className="text-(--color-ink)">{gender.U}%</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-8 text-center">
                <span className="text-2xl">👥</span>
                <p className="mt-2 text-sm font-semibold text-(--color-ink)">No demographic data available</p>
                <p className="mt-1 text-xs text-(--color-ink-soft)">
                  Audience insights (countries, age, gender) require an active Meta Instagram API connection.
                </p>
              </div>
            )}
          </div>

          {/* Collaboration Packages Card */}
          <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-(--color-ink)">
              <span>🏷️</span> Collaboration Packages
            </h2>

            {packages.length > 0 ? (
              <div className="space-y-3">
                {packages.map((pkg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4 transition hover:border-brand-500/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{packageIcon(pkg.format)}</span>
                      <div>
                        <span className="font-bold text-sm text-(--color-ink)">{formatPackageTitle(pkg.format)}</span>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-(--color-ink)">
                      {formatMoney(pkg.amount, pkg.currency || 'INR')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-8 text-center">
                <span className="text-2xl">🏷️</span>
                <p className="mt-2 text-sm font-semibold text-(--color-ink)">No fixed rate packages listed</p>
                <p className="mt-1 text-xs text-(--color-ink-soft)">
                  This creator has not listed standard packages yet.
                  {(profile.minBudget > 0 || profile.maxBudget > 0) && (
                    <span className="block mt-1 font-medium text-(--color-ink)">
                      Estimated budget: {formatMoney(profile.minBudget)} {profile.maxBudget > 0 ? `– ${formatMoney(profile.maxBudget)}` : ''}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button size="lg" className="w-full" to="/brand/campaigns">
                Start Collaboration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIENCE */}
      {activeTab === 'audience' && (
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-(--color-ink) flex items-center gap-2">
            <span>👥</span> Detailed Audience Demographics
          </h2>
          {hasDemographics ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {topCountries.length > 0 && (
                <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-5">
                  <h3 className="text-sm font-bold text-(--color-ink)">Top Countries</h3>
                  <div className="mt-4 space-y-3">
                    {topCountries.map((c) => (
                      <div key={c.country} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="flex items-center gap-2 text-(--color-ink)">
                            <span>{FLAGS[c.country] || '🌐'}</span> {c.country}
                          </span>
                          <span className="font-bold text-(--color-ink)">{c.pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(c.pct, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ageDistribution.length > 0 && (
                <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-5">
                  <h3 className="text-sm font-bold text-(--color-ink)">Age Distribution</h3>
                  <div className="mt-4 space-y-3">
                    {ageDistribution.map((a) => (
                      <div key={a.range} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-(--color-ink-soft)">Age {a.range}</span>
                          <span className="font-bold text-(--color-ink)">{a.pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(a.pct, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gender && (
                <div className="rounded-2xl border border-(--color-line) bg-(--color-canvas) p-5 md:col-span-2">
                  <h3 className="text-sm font-bold text-(--color-ink)">Gender Breakdown</h3>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-(--color-surface)">
                      <div className="text-xs text-(--color-ink-soft)">Male</div>
                      <div className="text-lg font-bold text-blue-500">{gender.M || 0}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-(--color-surface)">
                      <div className="text-xs text-(--color-ink-soft)">Female</div>
                      <div className="text-lg font-bold text-pink-500">{gender.F || 0}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-(--color-surface)">
                      <div className="text-xs text-(--color-ink-soft)">Other / Unspecified</div>
                      <div className="text-lg font-bold text-purple-500">{gender.U || 0}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-(--color-line) bg-(--color-canvas) p-12 text-center">
              <span className="text-3xl">👥</span>
              <h3 className="mt-3 text-base font-bold text-(--color-ink)">No Demographic Data Available</h3>
              <p className="mt-1 text-sm text-(--color-ink-soft) max-w-md mx-auto">
                Audience insights (countries, age groups, and gender distribution) will appear automatically once this creator connects an Instagram Professional account.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONTENT / PORTFOLIO */}
      {activeTab === 'content' && (
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-(--color-ink) flex items-center gap-2">
            <span>🎨</span> Creator Portfolio & Work
          </h2>
          {profile.portfolio?.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.portfolio.map((item, idx) => (
                <div key={item._id || idx} className="overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-canvas)">
                  {item.thumbnailUrl || item.mediaUrl ? (
                    <img src={item.thumbnailUrl || item.mediaUrl} alt={item.title || ''} className="h-44 w-full object-cover" />
                  ) : null}
                  <div className="p-4">
                    <h3 className="font-bold text-sm text-(--color-ink)">{item.title || 'Portfolio Item'}</h3>
                    {item.description && (
                      <p className="mt-1 text-xs text-(--color-ink-soft) line-clamp-2">{item.description}</p>
                    )}
                    {item.mediaUrl && (
                      <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        View media →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-(--color-line) bg-(--color-canvas) p-12 text-center">
              <span className="text-3xl">🎨</span>
              <h3 className="mt-3 text-base font-bold text-(--color-ink)">No Portfolio Uploaded Yet</h3>
              <p className="mt-1 text-sm text-(--color-ink-soft) max-w-md mx-auto">
                This creator hasn't published past campaign work samples or portfolio items yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-(--color-ink) flex items-center gap-2">
            <span>🏷️</span> Rates & Packages
          </h2>
          {packages.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, idx) => (
                <div key={idx} className="flex flex-col justify-between rounded-2xl border border-(--color-line) bg-(--color-canvas) p-5">
                  <div>
                    <span className="text-2xl">{packageIcon(pkg.format)}</span>
                    <h3 className="mt-2 font-bold text-base text-(--color-ink)">{formatPackageTitle(pkg.format)}</h3>
                    <p className="mt-1 text-2xl font-extrabold text-(--color-ink)">
                      {formatMoney(pkg.amount, pkg.currency || 'INR')}
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" className="w-full" to="/brand/campaigns">Choose package</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-(--color-line) bg-(--color-canvas) p-12 text-center">
              <span className="text-3xl">🏷️</span>
              <h3 className="mt-3 text-base font-bold text-(--color-ink)">No Fixed Packages Listed</h3>
              <p className="mt-1 text-sm text-(--color-ink-soft) max-w-md mx-auto">
                This creator accepts custom offers tailored to your campaign requirements.
              </p>
              {(profile.minBudget > 0 || profile.maxBudget > 0) && (
                <p className="mt-2 text-sm font-semibold text-(--color-ink)">
                  Estimated budget range: {formatMoney(profile.minBudget)} {profile.maxBudget > 0 ? `– ${formatMoney(profile.maxBudget)}` : '+'}
                </p>
              )}
              <div className="mt-4">
                <Button to="/brand/campaigns">Propose campaign terms</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COLLABS */}
      {activeTab === 'collabs' && (
        <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-(--color-ink) flex items-center gap-2">
            <span>🤝</span> Past Collaborations
          </h2>
          <div className="mt-6 rounded-2xl border border-(--color-line) bg-(--color-canvas) p-12 text-center">
            <span className="text-3xl">🤝</span>
            <h3 className="mt-3 text-base font-bold text-(--color-ink)">Past Collaborations & Reviews</h3>
            <p className="mt-1 text-sm text-(--color-ink-soft) max-w-md mx-auto">
              Completed brand campaigns and verified collaboration feedback for this creator will appear here.
            </p>
            <div className="mt-4">
              <Button to="/brand/campaigns">Start a Collaboration</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
