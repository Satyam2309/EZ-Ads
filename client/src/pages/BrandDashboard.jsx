import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../utils/format.js';

/* ─── helpers ─────────────────────────────────────────────────── */
function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN');
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-(--color-elevated) ${className}`} />;
}

/* ─── data hooks ───────────────────────────────────────────────── */
function useOverview() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    api.get('/dashboard/overview')
      .then((r) => { if (alive) setData(r.data); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, []);
  return { data, err };
}

function useResendVerification(email) {
  const [state, setState] = useState({ status: 'idle', message: '' });
  async function resend() {
    setState({ status: 'sending', message: '' });
    try {
      const r = await api.post('/auth/resend-verification');
      setState({
        status: 'sent',
        message: r.data?.alreadyVerified
          ? 'This email is already verified.'
          : `Verification email sent to ${email} — check your inbox and spam folder.`
      });
    } catch (e) {
      setState({ status: 'error', message: e.message || 'Could not send the verification email.' });
    }
  }
  return { state, resend };
}

/* ─── pipeline config ──────────────────────────────────────────── */
const PIPE_COLORS = {
  negotiating:   'bg-amber-400',
  active:        'bg-brand-500',
  delivered:     'bg-violet-500',
  payout_pending:'bg-orange-400',
  paid:          'bg-emerald-500',
  cancelled:     'bg-neutral-300 dark:bg-neutral-600',
};
const PIPE_LABEL = {
  negotiating:   'Negotiating',
  active:        'Active',
  delivered:     'Delivered',
  payout_pending:'Awaiting Payout',
  paid:          'Paid',
  cancelled:     'Cancelled',
};

/* ─── niche explorer ───────────────────────────────────────────── */
const NICHES = [
  { label: 'Fashion',  emoji: '👗', q: 'Fashion'  },
  { label: 'Beauty',   emoji: '💄', q: 'Beauty'   },
  { label: 'Tech',     emoji: '💻', q: 'Tech'     },
  { label: 'Fitness',  emoji: '🏋️', q: 'Fitness'  },
  { label: 'Food',     emoji: '🍔', q: 'Food'     },
  { label: 'Travel',   emoji: '✈️', q: 'Travel'   },
  { label: 'Gaming',   emoji: '🎮', q: 'Gaming'   },
];

/* ─── main component ───────────────────────────────────────────── */
export default function BrandDashboard() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const { data, err } = useOverview();
  const { state: resendState, resend } = useResendVerification(user?.email);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => { refreshUser?.(); }, [refreshUser]);

  if (!user) return null;

  const t       = data?.totals  || {};
  const loading = data === null && !err;
  const pipeline= data?.pipeline || [];
  const activity= data?.activity || [];
  const checklist=data?.checklist || [];

  const pipeTotal = pipeline.reduce((n, p) => n + p.count, 0);
  const doneCount = checklist.filter((i) => i.done).length;
  const checkPct  = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
  const inbox     = (t.unreadMessages ?? 0) + (t.unreadNotifications ?? 0);

  /* nav items */
  const navItems = [
    { label: 'Dashboard',       icon: '🏠', to: '/brand/dashboard'  },
    { label: 'Campaigns',       icon: '📢', to: '/brand/campaigns'  },
    { label: 'Find Creators',   icon: '👥', to: '/brand/discovery'  },
    { label: 'Shortlists',      icon: '⭐', to: '/brand/shortlists' },
    { label: 'Messages',        icon: '💬', to: '/chat',            badge: inbox > 0 ? inbox : null },
    { label: 'Payments',        icon: '💳', to: '/payments'         },
    { label: 'Settings',        icon: '⚙️', to: '/settings'         },
  ];

  /* initials */
  const initials = (user.displayName || 'B')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="min-h-screen bg-(--color-canvas) text-(--color-ink)">
      <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">

          {/* ═══════════════ LEFT SIDEBAR ═══════════════ */}
          <aside className="space-y-6">

            {/* Brand Profile card */}
            <div className="rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 text-center shadow-xs">
              <div className="relative mx-auto h-18 w-18">
                <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-brand-500/30">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-600 to-purple-600 text-xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                {user.emailVerified && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white ring-2 ring-white dark:ring-neutral-900"
                    title="Email Verified"
                  >✓</span>
                )}
              </div>
              <h2 className="mt-3 font-bold">{user.displayName || 'Brand'}</h2>
              <p className="text-xs text-(--color-ink-soft)">{user.email}</p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                user.emailVerified
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {user.emailVerified ? '✓ Email Verified' : '⚠ Email Unverified'}
              </span>
            </div>

            {/* Nav list */}
            <nav className="space-y-1 rounded-2xl border border-(--color-line) bg-(--color-surface) p-2 shadow-xs">
              {navItems.map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'text-(--color-ink-soft) hover:bg-(--color-elevated) hover:text-(--color-ink)'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* ═══════════════ MAIN CONTENT ═══════════════ */}
          <main className="space-y-6">

            {/* ── Hero Card ── */}
            <div className="relative overflow-hidden rounded-3xl border border-brand-200/50 bg-gradient-to-br from-brand-50/70 via-purple-50/50 to-pink-50/30 p-6 shadow-xs dark:border-brand-900/30 dark:from-brand-950/30 dark:via-purple-950/20 dark:to-transparent">

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back, {user.displayName || 'brand'} 👋
                  </h1>
                  <p className="mt-1 text-sm text-(--color-ink-soft)">
                    Your brand workspace — campaigns, applications, and creator collaborations in one place.
                  </p>
                </div>
                <div>
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs backdrop-blur dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      🏢 Brand Verified ✓
                    </span>
                  ) : (
                    <button
                      onClick={resend}
                      disabled={resendState.status === 'sending'}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-102 hover:shadow-md disabled:opacity-60"
                    >
                      ⚠ {resendState.status === 'sending' ? 'Sending…' : 'Verify Email'}
                    </button>
                  )}
                </div>
              </div>

              {/* KPI tiles */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/60 bg-white/70 p-3.5 dark:border-white/5 dark:bg-white/5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="mt-2 h-7 w-14" />
                      <Skeleton className="mt-1.5 h-2.5 w-16" />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                        <span className="text-brand-500">📢</span> Campaigns
                      </div>
                      <div className="mt-1 text-xl font-extrabold">{t.campaigns ?? 0}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                        {t.campaignsLive ?? 0} live · {t.campaignsDraft ?? 0} draft
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                        <span className="text-purple-500">📥</span> Applications
                      </div>
                      <div className="mt-1 text-xl font-extrabold">{t.applicationsPending ?? 0}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                        {t.applicationsTotal ?? 0} total received
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                        <span className="text-pink-500">⭐</span> Shortlisted
                      </div>
                      <div className="mt-1 text-xl font-extrabold">{t.shortlistedCreators ?? 0}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                        {t.shortlistLists ?? 0} list{t.shortlistLists === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/60 bg-white/70 p-3.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-xs text-(--color-ink-soft)">
                        <span className="text-emerald-500">💰</span> Budget
                      </div>
                      <div className="mt-1 text-xl font-extrabold">{formatMoney(data?.spend?.total ?? 0)}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-(--color-ink-soft)">
                        Committed spend
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* resend message */}
              {resendState.message && (
                <p className={`mt-3 text-xs font-medium ${resendState.status === 'error' ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {resendState.message}
                </p>
              )}
            </div>

            {err && (
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                Dashboard stats unavailable ({err}). The rest of the workspace still works.
              </div>
            )}

            {/* ── Middle Row: Pipeline + Creator Discovery ── */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Campaign Pipeline */}
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-bold">
                    <span className="text-brand-500">📊</span> Campaign Pipeline
                  </h2>
                  <span className="font-mono text-xs text-(--color-ink-soft)">
                    {pipeTotal} agreement{pipeTotal === 1 ? '' : 's'}
                  </span>
                </div>

                {loading ? (
                  <Skeleton className="mt-4 h-3 w-full" />
                ) : pipeTotal === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-(--color-line) px-4 py-6 text-center">
                    <p className="text-sm font-medium">No active deals yet</p>
                    <p className="mt-1 text-xs text-(--color-ink-soft)">Once you agree terms with creators, deals appear here.</p>
                    <Link
                      to="/brand/campaigns"
                      className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
                    >
                      Create a Campaign →
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Segmented bar */}
                    <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                      {pipeline.filter((p) => p.count > 0).map((p) => (
                        <div
                          key={p.status}
                          className={`transition-all ${PIPE_COLORS[p.status] || 'bg-neutral-400'}`}
                          style={{ width: `${(p.count / pipeTotal) * 100}%` }}
                          title={`${PIPE_LABEL[p.status] || p.status}: ${p.count}`}
                        />
                      ))}
                    </div>

                    <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {pipeline.map((p) => (
                        <li key={p.status} className="flex items-center gap-2 text-xs">
                          <span className={`h-2 w-2 rounded-full ${PIPE_COLORS[p.status] || 'bg-neutral-400'}`} />
                          <span className="text-(--color-ink-soft)">{PIPE_LABEL[p.status] || p.status}</span>
                          <span className="ml-auto font-mono font-semibold">{p.count}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to="/brand/campaigns"
                        className="flex-1 rounded-xl border border-(--color-line) bg-(--color-elevated) py-2 text-center text-xs font-bold text-(--color-ink) hover:bg-(--color-surface) transition-colors"
                      >
                        View All →
                      </Link>
                      <Link
                        to="/brand/campaigns"
                        className="flex-1 rounded-xl bg-brand-600 py-2 text-center text-xs font-bold text-white hover:bg-brand-700 transition-colors"
                      >
                        + New Campaign
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Creator Discovery */}
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-purple-500">🔍</span> Find Creators
                </div>
                <p className="mt-1 text-xs text-(--color-ink-soft)">
                  Browse by niche or search by name / handle.
                </p>

                {/* Search bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQ.trim()) window.location.assign(`/brand/discovery?q=${encodeURIComponent(searchQ.trim())}`);
                  }}
                  className="mt-4 flex gap-2"
                >
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search creators…"
                    className="flex-1 rounded-xl border border-(--color-line) bg-(--color-canvas) px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-900/40"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors"
                  >
                    Go
                  </button>
                </form>

                {/* Niche chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <Link
                      key={n.q}
                      to={`/brand/discovery?niche=${encodeURIComponent(n.q)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-line) bg-(--color-canvas) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:hover:bg-brand-950/30"
                    >
                      <span>{n.emoji}</span> {n.label}
                    </Link>
                  ))}
                </div>

                <Link
                  to="/brand/discovery"
                  className="mt-4 block rounded-xl border border-(--color-line) bg-(--color-elevated) py-2.5 text-center text-xs font-bold text-(--color-ink) hover:bg-(--color-surface) transition-colors"
                >
                  Open Full Discovery →
                </Link>
              </div>
            </div>

            {/* ── Bottom Row: Activity + Checklist ── */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Recent Activity */}
              <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold">
                    <span className="text-orange-500">⚡</span> Recent Activity
                  </h2>
                  <Link to="/notifications" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    View all
                  </Link>
                </div>

                {loading || activity === null ? (
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-2/3" />
                  </div>
                ) : activity.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-(--color-line) px-4 py-8 text-center">
                    <p className="text-sm font-medium">Nothing here yet</p>
                    <p className="mt-1 text-xs text-(--color-ink-soft)">
                      Applications, invites and agreement updates will appear here.
                    </p>
                  </div>
                ) : (
                  <ol className="mt-4 space-y-1">
                    {activity.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={a.campaignId ? `/brand/campaigns/${a.campaignId}` : '/notifications'}
                          className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-(--color-elevated)"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-elevated) text-base">
                            {a.type?.includes('payment') || a.type?.includes('payout') ? '💰'
                              : a.type?.includes('application') ? '📥'
                              : a.type?.includes('invitation') ? '📨'
                              : a.type?.includes('message') ? '💬'
                              : '📋'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{a.title}</span>
                              {a.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                            </span>
                            {a.body && <span className="mt-0.5 block truncate text-xs text-(--color-ink-soft)">{a.body}</span>}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-(--color-ink-soft)">{timeAgo(a.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Brand Setup Checklist */}
              {(!loading && checklist.length > 0 && doneCount < checklist.length) || loading ? (
                <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-bold">
                      <span className="text-emerald-500">🛡</span> Finish Setting Up
                    </h2>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      checkPct === 100
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                    }`}>
                      {doneCount}/{checklist.length}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-(--color-elevated)">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${checkPct}%` }}
                    />
                  </div>

                  {loading ? (
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-3/4" />
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {checklist.map((item) => {
                        const isEmailItem = item.key === 'email';
                        if (isEmailItem && !item.done) {
                          const isSending = resendState.status === 'sending';
                          const isSent    = resendState.status === 'sent';
                          const isError   = resendState.status === 'error';
                          return (
                            <li key={item.key}>
                              <button
                                type="button"
                                onClick={resend}
                                disabled={isSending}
                                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-(--color-line) px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/20"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-(--color-line) bg-(--color-surface)">
                                  {isSending && (
                                    <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                  )}
                                </span>
                                <div className="flex min-w-0 flex-col">
                                  <span className="font-medium text-brand-700 dark:text-brand-300">{item.label}</span>
                                  <span className={`text-xs ${isError ? 'text-red-500' : isSent ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-(--color-ink-soft)'}`}>
                                    {isSending
                                      ? 'Sending verification link…'
                                      : isSent
                                      ? resendState.message
                                      : isError
                                      ? resendState.message
                                      : 'Click to resend verification link'}
                                  </span>
                                </div>
                                <span className="ml-auto shrink-0 text-(--color-ink-soft)">→</span>
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li key={item.key}>
                            <Link
                              to={item.to || '#'}
                              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                item.done
                                  ? 'border-transparent bg-(--color-elevated) text-(--color-ink-soft)'
                                  : 'border-(--color-line) hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/20'
                              }`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                                item.done ? 'bg-emerald-500' : 'border border-(--color-line) bg-(--color-surface)'
                              }`}>
                                {item.done ? '✓' : ''}
                              </span>
                              <span className={item.done ? 'line-through text-(--color-ink-soft)' : 'font-medium'}>{item.label}</span>
                              {!item.done && <span className="ml-auto text-(--color-ink-soft)">→</span>}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : !loading && checklist.length > 0 && doneCount === checklist.length ? (
                /* all done — show a spend summary card instead */
                <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-brand-50/30 p-6 shadow-xs dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-transparent">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">✓</span>
                    Brand Setup Complete!
                  </div>
                  <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-400">
                    Your brand is fully set up. Start running campaigns and discovering creators.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link
                      to="/brand/campaigns"
                      className="rounded-xl bg-brand-600 py-2.5 text-center text-xs font-bold text-white hover:bg-brand-700 transition-colors"
                    >
                      📢 My Campaigns
                    </Link>
                    <Link
                      to="/brand/discovery"
                      className="rounded-xl border border-(--color-line) bg-(--color-surface) py-2.5 text-center text-xs font-bold text-(--color-ink) hover:bg-(--color-elevated) transition-colors"
                    >
                      👥 Find Creators
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Quick Actions Footer ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 shadow-xs">
              <div className="text-xs text-(--color-ink-soft)">
                Ready to run a campaign or find the perfect creator for your brand?
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/brand/campaigns"
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
                >
                  + New Campaign
                </Link>
                <Link
                  to="/brand/discovery"
                  className="rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs font-bold text-(--color-ink) hover:bg-(--color-elevated) transition-colors"
                >
                  Find Creators →
                </Link>
                <Link
                  to="/brand/shortlists"
                  className="rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2 text-xs font-bold text-(--color-ink) hover:bg-(--color-elevated) transition-colors"
                >
                  ⭐ Shortlists
                </Link>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
