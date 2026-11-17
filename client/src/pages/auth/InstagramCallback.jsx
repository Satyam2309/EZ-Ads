import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Legacy OAuth callback page. Instagram OAuth has been replaced with simple
 * email+password registration. This page redirects active creators to their
 * dashboard and everyone else to the new creator login page.
 */
export default function InstagramCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user?.role === 'influencer') {
        navigate('/influencer/dashboard', { replace: true });
      } else if (!user) {
        navigate('/login/creator', { replace: true });
      }
    }
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Redirecting…</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Taking you to the right place.
        </p>
        <Button className="mt-6 w-full" to="/login/creator">
          Creator log in
        </Button>
        <p className="mt-4 text-center text-sm text-neutral-500">
          Brand or agency?{' '}
          <Link to="/login/brand" className="font-medium text-brand-600 hover:text-brand-700">
            Log in here
          </Link>
        </p>
      </Card>
    </div>
  );
}
