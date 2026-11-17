import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import AuthStory, { useAuthSwap } from '../../components/auth/AuthStory.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLES = [
  {
    id: 'brand',
    label: "I'm a brand",
    hint: 'Hire creators',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
        <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18" />
      </svg>
    )
  },
  {
    id: 'creator',
    label: "I'm a creator",
    hint: 'Get discovered',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
        <path d="M4 8.5h2.6L8.2 6h7.6l1.6 2.5H20v9.5H4z" />
        <circle cx="12" cy="13" r="3.1" />
      </svg>
    )
  }
];

const PROOF = [
  'Real profiles with honest, labelled data',
  'Invite, negotiate and pay in one thread'
];

export default function BrandLogin() {
  const { loginBrand } = useAuth();
  const navigate = useNavigate();
  const [leaving, swapTo] = useAuthSwap();
  const [role, setRole] = useState('brand');
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
      await loginBrand(email, password);
      navigate('/brand/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function pickRole(next) {
    setRole(next);
    setError('');
  }

  return (
    <div className={`auth-page grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr] ${leaving ? 'is-leaving' : ''}`}>
      {/* ---- story panel ---- */}
      <section className="hidden overflow-hidden border-r border-(--color-line) lg:flex">
        <AuthStory
          points={PROOF}
          footnote="Payments are simulated in this demo — clearly labelled, never real money."
        />
      </section>

      {/* ---- form panel ---- */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="font-(family:--font-display) text-2xl font-bold tracking-tight">
            Pick your role to get started
          </h1>
          <p className="mt-1.5 text-sm text-(--color-ink-soft)">
            {role === 'brand'
              ? 'Log in to run campaigns and manage creator partnerships.'
              : 'Log in with your email to access your creator dashboard.'}
          </p>

          <div role="group" aria-label="Choose your role" className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-(--color-elevated) p-1.5 ring-1 ring-inset ring-(--color-line)">
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pickRole(r.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                    active
                      ? 'bg-(--color-surface) shadow-sm ring-1 ring-inset ring-(--color-line)'
                      : 'hover:bg-(--color-surface)/60'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    active ? 'bg-brand-600 text-white' : 'bg-(--color-surface) text-(--color-ink-soft)'
                  }`}>
                    {r.icon}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${active ? 'text-(--color-ink)' : 'text-(--color-ink-soft)'}`}>
                      {r.label}
                    </span>
                    <span className="block truncate text-[11px] text-(--color-ink-soft)">{r.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {role === 'brand' ? (
            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              {error && (
                <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-(--color-ink)">
                  Business email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 bg-(--color-surface) px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
                  inputClassName="mt-1 block w-full rounded-lg border border-neutral-300 bg-(--color-surface) px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Log in to dashboard'}
              </Button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-(--color-line) bg-(--color-surface) p-4 text-sm leading-relaxed text-(--color-ink-soft)">
                Creators sign in with their <strong className="font-semibold text-(--color-ink)">email and password</strong>. No Instagram app approval needed — just enter your handle as part of your profile.
              </div>
              <Button size="lg" className="w-full" to="/login/creator">
                Log in as creator
              </Button>
              <p className="text-center text-xs text-(--color-ink-soft)">
                New creator?{' '}
                <Link to="/register/creator" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
                  Create a creator account
                </Link>
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-(--color-ink-soft)">
            New to EZ Ads?{' '}
            <Link
              to="/register/brand"
              onClick={(e) => {
                e.preventDefault();
                swapTo('/register/brand');
              }}
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              Create a brand account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
