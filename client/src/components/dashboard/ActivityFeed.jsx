import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Icon from '../ui/Icon.jsx';

/* ---------------- loading primitives ---------------- */

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse-soft rounded-lg bg-(--color-elevated) ${className}`} />;
}

export function TilesSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- activity feed ---------------- */

const TYPE_ICON = {
  invitation_received: 'message',
  invitation_accepted: 'check',
  invitation_declined: 'message',
  application_received: 'users',
  application_accepted: 'check',
  application_rejected: 'message',
  campaign_agreed: 'chart',
  message_received: 'message',
  campaign_status_changed: 'bolt',
  payout_recorded: 'wallet'
};

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActivityFeed({ items = null, loading, title = 'Recent activity', emptyHint }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon name="bolt" gradient size={18} /> {title}
        </h2>
        <Link to="/notifications" className="text-xs font-semibold text-(--color-vz-link) hover:underline">View all</Link>
      </div>

      {loading || items === null ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-2/3" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-(--color-line) px-4 py-8 text-center">
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="mt-1 text-xs text-(--color-ink-soft)">
            {emptyHint || 'Campaign, invitation and message updates will show up here.'}
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-1">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                to={a.campaignId ? `/brand/campaigns/${a.campaignId}` : '/notifications'}
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-(--color-elevated)"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-elevated) text-(--color-ink-soft)">
                  <Icon name={TYPE_ICON[a.type] || 'sparkles'} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{a.title}</span>
                    {a.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-label="Unread" />}
                  </span>
                  {a.body && <span className="mt-0.5 block truncate text-xs text-(--color-ink-soft)">{a.body}</span>}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-(--color-ink-soft)">{timeAgo(a.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ---------------- agreement pipeline ---------------- */

const PIPE_TONES = {
  negotiating: 'bg-amber-400',
  active: 'bg-brand-500',
  delivered: 'bg-violet-500',
  payout_pending: 'bg-accent-500',
  paid: 'bg-emerald-500',
  cancelled: 'bg-neutral-300'
};

const PIPE_LABEL = {
  negotiating: 'Negotiating',
  active: 'Active',
  delivered: 'Delivered',
  payout_pending: 'Awaiting payout',
  paid: 'Paid',
  cancelled: 'Cancelled'
};

export function PipelineStrip({ pipeline = [], loading, caption }) {
  const total = pipeline.reduce((n, p) => n + p.count, 0);
  const visible = pipeline.filter((p) => p.count > 0);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon name="chart" gradient size={18} /> Campaign pipeline
        </h2>
        <span className="font-mono text-xs text-(--color-ink-soft)">{total} agreement{total === 1 ? '' : 's'}</span>
      </div>

      {loading || pipeline === null ? (
        <Skeleton className="mt-4 h-3 w-full" />
      ) : total === 0 ? (
        <p className="mt-4 text-sm text-(--color-ink-soft)">
          No agreements yet — {caption || 'once terms are agreed, deals appear here as they move to payout.'}
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-(--color-elevated)">
            {visible.map((p) => (
              <div
                key={p.status}
                className={`pipe-seg ${PIPE_TONES[p.status] || 'bg-neutral-400'}`}
                style={{ width: `${(p.count / total) * 100}%` }}
                title={`${PIPE_LABEL[p.status] || p.status}: ${p.count}`}
              />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pipeline.map((p) => (
              <li key={p.status} className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${PIPE_TONES[p.status] || 'bg-neutral-400'}`} />
                <span className="text-(--color-ink-soft)">{PIPE_LABEL[p.status] || p.status}</span>
                <span className="ml-auto font-mono font-semibold">{p.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ---------------- onboarding checklist ---------------- */

export function SetupChecklist({ items = [], loading }) {
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  if (!loading && items.length > 0 && doneCount === items.length) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon name="shield" gradient size={18} /> Finish setting up
        </h2>
        <Badge tone={pct === 100 ? 'success' : 'brand'}>{doneCount}/{items.length}</Badge>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-(--color-elevated)">
        <div className="pipe-seg h-full bg-linear-to-r from-brand-500 to-accent-500" style={{ width: `${pct}%` }} />
      </div>

      {loading ? (
        <div className="mt-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((i) => (
            <li key={i.key}>
              <Link
                to={i.to || '#'}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  i.done
                    ? 'border-transparent bg-(--color-elevated) text-(--color-ink-soft)'
                    : 'border-(--color-line) hover:border-brand-300 hover:bg-brand-50/50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${
                    i.done ? 'bg-emerald-500' : 'border border-(--color-line) bg-(--color-surface)'
                  }`}
                >
                  {i.done && <Icon name="check" size={12} />}
                </span>
                <span className={i.done ? 'line-through' : 'font-medium'}>{i.label}</span>
                {!i.done && <Icon name="arrow" size={15} className="ml-auto text-(--color-ink-soft)" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
