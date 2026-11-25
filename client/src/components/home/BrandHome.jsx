import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import ShortlistSaveButton from '../creators/ShortlistSaveButton.jsx';
import CompareTray from '../creators/CompareTray.jsx';
import { availabilityLabel, formatFollowers, formatMoney, rateFor } from '../../utils/format.js';
import { DiscoveryHero, ModalDialog, getNicheTheme } from './homeShared.jsx';

const NICHE_OPTIONS = [
  ['', 'All Niches'],
  ['fashion', 'Fashion'],
  ['beauty', 'Beauty'],
  ['technology', 'Tech & AI'],
  ['food', 'Food & Drink'],
  ['fitness', 'Fitness'],
  ['lifestyle', 'Lifestyle'],
  ['travel', 'Travel'],
  ['gaming', 'Gaming'],
  ['education', 'Education'],
  ['other', 'Other']
];

const FOLLOWER_PRESETS = [
  { id: '', label: 'Followers: Any', min: '', max: '' },
  { id: 'nano', label: '1K – 10K (Nano)', min: '1000', max: '10000' },
  { id: 'micro', label: '10K – 50K (Micro)', min: '10000', max: '50000' },
  { id: 'mid', label: '50K – 250K (Mid)', min: '50000', max: '250000' },
  { id: 'macro', label: '250K+ (Macro)', min: '250000', max: '' }
];

const ENGAGEMENT_PRESETS = [
  { id: '', label: 'Engagement: Any' },
  { id: '2', label: '2%+ Engagement' },
  { id: '4', label: '4%+ Engagement' },
  { id: '6', label: '6%+ Engagement' },
  { id: '8', label: '8%+ Engagement' }
];

const BUDGET_PRESETS = [
  { id: '', label: 'Budget: Any', min: '', max: '' },
  { id: 'u5k', label: 'Under ₹5,000', min: '', max: '5000' },
  { id: '5_15', label: '₹5,000 – ₹15,000', min: '5000', max: '15000' },
  { id: '15_50', label: '₹15,000 – ₹50,000', min: '15000', max: '50000' },
  { id: '50k', label: '₹50,000+', min: '50000', max: '' }
];

const SORTS = [
  ['followers', 'Most followers'],
  ['engagement', 'Highest engagement'],
  ['price_low', 'Lowest rate'],
  ['price_high', 'Highest rate']
];

const AVAIL_BADGE = {
  available: 'bg-emerald-500/90 text-white',
  limited: 'bg-amber-500/90 text-white',
  booked: 'bg-stone-600/90 text-white',
  paused: 'bg-rose-600/90 text-white'
};

function BrandHomeCard({ creator, onInvite }) {
  const compare = useCompare();
  const { user: me } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const audience = creator.audience || {};
  const isApiVerified = audience.followersSource === 'meta_api';
  const handle = creator.user?.instagram?.username || creator.username || '';
  const name = creator.displayName || handle || 'Creator';
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const avail = availabilityLabel(creator.availability);
  const theme = getNicheTheme(creator.niche);

  const avatarSrc = !imgFailed
    ? creator.user?.avatarUrl || creator.instagramInsights?.profilePicture || ''
    : '';
  const rawCover = creator.portfolio?.[0]?.thumbnailUrl || '';
  const coverSrc = !coverFailed && rawCover ? rawCover : '';

  const reelRate = rateFor(creator.rates, 'reel') || rateFor(creator.rates, 'post');
  const startingRate = creator.minBudget > 0 ? formatMoney(creator.minBudget) : reelRate || 'Custom';
  const locationText = [creator.location?.city, creator.location?.country].filter(Boolean).join(', ');
  const selected = compare.has(creator);
  const compareDisabled = !selected && compare.isFull();

  return (
    <article
      className={`taste-card group flex flex-col overflow-hidden ${
        selected ? 'ring-2 ring-brand-500 border-brand-500' : ''
      }`}
    >
      {/* Visual cover banner */}
      <div className={`relative h-24 overflow-hidden bg-linear-to-br ${theme.gradient}`}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden
            className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${theme.glow} blur-2xl`}
          />
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md shadow-2xs ${theme.accent}`}>
            {theme.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-2xs ${
              AVAIL_BADGE[creator.availability] || AVAIL_BADGE.available
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            {avail.text}
          </span>
        </div>
      </div>

      {/* Overlapping identity + card content */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-7 flex items-end justify-between gap-3">
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={name}
                onError={() => setImgFailed(true)}
                className="h-14 w-14 rounded-full object-cover ring-4 ring-(--color-surface) shadow-sm"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 text-base font-bold text-white ring-4 ring-(--color-surface) shadow-sm"
              >
                {initials}
              </div>
            )}
            {isApiVerified && (
              <span
                title="Verified via Meta Instagram Graph API"
                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white ring-2 ring-(--color-surface)"
              >
                ✓
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={compareDisabled}
            onClick={() => compare.toggle(creator)}
            title={compareDisabled ? `Compare tray full (max ${compare.max})` : 'Compare creator'}
            className={`mb-0.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              selected
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200'
                : 'border-(--color-line) bg-(--color-elevated)/60 text-(--color-ink-soft) hover:text-(--color-ink) disabled:opacity-40'
            }`}
          >
            {selected ? '✓ Comparing' : '+ Compare'}
          </button>
        </div>

        {/* Name, handle & source provenance */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/brand/creators/${creator._id}`}
              className="truncate font-(family:--font-display) text-base font-bold text-(--color-ink) transition-colors hover:text-brand-600 dark:hover:text-brand-300"
            >
              {name}
            </Link>
          </div>
          <p className="mt-0.5 truncate text-xs text-(--color-ink-soft)">
            {handle ? `@${handle}` : 'Creator'}
            {locationText && (
              <>
                <span className="mx-1.5 opacity-45">•</span>
                <span>{locationText}</span>
              </>
            )}
          </p>

          <div className="mt-2">
            {isApiVerified ? (
              <Badge tone="success" dot>
                Verified via Meta API
              </Badge>
            ) : (
              <Badge tone="neutral">Self-reported metrics</Badge>
            )}
          </div>
        </div>

        {/* Short bio */}
        <p className="mt-3 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-(--color-ink-soft)">
          {creator.bio || 'Open for sponsored reels, brand storytelling, and product collaborations.'}
        </p>

        {/* Clean 3-column metrics */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-(--color-line)/70 bg-(--color-elevated)/55 p-2 text-center">
          <div className="min-w-0 rounded-lg bg-(--color-surface) px-1.5 py-2 shadow-2xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Followers
            </div>
            <div className="figure mt-0.5 truncate text-sm font-bold text-(--color-ink)">
              {formatFollowers(audience.followers)}
            </div>
          </div>
          <div className="min-w-0 rounded-lg bg-(--color-surface) px-1.5 py-2 shadow-2xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Engagement
            </div>
            <div className="figure mt-0.5 truncate text-sm font-bold text-(--color-ink)">
              {audience.engagementRate != null ? `${Number(audience.engagementRate).toFixed(1)}%` : '—'}
            </div>
          </div>
          <div className="min-w-0 rounded-lg bg-(--color-surface) px-1.5 py-2 shadow-2xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-ink-soft)">
              Starting
            </div>
            <div className="figure mt-0.5 truncate text-sm font-bold text-brand-600 dark:text-brand-400">
              {startingRate}
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="mt-4 flex items-center gap-2 border-t border-(--color-line)/60 pt-3.5">
          <Button
            size="sm"
            className="flex-1 whitespace-nowrap text-xs"
            onClick={() => onInvite(creator)}
          >
            Invite to Campaign
          </Button>
          <Button
            size="sm"
            variant="secondary"
            to={`/brand/creators/${creator._id}`}
            className="whitespace-nowrap text-xs"
          >
            Profile
          </Button>
          <ShortlistSaveButton
            compact
            influencerId={creator.user?._id}
            disabled={!me || me.role !== 'brand'}
          />
        </div>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--color-line) bg-(--color-surface)">
      <div className="h-24 animate-pulse bg-(--color-elevated)" />
      <div className="p-5">
        <div className="-mt-12 h-14 w-14 animate-pulse rounded-full bg-(--color-elevated) ring-4 ring-(--color-surface)" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-(--color-elevated)" />
        <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-(--color-elevated)" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-12 animate-pulse rounded-lg bg-(--color-elevated)" />
          <div className="h-12 animate-pulse rounded-lg bg-(--color-elevated)" />
          <div className="h-12 animate-pulse rounded-lg bg-(--color-elevated)" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-xl bg-(--color-elevated)" />
          <div className="h-8 w-16 animate-pulse rounded-xl bg-(--color-elevated)" />
        </div>
      </div>
    </div>
  );
}

export default function BrandHome() {
  const { user } = useAuth();
  const [draftQ, setDraftQ] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    niche: '',
    followerPreset: '',
    minEngagement: '',
    budgetPreset: '',
    location: '',
    verifiedOnly: false,
    sort: 'followers',
    page: 1
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [overview, setOverview] = useState(null);

  // Quick invite modal state
  const [inviteCreator, setInviteCreator] = useState(null);
  const [myCampaigns, setMyCampaigns] = useState(null);
  const [inviteForm, setInviteForm] = useState({ campaignId: '', proposedRate: '', message: '' });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteErr, setInviteErr] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/dashboard/overview')
      .then((r) => { if (alive) setOverview(r.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Debounce search & location inputs
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q: draftQ, location: draftLocation, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [draftQ, draftLocation]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr('');

    const qs = new URLSearchParams();
    qs.set('limit', '9');
    qs.set('page', String(filters.page));
    qs.set('sort', filters.sort);
    if (filters.q.trim()) qs.set('q', filters.q.trim());
    if (filters.niche) qs.set('niche', filters.niche);
    if (filters.location.trim()) qs.set('location', filters.location.trim());
    if (filters.minEngagement) qs.set('minEngagement', filters.minEngagement);
    if (filters.verifiedOnly) qs.set('verifiedOnly', 'true');

    const fp = FOLLOWER_PRESETS.find((p) => p.id === filters.followerPreset);
    if (fp?.min) qs.set('minFollowers', fp.min);
    if (fp?.max) qs.set('maxFollowers', fp.max);

    const bp = BUDGET_PRESETS.find((p) => p.id === filters.budgetPreset);
    if (bp?.min) qs.set('minBudget', bp.min);
    if (bp?.max) qs.set('maxBudget', bp.max);

    api.get(`/influencers/search?${qs.toString()}`)
      .then((res) => { if (alive) setResult(res.data); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load creators'); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [filters]);

  const openInviteModal = (creator) => {
    setInviteCreator(creator);
    setInviteErr('');
    setInviteSuccess('');
    setInviteForm({
      campaignId: '',
      proposedRate: creator.minBudget > 0 ? String(creator.minBudget) : '',
      message: ''
    });
    api.get('/brand/campaigns')
      .then((res) => {
        const list = (res.data?.items || []).filter((c) => ['published', 'draft', 'paused'].includes(c.status));
        setMyCampaigns(list);
        if (list.length > 0) {
          setInviteForm((prev) => ({ ...prev, campaignId: list[0]._id }));
        }
      })
      .catch((e) => {
        setMyCampaigns([]);
        setInviteErr(e.message || 'Failed to load campaigns');
      });
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.campaignId || !inviteCreator) return;
    setInviteBusy(true);
    setInviteErr('');
    setInviteSuccess('');
    try {
      const payload = {
        influencerId: inviteCreator.user?._id || inviteCreator.user
      };
      if (inviteForm.proposedRate !== '') payload.proposedRate = Number(inviteForm.proposedRate);
      if (inviteForm.message.trim()) payload.message = inviteForm.message.trim();
      await api.post(`/brand/campaigns/${inviteForm.campaignId}/invite`, payload);
      setInviteSuccess(`Invitation sent to ${inviteCreator.displayName || 'creator'}!`);
    } catch (e2) {
      setInviteErr(e2.message || 'Could not send invitation');
    } finally {
      setInviteBusy(false);
    }
  };

  const hasActiveFilters = Boolean(
    filters.q || filters.niche || filters.followerPreset ||
    filters.minEngagement || filters.budgetPreset || filters.location || filters.verifiedOnly
  );

  const clearAllFilters = () => {
    setDraftQ('');
    setDraftLocation('');
    setFilters({
      q: '',
      niche: '',
      followerPreset: '',
      minEngagement: '',
      budgetPreset: '',
      location: '',
      verifiedOnly: false,
      sort: filters.sort,
      page: 1
    });
  };

  const totals = overview?.totals;
  const pillCls =
    'h-9 rounded-xl border border-(--color-line) bg-(--color-surface) px-3 text-xs font-medium text-(--color-ink) shadow-2xs transition-colors hover:border-brand-400 focus:border-brand-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-(--color-canvas) pb-16 text-(--color-ink)">
      <DiscoveryHero
        statusSlot={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-white/80 px-3 py-1 text-xs font-semibold text-(--color-ink) backdrop-blur-md dark:bg-black/30">
              <span className="pulse-node" />
              Brand Workspace · {user?.displayName || 'Welcome'}
            </span>
            {totals && (
              <Link
                to="/brand/campaigns"
                className="inline-flex items-center gap-1.5 rounded-full border border-(--color-line) bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur-md transition-colors hover:border-brand-400 dark:bg-black/30 dark:text-brand-300"
              >
                {totals.campaignsLive ?? 0} Active Campaign{totals.campaignsLive === 1 ? '' : 's'}
                {totals.applicationsPending > 0 && (
                  <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.2 text-[10px] text-white">
                    {totals.applicationsPending} new
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/brand/campaigns"
              className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs transition-transform hover:-translate-y-px hover:bg-brand-700"
            >
              + New Campaign
            </Link>
          </>
        }
        title="Discover Verified Creators"
        subtitle="Find and recruit the right influencers backed by real-time Instagram Graph API metrics, transparent rate cards, and direct workflow tools."
        searchValue={draftQ}
        onSearchChange={setDraftQ}
        onSearchSubmit={() => setFilters((f) => ({ ...f, q: draftQ, page: 1 }))}
        searchPlaceholder="Search creators by name, @handle, niche, or city…"
        filterSlot={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <select
              aria-label="Filter by niche"
              value={filters.niche}
              onChange={(e) => setFilters((f) => ({ ...f, niche: e.target.value, page: 1 }))}
              className={pillCls}
            >
              {NICHE_OPTIONS.map(([val, label]) => (
                <option key={val || 'all'} value={val} className="bg-(--color-surface) text-(--color-ink)">
                  {label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by followers"
              value={filters.followerPreset}
              onChange={(e) => setFilters((f) => ({ ...f, followerPreset: e.target.value, page: 1 }))}
              className={pillCls}
            >
              {FOLLOWER_PRESETS.map((p) => (
                <option key={p.id || 'any'} value={p.id} className="bg-(--color-surface) text-(--color-ink)">
                  {p.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by engagement rate"
              value={filters.minEngagement}
              onChange={(e) => setFilters((f) => ({ ...f, minEngagement: e.target.value, page: 1 }))}
              className={pillCls}
            >
              {ENGAGEMENT_PRESETS.map((p) => (
                <option key={p.id || 'any'} value={p.id} className="bg-(--color-surface) text-(--color-ink)">
                  {p.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by budget"
              value={filters.budgetPreset}
              onChange={(e) => setFilters((f) => ({ ...f, budgetPreset: e.target.value, page: 1 }))}
              className={pillCls}
            >
              {BUDGET_PRESETS.map((p) => (
                <option key={p.id || 'any'} value={p.id} className="bg-(--color-surface) text-(--color-ink)">
                  {p.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              aria-label="Filter by city or country"
              placeholder="Location (e.g. Mumbai)"
              value={draftLocation}
              onChange={(e) => setDraftLocation(e.target.value)}
              className={`${pillCls} w-40 placeholder:text-(--color-ink-soft)/75`}
            />

            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, verifiedOnly: !f.verifiedOnly, page: 1 }))}
              aria-pressed={filters.verifiedOnly}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                filters.verifiedOnly
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-(--color-line) bg-(--color-surface) text-(--color-ink-soft) hover:border-emerald-500/60 hover:text-(--color-ink)'
              }`}
            >
              <span>✓</span> Meta API Verified
            </button>
          </div>
        }
      />

      {/* Main Content Grid */}
      <main className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Toolbar row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-line)/70 pb-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-(--color-ink)">
              {loading && !result
                ? 'Finding creators…'
                : `${result?.total ?? 0} creator${result?.total === 1 ? '' : 's'} found`}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-lg bg-(--color-elevated) px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                Clear filters ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-(--color-ink-soft)">
              Sort by
              <select
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
            </label>
            <Link
              to="/brand/discovery"
              className="hidden items-center gap-1 rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-xs font-semibold text-(--color-ink) transition-colors hover:border-brand-400 sm:inline-flex"
            >
              <Icon name="filter" size={14} /> Advanced filters
            </Link>
          </div>
        </div>

        {err && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </div>
        )}

        {/* Creator Grid */}
        {loading && !result ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => <CardSkeleton key={idx} />)}
          </div>
        ) : result?.items?.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-(--color-line) bg-(--color-surface) p-12 text-center shadow-xs">
            <p className="font-(family:--font-display) text-lg font-bold">No creators match these filters</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-(--color-ink-soft)">
              Try widening your follower, budget, or engagement filters — or publish an open campaign so creators apply directly.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hasActiveFilters && (
                <Button variant="secondary" onClick={clearAllFilters}>Reset filters</Button>
              )}
              <Button to="/brand/campaigns">+ Post an open campaign</Button>
            </div>
          </div>
        ) : result ? (
          <>
            <div className={`mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-65 transition-opacity' : ''}`}>
              {result.items.map((creator) => (
                <BrandHomeCard
                  key={creator._id}
                  creator={creator}
                  onInvite={openInviteModal}
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

      <CompareTray />

      {/* Quick Invite to Campaign Modal */}
      <ModalDialog
        open={Boolean(inviteCreator)}
        onClose={() => setInviteCreator(null)}
        title={`Invite ${inviteCreator?.displayName || 'Creator'}`}
        subtitle={
          inviteCreator?.username
            ? `@${inviteCreator.username} · Send an official collaboration invite tied to one of your campaigns.`
            : 'Choose a campaign and send an official collaboration invite.'
        }
      >
        {myCampaigns === null ? (
          <p className="py-6 text-center text-sm text-(--color-ink-soft)">Loading your campaigns…</p>
        ) : myCampaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-(--color-line) bg-(--color-elevated)/50 p-6 text-center">
            <p className="text-sm font-semibold text-(--color-ink)">No active or draft campaigns yet</p>
            <p className="mt-1 text-xs text-(--color-ink-soft)">
              Create a campaign brief first so you can send invitations and lock deliverable terms.
            </p>
            <Button className="mt-4" to="/brand/campaigns">
              Create your first campaign →
            </Button>
          </div>
        ) : inviteSuccess ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              {inviteSuccess}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setInviteCreator(null)}>Done</Button>
              <Button to={`/brand/campaigns/${inviteForm.campaignId}`}>Open Campaign →</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={sendInvite} className="space-y-4">
            {inviteErr && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {inviteErr}
              </div>
            )}

            <label className="block text-sm font-medium text-(--color-ink)">
              Select Campaign *
              <select
                required
                value={inviteForm.campaignId}
                onChange={(e) => setInviteForm((f) => ({ ...f, campaignId: e.target.value }))}
                className="mt-1.5 block w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2.5 text-sm text-(--color-ink) focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {myCampaigns.map((c) => (
                  <option key={c._id} value={c._id} className="bg-(--color-surface) text-(--color-ink)">
                    {c.title} ({c.status} · {formatMoney(c.budget?.total, c.budget?.currency)})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-(--color-ink)">
              Proposed Offer (INR)
              <input
                type="number"
                min="0"
                placeholder="Optional starting offer, e.g. 12000"
                value={inviteForm.proposedRate}
                onChange={(e) => setInviteForm((f) => ({ ...f, proposedRate: e.target.value }))}
                className="mt-1.5 block w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <label className="block text-sm font-medium text-(--color-ink)">
              Personal Note
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="Tell the creator why you chose them and what deliverables you have in mind…"
                value={inviteForm.message}
                onChange={(e) => setInviteForm((f) => ({ ...f, message: e.target.value }))}
                className="mt-1.5 block w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-3 py-2 text-sm text-(--color-ink) focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setInviteCreator(null)}>Cancel</Button>
              <Button type="submit" disabled={inviteBusy}>
                {inviteBusy ? 'Sending…' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}
