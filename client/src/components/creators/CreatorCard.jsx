import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import { useCompare } from '../../context/CompareContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatFollowers, formatMoney, sourceLabel, availabilityLabel, rateFor } from '../../utils/format.js';
import ShortlistSaveButton from './ShortlistSaveButton.jsx';

export function CreatorAvatar({ creator, size = 'h-12 w-12 text-sm' }) {
  const name = creator.displayName || creator.username || '?';
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return creator.user?.avatarUrl ? (
    <img src={creator.user.avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-(--color-line)`} />
  ) : (
    <div aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 via-indigo-500 to-accent-500 font-bold text-white ring-2 ring-brand-500/20 ring-offset-2 ring-offset-(--color-surface)`}>
      {initials}
    </div>
  );
}

const AVAIL_TONES = { available: 'success', limited: 'warning', booked: 'neutral', paused: 'danger' };

export default function CreatorCard({ creator }) {
  const compare = useCompare();
  const { user: me } = useAuth();
  const audience = creator.audience || {};
  const folSrc = sourceLabel(audience.followersSource);
  const engSrc = sourceLabel(audience.engagementSource);
  const avail = availabilityLabel(creator.availability);
  const selected = compare.has(creator);
  const disabled = !selected && compare.isFull();

  const handle = creator.user?.instagram?.username || creator.username || '';

  return (
    <Card hover className={`flex flex-col justify-between p-5 transition-all ${selected ? 'ring-2 ring-brand-500 shadow-md' : ''}`}>
      {/* ── Header: Avatar, Name, Handle, Niche & Availability ── */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <CreatorAvatar creator={creator} size="h-12 w-12 text-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-bold text-base text-(--color-ink) hover:text-brand-600 transition-colors">
                  {creator.displayName || creator.username}
                </p>
                {creator.user?.instagram?.providerId && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white" title="Verified with Meta API">
                    ✓
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-(--color-ink-soft) mt-0.5">
                {handle ? `@${handle}` : 'Creator'}
                {creator.niche && (
                  <>
                    <span className="mx-1 opacity-50">•</span>
                    <span className="capitalize">{creator.niche}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Badge tone={AVAIL_TONES[creator.availability] || 'neutral'} className="shrink-0 text-[11px] capitalize">
            {avail.text}
          </Badge>
        </div>

        {/* ── Metrics: Full-Width 3-Column Grid ── */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-(--color-line) bg-(--color-elevated)/50 p-2 text-center">
          {/* Column 1: Followers */}
          <div className="flex flex-col items-center justify-center min-w-0 rounded-xl bg-(--color-surface) p-2 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-ink-soft) truncate w-full">
              Followers
            </span>
            <span className="mt-0.5 text-base font-extrabold text-(--color-ink) font-(family:--font-display) truncate w-full">
              {formatFollowers(audience.followers)}
            </span>
            <span
              title={folSrc.title}
              className={`mt-1 inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                folSrc.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-(--color-elevated) text-(--color-ink-soft)'
              }`}
            >
              {folSrc.text}
            </span>
          </div>

          {/* Column 2: Engagement */}
          <div className="flex flex-col items-center justify-center min-w-0 rounded-xl bg-(--color-surface) p-2 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-ink-soft) truncate w-full">
              Engagement
            </span>
            <span className="mt-0.5 text-base font-extrabold text-(--color-ink) font-(family:--font-display) truncate w-full">
              {audience.engagementRate != null ? `${audience.engagementRate}%` : '—'}
            </span>
            <span
              title={engSrc.title}
              className={`mt-1 inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                engSrc.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-(--color-elevated) text-(--color-ink-soft)'
              }`}
            >
              {engSrc.text}
            </span>
          </div>

          {/* Column 3: Rate */}
          <div className="flex flex-col items-center justify-center min-w-0 rounded-xl bg-(--color-surface) p-2 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-ink-soft) truncate w-full">
              From
            </span>
            <span className="mt-0.5 text-base font-extrabold text-brand-600 dark:text-brand-400 font-(family:--font-display) truncate w-full">
              {formatFollowers(creator.minBudget) === '—' ? '—' : formatMoney(creator.minBudget)}
            </span>
            <span className="mt-1 inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-medium text-(--color-ink-soft) bg-(--color-elevated)">
              {creator.maxBudget > 0 ? `to ${formatMoney(creator.maxBudget)}` : 'per Reel'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Actions: Full-Width Row ── */}
      <div className="mt-5 flex items-center gap-2 pt-3 border-t border-(--color-line)/60">
        <Button size="sm" variant="secondary" className="flex-1 text-xs" to={`/brand/creators/${creator._id}`}>
          View profile
        </Button>
        <ShortlistSaveButton influencerId={creator.user?._id} disabled={!me || me.role !== 'brand'} />
        <Button
          size="sm"
          variant={selected ? 'primary' : 'ghost'}
          disabled={disabled}
          title={disabled ? `Compare tray is full (max ${compare.max})` : undefined}
          onClick={() => compare.toggle(creator)}
          className="text-xs px-2.5"
        >
          {selected ? '✓ Added' : 'Compare'}
        </Button>
      </div>
    </Card>
  );
}

export { rateFor };
