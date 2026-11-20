import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return n >= 10_000 ? Math.round(n / 1_000) + 'K' : (n / 1_000).toFixed(1) + 'K';
  return Number(n).toLocaleString('en-IN');
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${Number(n).toFixed(2)}%`;
}

// Country flags lookup
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

export default function InfluencerDashboard() {
  const { user, refreshUser, connectInstagram } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [demographicTab, setDemographicTab] = useState('country');
  const [growthRange, setGrowthRange] = useState('30d');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [connecting, setConnecting] = useState(false);

  const ig = user?.instagram || {};
  const isConnected = Boolean(ig.providerId);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await api.get('/instagram/insights');
      if (res.data) {
        setInsights(res.data);
      }
    } catch (err) {
      console.warn('Could not load Instagram insights:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await api.post('/instagram/sync');
      if (res.data) {
        setInsights(res.data);
        setSyncMsg('Updated just now!');
      }
      if (refreshUser) refreshUser();
    } catch (err) {
      setSyncMsg(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setSyncMsg('');
    try {
      if (connectInstagram) {
        const res = await connectInstagram();
        if (res?.success) {
          await fetchInsights();
          setSyncMsg('Connected!');
        }
      } else {
        const start = await api.get('/auth/instagram/start');
        if (start.data?.authorizeUrl) {
          window.location.assign(start.data.authorizeUrl);
        }
      }
    } catch (err) {
      setSyncMsg(err.message || 'Connect failed');
    } finally {
      setConnecting(false);
    }
  }

  // Real metrics from Instagram Graph API (no fake demo values)
  const followersCount = insights?.followersCount ?? user?.instagram?.followersCount ?? 0;
  const engagementRate = insights?.engagementRate ?? 0;
  const totalReach = insights?.totalReach ?? 0;
  const avgReach = insights?.avgReach ?? (totalReach ? Math.round(totalReach / 30) : 0);
  const totalImpressions = insights?.totalImpressions ?? 0;
  const avgImpressions = insights?.avgImpressions ?? (totalImpressions ? Math.round(totalImpressions / 30) : 0);
  const profileViews = insights?.profileViews ?? 0;
  const websiteTaps = insights?.websiteTaps ?? 0;
  const newFollows = insights?.newFollows ?? 0;

  const followersTrend = insights?.followersTrend?.filter((d) => d && d.value != null) || [];
  const audienceCountry = insights?.audienceCountry?.filter((c) => c && c.pct > 0) || [];
  const audienceAge = insights?.audienceAge?.filter((a) => a && a.pct > 0) || [];
  const audienceGender = (insights?.audienceGender && (insights.audienceGender.M || insights.audienceGender.F)) ? insights.audienceGender : null;

  const syncedDateStr = insights?.syncedAt
    ? new Date(insights.syncedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : isConnected
    ? 'Awaiting first sync'
    : 'Not connected';

  // Area Chart Calculations
  const chartWidth = 560;
  const chartHeight = 120;
  const padBottom = 20;
  const padTop = 10;
  const usableH = chartHeight - padBottom - padTop;
  const vals = followersTrend.map((d) => d.value);
  const minVal = vals.length ? Math.min(...vals) : 0;
  const maxVal = vals.length ? Math.max(...vals) : 0;
  const valSpan = maxVal - minVal || 1;

  const points = followersTrend.map((d, i) => {
    const x = (i / (followersTrend.length - 1 || 1)) * (chartWidth - 20) + 10;
    const y = padTop + usableH - ((d.value - minVal) / valSpan) * usableH;
    return { x, y, ...d };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPathStr = points.length
    ? `M ${points[0].x},${padTop + usableH} ` +
      points.map((p) => `L ${p.x},${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x},${padTop + usableH} Z`
    : '';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', to: '/influencer/dashboard' },
    { id: 'campaigns', label: 'Campaigns', icon: '📢', to: '/influencer/explore' },
    { id: 'inbox', label: 'Inbox', icon: '📬', to: '/influencer/inbox' },
    { id: 'portfolio', label: 'Portfolio & Rates', icon: '🏷️', to: '/settings' },
    { id: 'payments', label: 'Payments', icon: '💳', to: '/payments' },
    { id: 'settings', label: 'Settings', icon: '⚙️', to: '/settings' }
  ];

  return (
    <div className="min-h-screen bg-(--color-canvas) text-(--color-ink)">
      <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          {/* ================= LEFT SIDEBAR ================= */}
          <aside className="space-y-6">
            {/* Creator Profile snippet card */}
            <div className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 text-center shadow-xs">
              <div className="relative mx-auto h-18 w-18">
                <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-brand-500/30">
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-600 to-purple-600 text-xl font-bold text-white">
                    {(user?.displayName || 'Creator')
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                </div>
                {isConnected && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] text-white ring-2 ring-white"
                    title="Verified Creator"
                  >
                    ✓
                  </span>
                )}
              </div>
              <h2 className="mt-3 flex items-center justify-center gap-1 font-bold">
                {user?.displayName || 'Ab Kar Dikha'}
                {isConnected && <span className="text-blue-500">✓</span>}
              </h2>
              <p className="text-xs text-(--color-ink-soft)">
                {ig.username ? `@${ig.username}` : 'Creator Account'}
              </p>
            </div>

            {/* Nav list */}
            <nav className="space-y-1 rounded-2xl border border-(--color-line) bg-(--color-surface) p-2 shadow-xs">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                      : 'text-(--color-ink-soft) hover:bg-(--color-elevated) hover:text-(--color-ink)'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* ================= MAIN DASHBOARD CONTENT ================= */}
          <main className="space-y-6">
            {/* Top Row: Welcome Banner + Follower Growth */}
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              {/* Welcome Card */}
              <div className="relative overflow-hidden rounded-3xl border border-brand-200/50 bg-gradient-to-br from-brand-50/70 via-purple-50/50 to-pink-50/30 p-6 shadow-xs dark:border-brand-900/30 dark:from-brand-950/30 dark:via-purple-950/20 dark:to-transparent">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      Welcome back, {user?.displayName || 'Creator'} 👋
                    </h1>
                    <p className="mt-1 text-sm text-(--color-ink-soft)">
                      Here's your creator dashboard and Instagram performance.
                    </p>
                  </div>
                  <div>
                    {isConnected ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs backdrop-blur dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="text-sm">📸</span> Connected with Instagram ✓
                      </div>
                    ) : (
                      <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-102 hover:shadow-md disabled:opacity-60"
                      >
                        <span>📸</span> {connecting ? 'Connecting…' : 'Connect Instagram'}
                      </button>
                    )}
                  </div>
                </div>

                {/* KPI metric strip inside hero */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                      <span className="text-pink-500">📸</span> Followers
                    </div>
                    <div className="mt-1 text-xl font-extrabold">{fmt(followersCount)}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                      {isConnected ? 'Instagram API' : 'Self-reported'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                      <span className="text-brand-500">👥</span> Engagement
                    </div>
                    <div className="mt-1 text-xl font-extrabold">{fmtPct(engagementRate)}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                      {engagementRate > 0 ? 'Calculated' : '—'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                      <span className="text-purple-500">((•))</span> Avg. Reach
                    </div>
                    <div className="mt-1 text-xl font-extrabold">{totalReach ? fmt(totalReach) : '—'}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                      {totalReach > 0 ? 'Last 30 days' : 'Requires API'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                      <span className="text-orange-500">👁️</span> Avg. Impr.
                    </div>
                    <div className="mt-1 text-xl font-extrabold">{totalImpressions ? fmt(totalImpressions) : '—'}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                      {totalImpressions > 0 ? 'Last 30 days' : 'Requires API'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Follower Growth Chart Card */}
              <div className="flex flex-col justify-between rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-(--color-ink)">Follower Growth</h3>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-(--color-line) bg-(--color-canvas) px-2.5 py-1 text-xs font-semibold text-(--color-ink-soft)">
                    Last 30 Days
                  </span>
                </div>

                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold">{fmt(followersCount)}</span>
                    <span className="text-xs font-semibold text-(--color-ink-soft)">
                      {newFollows > 0 ? `+${fmt(newFollows)} new follows` : 'Current count'}
                    </span>
                  </div>
                </div>

                {/* Chart SVG or clean message */}
                <div className="mt-4 w-full">
                  {followersTrend.length > 1 ? (
                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="h-28 w-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {areaPathStr && <path d={areaPathStr} fill="url(#growthGrad)" />}
                      {polylineStr && (
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={polylineStr}
                        />
                      )}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
                          {idx % 2 === 0 && (
                            <text
                              x={p.x}
                              y={chartHeight - 4}
                              textAnchor="middle"
                              fontSize="9"
                              fill="currentColor"
                              className="text-(--color-ink-soft) opacity-70"
                            >
                              {p.date}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                  ) : (
                    <div className="flex h-28 items-center justify-center text-center text-xs text-(--color-ink-soft)">
                      {isConnected ? 'Follower growth chart will populate after your daily syncs.' : 'Connect Instagram above to begin tracking growth.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Row: Instagram Insights + Demographics + Creator Status */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {/* Card 1: Instagram Insights (Last 30 Days) */}
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-(--color-ink)">
                    Instagram Insights{' '}
                    <span className="text-xs font-normal text-(--color-ink-soft)">(Last 30 Days) ⓘ</span>
                  </h3>
                </div>

                <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
                  {/* Donut chart */}
                  <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="9"
                        className="text-(--color-elevated)"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#donutGrad)"
                        strokeWidth="9"
                        strokeDasharray="251.2"
                        strokeDashoffset="65"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-sm">📸</span>
                      <span className="text-sm font-extrabold">{totalReach ? fmt(totalReach) : '0'}</span>
                      <span className="text-[10px] text-(--color-ink-soft)">Total Reach</span>
                    </div>
                  </div>

                  {/* Metrics list */}
                  <div className="w-full flex-1 space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b border-(--color-line)/60 pb-2">
                      <span className="flex items-center gap-2 text-xs text-(--color-ink-soft)">
                        <span>👁️</span> Impressions
                      </span>
                      <span className="font-bold">{fmt(totalImpressions)}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-(--color-line)/60 pb-2">
                      <span className="flex items-center gap-2 text-xs text-(--color-ink-soft)">
                        <span>👤</span> Profile Visits
                      </span>
                      <span className="font-bold">{fmt(profileViews)}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-(--color-line)/60 pb-2">
                      <span className="flex items-center gap-2 text-xs text-(--color-ink-soft)">
                        <span>🔗</span> Website Taps
                      </span>
                      <span className="font-bold">{fmt(websiteTaps)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs text-(--color-ink-soft)">
                        <span>➕</span> Follows
                      </span>
                      <span className="font-bold">{fmt(newFollows)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Audience Demographics */}
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-(--color-ink)">Audience Demographics</h3>
                  <div className="flex rounded-lg bg-(--color-elevated) p-0.5 text-xs">
                    {['country', 'age', 'gender'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setDemographicTab(tab)}
                        className={`rounded-md px-2.5 py-1 font-semibold capitalize transition-colors ${
                          demographicTab === tab
                            ? 'bg-(--color-surface) text-brand-600 shadow-xs dark:text-brand-300'
                            : 'text-(--color-ink-soft) hover:text-(--color-ink)'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 space-y-3.5">
                  {demographicTab === 'country' &&
                    (audienceCountry.length > 0 ? (
                      audienceCountry.map((item) => (
                        <div key={item.country} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-2">
                              <span>{FLAGS[item.country] || '🌐'}</span>
                              {item.country}
                            </span>
                            <span className="font-bold">{item.pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-(--color-ink-soft)">
                        No country demographic data synced yet.
                      </div>
                    ))}

                  {demographicTab === 'age' &&
                    (audienceAge.length > 0 ? (
                      audienceAge.map((item) => (
                        <div key={item.range} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-(--color-ink-soft)">Age {item.range}</span>
                            <span className="font-bold">{item.pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-(--color-ink-soft)">
                        No age demographic data synced yet.
                      </div>
                    ))}

                  {demographicTab === 'gender' &&
                    (audienceGender ? (
                      <div className="space-y-4 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">👨</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span>Male</span>
                              <span className="font-bold">{audienceGender.M || 0}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-(--color-elevated)">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${audienceGender.M || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm">👩</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span>Female</span>
                              <span className="font-bold">{audienceGender.F || 0}%</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-(--color-elevated)">
                              <div
                                className="h-full rounded-full bg-pink-500"
                                style={{ width: `${audienceGender.F || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {audienceGender.U > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm">🧑</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span>Other</span>
                                <span className="font-bold">{audienceGender.U}%</span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-(--color-elevated)">
                                <div
                                  className="h-full rounded-full bg-purple-500"
                                  style={{ width: `${audienceGender.U}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-(--color-ink-soft)">
                        No gender demographic data synced yet.
                      </div>
                    ))}
                </div>
              </div>

              {/* Card 3: Creator Status */}
              <div className="flex flex-col justify-between rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div>
                  <h3 className="font-bold text-(--color-ink)">Creator Status</h3>

                  {isConnected ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                      <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                          ✓
                        </span>
                        Verified Creator
                      </div>
                      <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400">
                        Real data from Instagram Graph API
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-canvas) p-4">
                      <div className="flex items-center gap-2 font-bold text-(--color-ink)">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-400 text-xs text-white">
                          !
                        </span>
                        Unlinked Profile
                      </div>
                      <p className="mt-1 text-xs text-(--color-ink-soft)">
                        Connect your Instagram account to verify your metrics.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 space-y-2 text-xs text-(--color-ink-soft)">
                    <div className="flex items-center gap-1.5">
                      <span>🔄</span>
                      <span>Last synced: {syncedDateStr}</span>
                    </div>
                    {syncMsg && (
                      <p className="font-semibold text-brand-600 dark:text-brand-300">
                        {syncMsg}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-1 rounded-xl border border-brand-300 bg-brand-50/70 py-2.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                  >
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                  {!isConnected && (
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="flex-1 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      {connecting ? 'Connecting…' : 'Connect IG'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Footer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4">
              <div className="text-xs text-(--color-ink-soft)">
                Want to apply to active brand campaigns or update your rates?
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/influencer/explore"
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700"
                >
                  Explore Campaigns →
                </Link>
                <Link
                  to="/settings"
                  className="rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs font-bold text-(--color-ink) hover:bg-(--color-elevated)"
                >
                  Edit Profile & Rates
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
