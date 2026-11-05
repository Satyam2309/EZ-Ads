import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

const selfSent = (x) => x.self || String(x._id).startsWith('tmp-');

export default function Chat() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [convs, setConvs] = useState(null);
  const [messages, setMessages] = useState(null);
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState('');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const activeId = params.get('conv');

  const loadConvs = useCallback(() => api.get('/conversations')
    .then((res) => {
      setConvs(res.data.items);
      // no conversation selected yet → best one (most recent)
      if (!activeId && res.data.items.length) {
        const first = res.data.items[0];
        setParams((p) => { p.set('conv', String(first._id)); return p; }, { replace: true });
      }
    }).catch((e) => setErr(e.message)), [activeId, setParams]);

  useEffect(() => { loadConvs(); return () => {}; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // one socket for the whole page
  useEffect(() => {
    const socket = io('/', { withCredentials: true, transports: ['websocket'] });
    socketRef.current = socket;
    return () => { socket.close(); socketRef.current = null; };
  }, []);

  // select a conversation → REST history + socket room + read receipts
  useEffect(() => {
    if (!activeId || !socketRef.current) return;
    let alive = true;
    setMessages(null);
    api.get(`/conversations/${activeId}/messages`)
      .then((res) => alive && setMessages(res.data))
      .catch((e) => alive && setErr(e.message));

    const socket = socketRef.current;
    if (socket.connected) join(); else socket.once('connect', join);
    function join() {
      socket.emit('conversation:join', { conversationId: activeId }, (ack) => {
        if (ack && !ack.ok && alive) setErr(ack.error || 'Could not open this conversation');
      });
      socket.emit('conversation:read', { conversationId: activeId }, () => {});
    }

    const onNew = (msg) => {
      if (!alive) return;
      if (String(msg.conversation) === String(activeId)) {
        setMessages((m) => {
          const next = m || [];
          // two echo paths: socket broadcast + own REST send — dedupe by id,
          // and by body for the optimistic send that gets a real id back
          if (next.some((x) => String(x._id) === String(msg.id))) return next;
          if (String(msg.sender?.id) === String(user.id)) {
            const twin = next.findIndex((x) => selfSent(x) && x.body === msg.body);
            if (twin !== -1) {
              const copy = [...next]; copy[twin] = { ...copy[twin], _id: msg.id }; return copy;
            }
            return [...next, { _id: msg.id, body: msg.body, createdAt: msg.createdAt, sender: { _id: msg.sender.id }, self: true }];
          }
          return [...next, { _id: msg.id, body: msg.body, createdAt: msg.createdAt, sender: { _id: msg.sender.id } }];
        });
      }
      loadConvs();
    };
    socket.on('message:new', onNew);
    return () => { socket.off('message:new', onNew); alive = false; };
  }, [activeId, loadConvs]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft('');
    // optimistic append; reconciled below once the server returns the real id
    const tmpId = `tmp-${Date.now()}`;
    setMessages((m) => [...(m || []), { _id: tmpId, body, createdAt: new Date().toISOString(), self: true }]);
    try {
      const res = await api.post(`/conversations/${activeId}/messages`, { body });
      setMessages((m) => (m || []).map((x) => (String(x._id) === tmpId ? { ...x, _id: String(res.data._id) } : x)));
      loadConvs();
    } catch (e2) {
      setErr(e2.message);
      setMessages((m) => m?.filter((x) => String(x._id) !== tmpId));
    }
  };

  const active = convs?.find((c) => String(c._id) === String(activeId)) || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-neutral-500">Chat about your campaign work — only you and the other party can see this thread.</p>
      </div>

      {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Conversations rail */}
        <aside>
          {convs === null ? <p className="text-sm text-neutral-500">Loading…</p> : convs.length === 0 ? (
            <Card className="p-4 text-sm text-neutral-500">
              No conversations yet. Opens automatically once you have an application, invitation or agreement with the other side.
            </Card>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {convs.map((c) => (
                <li key={c._id} className="border-t border-neutral-100 first:border-0">
                  <button
                    onClick={() => setParams((p) => { p.set('conv', String(c._id)); return p; })}
                    className={`block w-full px-4 py-3 text-left ${String(c._id) === String(activeId) ? 'bg-brand-50' : 'hover:bg-brand-50/50'}`}>
                    <span className="block truncate text-sm font-medium">
                      {c.other?.displayName || 'Campaign chat'}
                    </span>
                    <span className="block truncate text-xs text-neutral-400">{c.campaign?.title}</span>
                    {c.lastMessagePreview && (
                      <span className="mt-0.5 block truncate text-xs text-neutral-500">{c.lastMessagePreview}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <Card className="flex min-h-[60vh] flex-col p-0">
          {active && (
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{active.other?.displayName || 'Campaign chat'}</p>
                <p className="truncate text-xs text-neutral-500">{active.campaign?.title}</p>
              </div>
              <Badge tone="brand">End-to-end via EZ Ads</Badge>
            </header>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
            {activeId === null ? (
              <p className="py-16 text-center text-sm text-neutral-400">Pick a conversation on the left.</p>
            ) : messages === null ? (
              <p className="py-16 text-center text-sm text-neutral-400">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="py-16 text-center text-sm text-neutral-400">No messages yet — say hello!</p>
            ) : (
              messages.map((m) => {
                const mine = m.self || String(m.sender?._id) === String(user.id);
                return (
                  <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine
                      ? 'rounded-br-sm bg-brand-600 text-white'
                      : 'rounded-bl-sm bg-neutral-100 text-neutral-800'}`}>
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {activeId && (
            <form onSubmit={send} className="flex gap-2 border-t border-neutral-100 px-4 py-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…" maxLength={4000}
                className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm"
              />
              <Button type="submit" size="sm" disabled={!draft.trim()}>Send</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
