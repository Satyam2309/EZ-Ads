import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const { user, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Enter your admin credentials.');
    setBusy(true);
    try {
      await loginAdmin(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold">Platform admin</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Operations console. Admin accounts exist only through server-side provisioning — there is no public admin signup.
        </p>
        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </div>
        )}
        {user?.role === 'admin' ? (
          <div className="mt-6 text-sm">
            <p className="font-medium"> Already signed in as {user.displayName || user.email}.</p>
            <Button className="mt-4 w-full" to="/admin">Open admin console</Button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">Admin email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">Password</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-neutral-400">
          Not an admin? <Link to="/login/brand" className="hover:text-neutral-600">Brand log in</Link>
        </p>
      </Card>
    </div>
  );
}
