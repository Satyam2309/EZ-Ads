import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import { formatMoney } from '../../utils/format.js';
import { DiscoveryHero, ModalDialog, getNicheTheme } from './homeShared.jsx';

const NICHE_PILLS = [
  { value: '', label: 'All Campaigns' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'tech', label: 'Tech' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'food', label: 'Food' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'travel', label: 'Travel' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'education', label: 'Education' }
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Budget: Any' },
  { value: '5000', label: '₹5,000+' },
  { value: '15000', label: '₹15,000+' },
  { value: '30000', label: '₹30,000+' },
  { value: '50000', label: '₹50,000+' }
];

const SORTS = [
  ['newest', 'Newest first'],
  ['budget_high', 'Highest payout budget'],
  ['deadline', 'Closing soonest'],
  ['budget_low', 'Lowest payout budget']
];

const APP_TONES = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'neutral'
};

function deadlineInfo(deadlineIso) {
  if (!deadlineIso) return { label: 'Rolling · Open', tone: 'bg-emerald-500/90 text-white', passed: false };
  const d = new Date(deadlineIso);
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { label: 'Closed', tone: 'bg-stone-600/90 text-white', passed: true };
  if (diffDays <= 5) return { label: diffDays === 0 ? 'Closes today' : `${diffDays}d left`, tone: 'bg-amber-500/90 text-white', passed: false };
  return {
    label: `Due ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    tone: 'bg-white/85 text-(--color-ink) dark:bg-black/45 dark:text-stone-100',
    passed: false
  };
}

function CampaignHomeCard({ campaign, existingApp, onApply, onViewBrand, onWithdraw }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const brandName = campaign.brandProfile?.companyName || campaign.brand?.displayName || 'Brand Partner';
  const brandLogo = !logoFailed ? campaign.brandProfile?.logoUrl || campaign.brand?.avatarUrl || '' : '';
  const initials = brandName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const theme = getNicheTheme(campaign.niche || campaign.brandProfile?.industry);
  const dl = deadlineInfo(campaign.applicationDeadline);
  const industryLabel = campaign.brandProfile?.industry
    ? campaign.brandProfile.industry.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    : theme.label;

  return (
    <article className="taste-card group flex flex-col overflow-hidden">
      {/* Niche visual banner */}
      <div className={`relative h-24 overflow-hidden bg-linear-to-br ${theme.gradient}`}>
        <div
          aria-hidden
          className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${theme.glow} blur-2xl`}
        />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md shadow-2xs ${theme.accent}`}>
            {theme.label}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-2xs ${dl.tone}`}>
            {dl.label}
          </span>
        </div>
      </div>

      {/* Body with overlapping brand avatar */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-7 flex items-end gap-3">
          <div className="shrink-0">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={brandName}
                onError={() => setLogoFailed(true)}
                className="h-14 w-14 rounded-full bg-white object-cover ring-4 ring-(--color-surface) shadow-sm"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-accent-500 text-base font-bold text-white ring-4 ring-(--color-surface) shadow-sm"
              >
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0 pb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-(--color-ink)">{brandName}</span>
              {campaign.brandProfile?.verified && (
                <span
                  title="Verified brand profile"
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[9px] text-white"
                >
                  ✓
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-(--color-ink-soft)">{industryLabel}</p>
          </div>
        </div>

        {/* Title & snippet */}
        <h3 className="mt-3 line-clamp-2 font-(family:--font-display) text-base font-bold leading-snug text-(--color-ink)">
          {campaign.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-(--color-ink-soft)">
          {campaign.description}
        </p>

        {/* Budget & Deliverables Box */}
        <div className="mt-4 space-y-2.5 rounded-xl border border-(--color-line)/70 bg-(--color-elevated)/55 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Campaign Budget
            </span>
            <span className="figure text-base font-extrabold text-brand-600 dark:text-brand-400">
              {formatMoney(campaign.budget?.total, campaign.budget?.currency)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {campaign.deliverables?.length > 0 ? (
              campaign.deliverables.slice(0, 3).map((d, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-lg border border-(--color-line) bg-(--color-surface) px-2 py-0.5 text-[11px] font-medium capitalize text-(--color-ink)"
                >
                  {d.quantity}× {d.format}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center rounded-lg border border-(--color-line) bg-(--color-surface) px-2 py-0.5 text-[11px] font-medium text-(--color-ink-soft)">
                Open deliverables scope
              </span>
            )}
            {campaign.deliverables?.length > 3 && (
              <span className="text-[11px] text-(--color-ink-soft)">+{campaign.deliverables.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Action footer */}
        <div className="mt-4 flex items-center gap-2 border-t border-(--color-line)/60 pt-3.5">
          {existingApp && existingApp.status !== 'withdrawn' ? (
            <div className="flex flex-1 items-center justify-between gap-2">
              <Badge tone={APP_TONES[existingApp.status] || 'neutral'}>
                Applied · {existingApp.status}
              </Badge>
              {existingApp.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => onWithdraw(existingApp._id)}
                  className="text-xs font-semibold text-(--color-ink-soft) transition-colors hover:text-red-600"
                >
                  Withdraw
                </button>
              )}
            </div>
          ) : dl.passed ? (
            <Button size="sm" variant="secondary" disabled className="flex-1 text-xs">
              Applications Closed
            </Button>
          ) : (
            <Button size="sm" className="flex-1 whitespace-nowrap text-xs" onClick={() => onApply(campaign)}>
              {existingApp ? 'Re-apply Now' : 'Apply Now'}
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="whitespace-nowrap text-xs"
            onClick={() => onViewBrand(campaign)}
          >
            View Brand
          </Button>
        </div>
      </div>
    </article>
  );
}

function CampaignSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-surface)">
      <div className="h-24 animate-pulse bg-(--color-elevated)" />
      <div className="p-5">
        <div className="-mt-12 h-14 w-14 animate-pulse rounded-full bg-(--color-elevated) ring-4 ring-(--color-surface)" />
        <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-(--color-elevated)" />
        <div className="mt-2 h-3 w-full animate-pulse rounded bg-(--color-elevated)" />
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-(--color-elevated)" />
        <div className="mt-4 flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-xl bg-(--color-elevated)" />
          <div className="h-8 w-24 animate-pulse rounded-xl bg-(--color-elevated)" />
        </div>
      </div>
    </div>
  );
}

export default function CreatorHome() {
  const { user } = useAuth();
  const [draftQ, setDraftQ] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    niche: '',
    minBudget: '',
    sort: 'newest',
    page: 1
  });

  const [result, setResult] = useState(null);
  const [mine, setMine] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  // Quick Apply modal
  const [applyFor, setApplyFor] = useState(null);
  const [applyForm, setApplyForm] = useState({ proposedRate: '', message: '', links: '' });
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyErr, setApplyErr] = useState('');

  // View Brand & Campaign Brief modal
  const [inspectCampaign, setInspectCampaign] = useState(null);

  const loadAux = useCallback(() => {
    api.get('/influencer/applications').then((r) => setMine(r.data || [])).catch(() => setMine([]));
    api.get('/dashboard/overview').then((r) => setOverview(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadAux();
  }, [loadAux]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q: draftQ, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [draftQ]);

  const fetchCampaigns = useCallback(() => {
    let alive = true;
    setLoading(true);
    setErr('');

    const qs = new URLSearchParams();
    qs.set('limit', '9');
    qs.set('page', String(filters.page));
    qs.set('sort', filters.sort);
    if (filters.q.trim()) qs.set('q', filters.q.trim());
    if (filters.niche) qs.set('niche', filters.niche);
    if (filters.minBudget) qs.set('minBudget', filters.minBudget);

    api.get(`/campaigns/open?${qs.toString()}`)
      .then((res) => { if (alive) setResult(res.data); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load campaigns'); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [filters]);

  useEffect(() => fetchCampaigns(), [fetchCampaigns]);

  const appliedTo = (c) => mine.find((a) => String(a.campaign?._id || a.campaign) === c._id);

  const openApplyModal = (c) => {
    setApplyFor(c);
    setApplyErr('');
    setApplyForm({
      proposedRate: c.budget?.total ? String(c.budget.total) : '',
      message: '',
      links: ''
    });
  };

  const submitApply = async (e) => {
    e.preventDefault();
    if (!applyFor) return;
    setApplyBusy(true);
    setApplyErr('');
    setToast('');
    try {
      const body = { proposedRate: Number(applyForm.proposedRate) };
      if (applyForm.message.trim()) body.message = applyForm.message.trim();
      const links = applyForm.links.split(',').map((s) => s.trim()).filter(Boolean);
      if (links.length) body.deliverableLinks = links;
      await api.post(`/campaigns/${applyFor._id}/apply`, body);
      setToast(`Application sent to “${applyFor.title}”.`);
      setApplyFor(null);
      loadAux();
    } catch (e2) {
      setApplyErr(e2.message || 'Could not send application');
    } finally {
      setApplyBusy(false);
    }
  };

  const withdrawApp = async (appId) => {
    if (!confirm('Withdraw this application? You can re-apply while the campaign stays open.')) return;
    setErr('');
    setToast('');
    try {
      await api.post(`/applications/${appId}/withdraw`);
      setToast('Application withdrawn.');
      loadAux();
    } catch (e) {
      setErr(e.message || 'Could not withdraw application');
    }
  };

  const igConnected = Boolean(user?.instagram?.connected);
  const pendingInvites = overview?.totals?.invitationsPending ?? 0;
  const activeAgreements = overview?.totals?.agreementsActive ?? 0;
  const hasFilters = Boolean(filters.q || filters.niche || filters.minBudget);

  const clearFilters = () => {
    setDraftQ('');
    setFilters({ q: '', niche: '', minBudget: '', sort: filters.sort, page: 1 });
  };

  return (
    <div className="min-h-screen bg-(--color-canvas) pb-16 text-(--color-ink)">
      <DiscoveryHero
        statusSlot={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-white/80 px-3 py-1 text-xs font-semibold text-(--color-ink) backdrop-blur-md dark:bg-black/30">
              <span className="pulse-node" />
              Creator Home · {user?.displayName || 'Welcome'}
            </span>
            {igConnected ? (
              <Link
                to="/influencer/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-800 backdrop-blur-md transition-colors hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                ✓ Instagram Synced{user?.instagram?.username ? ` (@${user.instagram.username})` : ''}
              </Link>
            ) : (
              <Link
                to="/influencer/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-800 backdrop-blur-md transition-colors hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300"
              >
                Connect Instagram for API badge →
              </Link>
            )}
            {pendingInvites > 0 && (
              <Link
                to="/influencer/inbox"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs transition-transform hover:-translate-y-px hover:bg-brand-700"
              >
                📨 {pendingInvites} New Invite{pendingInvites === 1 ? '' : 's'}
              </Link>
            )}
            {activeAgreements > 0 && (
              <Link
                to="/influencer/inbox"
                className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-white/80 px-3 py-1 text-xs font-semibold text-(--color-ink) backdrop-blur-md hover:border-brand-400 dark:bg-black/30"
              >
                🤝 {activeAgreements} Active Deal{activeAgreements === 1 ? '' : 's'}
              </Link>
            )}
          </>
        }
        title="Discover Active Brand Campaigns"
        subtitle="Apply to live brand briefs, propose your deliverables & rates transparently, and collaborate under structured agreements."
        searchValue={draftQ}
        onSearchChange={setDraftQ}
        onSearchSubmit={() => setFilters((f) => ({ ...f, q: draftQ, page: 1 }))}
        searchPlaceholder="Search campaigns by brand, product, niche, or deliverable…"
        filterSlot={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {NICHE_PILLS.map((pill) => {
              const active = filters.niche === pill.value;
              return (
                <button
                  key={pill.value || 'all'}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, niche: pill.value, page: 1 }))}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
                      : 'border-(--color-line) bg-(--color-surface) text-(--color-ink-soft) hover:border-brand-400 hover:text-(--color-ink)'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        }
      />

      <main className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Toolbar row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-line)/70 pb-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-(--color-ink)">
              {loading && !result
                ? 'Loading open campaigns…'
                : `${result?.total ?? 0} active campaign${result?.total === 1 ? '' : 's'}`}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg bg-(--color-elevated) px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                Clear filters ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter by minimum budget"
              value={filters.minBudget}
              onChange={(e) => setFilters((f) => ({ ...f, minBudget: e.target.value, page: 1 }))}
              className="h-9 rounded-xl border border-(--color-line) bg-(--color-surface) px-2.5 text-xs font-medium text-(--color-ink) focus:border-brand-500 focus:outline-none"
            >
              {BUDGET_OPTIONS.map((b) => (
                <option key={b.value || 'any'} value={b.value} className="bg-(--color-surface) text-(--color-ink)">
                  {b.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort campaigns"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
              className="h-9 rounded-xl border border-(--color-line) bg-(--color-surface) px-2.5 text-xs font-semibold text-(--color-ink) focus:border-brand-500 focus:outline-none"
            >
              {SORTS.map(([v, l]) => (
                <option key={v} value={v} className="bg-(--color-surface) text-(--color-ink)">
                  {l}
                </option>
              ))}
            </select>

            <Link
              to="/influencer/explore"
              className="hidden items-center gap-1 rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-xs font-semibold text-(--color-ink) transition-colors hover:border-brand-400 sm:inline-flex"
            >
              My Applications ({mine.length})
            </Link>
          </div>
        </div>

        {toast && (
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast('')} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {err && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </div>
        )}

        {/* Campaign Grid */}
        {loading && !result ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => <CampaignSkeleton key={idx} />)}
          </div>
        ) : result?.items?.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-(--color-line) bg-(--color-surface) p-12 text-center shadow-xs">
            <p className="font-(family:--font-display) text-lg font-bold">
              {hasFilters ? 'No matching campaigns found' : 'No open brand campaigns yet'}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-(--color-ink-soft)">
              {hasFilters
                ? 'Try clearing filters or picking another niche to see all available opportunities.'
                : 'Keep your creator rates and Instagram stats updated on your dashboard so brands can find and invite you directly.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hasFilters && <Button variant="secondary" onClick={clearFilters}>Show all campaigns</Button>}
              <Button to="/influencer/dashboard">Open Creator Dashboard →</Button>
            </div>
          </div>
        ) : result ? (
          <>
            <div className={`mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-65 transition-opacity' : ''}`}>
              {result.items.map((c) => (
                <CampaignHomeCard
                  key={c._id}
                  campaign={c}
                  existingApp={appliedTo(c)}
                  onApply={openApplyModal}
                  onViewBrand={setInspectCampaign}
                  onWithdraw={withdrawApp}
                />
              ))}
            </div>

            {result.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3 text-sm">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  ← Prev
                </Button>
                <span className="text-xs font-medium text-(--color-ink-soft)">
                  Page {result.page} of {result.pages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={result.page >= result.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Quick Apply Modal */}
      <ModalDialog
        open={Boolean(applyFor)}
        onClose={() => setApplyFor(null)}
        title={`Apply — ${applyFor?.title || ''}`}
        subtitle={`Brand: ${applyFor?.brandProfile?.companyName || applyFor?.brand?.displayName || 'Brand Partner'} · Budget: ${formatMoney(applyFor?.budget?.total, applyFor?.budget?.currency)}`}
      >
        <form onSubmit={submitApply} className="space-y-4">
          {applyErr && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {applyErr}
            </div>
          )}

          <label className="block text-sm font-medium text-(--color-ink)">
            Your proposed rate (INR) *
            <input
              required
              type="number"
              min="0"
              value={applyForm.proposedRate}
              onChange={(e) => setApplyForm((f) => ({ ...f, proposedRate: e.target.value }))}
              className="mt-1.5 block w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2.5 text-sm text-(--color-ink) focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <label className="block text-sm font-medium text-(--color-ink)">
            Pitch to the brand
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="Share why your audience matches this brief, content ideas, or past campaign results…"
              value={applyForm.message}
              onChange={(e) => setApplyForm((f) => ({ ...f, message: e.target.value }))}
              className="mt-1.5 block w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <label className="block text-sm font-medium text-(--color-ink)">
            Relevant work links (comma-separated)
            <input
              placeholder="https://instagram.com/reel/..., https://..."
              value={applyForm.links}
              onChange={(e) => setApplyForm((f) => ({ ...f, links: e.target.value }))}
              className="mt-1.5 block w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <p className="text-[11px] text-(--color-ink-soft)">
            If accepted, the brand initiates a formal agreement with full fee & milestone breakdown for your confirmation.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setApplyFor(null)}>Cancel</Button>
            <Button type="submit" disabled={applyBusy}>
              {applyBusy ? 'Sending…' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* View Brand & Brief Modal */}
      <ModalDialog
        open={Boolean(inspectCampaign)}
        onClose={() => setInspectCampaign(null)}
        title={inspectCampaign?.brandProfile?.companyName || inspectCampaign?.brand?.displayName || 'Brand Brief'}
        subtitle={
          [
            inspectCampaign?.brandProfile?.industry?.replace(/[_-]+/g, ' '),
            inspectCampaign?.brandProfile?.contact?.city,
            inspectCampaign?.brandProfile?.contact?.country
          ].filter(Boolean).join(' · ') || 'Registered Brand on EZ Ads'
        }
        maxWidth="max-w-xl"
      >
        {inspectCampaign && (() => {
          const bp = inspectCampaign.brandProfile;
          const existing = appliedTo(inspectCampaign);
          const dl = deadlineInfo(inspectCampaign.applicationDeadline);
          return (
            <div className="space-y-5">
              {/* About the Brand */}
              <div className="rounded-xl border border-(--color-line) bg-(--color-elevated)/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
                    About the Brand
                  </span>
                  {bp?.website && (
                    <a
                      href={bp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                    >
                      Visit website ↗
                    </a>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-(--color-ink)">
                  {bp?.about || 'Active advertiser looking for authentic creators on EZ Ads.'}
                </p>
              </div>

              {/* Campaign Brief */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-(family:--font-display) text-base font-bold text-(--color-ink)">
                    {inspectCampaign.title}
                  </h3>
                  <Badge tone="brand">{formatMoney(inspectCampaign.budget?.total, inspectCampaign.budget?.currency)}</Badge>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed text-(--color-ink-soft)">
                  {inspectCampaign.description}
                </p>

                {inspectCampaign.productInfo && (
                  <div className="rounded-xl border border-(--color-line) bg-(--color-canvas) p-3 text-xs">
                    <span className="font-bold text-(--color-ink)">Product Info: </span>
                    <span className="text-(--color-ink-soft)">{inspectCampaign.productInfo}</span>
                  </div>
                )}

                {inspectCampaign.deliverables?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-(--color-ink-soft)">
                      Required Deliverables
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {inspectCampaign.deliverables.map((d, i) => (
                        <span
                          key={i}
                          className="rounded-lg border border-(--color-line) bg-(--color-elevated)/70 px-2.5 py-1 text-xs font-medium capitalize text-(--color-ink)"
                        >
                          {d.quantity}× {d.format}{d.description ? ` — ${d.description}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--color-line) pt-4">
                <span className="text-xs text-(--color-ink-soft)">
                  Deadline: <strong className="text-(--color-ink)">{dl.label}</strong>
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setInspectCampaign(null)}>Close</Button>
                  {(!existing || existing.status === 'withdrawn') && !dl.passed && (
                    <Button
                      onClick={() => {
                        const target = inspectCampaign;
                        setInspectCampaign(null);
                        openApplyModal(target);
                      }}
                    >
                      Apply Now →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </ModalDialog>
    </div>
  );
}
