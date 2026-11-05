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
    <img src={creator.user.avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <div aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-accent-500 font-semibold text-white`}>
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

  return (
    <Card hover className={`p-5 ${selected ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex items-start gap-3">
        <CreatorAvatar creator={creator} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                <span className="hover:text-brand-700">{creator.displayName}</span>
              </p>
              <p className="truncate text-sm text-neutral-500">
                {creator.user?.instagram?.username ? `@${creator.user.instagram.username}` : `@${creator.username || ''}`}
                {' · '}
                {creator.niche}
              </p>
            </div>
            <Badge tone={AVAIL_TONES[creator.availability] || 'neutral'}>{avail.text}</Badge>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <span className="block text-xs text-neutral-500">Followers</span>
              <strong>{formatFollowers(audience.followers)}</strong>{' '}
              <span title={folSrc.title} className="cursor-help align-middle"><Badge tone={folSrc.tone}>{folSrc.text}</Badge></span>
            </div>
            <div>
              <span className="block text-xs text-neutral-500">Engagement</span>
              <strong>{audience.engagementRate != null ? `${audience.engagementRate}%` : '—'}</strong>{' '}
              <span title={engSrc.title} className="cursor-help align-middle"><Badge tone={engSrc.tone}>{engSrc.text}</Badge></span>
            </div>
            <div>
              <span className="block text-xs text-neutral-500">From</span>
              <strong>{formatFollowers(creator.minBudget) === '—' ? '—' : formatMoney(creator.minBudget)}</strong>
              {creator.maxBudget > 0 && <span className="block text-xs text-neutral-500">to {formatMoney(creator.maxBudget)}</span>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" to={`/brand/creators/${creator._id}`}>View profile</Button>
            <ShortlistSaveButton influencerId={creator.user?._id} disabled={!me || me.role !== 'brand'} />
            <Button
              size="sm"
              variant={selected ? 'primary' : 'ghost'}
              disabled={disabled}
              title={disabled ? `Compare tray is full (max ${compare.max})` : undefined}
              onClick={() => compare.toggle(creator)}
            >
              {selected ? '✓ In compare' : 'Compare'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export { rateFor };
