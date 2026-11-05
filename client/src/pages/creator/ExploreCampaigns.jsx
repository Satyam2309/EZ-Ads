import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { formatMoney } from '../../utils/format.js';

const money = (n, c = 'INR') =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function ExploreCampaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [mine, setMine] = useState(null);
  const [niche, setNiche] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  // one open apply form at a time
  const [applyFor, setApplyFor] = useState(null);
  const [applyForm, setApplyForm] = useState({ proposedRate: '', message: '', links: '' });

  const load = () => Promise.all([
    api.get(`/campaigns/open${niche ? `?niche=${encodeURIComponent(niche)}` : ''}`).then((res) => setCampaigns(res.data.items)),
    api.get('/influencer/applications').then((res) => setMine(res.data)).catch(() => setMine([]))
  ]);

  useEffect(() => { load().catch((e) => setErr(e.message)); }, [niche]); // eslint-disable-line react-hooks/exhaustive-deps

  const appliedTo = (c) => mine?.find((a) => String(a.campaign?._id || a.campaign) === c._id);

  const apply = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      const body = { proposedRate: Number(applyForm.proposedRate) };
      if (applyForm.message) body.message = applyForm.message;
      const links = applyForm.links.split(',').map((s) => s.trim()).filter(Boolean);
      if (links.length) body.deliverableLinks = links;
      await api.post(`/campaigns/${applyFor._id}/apply`, body);
      setApplyFor(null); setApplyForm({ proposedRate: '', message: '', links: '' });
      await load();
      setMsg(`Application sent to “${applyFor && applyFor.title}”.`);
    } catch (e2) { setErr(e2.message); }
  };

  const withdraw = async (appId) => {
    if (!confirm('Withdraw this application? You can re-apply while the campaign is open.')) return;
    setErr(''); setMsg('');
    try { await api.post(`/applications/${appId}/withdraw`); await load(); setMsg('Application withdrawn.'); }
    catch (e) { setErr(e.message); }
  };

  const APP_TONES = { pending: 'warning', accepted: 'success', rejected: 'danger', withdrawn: 'neutral' };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Explore campaigns</h1>
          <p className="mt-1 text-sm text-neutral-500">Published campaigns that are accepting applications right now.</p>
        </div>
        <input
          value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Filter by niche…"
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm"
        />
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      {/* Grid */}
      {campaigns === null ? <p className="mt-6 text-sm text-neutral-500">Loading…</p> : campaigns.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="font-semibold">No open campaigns{niche ? ` for “${niche}”` : ''}</p>
          <p className="mt-1 text-sm text-neutral-500">Check back soon, or clear the niche filter.</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const existing = appliedTo(c);
            const bd = c.applicationDeadline ? new Date(c.applicationDeadline) : null;
            const deadlinePassed = bd && bd < new Date();
            return (
              <Card key={c._id} hover className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  {c.niche && <Badge tone="brand">{c.niche}</Badge>}
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-neutral-500">{c.description}</p>
                <div className="mt-3 space-y-1 text-xs text-neutral-500">
                  <p>Budget: <span className="font-medium text-neutral-700">{money(c.budget?.total, c.budget?.currency)}</span></p>
                  {c.brand?.displayName && <p>By <span className="font-medium text-neutral-700">{c.brand.displayName}</span></p>}
                  <p>Deadline: {bd ? bd.toLocaleDateString() : 'Open'}{deadlinePassed && <span className="text-amber-600"> · passed</span>}</p>
                  {c.deliverables?.length > 0 && (
                    <p>Deliverables: {c.deliverables.map((d) => `${d.quantity}× ${d.format}`).join(', ')}</p>
                  )}
                </div>
                <div className="mt-4">
                  {existing && existing.status !== 'withdrawn' ? (
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={APP_TONES[existing.status] || 'neutral'}>Applied · {existing.status}</Badge>
                      {existing.status === 'pending' && (
                        <Button size="sm" variant="ghost" onClick={() => withdraw(existing._id)}>Withdraw</Button>
                      )}
                    </div>
                  ) : deadlinePassed ? (
                    <Button size="sm" variant="secondary" disabled>Applications closed</Button>
                  ) : (
                    <Button size="sm" onClick={() => { setApplyFor(c); setApplyForm({ proposedRate: '', message: '', links: '' }); setMsg(''); }}>
                      {existing ? 'Re-apply' : 'Apply'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Apply form */}
      {applyFor && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setApplyFor(null)}>
          <Card className="w-full max-w-lg p-6" onClick={undefined}>
            <div onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold">Apply — {applyFor.title}</h2>
              <form onSubmit={apply} className="mt-4 grid gap-4">
                <label className="text-sm font-medium">Your rate (INR) *
                  <input required type="number" min="0" value={applyForm.proposedRate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, proposedRate: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-medium">Message to the brand
                  <textarea rows={3} maxLength={2000} placeholder="Why you’re a fit, your audience, past work…"
                    value={applyForm.message}
                    onChange={(e) => setApplyForm((f) => ({ ...f, message: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                </label>
                <label className="text-sm font-medium">Work links (comma-separated)
                  <input placeholder="https://…, https://…" value={applyForm.links}
                    onChange={(e) => setApplyForm((f) => ({ ...f, links: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                </label>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-500">If accepted, the brand proposes the final amount — you confirm before anything is active.</span>
                  <Button type="submit">Send application</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* My applications */}
      {mine?.length > 0 && (
        <Card className="mt-8 p-6">
          <h2 className="font-semibold">My applications ({mine.length})</h2>
          <ul className="mt-3 divide-y divide-neutral-100">
            {mine.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.campaign?.title || 'Campaign'}</p>
                  <p className="text-xs text-neutral-500">Asked {money(a.proposedRate, a.currency)} · {new Date(a.createdAt).toLocaleDateString()}</p>
                  {a.decisionNote && <p className="text-xs text-neutral-500">Note from brand: {a.decisionNote}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={APP_TONES[a.status] || 'neutral'}>{a.status}</Badge>
                  {a.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => withdraw(a._id)}>Withdraw</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
