import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { formatMoney } from '../../utils/format.js';

const STATUS_TONES = {
  draft: 'neutral', published: 'success', paused: 'warning',
  archived: 'neutral', completed: 'brand'
};
const NEXT_ACTIONS = {
  draft: [{ to: 'published', label: 'Publish' }],
  published: [{ to: 'paused', label: 'Pause' }, { to: 'completed', label: 'Mark completed' }, { to: 'archived', label: 'Archive' }],
  paused: [{ to: 'published', label: 'Resume' }, { to: 'archived', label: 'Archive' }],
  archived: [], completed: []
};
const APP_TONES = { pending: 'warning', accepted: 'success', rejected: 'danger', withdrawn: 'neutral' };
const INV_TONES = { pending: 'warning', accepted: 'success', declined: 'danger', revoked: 'neutral', expired: 'neutral' };
const AGR_TONES = { negotiating: 'warning', active: 'success', delivered: 'brand', payout_pending: 'brand', paid: 'success', cancelled: 'danger' };

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [apps, setApps] = useState(null);
  const [invs, setInvs] = useState(null);
  const [agreements, setAgreements] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ title: '', description: '', budgetTotal: '', applicationDeadline: '', niche: '' });
  const [inviteForm, setInviteForm] = useState({ influencerId: '', message: '' });
  // per-application agreement setup form keyed by application id
  const [agrForm, setAgrForm] = useState({});

  const load = () => Promise.all([
    api.get(`/brand/campaigns/${id}`).then((res) => {
      const c = res.data;
      setCampaign(c);
      setEdit({
        title: c.title, description: c.description,
        budgetTotal: c.budget?.total ?? '', niche: c.niche || '',
        applicationDeadline: c.applicationDeadline ? new Date(c.applicationDeadline).toISOString().slice(0, 10) : ''
      });
    }),
    api.get(`/brand/campaigns/${id}/applications`).then((res) => setApps(res.data)).catch(() => setApps([])),
    api.get(`/brand/campaigns/${id}/invitations`).then((res) => setInvs(res.data)).catch(() => setInvs([])),
    api.get('/brand/agreements').then((res) => setAgreements(res.data.filter((a) => String(a.campaign?._id || a.campaign) === id)))
      .catch(() => setAgreements([]))
  ]);

  useEffect(() => { load().catch((e) => setErr(e.message)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasAgreement = (app) => agreements?.some((a) => String(a.influencer?._id || a.influencer) === String(app.influencer?._id || app.influencer));

  const transition = async (to) => {
    if (to === 'archived' && !confirm('Archive this campaign? It cannot be re-opened.')) return;
    setErr(''); setMsg('');
    try { await api.post(`/brand/campaigns/${id}/transition`, { status: to }); await load(); setMsg('Campaign updated.'); }
    catch (e) { setErr(e.message); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      const body = {
        title: edit.title,
        description: edit.description,
        budget: { total: Number(edit.budgetTotal) }
      };
      if (edit.niche) body.niche = edit.niche;
      if (edit.applicationDeadline) body.applicationDeadline = edit.applicationDeadline;
      await api.patch(`/brand/campaigns/${id}`, body);
      setEditing(false);
      await load(); setMsg('Campaign updated.');
    } catch (e2) { setErr(e2.message); }
  };

  const decide = async (appId, action) => {
    setErr(''); setMsg('');
    try {
      await api.post(`/applications/${appId}/${action}`, action === 'reject' ? {} : {});
      await load();
      setMsg(action === 'accept' ? 'Application accepted — you can now set up the agreement below.' : 'Application rejected.');
    } catch (e) { setErr(e.message); }
  };

  const invite = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await api.post(`/brand/campaigns/${id}/invite`, {
        influencerId: inviteForm.influencerId.trim(),
        message: inviteForm.message || undefined
      });
      setInviteForm({ influencerId: '', message: '' });
      await load(); setMsg('Invitation sent.');
    } catch (e2) { setErr(e2.message); }
  };

  const revoke = async (invId) => {
    setErr(''); setMsg('');
    try { await api.post(`/invitations/${invId}/revoke`); await load(); setMsg('Invitation revoked.'); }
    catch (e) { setErr(e.message); }
  };

  const messageCreator = async (influencerId) => {
    setErr('');
    try {
      const conv = await api.post('/conversations', { campaignId: id, influencerId });
      navigate(`/chat?conv=${conv.data._id}`);
    } catch (e) { setErr(e.message); }
  };

  const startAgreement = async (app) => {
    const f = agrForm[app._id] || {};
    setErr(''); setMsg('');
    try {
      const payload = {
        applicationId: app._id,
        agreedAmount: Number(f.agreedAmount)
      };
      if (f.agreedRatePercent) payload.commissionPercent = Number(f.agreedRatePercent);
      if (f.terms) payload.terms = f.terms;
      if (f.deliverableDeadline) payload.deliverableDeadline = f.deliverableDeadline;
      await api.post('/agreements', payload);
      await load();
      setAgrForm((m) => ({ ...m, [app._id]: undefined }));
      setMsg('Agreement drafted — waiting for the creator to accept.');
    } catch (e2) { setErr(e2.message); }
  };

  const transitionAgreement = async (agreementId, to) => {
    if (to === 'cancelled' && !confirm('Cancel this agreement? This cannot be undone.')) return;
    setErr(''); setMsg('');
    try { await api.post(`/agreements/${agreementId}/transition`, { status: to }); await load(); setMsg('Agreement updated.'); }
    catch (e) { setErr(e.message); }
  };

  if (!campaign && !err) return <p className="p-10 text-center text-sm text-neutral-500">Loading…</p>;
  if (!campaign) return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <p className="text-lg font-semibold">{err || 'Campaign not found'}</p>
      <Button className="mt-4" variant="secondary" to="/brand/campaigns">Back to campaigns</Button>
    </div>
  );

  const setA = (appId, k, v) => setAgrForm((m) => ({ ...m, [appId]: { ...(m[appId] || {}), [k]: v } }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/brand/campaigns" className="text-sm text-brand-600 hover:text-brand-700">← Back to campaigns</Link>

      {/* Header card */}
      <Card className="mt-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{campaign.title}</h1>
              <Badge tone={STATUS_TONES[campaign.status] || 'neutral'}>{campaign.status}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{campaign.description}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-neutral-500">Budget</dt><dd className="font-medium">{formatMoney(campaign.budget?.total)}</dd></div>
              <div><dt className="text-neutral-500">Niche</dt><dd className="font-medium">{campaign.niche || '—'}</dd></div>
              <div>
                <dt className="text-neutral-500">Application deadline</dt>
                <dd className="font-medium">
                  {campaign.applicationDeadline ? new Date(campaign.applicationDeadline).toLocaleDateString() : 'No deadline'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-end gap-2">
            {(NEXT_ACTIONS[campaign.status] || []).map((a) => (
              <Button key={a.to} size="sm" variant={a.to === 'published' ? 'primary' : 'secondary'} onClick={() => transition(a.to)}>
                {a.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setEditing((s) => !s)}>
              {editing ? 'Cancel edit' : 'Edit details'}
            </Button>
          </div>
        </div>
        {editing && (
          <form onSubmit={saveEdit} className="mt-4 grid gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium">Title
              <input required maxLength={120} value={edit.title} onChange={(e) => setEdit((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2 text-sm font-medium">Description
              <textarea required maxLength={4000} rows={3} value={edit.description}
                onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium">Budget (INR)
              <input required type="number" min="0" value={edit.budgetTotal}
                onChange={(e) => setEdit((f) => ({ ...f, budgetTotal: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium">Application deadline
              <input type="date" value={edit.applicationDeadline}
                onChange={(e) => setEdit((f) => ({ ...f, applicationDeadline: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2"><Button type="submit" size="sm">Save changes</Button></div>
          </form>
        )}
      </Card>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      {/* Applications */}
      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Applications ({apps?.length ?? '…'})</h2>
        </div>
        {apps === null ? <p className="mt-2 text-sm text-neutral-500">Loading…</p> : apps.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No applications yet. Publish the campaign so creators can find it under “Explore campaigns”.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {apps.map((a) => (
              <li key={a._id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.influencer?.displayName || 'Creator'}</span>
                      <Badge tone={APP_TONES[a.status] || 'neutral'}>{a.status}</Badge>
                      {campaign.status === 'published' && <span className="text-xs text-neutral-400">campaign open</span>}
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">Asking {formatMoney(a.proposedRate, a.currency)}</p>
                    {a.message && <p className="mt-1 line-clamp-3 text-sm text-neutral-600">“{a.message}”</p>}
                    {a.deliverableLinks?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {a.deliverableLinks.map((l, i) => (
                          <a key={i} href={l} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">#link{i + 1}</a>
                        ))}
                      </div>
                    )}
                    {a.decisionNote && <p className="mt-1 text-xs text-neutral-500">Note: {a.decisionNote}</p>}
                  </div>
                  {a.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(a._id, 'accept')}>Accept</Button>
                      <Button size="sm" variant="secondary" onClick={() => decide(a._id, 'reject')}>Reject</Button>
                    </div>
                  )}
                  {a.status !== 'pending' && a.influencer && (
                    <Button size="sm" variant="ghost" onClick={() => messageCreator(a.influencer._id || a.influencer)}>💬 Message</Button>
                  )}
                </div>
                {a.status === 'accepted' && (
                  hasAgreement(a) ? (
                    <p className="mt-2 text-xs text-emerald-700">
                      Agreement created — see the “Agreements” section below.
                    </p>
                  ) : (
                    <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                      <p className="text-sm font-medium">Set up the agreement</p>
                      <form onSubmit={(e) => { e.preventDefault(); startAgreement(a); }}
                        className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium">Agreed amount (INR) *
                          <input required type="number" min="0"
                            value={agrForm[a._id]?.agreedAmount ?? ''}
                            onChange={(e) => setA(a._id, 'agreedAmount', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm font-medium">Deliverable deadline
                          <input type="date" value={agrForm[a._id]?.deliverableDeadline ?? ''}
                            onChange={(e) => setA(a._id, 'deliverableDeadline', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                        </label>
                        <label className="sm:col-span-2 text-sm font-medium">Terms
                          <textarea rows={2} maxLength={4000} placeholder="Deliverables, usage rights, exclusivity…"
                            value={agrForm[a._id]?.terms ?? ''}
                            onChange={(e) => setA(a._id, 'terms', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                        </label>
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <Button size="sm" type="submit">Create agreement draft</Button>
                          <span className="text-xs text-neutral-500">Platform commission is applied automatically (10%) and shown to both parties.</span>
                        </div>
                      </form>
                    </div>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Invitations */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Invitations ({invs?.length ?? '…'})</h2>
        <form onSubmit={invite} className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input required placeholder="Creator user id" value={inviteForm.influencerId}
            onChange={(e) => setInviteForm((f) => ({ ...f, influencerId: e.target.value }))}
            className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" />
          <input placeholder="Message (optional)" value={inviteForm.message}
            onChange={(e) => setInviteForm((f) => ({ ...f, message: e.target.value }))}
            className="h-9 rounded-lg border border-neutral-200 px-3 text-sm" />
          <Button size="sm" type="submit">Invite</Button>
        </form>
        <p className="mt-1 text-xs text-neutral-500">
          Tip: you’ll find creator ids on discover cards via “Save to shortlist”, or paste one from a shortlist —
          they can accept or decline from their inbox.
        </p>

        {invs === null ? <p className="mt-3 text-sm text-neutral-500">Loading…</p> : invs.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No invitations sent for this campaign yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {invs.map((iv) => (
              <li key={iv._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{iv.influencer?.displayName || iv.influencer?.username || 'Creator'}</span>
                    <Badge tone={INV_TONES[iv.status] || 'neutral'}>{iv.status}</Badge>
                  </div>
                  {iv.message && <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{iv.message}</p>}
                </div>
                {iv.status === 'pending' && (
                  <Button size="sm" variant="secondary" onClick={() => revoke(iv._id)}>Revoke</Button>
                )}
                {iv.status === 'accepted' && !hasAgreement({ influencer: { _id: iv.influencer?._id || iv.influencer } }) && (
                  <Link className="text-xs text-brand-600 hover:underline" to={`/brand/campaigns/${id}`}>Set up agreement from the application list</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Agreements */}
      <Card className="mt-6 p-6">
        <h2 className="font-semibold">Agreements ({agreements?.length ?? '…'})</h2>
        {agreements === null ? <p className="mt-2 text-sm text-neutral-500">Loading…</p> : agreements.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No agreements yet — accept an application or invitation, then draft the commercial terms.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {agreements.map((a) => (
              <li key={a._id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{a.influencer?.displayName || 'Creator'}</span>
                      <Badge tone={AGR_TONES[a.status] || 'neutral'}>{a.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Agreed {formatMoney(a.agreedAmount, a.currency)} · commission {formatMoney(a.commissionAmount, a.currency)} ({a.commissionPercent}%) · creator payout {formatMoney(a.influencerPayout, a.currency)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status === 'negotiating' && <span className="text-xs text-neutral-500 self-center">Waiting for creator to accept</span>}
                    {a.status === 'active' && <Button size="sm" variant="secondary" onClick={() => transitionAgreement(a._id, 'delivered')}>Mark delivered</Button>}
                    {a.status === 'delivered' && <Button size="sm" variant="secondary" onClick={() => transitionAgreement(a._id, 'payout_pending')}>Request payout</Button>}
                    {a.status === 'payout_pending' && <Button size="sm" onClick={() => transitionAgreement(a._id, 'paid')}>Mark paid</Button>}
                    {a.status === 'active' && <Button size="sm" variant="ghost" onClick={() => transitionAgreement(a._id, 'cancelled')}>Cancel</Button>}
                    {a.status === 'paid' && <span className="text-xs text-emerald-700 self-center">Paid ✓</span>}
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
