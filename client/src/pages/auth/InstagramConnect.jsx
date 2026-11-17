import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import AuthStory, { useAuthSwap } from '../../components/auth/AuthStory.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const POINTS = [
  'Free to join — start getting discovered today',
  'Brands find you based on niche, style and audience'
];

const NICHES = [
  'Fashion', 'Beauty', 'Food & Beverage', 'Health & Fitness', 'Technology', 'Gaming',
  'Education', 'Finance', 'Travel', 'Entertainment', 'Lifestyle', 'Sports',
  'Comedy', 'Music', 'Art & Design', 'Parenting', 'Business', 'Other'
];

const input = 'mt-1 block w-full rounded-lg border border-neutral-300 bg-(--color-surface) px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const label = 'block text-sm font-medium text-(--color-ink)';

export default function CreatorRegister() {
  const { registerCreator } = useAuth();
  const navigate = useNavigate();
  const [leaving, swapTo] = useAuthSwap();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', instagramUsername: '', niche: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    if (form.displayName.trim().length < 2) return 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      return 'Password must be 8+ characters with letters and numbers.';
    }
    if (!form.instagramUsername.trim()) return 'Enter your Instagram username.';
    if (!form.niche) return 'Pick your content niche.';
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError('');
    setBusy(true);
    try {
      await registerCreator({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        password: form.password,
        instagramUsername: form.instagramUsername.trim().replace(/^@/, ''),
        niche: form.niche.toLowerCase()
      });
      navigate('/influencer/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-page grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_1fr] ${leaving ? 'is-leaving' : ''}`}>
      {/* ---- story panel ---- */}
      <section className="hidden overflow-hidden border-r border-(--color-line) lg:flex">
        <AuthStory
          points={POINTS}
          footnote="Your Instagram account stays yours — we never ask for your Instagram password."
        />
      </section>

      {/* ---- form panel ---- */}
      <section className="px-4 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--color-ink-soft)">
            Join as a creator
          </p>
          <h1 className="mt-3 font-(family:--font-display) text-2xl font-bold tracking-tight">
            Create your creator account
          </h1>
          <p className="mt-1.5 text-sm text-(--color-ink-soft)">
            Get discovered by brands, apply to campaigns, and earn — all in one place.
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="displayName" className={label}>Your name</label>
              <input id="displayName" value={form.displayName} onChange={set('displayName')} className={input} placeholder="e.g. Priya Sharma" />
            </div>
            <div>
              <label htmlFor="email" className={label}>Email address</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={input} />
            </div>
            <div>
              <label htmlFor="password" className={label}>Password</label>
              <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set('password')} inputClassName={input} />
              <p className="mt-1 text-xs text-(--color-ink-soft)">8+ characters, letters and numbers.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="igUsername" className={label}>Instagram username</label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-(--color-ink-soft)">@</span>
                  <input
                    id="igUsername"
                    value={form.instagramUsername}
                    onChange={set('instagramUsername')}
                    placeholder="yourhandle"
                    className={`${input} !mt-0 pl-7`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="niche" className={label}>Content niche</label>
                <select id="niche" value={form.niche} onChange={set('niche')} className={input}>
                  <option value="">Select…</option>
                  {NICHES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Creating account…' : 'Create creator account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-(--color-ink-soft)">
            Already registered?{' '}
            <Link
              to="/login/creator"
              onClick={(e) => { e.preventDefault(); swapTo('/login/creator'); }}
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              Log in
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-(--color-ink-soft)">
            Joining as a brand?{' '}
            <Link to="/register/brand" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              Brand sign-up
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
