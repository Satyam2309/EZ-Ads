import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

const TYPE_LABELS = {
  invitation_received: 'Invitation',
  invitation_accepted: 'Invitation',
  invitation_declined: 'Invitation',
  application_received: 'Application',
  application_accepted: 'Application',
  application_rejected: 'Application',
  campaign_agreed: 'Agreement',
  message_received: 'Message',
  campaign_status_changed: 'Campaign',
  payout_recorded: 'Payout'
};
const TYPE_TONES = {
  invitation_received: 'brand', application_received: 'brand', campaign_agreed: 'success',
  application_accepted: 'success', invitation_accepted: 'success', payout_recorded: 'success',
  application_rejected: 'danger', invitation_declined: 'neutral', message_received: 'neutral', campaign_status_changed: 'neutral'
};

export default function Notifications() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api.get(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`)
    .then((res) => setData(res.data))
    .catch((e) => setErr(e.message));

  useEffect(() => { load(); }, [unreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAll = async () => {
    setErr('');
    try { await api.post('/notifications/read', {}); await load(); } catch (e) { setErr(e.message); }
  };

  const linkFor = (n) => {
    if (n.type === 'message_received' && n.refs?.conversation) return `/chat?conv=${n.refs.conversation}`;
    if (['invitation_received', 'invitation_accepted', 'invitation_declined'].includes(n.type)) {
      return n.refs?.campaign ? '/influencer/inbox' : null;
    }
    if (['application_received', 'application_accepted', 'application_rejected', 'campaign_agreed'].includes(n.type)) {
      return n.refs?.campaign ? (user?.role === 'brand' ? '/brand/campaigns' : '/influencer/inbox') : null;
    }
    if (n.type === 'payout_recorded') return '/payments';
    return null;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">Everything that happened to your campaigns, invitations and agreements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setUnreadOnly((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-sm ${unreadOnly ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-200 bg-white text-neutral-600'}`}>
            Unread only
          </button>
          <Button size="sm" variant="secondary" onClick={markAll}>Mark all read</Button>
        </div>
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      {data === null ? <p className="mt-6 text-sm text-neutral-500">Loading…</p> : data.items.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="font-semibold">{unreadOnly ? 'Nothing unread — you’re all caught up' : 'No notifications yet'}</p>
          <p className="mt-1 text-sm text-neutral-500">Activity appears here as campaigns, chats and agreements move.</p>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.items.map((n) => {
            const to = linkFor(n);
            const content = (
              <Card hover={!to} className={`flex items-start gap-3 p-4 ${!n.readAt ? 'border-brand-200' : ''}`}>
                <Badge tone={TYPE_TONES[n.type] || 'neutral'}>{TYPE_LABELS[n.type] || n.type}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-neutral-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              </Card>
            );
            return <li key={n._id}>{to ? <Link to={to} className="block">{content}</Link> : content}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
