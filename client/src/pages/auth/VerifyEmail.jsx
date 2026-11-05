import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';

/**
 * Third email-flow page. The verification email links here:
 *   {origin}/verify-email?token=...
 * The token is single-use and burned server-side on success, so the verify
 * request must fire EXACTLY once — React StrictMode double-invokes effects in
 * development, which would burn the token on the first (rejected) render pass.
 * A ref guard keeps that from happening.
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = (params.get('token') || '').trim();

  const [state, setState] = useState(token ? 'verifying' : 'missing'); // verifying | success | error | missing
  const [errorMsg, setErrorMsg] = useState('');
  // The verify request is cached as a promise: it fires EXACTLY once even with
  // StrictMode's double-invoked effects, yet every surviving mount gets the
  // outcome (an alive-flag alone would swallow it during StrictMode's
  // mount → cleanup → remount cycle and freeze the page on 'verifying').
  const verifyRef = useRef(null);

  useEffect(() => {
    if (!token) { setState('missing'); return; }
    if (!verifyRef.current) {
      verifyRef.current = api
        .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
        .then(() => ({ ok: true }))
        .catch((err) => ({ ok: false, message: err.message || 'Verification failed' }));
    }
    let alive = true;
    verifyRef.current.then((r) => {
      if (!alive) return;
      if (r.ok) setState('success');
      else { setErrorMsg(r.message); setState('error'); }
    });
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md p-8 text-center ring-1 ring-neutral-200 rounded-2xl bg-white shadow-sm">
        <h1 className="text-xl font-bold">Email verification</h1>

        {state === 'verifying' && (
          <p className="mt-4 text-sm text-neutral-500" aria-live="polite">Verifying your email…</p>
        )}

        {state === 'success' && (
          <div className="mt-4 space-y-4">
            <div role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-inset ring-green-200">
              <p className="font-semibold">Email verified ✔</p>
              Your brand account is now fully unlocked — campaign posting and payments are live.
            </div>
            <a
              href="/brand/dashboard"
              className="block w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Go to your dashboard →
            </a>
          </div>
        )}

        {state === 'error' && (
          <div className="mt-4 space-y-4 text-left">
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {errorMsg}
              {/expired|invalid/i.test(errorMsg) && ' — verification links expire after 24 hours and work only once.'}
            </div>
            <p className="text-sm text-neutral-500">
              If your link expired, register again with a new email or contact support to re-send the verification email.
            </p>
          </div>
        )}

        {state === 'missing' && (
          <p className="mt-4 text-sm text-neutral-500">
            No verification token in this URL. Use the exact link from your welcome email.
          </p>
        )}

        <p className="mt-6 text-sm text-neutral-500">
          <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">← Back to brand login</Link>
        </p>
      </div>
    </div>
  );
}
