import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import InstagramCallback from './pages/auth/InstagramCallback.jsx';
import CreatorLogin from './pages/auth/CreatorLogin.jsx';
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
import Settings from './pages/shared/Settings.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import InfoPage from './pages/shared/InfoPage.jsx';
import Footer from './components/Footer.jsx';
import LegalStrip from './components/LegalStrip.jsx';
import Button from './components/ui/Button.jsx';
import BrandLogo from './components/BrandLogo.jsx';

/* The marketing footer only closes the public pages. Auth screens stay bare
   and full-height; the signed-in app gets a slim legal row instead. */
const FOOTER_ROUTES = new Set([
  '/',
  '/about',
  '/contact',
  '/terms',
  '/terms-of-service',
  '/privacy',
  '/privacy-policy',
  '/data-deletion',
  '/return-policy',
  '/refund-policy',
  '/disclaimer'
]);
const APP_SECTIONS = ['/brand', '/influencer', '/chat', '/notifications', '/payments', '/settings', '/admin'];

/* One shared look for the header links, with a brand-coloured label and a
   2px underline on whichever page the user is currently on. */
const NAV_BASE = 'relative text-sm transition-colors';
const NAV_ACTIVE = 'font-semibold text-brand-600 dark:text-brand-300 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-brand-600 dark:after:bg-brand-300';
const NAV_IDLE = 'font-medium text-(--color-ink-soft) hover:text-(--color-ink)';
const navLinkClass = (active) => `${NAV_BASE} ${active ? NAV_ACTIVE : NAV_IDLE}`;

function SiteFooter() {
  const { pathname } = useLocation();
  if (FOOTER_ROUTES.has(pathname)) return <Footer />;
  // admin sign-in is an auth screen, not part of the app shell
  if (pathname === '/admin/login') return null;
  const inApp = APP_SECTIONS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
  return inApp ? <LegalStrip /> : null;
}

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
        <Link to="/" aria-label="EZ Ads — home" className="flex items-center transition-opacity hover:opacity-90">
          <BrandLogo />
        </Link>
        <nav className="hidden gap-4 md:flex lg:gap-6">
          <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>Home</NavLink>
          {user?.role === 'brand' && <NavLink to="/brand/discovery" className={({ isActive }) => navLinkClass(isActive)}>Find creators</NavLink>}
          {user?.role === 'brand' && <NavLink to="/brand/shortlists" className={({ isActive }) => navLinkClass(isActive)}>Shortlists</NavLink>}
          {user?.role === 'brand' && <NavLink to="/brand/campaigns" className={({ isActive }) => navLinkClass(isActive)}>Campaigns</NavLink>}
          {user?.role === 'brand' && <NavLink to="/brand/dashboard" className={({ isActive }) => navLinkClass(isActive)}>Dashboard</NavLink>}
          {user?.role === 'influencer' && <NavLink to="/influencer/explore" className={({ isActive }) => navLinkClass(isActive)}>Explore campaigns</NavLink>}
          {user?.role === 'influencer' && <NavLink to="/influencer/inbox" className={({ isActive }) => navLinkClass(isActive)}>Inbox</NavLink>}
          {user?.role === 'influencer' && <NavLink to="/payments" className={({ isActive }) => navLinkClass(isActive)}>Payments</NavLink>}
          {user && <NavLink to="/chat" className={({ isActive }) => navLinkClass(isActive || unreadChat > 0)}>Chat{unreadChat > 0 ? ` (${unreadChat})` : ''}</NavLink>}
          {user && <NavLink to="/notifications" className={({ isActive }) => `${navLinkClass(isActive || unreadNotifs > 0)} px-2`}>🔔{unreadNotifs > 0 ? ` ${unreadNotifs}` : ''}</NavLink>}
          {user?.role === 'influencer' && <NavLink to="/influencer/dashboard" className={({ isActive }) => navLinkClass(isActive)}>Dashboard</NavLink>}
          {user && <NavLink to="/settings" className={({ isActive }) => navLinkClass(isActive)}>Settings</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive)}>⚙ Admin</NavLink>}
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
              <Button variant="ghost" size="sm" to="/login/brand">Brand login</Button>
              <Button variant="ghost" size="sm" to="/login/creator" className="hidden sm:inline-flex">Creator login</Button>
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
            <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
            <Route path="/register/creator" element={<InstagramConnect />} />
            <Route path="/login/creator" element={<CreatorLogin />} />
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
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/influencer/dashboard" element={<Protected roles={['influencer']}><InfluencerDashboard /></Protected>} />
            <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
            <Route path="/about" element={<InfoPage page="about" />} />
            <Route path="/contact" element={<InfoPage page="contact" />} />
            <Route path="/terms" element={<InfoPage page="terms" />} />
            <Route path="/terms-of-service" element={<InfoPage page="terms" />} />
            <Route path="/privacy" element={<InfoPage page="privacy-policy" />} />
            <Route path="/privacy-policy" element={<InfoPage page="privacy-policy" />} />
            <Route path="/data-deletion" element={<InfoPage page="data-deletion" />} />
            <Route path="/return-policy" element={<InfoPage page="return-policy" />} />
            <Route path="/refund-policy" element={<InfoPage page="refund-policy" />} />
            <Route path="/disclaimer" element={<InfoPage page="disclaimer" />} />
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
          <SiteFooter />
          </CompareProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
