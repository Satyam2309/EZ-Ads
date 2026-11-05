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

export default function InfluencerDashboard() {
  const { user } = useAuth();
  const { data, err } = useOverview();
  if (!user) return null;

  const ig = user.instagram || {};
  const t = data?.totals || {};
  const loading = data === null && !err;

  const tiles = data ? [
    { key: 'invites', label: 'Pending invitations', value: t.invitationsPending ?? 0, hint: `${t.invitationsTotal ?? 0} received in total`, icon: 'message', to: '/influencer/inbox' },
    { key: 'apps', label: 'Open applications', value: t.applicationsPending ?? 0, hint: `${t.applicationsAccepted ?? 0} accepted`, icon: 'search', to: '/influencer/explore' },
    { key: 'agreements', label: 'Active deals', value: t.agreementsActive ?? 0, hint: `${t.agreementsAwaitingYou ?? 0} awaiting your reply`, icon: 'chart', to: '/influencer/inbox' },
    { key: 'earnings', label: 'Paid out', value: formatMoney(data.earnings?.total ?? 0), hint: 'Simulated ledger', icon: 'wallet', to: '/payments' }
  ] : [];

  const inbox = (t.unreadMessages ?? 0) + (t.unreadNotifications ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHero
        eyebrow={`Creator profile ${t.profileCompleteness ?? 0}% complete`}
        title={`Hi ${user.displayName || 'creator'}`}
        subtitle="Your Instagram connection, campaign invitations and payouts — all in one place."
        tiles={tiles}
      >
        {loading && <TilesSkeleton />}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" to="/influencer/explore"><Icon name="search" size={16} /> Explore campaigns</Button>
          <Button size="sm" variant="secondary" to="/influencer/inbox"><Icon name="message" size={16} /> My inbox</Button>
          <Button size="sm" variant="ghost" to="/chat"><Icon name="message" size={16} /> Chat{inbox > 0 ? ` (${inbox})` : ''}</Button>
        </div>
      </DashboardHero>

      {err && (
        <Card className="border-accent-200 bg-accent-50/60 p-4 text-sm">
          Dashboard stats unavailable ({err}). The rest of the workspace still works — try again in a moment.
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon name="instagram" gradient size={18} /> Instagram connection
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ig.connected
                ? <Badge tone="success">Connected via OAuth{ig.isMock ? ' — MOCK (development only)' : ''}</Badge>
                : <Badge tone="warning">Not connected</Badge>}
              {ig.reauthRequired && <Badge tone="danger">Reauthorization required</Badge>}
              {data && <Badge tone={t.profileCompleteness === 100 ? 'success' : 'brand'}>{t.profileCompleteness}% profile complete</Badge>}
            </div>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-(--color-ink-soft)">Username</dt><dd className="font-medium">{ig.username || '—'}</dd></div>
              <div><dt className="text-(--color-ink-soft)">Account type</dt><dd className="font-medium">{ig.accountType || '—'}</dd></div>
              <div>
                <dt className="text-(--color-ink-soft)">Data source</dt>
                <dd className="font-medium">
                  {ig.isMock ? 'Simulated (dev mode — not real Instagram data)' : ig.connected ? "Meta's Instagram API" : '—'}
                </dd>
              </div>
            </dl>
          </Card>
          <PipelineStrip
            pipeline={data?.pipeline ?? []}
            loading={loading}
            caption="accepted invitations and applications become deals and move through here."
          />
        </div>

        <div className="space-y-6">
          <ActivityFeed
            items={data?.activity ?? null}
            loading={loading}
            title="Recent activity"
            emptyHint="Invitations, application decisions and payout updates will appear here."
          />
          <SetupChecklist items={data?.checklist ?? []} loading={loading} />
        </div>
      </div>
    </div>
  );
}
