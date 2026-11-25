import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function InstagramCallback() {
  const [params] = useSearchParams();
  const status = params.get('status');
  const message = params.get('message');
  const detail = params.get('detail');
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const isSuccess = status === 'connected' || status === 'success';

  useEffect(() => {
    if (isSuccess) {
      if (refreshUser) refreshUser();
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (!loading && !user && status !== 'error') {
      navigate('/login/creator', { replace: true });
    }
  }, [isSuccess, loading, user, navigate, refreshUser, status]);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8 text-center">
        {isSuccess ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <h1 className="mt-4 text-xl font-bold">Instagram Connected!</h1>
            <p className="mt-2 text-sm text-(--color-ink-soft)">
              Syncing your insights from Meta Graph API. Redirecting to your dashboard…
            </p>
          </>
        ) : status === 'error' ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
              ✕
            </div>
            <h1 className="mt-4 text-xl font-bold">Connection Failed</h1>
            <p className="mt-2 text-sm text-(--color-ink-soft)">
              {message || 'Could not connect your Instagram account.'}
            </p>
            {detail && (
              <p className="mt-2 rounded bg-red-50 p-2 text-xs font-mono text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {detail}
              </p>
            )}
            <Button className="mt-6 w-full" to="/influencer/dashboard">
              Back to Dashboard
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Redirecting…</h1>
            <p className="mt-3 text-sm text-neutral-600">Taking you to the right place.</p>
            <Button className="mt-6 w-full" to="/login/creator">
              Creator log in
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          Brand or agency?{' '}
          <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">
            Log in here
          </Link>
        </p>
      </Card>
    </div>
  );
}
