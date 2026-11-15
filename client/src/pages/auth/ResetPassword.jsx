import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  // Show an error immediately if no token in URL
  const missingToken = !token.trim();

  const clientRulesOk =
    !missingToken &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    password === confirm;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (missingToken) return setError('Reset link is invalid or expired. Please request a new one.');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return setError('New password must be at least 8 characters with letters and numbers.');
    }
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/password-reset', { token: token.trim(), password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Choose a new password for your brand account. The link expires 60 minutes after the request.
        </p>

        {missingToken && !done && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            This reset link is invalid or has expired.{' '}
            <Link to="/forgot-password" className="font-medium underline">Request a new one →</Link>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}

        {done ? (
          <div role="status" className="mt-6 space-y-4">
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-inset ring-green-200">
              <p className="font-semibold">Password updated.</p>
              Your old password no longer works. Log in with the new one.
            </div>
            <Button type="button" className="w-full" onClick={() => navigate('/login/brand')}>
              Go to login →
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">New password</label>
              <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              <p className="mt-1 text-xs text-neutral-400">At least 8 characters, including letters and numbers.</p>
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-neutral-700">Confirm new password</label>
              <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !clientRulesOk || missingToken}>
              {busy ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">← Back to brand login</Link>
        </p>
      </Card>
    </div>
  );
}
