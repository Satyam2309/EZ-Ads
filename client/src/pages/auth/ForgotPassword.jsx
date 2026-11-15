import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const mail = email.trim().toLowerCase();
    if (!mail) return setError('Enter the email you registered with.');
    setBusy(true);
    try {
      await api.post('/auth/password-reset-request', { email: mail });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter your business email and we&apos;ll send a reset link. The link is valid for 60 minutes.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}

        {!sent ? (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">Business email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
          </form>
        ) : (
          <>
            <div role="status" className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-inset ring-green-200">
              If that email is registered, a reset link has been sent. Check your inbox and follow the link within 60 minutes.
            </div>
            <p className="mt-4 text-center text-sm text-neutral-500">
              Try logging in again with a new password later, or{' '}
              <button type="button" onClick={() => navigate('/login/brand')} className="font-medium text-brand-600 hover:text-brand-700">back to login</button>
              {' '}·{' '}
              <button type="button" onClick={() => { setSent(false); setEmail(''); }} className="font-medium text-neutral-600 hover:text-neutral-800">request again</button>
            </p>
          </>
        )}

        <p className="mt-4 text-center text-sm text-neutral-500">
          <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">← Back to brand login</Link>
        </p>
      </Card>
    </div>
  );
}
