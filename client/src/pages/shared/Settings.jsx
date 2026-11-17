import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';

const INDUSTRIES = [
  ['fashion', 'Fashion'], ['beauty', 'Beauty'], ['food_beverage', 'Food & Beverage'],
  ['health_fitness', 'Health & Fitness'], ['technology', 'Technology'], ['gaming', 'Gaming'],
  ['education', 'Education'], ['finance', 'Finance'], ['travel', 'Travel'],
  ['entertainment', 'Entertainment'], ['ecommerce', 'E-commerce'], ['automotive', 'Automotive'],
  ['home_living', 'Home & Living'], ['sports', 'Sports'], ['other', 'Other']
];

const input = 'mt-1 block w-full rounded-lg border border-neutral-300 bg-(--color-surface) px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const label = 'block text-sm font-medium text-(--color-ink)';

/** Turn the account payload into the editable form shape for the current role. */
function toForm(data) {
  const p = data.profile || {};
  if (data.role === 'brand') {
    return {
      companyName: p.companyName || data.displayName || '',
      industry: p.industry || '',
      website: p.website || '',
      phone: p.contact?.phone || '',
      city: p.contact?.city || '',
      country: p.contact?.country || '',
      about: p.about || ''
    };
  }
  return {
    displayName: p.displayName || data.displayName || '',
    bio: p.bio || '',
    city: p.location?.city || '',
    country: p.location?.country || ''
  };
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [form, setForm] = useState(null);
  const [saveErr, setSaveErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwDone, setPwDone] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/auth/account')
      .then((r) => { if (alive) { setData(r.data); setForm(toForm(r.data)); } })
      .catch((e) => { if (alive) setLoadErr(e.message); });
    return () => { alive = false; };
  }, []);

  if (!user) return null;

  const isBrand = data?.role === 'brand';
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setSaved(false); };

  async function saveProfile(e) {
    e.preventDefault();
    setSaveErr('');
    setSaved(false);
    const name = isBrand ? form.companyName.trim() : form.displayName.trim();
    if (name.length < 2) return setSaveErr(isBrand ? 'Enter your company name.' : 'Enter your display name.');
    if (form.website && !/^https?:\/\/.+/.test(form.website)) {
      return setSaveErr('Website must start with http:// or https://');
    }
    setSaving(true);
    try {
      await api.patch('/auth/account', isBrand
        ? {
            companyName: name,
            industry: form.industry || undefined,
            website: form.website.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            country: form.country.trim(),
            about: form.about
          }
        : {
            displayName: name,
            bio: form.bio,
            city: form.city.trim(),
            country: form.country.trim()
          });
      const fresh = await api.get('/auth/account');
      setData(fresh.data);
      setForm(toForm(fresh.data));
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwErr('');
    setPwDone(false);
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/[0-9]/.test(pw.newPassword)) {
      return setPwErr('New password must be at least 8 characters with letters and numbers.');
    }
    if (pw.newPassword !== pw.confirm) return setPwErr('The two new passwords do not match.');
    setPwBusy(true);
    try {
      await api.post('/auth/account/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword
      });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwDone(true);
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="font-(family:--font-mono) text-xs uppercase tracking-[0.18em] text-(--color-ink-soft)">
          {isBrand ? 'Brand account' : 'Creator account'}
        </p>
        <h1 className="font-(family:--font-display) mt-2 text-3xl font-extrabold tracking-tight">Profile settings</h1>
        <p className="mt-2 text-sm text-(--color-ink-soft)">
          Update how you appear on EZ Ads, and manage the password you sign in with.
        </p>
      </header>

      {loadErr && (
        <Card className="border-accent-200 bg-accent-50/60 p-4 text-sm">
          Could not load your account ({loadErr}). Try again in a moment.
        </Card>
      )}

      {!data && !loadErr && <p className="text-sm text-(--color-ink-soft)">Loading your account…</p>}

      {data && form && (
        <Card className="p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{isBrand ? 'Company details' : 'Your profile'}</h2>
            <Badge tone="neutral">
              <Icon name="lock" size={13} className="mr-1 inline" />
              {data.email}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-ink-soft)">
            Your email address is used for sign-in and cannot be changed here.
            {!data.emailVerified && ' It is not verified yet — check your inbox.'}
          </p>

          <form className="mt-5 space-y-4" onSubmit={saveProfile}>
            {saveErr && (
              <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {saveErr}
              </div>
            )}
            {saved && (
              <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-inset ring-green-200">
                Profile updated.
              </div>
            )}

            {isBrand ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="companyName" className={label}>Company / brand name</label>
                    <input id="companyName" value={form.companyName} onChange={set('companyName')} className={input} />
                  </div>
                  <div>
                    <label htmlFor="industry" className={label}>Industry</label>
                    <select id="industry" value={form.industry} onChange={set('industry')} className={input}>
                      <option value="">Select…</option>
                      {INDUSTRIES.map(([slug, text]) => <option key={slug} value={slug}>{text}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="website" className={label}>Website</label>
                    <input id="website" type="url" placeholder="https://" value={form.website} onChange={set('website')} className={input} />
                  </div>
                  <div>
                    <label htmlFor="phone" className={label}>Contact number</label>
                    <input id="phone" value={form.phone} onChange={set('phone')} className={input} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className={label}>City</label>
                    <input id="city" value={form.city} onChange={set('city')} className={input} />
                  </div>
                  <div>
                    <label htmlFor="country" className={label}>Country</label>
                    <input id="country" value={form.country} onChange={set('country')} className={input} />
                  </div>
                </div>
                <div>
                  <label htmlFor="about" className={label}>About the brand</label>
                  <textarea id="about" rows={3} maxLength={2000} value={form.about} onChange={set('about')} className={input} />
                  <p className="mt-1 text-xs text-(--color-ink-soft)">Shown to creators you invite. Up to 2,000 characters.</p>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="displayName" className={label}>Display name</label>
                    <input id="displayName" value={form.displayName} onChange={set('displayName')} className={input} />
                  </div>
                  <div>
                    <label htmlFor="country" className={label}>Country</label>
                    <input id="country" value={form.country} onChange={set('country')} className={input} />
                  </div>
                </div>
                <div>
                  <label htmlFor="city" className={label}>City</label>
                  <input id="city" value={form.city} onChange={set('city')} className={input} />
                </div>
                <div>
                  <label htmlFor="bio" className={label}>Bio</label>
                  <textarea id="bio" rows={4} maxLength={1000} value={form.bio} onChange={set('bio')} className={input} />
                  <p className="mt-1 text-xs text-(--color-ink-soft)">
                    Shown on your public creator profile. Rates, niche and audience numbers are edited from your dashboard.
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
              <Button type="button" variant="secondary" to={isBrand ? '/brand/dashboard' : '/influencer/dashboard'}>
                Back to dashboard
              </Button>
            </div>
          </form>
        </Card>
      )}

      {data && (
        <Card className="p-6 sm:p-7">
          <h2 className="text-lg font-semibold">Password</h2>
          {!data.canChangePassword ? (
            <p className="mt-2 text-sm text-(--color-ink-soft)">
              This account signs in with Instagram, so there is no password to change. Disconnect and reconnect
              from your creator dashboard if you need to switch Instagram accounts.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-(--color-ink-soft)">
                Choose something at least 8 characters long, with letters and numbers.
              </p>
              <form className="mt-5 space-y-4" onSubmit={savePassword}>
                {pwErr && (
                  <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                    {pwErr}
                  </div>
                )}
                {pwDone && (
                  <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-inset ring-green-200">
                    Password changed. Use the new one the next time you log in.
                  </div>
                )}
                <div>
                  <label htmlFor="currentPassword" className={label}>Current password</label>
                  <PasswordInput
                    id="currentPassword"
                    autoComplete="current-password"
                    value={pw.currentPassword}
                    onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                    inputClassName={input}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="newPassword" className={label}>New password</label>
                    <PasswordInput
                      id="newPassword"
                      autoComplete="new-password"
                      value={pw.newPassword}
                      onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                      inputClassName={input}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className={label}>Confirm new password</label>
                    <PasswordInput
                      id="confirmPassword"
                      autoComplete="new-password"
                      value={pw.confirm}
                      onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                      inputClassName={input}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Change password'}</Button>
              </form>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
