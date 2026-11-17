import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import AuthStory, { useAuthSwap } from '../../components/auth/AuthStory.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const POINTS = [
  'Real profiles with honest, labelled data',
  'Invite, negotiate and pay in one thread'
];

export default function CreatorLogin() {
  const { loginCreator } = useAuth();
  const navigate = useNavigate();
  const [leaving, swapTo] = useAuthSwap();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await loginCreator(email, password);
      navigate('/influencer/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'mt-1 block w-full rounded-lg border border-neutral-300 bg-(--color-surface) px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

  return (
    <div className={`auth-page grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr] ${leaving ? 'is-leaving' : ''}`}>
      {/* ---- story panel ---- */}
      <section className="hidden overflow-hidden border-r border-(--color-line) lg:flex">
        <AuthStory points={POINTS} footnote="Your Instagram account stays yours — we never ask for your Instagram password." />
      </section>

      {/* ---- form panel ---- */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="font-(family:--font-display) text-2xl font-bold tracking-tight">
            Creator log in
          </h1>
          <p className="mt-1.5 text-sm text-(--color-ink-soft)">
            Log in to explore campaigns and manage your partnerships.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            {error && (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-(--color-ink)">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="password" className="block text-sm font-medium text-(--color-ink)">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputClassName={inputClass}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Log in to dashboard'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-(--color-ink-soft)">
            New creator?{' '}
            <Link
              to="/register/creator"
              onClick={(e) => { e.preventDefault(); swapTo('/register/creator'); }}
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              Create account
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-(--color-ink-soft)">
            Brand or agency?{' '}
            <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              Log in here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
