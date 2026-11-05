import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const INDUSTRIES = [
  'Fashion', 'Beauty', 'Food & Beverage', 'Health & Fitness', 'Technology', 'Gaming',
  'Education', 'Finance', 'Travel', 'Entertainment', 'E-commerce', 'Automotive',
  'Home & Living', 'Sports', 'Other'
];
const INDUSTRY_SLUGS = ['fashion', 'beauty', 'food_beverage', 'health_fitness', 'technology', 'gaming', 'education', 'finance', 'travel', 'entertainment', 'ecommerce', 'automotive', 'home_living', 'sports', 'other'];

export default function BrandRegister() {
  const { registerBrand } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', email: '', password: '', industry: '', website: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    if (form.companyName.trim().length < 2) return 'Enter your company/brand name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid business email.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      return 'Password must be 8+ characters and include letters and numbers.';
    }
    if (!form.industry) return 'Choose your industry.';
    return '';
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError('');
    setBusy(true);
    try {
      await registerBrand({
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        password: form.password,
        industry: INDUSTRY_SLUGS[INDUSTRIES.indexOf(form.industry)],
        website: form.website || undefined,
        phone: form.phone || undefined
      });
      navigate('/brand/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input = 'mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
  const label = 'block text-sm font-medium text-neutral-700';

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-bold">Create your brand account</h1>
        <p className="mt-1 text-sm text-neutral-500">Find creators, run campaigns, pay securely on-platform.</p>
        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>
        )}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="company" className={label}>Company / brand name</label>
            <input id="company" value={form.companyName} onChange={set('companyName')} className={input} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className={label}>Business email</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={input} />
            </div>
            <div>
              <label htmlFor="industry" className={label}>Industry</label>
              <select id="industry" value={form.industry} onChange={set('industry')} className={input}>
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="password" className={label}>Password</label>
            <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className={input} />
            <p className="mt-1 text-xs text-neutral-500">8+ characters, letters and numbers.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="website" className={label}>Website <span className="text-neutral-400">(optional)</span></label>
              <input id="website" type="url" placeholder="https://" value={form.website} onChange={set('website')} className={input} />
            </div>
            <div>
              <label htmlFor="phone" className={label}>Contact number <span className="text-neutral-400">(optional)</span></label>
              <input id="phone" value={form.phone} onChange={set('phone')} className={input} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Already registered? <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
