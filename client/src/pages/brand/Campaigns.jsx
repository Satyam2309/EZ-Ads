import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
const DELIVERABLE_LABELS = { post: 'Post', reel: 'Reel', story: 'Story', video: 'Video', custom: 'Custom' };

const EMPTY = {
  title: '', description: '', productInfo: '', niche: '',
  budgetTotal: '', applicationDeadline: '', startDate: '', endDate: ''
};

export default function Campaigns() {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => api.get(`/brand/campaigns${status ? `?status=${status}` : ''}`)
    .then((res) => setItems(res.data.items))
    .catch((e) => setErr(e.message));

  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    setCreating(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        niche: form.niche || undefined
      };
      if (form.productInfo) body.productInfo = form.productInfo;
      if (form.budgetTotal) body.budget = { total: Number(form.budgetTotal) };
      for (const k of ['applicationDeadline', 'startDate', 'endDate']) {
        if (form[k]) body[k] = form[k];
      }
      await api.post('/brand/campaigns', body);
      setForm(EMPTY); setShowForm(false); setMsg('Campaign created as a draft. Set a budget, then publish.');
      await load();
    } catch (e2) { setErr(e2.message); } finally { setCreating(false); }
  };

  const transition = async (id, to) => {
    if (to === 'archived' && !confirm('Archive this campaign? It cannot be re-opened.')) return;
    setErr(''); setMsg('');
    try { await api.post(`/brand/campaigns/${id}/transition`, { status: to }); await load(); setMsg('Campaign updated.'); }
    catch (e) { setErr(e.message); }
  };

  const dateLabel = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const deadlinePassed = (c) => c.applicationDeadline && new Date(c.applicationDeadline) < new Date();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My campaigns</h1>
          <p className="mt-1 text-sm text-neutral-500">Create campaigns, publish them for creators to apply, and manage partnerships.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Cancel' : '+ New campaign'}
        </Button>
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      {showForm && (
        <Card className="mt-6 p-6">
          <h2 className="font-semibold">New campaign</h2>
          <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium">
              Title *
              <input required maxLength={120} value={form.title} onChange={set('title')}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="sm:col-span-2 text-sm font-medium">
              Description *
              <textarea required maxLength={4000} rows={4} value={form.description} onChange={set('description')}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium">
              Niche
              <input maxLength={60} placeholder="e.g. fitness, fashion" value={form.niche} onChange={set('niche')}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium">
              Budget (INR) *
              <input type="number" min="0" required value={form.budgetTotal} onChange={set('budgetTotal')}
                placeholder="Total budget, e.g. 50000"
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium">
              Application deadline
              <input type="date" value={form.applicationDeadline} onChange={set('applicationDeadline')}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium">
              Product info
              <input maxLength={2000} value={form.productInfo} onChange={set('productInfo')}
                className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create draft campaign'}</Button>
              <p className="mt-2 text-xs text-neutral-500">Budget and dates can also be edited later on the campaign page.</p>
            </div>
          </form>
        </Card>
      )}

      {/* Status filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {['', 'draft', 'published', 'paused', 'completed', 'archived'].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1.5 text-sm ${status === s ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-300'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      {items === null ? (
        <p className="mt-6 text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="font-semibold">No campaigns yet</p>
          <p className="mt-1 text-sm text-neutral-500">Create one above — it stays a draft until you publish it.</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {items.map((c) => (
            <Card key={c._id} hover className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/brand/campaigns/${c._id}`} className="text-lg font-semibold hover:text-brand-700">{c.title}</Link>
                    <Badge tone={STATUS_TONES[c.status] || 'neutral'}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                    {c.niche && <span>Niche: {c.niche}</span>}
                    <span>Budget: {formatMoney(c.budget?.total)}</span>
                    <span>Applications: {c.stats?.applicationsCount ?? 0}</span>
                    <span>Invitations: {c.stats?.invitationsCount ?? 0}</span>
                    <span>Deadline: {dateLabel(c.applicationDeadline)}</span>
                    {c.status === 'draft' && !c.budget?.total && <span className="text-amber-600">Needs a budget before publishing</span>}
                    {deadlinePassed(c) && c.status === 'published' && <span className="text-amber-600">Deadline has passed</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(NEXT_ACTIONS[c.status] || []).map((a) => (
                    <Button key={a.to} size="sm" variant={a.to === 'published' ? 'primary' : 'secondary'}
                      onClick={() => transition(c._id, a.to)}>
                      {a.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" to={`/brand/campaigns/${c._id}`}>Open →</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
