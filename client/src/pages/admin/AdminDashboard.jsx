import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

const money = (n, c = 'INR') =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

const TABS = [
  ['overview', 'Overview'],
  ['users', 'Users'],
  ['reports', 'Reports'],
  ['transactions', 'Transactions'],
  ['audit', 'Audit log']
];

const STATUS_TONES = {
  active: 'success', suspended: 'danger', deleted: 'danger',
  open: 'warning', reviewing: 'brand',
  resolved_no_action: 'neutral', resolved_action_taken: 'success', dismissed: 'neutral',
  pending: 'neutral', accepted: 'success', rejected: 'neutral', withdrawn: 'neutral', declined: 'neutral',
  draft: 'neutral', published: 'brand', paused: 'warning', archived: 'neutral', completed: 'neutral',
  active_agreement: 'success', delivered: 'brand', payout_pending: 'warning', paid: 'success',
  simulated_completed: 'neutral'
};

function StatusBadge({ value }) {
  return <Badge tone={STATUS_TONES[value] || 'neutral'}>{value || '—'}</Badge>;
}

/* ---------------- Overview ---------------- */

function Overview() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>;
  if (!stats) return <p className="mt-6 text-sm text-neutral-500">Loading stats…</p>;

  const cards = [
    ['Users', stats.users?.total ?? 0, `${Object.entries(stats.users?.byRole || {}).map(([k, v]) => `${v} ${k}`).join(' · ')}`],
    ['Campaigns', stats.campaigns?.total ?? 0, `${Object.entries(stats.campaigns?.byStatus || {}).map(([k, v]) => `${v} ${k}`).join(' · ') || 'none'}`],
    ['Open reports', (stats.reports?.byStatus?.open || 0) + (stats.reports?.byStatus?.reviewing || 0), `${stats.reports?.byStatus?.resolved_action_taken || 0} resolved with action`],
    ['Simulated volume', money(stats.simulatedLedger?.totalSimulatedVolume ?? 0), `${stats.simulatedLedger?.byType?.campaign_payment?.count || 0} paid agreements`]
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, sub]) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-neutral-500">{sub}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Chat</p>
          <p className="mt-1 text-lg font-semibold">{stats.chat?.conversations ?? 0} conversations</p>
          <p className="text-xs text-neutral-500">{stats.chat?.messages ?? 0} messages exchanged</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Moderation</p>
          <p className="mt-1 text-lg font-semibold">
            {Object.entries(stats.reports?.byStatus || {}).map(([k, v]) => `${v} ${k}`).join(' · ') || 'No reports yet'}
          </p>
          <p className="text-xs text-neutral-500">Suspend / reinstate users in the Users tab</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Simulated ledger</p>
          {Object.entries(stats.simulatedLedger?.byType || {}).map(([type, r]) => (
            <p key={type} className="mt-1 text-xs text-neutral-600">{type}: {money(r.amount)} ({r.count})</p>
          ))}
        </Card>
      </div>
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        ⚠ All money figures above are SIMULATED — no real provider is connected and no real money moves.
      </p>
    </div>
  );
}

/* ---------------- Users ---------------- */

function Users() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    api.get(`/admin/users?${params}`).then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, [role, status, q]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(u, next) {
    setErr(''); setNote('');
    setBusyId(u._id);
    try {
      await api.patch(`/admin/users/${u._id}/status`, { status: next });
      setNote(`${u.displayName || u.email} is now ${next}.`);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); }} placeholder="Search name, email, @username…"
          className="w-72 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All roles</option>
          <option value="influencer">Influencers</option>
          <option value="brand">Brands</option>
          <option value="admin">Admins (read-only)</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {note && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{note}</p>}
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {data === null ? <p className="mt-4 text-sm text-neutral-500">Loading…</p> : data.items.length === 0 ? (
        <Card className="mt-4 p-8 text-center text-sm text-neutral-500">No users match those filters.</Card>
      ) : (
        <Card className="mt-4 overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u._id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.displayName || '—'}</div>
                    <div className="text-xs text-neutral-500">{u.email || `@${u.instagram?.username || '—'}`}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={u.role} /></td>
                  <td className="px-4 py-3"><StatusBadge value={u.status} /></td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' && (
                      u.status === 'active' ? (
                        <Button variant="secondary" size="sm" disabled={busyId === u._id} onClick={() => changeStatus(u, 'suspended')}>
                          {busyId === u._id ? '…' : 'Suspend'}
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled={busyId === u._id} onClick={() => changeStatus(u, 'active')}>
                          {busyId === u._id ? '…' : 'Reinstate'}
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {data?.pages > 1 && <p className="mt-2 text-xs text-neutral-400">Page {data.page} of {data.pages} · {data.total} users</p>}
    </div>
  );
}

/* ---------------- Reports ---------------- */

function Reports() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/reports').then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function transition(r, status) {
    setErr('');
    let resolutionNote;
    const closing = ['resolved_no_action', 'resolved_action_taken', 'dismissed'].includes(status);
    if (closing) {
      resolutionNote = prompt(`Resolution note for "${r.reason}" report (${status}) — required:`);
      if (!resolutionNote || !resolutionNote.trim()) return;
    }
    setBusyId(r._id);
    try {
      await api.patch(`/admin/reports/${r._id}`, { status, ...(resolutionNote ? { resolutionNote } : {}) });
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {data === null ? <p className="mt-2 text-sm text-neutral-500">Loading…</p> : data.items.length === 0 ? (
        <Card className="mt-2 p-8 text-center text-sm text-neutral-500">No reports yet — the platform gets along peacefully.</Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((r) => {
            const open = ['open', 'reviewing'].includes(r.status);
            return (
              <Card key={r._id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={r.status} />
                      <StatusBadge value={r.reason} />
                    </div>
                    <p className="mt-2 text-sm font-medium">Reported {r.subject?.kind === 'campaign' ? `campaign “${r.subject?.title}”` : r.subject?.kind === 'influencer_profile' ? `creator “${r.subject?.displayName}”` : r.subject?.kind === 'user' ? `user “${r.subject?.displayName}” (${r.subject?.role})` : '—'}</p>
                    <p className="text-xs text-neutral-500">
                      By {r.reporter?.displayName || r.reporter?.email || 'anonymous'} · {new Date(r.createdAt).toLocaleString()}
                      {r.details ? ` · “${r.details}”` : ''}
                    </p>
                    {r.resolutionNote && <p className="mt-1 text-xs text-neutral-600">Resolution: {r.resolutionNote}</p>}
                  </div>
                  {open && (
                    <div className="flex gap-2">
                      {r.status === 'open' && (
                        <Button variant="secondary" size="sm" disabled={busyId === r._id} onClick={() => transition(r, 'reviewing')}>Start review</Button>
                      )}
                      <Button variant="secondary" size="sm" disabled={busyId === r._id} onClick={() => transition(r, 'resolved_action_taken')}>Action taken</Button>
                      <Button variant="secondary" size="sm" disabled={busyId === r._id} onClick={() => transition(r, 'resolved_no_action')}>No action</Button>
                      <Button variant="secondary" size="sm" disabled={busyId === r._id} onClick={() => transition(r, 'dismissed')}>Dismiss</Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Transactions ---------------- */

function Transactions() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get('/admin/transactions').then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">⚠ SIMULATED — no real money moved.</p>
        <p className="mt-1">These ledger rows are clearly-labeled simulation records of future real payments.</p>
      </div>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {data === null ? <p className="mt-4 text-sm text-neutral-500">Loading…</p> : data.items.length === 0 ? (
        <Card className="mt-4 p-8 text-center text-sm text-neutral-500">No transactions recorded yet.</Card>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Parties</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t._id} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-medium">{t.type}</td>
                  <td className="px-4 py-3">{t.campaign?.title || '—'}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {t.brand?.displayName || t.brand?.email || '—'} → {t.influencer?.displayName || '@' + t.influencer?.instagram?.username || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(t.amount, t.currency)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Audit log ---------------- */

function AuditLogTable() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [action, setAction] = useState('');
  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    api.get(`/admin/audit-logs?${params}`).then((r) => setData(r.data)).catch((e) => setErr(e.message));
  }, [action]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All actions</option>
          <option value="admin.">Admin actions</option>
          <option value="auth.">Auth events</option>
        </select>
        <span className="text-xs text-neutral-400">Append-only — nothing here can be edited or deleted.</span>
      </div>
      {err && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {data === null ? <p className="mt-4 text-sm text-neutral-500">Loading…</p> : data.items.length === 0 ? (
        <Card className="mt-4 p-8 text-center text-sm text-neutral-500">No audit entries match.</Card>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Meta</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a._id} className="border-t border-neutral-100 align-top">
                  <td className="px-4 py-3 text-xs text-neutral-500">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-3 text-xs">{a.actor?.displayName || a.actor?.email || 'system'} <span className="text-neutral-400">({a.actor?.role || '—'})</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{a.meta ? JSON.stringify(a.meta) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Operations console — users, moderation, ledger and audit trail.</p>
        </div>
        <nav className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === key ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:text-neutral-900'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'reports' && <Reports />}
      {tab === 'transactions' && <Transactions />}
      {tab === 'audit' && <AuditLogTable />}
    </div>
  );
}
