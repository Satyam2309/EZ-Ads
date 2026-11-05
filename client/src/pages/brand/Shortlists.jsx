import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { CreatorAvatar } from '../../components/creators/CreatorCard.jsx';

export default function Shortlists() {
  const [lists, setLists] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/shortlists')
    .then((res) => setLists(res.data))
    .catch((e) => setErr(e.message));

  useEffect(() => { load(); }, []);

  const selected = lists?.find((l) => l._id === selectedId) || null;

  const create = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    setErr(''); setMsg('');
    try {
      const res = await api.post('/shortlists', { name: form.get('name') });
      await load();
      setSelectedId(res.data._id);
      e.target.reset();
    } catch (e2) { setErr(e2.message); }
  };

  const rename = async (id, current) => {
    const name = (prompt('Rename shortlist', current) || '').trim();
    if (!name || name === current) return;
    setErr(''); setMsg('');
    try { await api.patch(`/shortlists/${id}`, { name }); await load(); } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this shortlist? Creators in it are not affected globally.')) return;
    setErr(''); setMsg('');
    try { await api.delete(`/shortlists/${id}`); if (selectedId === id) setSelectedId(null); await load(); } catch (e) { setErr(e.message); }
  };

  const removeItem = async (listId, itemId) => {
    setErr(''); setMsg('');
    try { await api.delete(`/shortlists/${listId}/items/${itemId}`); await load(); setMsg('Removed from list'); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My shortlists</h1>
          <p className="mt-1 text-sm text-neutral-500">Group creators you want to invite. Save more from discovery.</p>
        </div>
        <Button variant="secondary" size="sm" to="/brand/discovery">Find creators</Button>
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {msg && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* List rail */}
        <aside className="space-y-4">
          <form onSubmit={create} className="flex gap-2 rounded-xl border border-neutral-200 bg-white p-3">
            <input name="name" required maxLength={80} placeholder="New shortlist name"
              className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm" />
            <Button size="sm">Create</Button>
          </form>
          {lists === null ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : lists.length === 0 ? (
            <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
              No shortlists yet. Create one above, or save creators straight from discovery.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {lists.map((l) => (
                <li key={l._id} className="flex items-center justify-between border-t border-neutral-100 first:border-0">
                  <button onClick={() => setSelectedId(l._id)}
                    className={`min-w-0 flex-1 px-4 py-3 text-left text-sm hover:bg-brand-50 ${selectedId === l._id ? 'bg-brand-50 font-semibold' : ''}`}>
                    <span className="block truncate">{l.name}</span>
                    <span className="text-xs text-neutral-400">{l.items?.length || 0} creator{l.items?.length === 1 ? '' : 's'}</span>
                  </button>
                  <button aria-label={`Delete ${l.name}`} title="Delete list" className="px-3 text-neutral-300 hover:text-red-600"
                    onClick={() => remove(l._id)}>🗑</button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Detail */}
        {selected && (
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-neutral-500">
                  {selected.items?.length || 0} creators
                  {selected.items?.length ? ' · click a card to open the full profile' : ''}
                </p>
              </div>
              <Badge tone="brand">Private to you</Badge>
            </div>

            {selected.items?.length ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {selected.items.map((item) => {
                  const infl = item.influencer; // ref populated server-side
                  if (!infl || typeof infl !== 'object') return null;
                  return (
                    <div key={item._id} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4">
                      <CreatorAvatar creator={{ displayName: infl.displayName, user: infl }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{infl.displayName}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.note || 'Added from discovery'}</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="secondary" to={`/brand/creators/${infl._id}`}>Profile</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeItem(selected._id, item._id)}>Remove</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">This list is empty. Use “☆ Save” on any creator in discovery.</p>
            )}

            <div className="mt-5 border-t border-neutral-100 pt-4 text-right">
              <Button size="sm" variant="ghost" onClick={() => rename(selected._id, selected.name)}>Rename list</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
