import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

const INV_TONES = { pending: 'warning', accepted: 'success', declined: 'danger', revoked: 'neutral', expired: 'neutral' };
const AGR_TONES = { negotiating: 'warning', active: 'success', delivered: 'brand', payout_pending: 'brand', paid: 'success', cancelled: 'danger' };

const money = (n, c = 'INR') =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function Inbox() {
  const [invs, setInvs] = useState(null);
  const [agreements, setAgreements] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => Promise.all([
    api.get('/influencer/invitations').then((res) => setInvs(res.data)).catch(() => setInvs([])),
    api.get('/influencer/agreements').then((res) => setAgreements(res.data)).catch(() => setAgreements([]))
  ]);

  useEffect(() => { load().catch((e) => setErr(e.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const respondInvitation = async (id, accept) => {
    setErr(''); setMsg('');
    try {
      await api.post(`/invitations/${id}/respond`, { accept, decisionNote: accept ? undefined : 'Declined from inbox' });
      await load();
      setMsg(accept ? 'Invitation accepted — the brand will draft the agreement next.' : 'Invitation declined. Thanks for the response.');
    } catch (e) { setErr(e.message); }
  };

  const openChat = async (campaignId) => {
    setErr('');
    try {
      const conv = await api.post('/conversations', { campaignId });
      window.location.assign(`/chat?conv=${conv.data._id}`);
    } catch (e) { setErr(e.message); }
  };

  const respondAgreement = async (id, accept) => {
    setErr(''); setMsg('');
    try {
      await api.post(`/agreements/${id}/respond`, { accept });
      await load();
      setMsg(accept ? 'Agreement accepted — it is now active. Deliver by the agreed deadline.' : 'Agreement declined — the brand may propose new terms.');
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My inbox</h1>
        <p className="mt-1 text-sm text-neutral-500">Campaign invitations from brands and agreement offers awaiting your confirmation.</p>
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      {/* Invitations */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Invitations ({invs?.length ?? '…'})</h2>
        {invs === null ? <p className="mt-2 text-sm text-neutral-500">Loading…</p> : invs.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No invitations yet. Keep your profile up to date — brands browse discovery to find you.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {invs.map((iv) => (
              <li key={iv._id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{iv.campaign?.title || 'Campaign'}</span>
                      <Badge tone={INV_TONES[iv.status] || 'neutral'}>{iv.status}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{iv.campaign?.description}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {iv.campaign?.niche ? `Niche: ${iv.campaign.niche} · ` : ''}
                      Budget: {money(iv.campaign?.budget?.total, iv.campaign?.budget?.currency)}
                      {iv.proposedRate != null ? ` · proposed to you: ${money(iv.proposedRate)}` : ''}
                    </p>
                    {iv.message && <p className="mt-1 text-sm text-neutral-700">“{iv.message}”</p>}
                  </div>
                  {iv.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondInvitation(iv._id, true)}>Accept</Button>
                      <Button size="sm" variant="secondary" onClick={() => respondInvitation(iv._id, false)}>Decline</Button>
                    </div>
                  )}
                  {iv.status === 'accepted' && (
                    <Button size="sm" variant="ghost" onClick={() => openChat(iv.campaign?._id || iv.campaign)}>💬 Message brand</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Agreements */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Agreements ({agreements?.length ?? '…'})</h2>
        {agreements === null ? <p className="mt-2 text-sm text-neutral-500">Loading…</p> : agreements.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No agreements yet. Terms appear here once a brand drafts them after accepting you.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {agreements.map((a) => (
              <li key={a._id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.campaign?.title || 'Campaign'}</span>
                      <Badge tone={AGR_TONES[a.status] || 'neutral'}>{a.status}</Badge>
                    </div>
                    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                      <div><dt className="text-xs text-neutral-500">You receive</dt><dd className="font-semibold text-emerald-700">{money(a.influencerPayout, a.currency)}</dd></div>
                      <div><dt className="text-xs text-neutral-500">Agreed amount</dt><dd>{money(a.agreedAmount, a.currency)}</dd></div>
                      <div><dt className="text-xs text-neutral-500">Platform commission</dt><dd>{money(a.commissionAmount, a.currency)} ({a.commissionPercent}%)</dd></div>
                    </dl>
                    {a.terms && <p className="mt-2 whitespace-pre-line rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">{a.terms}</p>}
                    <p className="mt-1 text-xs text-neutral-500">
                      Deliver by: {a.deliverableDeadline ? new Date(a.deliverableDeadline).toLocaleDateString() : 'No deadline set'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {a.status === 'negotiating' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respondAgreement(a._id, true)}>Accept terms</Button>
                        <Button size="sm" variant="secondary" onClick={() => respondAgreement(a._id, false)}>Decline</Button>
                      </div>
                    )}
                    {a.status === 'active' && (
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone="success">In progress — deliver by {a.deliverableDeadline ? new Date(a.deliverableDeadline).toLocaleDateString() : 'deadline'}</Badge>
                        <Link className="text-xs text-brand-600 hover:underline" to="/chat">💬 Chat about delivery →</Link>
                      </div>
                    )}
                    {a.status === 'delivered' && <span className="text-xs text-neutral-500">Delivered — awaiting payout</span>}
                    {a.status === 'payout_pending' && <span className="text-xs text-amber-600">Payout pending</span>}
                    {a.status === 'paid' && <span className="text-xs text-emerald-700">Payout complete ✓</span>}
                    {a.status === 'cancelled' && <span className="text-xs text-neutral-500">Cancelled</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
