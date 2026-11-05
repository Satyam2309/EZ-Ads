import { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';
import DashboardHero from '../components/dashboard/DashboardHero.jsx';
import { ActivityFeed, PipelineStrip, SetupChecklist, TilesSkeleton } from '../components/dashboard/ActivityFeed.jsx';
import { formatMoney } from '../utils/format.js';

/** Small hook around the read-only dashboard aggregate endpoint. */
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

export default function BrandDashboard() {
  const { user } = useAuth();
  const { data, err } = useOverview();
  if (!user) return null;

  const t = data?.totals || {};
  const loading = data === null && !err;

  const tiles = data ? [
    { key: 'campaigns', label: 'Campaigns', value: t.campaigns ?? 0, hint: `${t.campaignsDraft ?? 0} draft · ${t.campaignsLive ?? 0} live`, icon: 'rocket', to: '/brand/campaigns' },
    { key: 'applications', label: 'Pending applications', value: t.applicationsPending ?? 0, hint: `${t.applicationsTotal ?? 0} total received`, icon: 'users', to: '/brand/campaigns' },
    { key: 'shortlist', label: 'Shortlisted creators', value: t.shortlistedCreators ?? 0, hint: `${t.shortlistLists ?? 0} list${t.shortlistLists === 1 ? '' : 's'}`, icon: 'search', to: '/brand/shortlists' },
    { key: 'spend', label: 'Committed spend', value: formatMoney(data.spend?.total ?? 0), hint: 'Simulated ledger', icon: 'wallet', to: '/payments' }
  ] : [];

  const inbox = (t.unreadMessages ?? 0) + (t.unreadNotifications ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHero
        eyebrow={user.emailVerified ? 'Brand workspace' : 'Email verification pending'}
        title={`Welcome back, ${user.displayName || 'brand'}`}
        subtitle="Everything that is moving right now — campaigns, applications and creator conversations in one place."
        tiles={tiles}
      >
        {loading && <TilesSkeleton />}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" to="/brand/campaigns"><Icon name="rocket" size={16} /> New campaign</Button>
          <Button size="sm" variant="secondary" to="/brand/discovery"><Icon name="search" size={16} /> Find creators</Button>
          <Button size="sm" variant="ghost" to="/chat"><Icon name="message" size={16} /> Chat{inbox > 0 ? ` (${inbox})` : ''}</Button>
          {user.emailVerified
            ? <Badge tone="success">Email verified</Badge>
            : <Badge tone="warning">Check your inbox to verify your email</Badge>}
        </div>
      </DashboardHero>

      {err && (
        <Card className="border-accent-200 bg-accent-50/60 p-4 text-sm">
          Dashboard stats unavailable ({err}). The rest of the workspace still works — try again in a moment.
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed
          items={data?.activity ?? null}
          loading={loading}
          title="Recent activity"
          emptyHint="Applications, invites and agreement updates will appear here."
        />
        <div className="space-y-6">
          <PipelineStrip pipeline={data?.pipeline ?? []} loading={loading} />
          <SetupChecklist items={data?.checklist ?? []} loading={loading} />
        </div>
      </div>
    </div>
  );
}
