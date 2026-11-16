import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Landing page for Meta's redirect back into EZ Ads.
 *
 * The API's /api/auth/instagram/callback already traded the code for a token and
 * set the session cookie, then redirected the browser here with
 * ?status=success or ?status=error&message=… . So this page only has to wait for
 * /auth/me to resolve and hand the creator their dashboard.
 */
export default function InstagramCallback() {
  const [params] = useSearchParams();
  const status = params.get('status');
  const message = params.get('message');
  const detail = params.get('detail');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const ok = status === 'success';

  useEffect(() => {
    if (ok && !loading && user?.role === 'influencer') {
      navigate('/influencer/dashboard', { replace: true });
    }
  }, [ok, loading, user, navigate]);

  const failed = ok && !loading && !user && status !== null;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8 text-center">
        {ok && !failed && (
          <>
            <h1 className="text-xl font-bold">Signing you in…</h1>
            <p className="mt-3 text-sm text-neutral-600">
              Instagram authorized. Setting up your EZ Ads creator account.
            </p>
          </>
        )}

        {ok && failed && (
          <>
            <h1 className="text-xl font-bold">Couldn't finish sign-in</h1>
            <p className="mt-3 text-sm text-neutral-600">
              Instagram approved the connection, but this browser didn't keep the session.
              This usually means cookies are blocked for this site.
            </p>
            <Button className="mt-6 w-full" to="/auth/instagram">Try again</Button>
          </>
        )}

        {!ok && (
          <>
            <h1 className="text-xl font-bold">Instagram sign-in failed</h1>
            <p className="mt-3 text-sm text-neutral-600">
              {message || 'Authorization was denied or timed out before it completed.'}
            </p>
            {detail && (
              <p className="mt-3 rounded bg-red-50 p-2 text-xs font-mono text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {detail}
              </p>
            )}
            <Button className="mt-6 w-full" to="/auth/instagram">Try again</Button>
          </>
        )}

        <p className="mt-4 text-center text-sm text-neutral-500">
          Brand or agency? <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">Log in here</Link>
        </p>
      </Card>
    </div>
  );
}
