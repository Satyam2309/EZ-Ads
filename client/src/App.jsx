import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api/client.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import Home from './pages/Home.jsx';
import BrandLogin from './pages/auth/BrandLogin.jsx';
import AdminLogin from './pages/auth/AdminLogin.jsx';
import BrandRegister from './pages/auth/BrandRegister.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import VerifyEmail from './pages/auth/VerifyEmail.jsx';
import InstagramConnect from './pages/auth/InstagramConnect.jsx';
import BrandDashboard from './pages/BrandDashboard.jsx';
import InfluencerDashboard from './pages/InfluencerDashboard.jsx';
import Discovery from './pages/brand/Discovery.jsx';
import CreatorProfile from './pages/brand/CreatorProfile.jsx';
import Shortlists from './pages/brand/Shortlists.jsx';
import Campaigns from './pages/brand/Campaigns.jsx';
import CampaignDetail from './pages/brand/CampaignDetail.jsx';
import ExploreCampaigns from './pages/creator/ExploreCampaigns.jsx';
import Inbox from './pages/creator/Inbox.jsx';
import Chat from './pages/shared/Chat.jsx';
import Notifications from './pages/shared/Notifications.jsx';
import Payments from './pages/shared/Payments.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Button from './components/ui/Button.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login/brand" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // lightweight badge polling (socket push updates the page itself; polling keeps it simple)
  useEffect(() => {
    if (!user) { setUnreadChat(0); setUnreadNotifs(0); return; }
    let alive = true;
    const tick = () => {
      api.get('/conversations').then((r) => { if (alive) setUnreadChat(r.data.unread || 0); }).catch(() => {});
      api.get('/notifications?unreadOnly=true&limit=1').then((r) => { if (alive) setUnreadNotifs(r.data.unread || 0); }).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [user]);
  return (
    <header className="sticky top-0 z-10 border-b border-(--color-line) bg-(--color-canvas)/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-brand-600 to-accent-600 font-bold text-white shadow-sm">EZ</span>
          <span className="font-(family:--font-display) text-lg font-bold tracking-tight">EZ Ads</span>
        </Link>
        <nav className="hidden gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Home</Link>
          {user?.role === 'brand' && <Link to="/brand/discovery" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Find creators</Link>}
          {user?.role === 'brand' && <Link to="/brand/shortlists" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Shortlists</Link>}
          {user?.role === 'brand' && <Link to="/brand/campaigns" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Campaigns</Link>}
          {user?.role === 'brand' && <Link to="/brand/dashboard" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Dashboard</Link>}
          {user?.role === 'influencer' && <Link to="/influencer/explore" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Explore campaigns</Link>}
          {user?.role === 'influencer' && <Link to="/influencer/inbox" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Inbox</Link>}
          {user?.role === 'influencer' && <Link to="/payments" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Payments</Link>}
          {user && <Link to="/chat" className={unreadChat > 0 ? "text-sm font-semibold text-brand-600 dark:text-brand-300" : "text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)"}>Chat{unreadChat > 0 ? ` (${unreadChat})` : ''}</Link>}
          {user && <NavLink to="/notifications" className={({ isActive }) => `rounded-full px-2 py-1 text-sm ${isActive || unreadNotifs > 0 ? 'text-brand-600 dark:text-brand-300 font-semibold' : 'text-(--color-ink-soft) hover:text-(--color-ink) font-medium'}`}>🔔{unreadNotifs > 0 ? ` ${unreadNotifs}` : ''}</NavLink>}
          {user?.role === 'influencer' && <Link to="/influencer/dashboard" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">Dashboard</Link>}
          {user?.role === 'admin' && <Link to="/admin" className="text-sm font-medium text-(--color-ink-soft) hover:text-(--color-ink)">⚙ Admin</Link>}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-(--color-elevated)"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <Button variant="secondary" size="sm" onClick={() => { logout(); navigate('/'); }}>Log out</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" to="/login/brand">Log in</Button>
              <Button size="sm" className="hidden sm:inline-flex" to="/register/brand">Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CompareProvider>
            <Navbar />
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login/brand" element={<BrandLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register/brand" element={<BrandRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/instagram" element={<InstagramConnect />} />
            <Route path="/brand/dashboard" element={<Protected roles={['brand']}><BrandDashboard /></Protected>} />
            <Route path="/brand/discovery" element={<Protected roles={['brand']}><Discovery /></Protected>} />
            <Route path="/brand/creators/:id" element={<Protected roles={['brand']}><CreatorProfile /></Protected>} />
            <Route path="/brand/shortlists" element={<Protected roles={['brand']}><Shortlists /></Protected>} />
            <Route path="/brand/campaigns" element={<Protected roles={['brand']}><Campaigns /></Protected>} />
            <Route path="/brand/campaigns/:id" element={<Protected roles={['brand']}><CampaignDetail /></Protected>} />
            <Route path="/influencer/explore" element={<Protected roles={['influencer']}><ExploreCampaigns /></Protected>} />
            <Route path="/influencer/inbox" element={<Protected roles={['influencer']}><Inbox /></Protected>} />
            <Route path="/chat" element={<Protected><Chat /></Protected>} />
            <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
            <Route path="/payments" element={<Protected><Payments /></Protected>} />
            <Route path="/influencer/dashboard" element={<Protected roles={['influencer']}><InfluencerDashboard /></Protected>} />
            <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
              <Route
              path="*"
              element={
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                  <p className="text-2xl font-semibold">404 — Page not found</p>
                  <Link className="font-medium text-brand-600 hover:text-brand-700" to="/">Back to home</Link>
                </div>
              }
            />
          </Routes>
          </CompareProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
