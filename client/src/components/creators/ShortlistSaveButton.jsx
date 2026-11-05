import { useEffect, useRef, useState } from 'react';
import api from '../../api/client.js';
import Button from '../ui/Button.jsx';

/**
 * "Save to shortlist" — fetches the brand's shortlists on first open, lets the
 * creator be added to any list (or a brand-new one). Duplicate adds surface the
 * server's 409 as a plain "already in list" message.
 */
export default function ShortlistSaveButton({ influencerId, disabled }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(null);
  const [err, setErr] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const [newName, setNewName] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    api.get('/shortlists')
      .then((res) => setLists(res.data))
      .catch((e) => setErr(e.message));
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (disabled) return null;

  const add = async (shortlistId) => {
    setErr(''); setDoneMsg('');
    try {
      await api.post(`/shortlists/${shortlistId}/items`, { influencerId });
      setDoneMsg('Saved ✓');
      setTimeout(() => setOpen(false), 700);
    } catch (e) {
      setErr(e.message.includes('already') ? 'Already in this list' : e.message);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setErr(''); setDoneMsg('');
    try {
      const res = await api.post('/shortlists', { name: newName.trim() });
      await add(res.data._id);
      setNewName('');
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="relative" ref={boxRef}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>☆ Save</Button>
      {open && (
        <div className="absolute z-20 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-neutral-500">Save to shortlist</p>
          {lists === null ? (
            <p className="mt-2 text-sm text-neutral-500">Loading…</p>
          ) : lists.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">No shortlists yet — create one:</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
              {lists.map((l) => (
                <li key={l._id}>
                  <button
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-brand-50"
                    onClick={() => add(l._id)}
                  >
                    {l.name} <span className="text-xs text-neutral-400">({l.items?.length || 0})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex gap-1.5">
            <input
              className="h-8 w-full rounded-md border border-neutral-200 px-2 text-sm"
              placeholder="New list name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
            />
            <Button size="sm" onClick={createAndAdd}>Add</Button>
          </div>
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          {doneMsg && <p className="mt-2 text-xs text-emerald-600">{doneMsg}</p>}
        </div>
      )}
    </div>
  );
}
