import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Influencer entry point. THREE honest facts stated up front:
 *  1. Real flow requires an Instagram professional (Business/Creator) account — Meta rule, not ours.
 *  2. If Meta credentials/app review aren't configured, the button runs a MOCK flow
 *     that is clearly labeled at every step. It never pretends to be real verification.
 *  3. We never see or store an Instagram password; authorization happens on Meta.
 */
export default function InstagramConnect() {
  const { connectInstagram } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function onConnect() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await connectInstagram();
      if (res?.cancelled) return setMessage({ tone: 'neutral', text: 'Connect cancelled — you can try again anytime.' });
      if (res?.mode === 'mock') {
        navigate('/influencer/dashboard');
      } else {
        setMessage({ tone: 'info', text: 'Redirecting to Meta…' });
      }
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1Zm0 1.8c-3.1 0-3.5 0-4.8.1-1.1 0-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.4-.6.7-.8 1.2-.2.4-.4 1-.4 2.1-.1 1.3-.1 1.7-.1 4.8s0 3.5.1 4.8c0 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.4.4.7.6 1.2.8.4.2 1 .4 2.1.4 1.3.1 1.7.1 4.8.1s3.5 0 4.8-.1c1.1 0 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.4.6-.7.8-1.2.2-.4.4-1 .4-2.1.1-1.3.1-1.7.1-4.8s0-3.5-.1-4.8c0-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.2-1-.4-2.1-.4-1.3-.1-1.7-.1-4.8-.1Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Zm5.2-2.9a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" /></svg>
          <h1 className="text-xl font-bold">Creator sign-in</h1>
        </div>

        <p className="mt-3 text-sm text-neutral-600">
          Connect your Instagram professional account through Meta's official authorization screen.
          EZ Ads never sees your Instagram password.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-neutral-600">
          <li className="flex gap-2"><span className="text-brand-600">•</span> Requires an Instagram <strong>professional account</strong> (Business or Creator) — a Meta requirement.</li>
          <li className="flex gap-2"><span className="text-brand-600">•</span> We request only <code className="text-xs">instagram_business_basic</code> — profile fields, not messaging or publishing.</li>
          <li className="flex gap-2"><span className="text-brand-600">•</span> You'll set your niche, rates, and portfolio right after connecting.</li>
        </ul>

        {message && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${
            message.tone === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-brand-50 text-brand-700 ring-brand-200'
          }`}>
            {message.text}
          </div>
        )}

        <Button className="mt-6 w-full" onClick={onConnect} disabled={busy}>
          {busy ? 'Connecting…' : 'Continue with Instagram'}
        </Button>

        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
          <strong>Development notice:</strong> Meta app credentials aren't configured yet
          (Meta app review + Advanced Access pending), so this button currently runs a
          clearly-labeled <Badge tone="warning">MOCK</Badge> flow — simulated authentication for
          development only. It does not verify any real Instagram account and no live data is fetched.
        </div>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Brand or agency? <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">Log in here</Link>
        </p>
      </Card>
    </div>
  );
}
