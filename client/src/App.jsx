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
import Icon from './components/ui/Icon.jsx';

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
  const { pathname } = useLocation();
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lightweight badge polling
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

  // Brand nav links
  const brandLinks = [
    { to: '/brand/discovery',  label: 'Find Creators', icon: 'search' },
    { to: '/brand/shortlists', label: 'Shortlists',    icon: 'star' },
    { to: '/brand/campaigns',  label: 'Campaigns',     icon: 'megaphone' },
    { to: '/brand/dashboard',  label: 'Dashboard',     icon: 'grid' },
  ];
  // Creator nav links
  const creatorLinks = [
    { to: '/influencer/explore',   label: 'Explore',   icon: 'globe' },
    { to: '/influencer/inbox',     label: 'Inbox',     icon: 'inbox' },
    { to: '/influencer/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/payments',             label: 'Payments',  icon: 'wallet' },
  ];

  const roleLinks = user?.role === 'brand' ? brandLinks : user?.role === 'influencer' ? creatorLinks : [];

  return (
    <header className="sticky top-0 z-40 border-b border-(--color-line)/80 bg-(--color-canvas)/80 backdrop-blur-xl supports-[backdrop-filter]:bg-(--color-canvas)/65">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link to="/" aria-label="EZ Ads — home" className="flex shrink-0 items-center transition-opacity hover:opacity-90">
          <BrandLogo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {!user && (
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive) + ' px-3 py-2 rounded-lg'}>
              Home
            </NavLink>
          )}
          {roleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-150 hover:-translate-y-px active:translate-y-0 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] ring-1 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-200 dark:shadow-none dark:ring-brand-400/25'
                    : 'text-(--color-ink-soft) hover:bg-(--color-elevated) hover:text-(--color-ink)'
                }`
              }
            >
              <Icon name={link.icon} size={16} />
              {link.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive) + ' px-3 py-2 rounded-lg'}>
              ⚙ Admin
            </NavLink>
          )}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Chat icon with badge */}
          {user && (
            <NavLink
              to="/chat"
              title="Chat"
              className={({ isActive }) =>
                `relative flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40' : 'text-(--color-ink-soft) hover:bg-(--color-elevated) hover:text-(--color-ink)'
                }`
              }
            >
              <Icon name="message" size={18} />
              {unreadChat > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white leading-none">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </NavLink>
          )}

          {/* Notification bell icon with badge */}
          {user && (
            <NavLink
              to="/notifications"
              title="Notifications"
              className={({ isActive }) =>
                `relative flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40' : 'text-(--color-ink-soft) hover:bg-(--color-elevated) hover:text-(--color-ink)'
                }`
              }
            >
              <Icon name="bell" size={18} />
              {unreadNotifs > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </NavLink>
          )}

          {/* Settings icon (logged in) */}
          {user && (
            <NavLink
              to="/settings"
              title="Settings"
              className={({ isActive }) =>
                `flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40' : 'text-(--color-ink-soft) hover:bg-(--color-elevated) hover:text-(--color-ink)'
                }`
              }
            >
              <Icon name="gear" size={18} />
            </NavLink>
          )}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-(--color-elevated) text-(--color-ink-soft)"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>

          {/* Auth buttons */}
          {user ? (
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="hidden rounded-lg border border-(--color-line) bg-(--color-surface) px-3 py-1.5 text-sm font-medium text-(--color-ink) transition-colors hover:bg-(--color-elevated) sm:block"
            >
              Log out
            </button>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" to="/login/brand">Brand login</Button>
              <Button variant="ghost" size="sm" to="/login/creator">Creator login</Button>
              <Button size="sm" to="/register/brand">Get started</Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-(--color-ink-soft) transition-colors hover:bg-(--color-elevated) hover:text-(--color-ink) md:hidden"
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div id="mobile-nav" className="border-t border-(--color-line) bg-(--color-canvas)/95 px-4 pb-4 backdrop-blur-xl md:hidden">
          <nav className="mt-3 space-y-1">
            {!user && (
              <NavLink to="/" end className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-(--color-ink-soft) hover:bg-(--color-elevated)'}`}>
                <Icon name="home" size={16} /> Home
              </NavLink>
            )}
            {roleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-(--color-ink-soft) hover:bg-(--color-elevated)'
                  }`
                }
              >
                <Icon name={link.icon} size={16} /> {link.label}
              </NavLink>
            ))}
            {user && (
              <>
                <NavLink to="/chat" className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-(--color-ink-soft) hover:bg-(--color-elevated)'}`}>
                  <span className="flex items-center gap-2"><Icon name="message" size={16} /> Chat</span>
                  {unreadChat > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">{unreadChat}</span>}
                </NavLink>
                <NavLink to="/notifications" className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-(--color-ink-soft) hover:bg-(--color-elevated)'}`}>
                  <span className="flex items-center gap-2"><Icon name="bell" size={16} /> Notifications</span>
                  {unreadNotifs > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadNotifs}</span>}
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-(--color-ink-soft) hover:bg-(--color-elevated)'}`}>
                  <Icon name="gear" size={16} /> Settings
                </NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-(--color-ink-soft) hover:bg-(--color-elevated)'}`}>
                <Icon name="gear" size={16} /> Admin Panel
              </NavLink>
            )}
            {!user && (
              <div className="mt-3 flex flex-col gap-2 border-t border-(--color-line) pt-3">
                <Button variant="ghost" size="sm" to="/login/brand">Brand login</Button>
                <Button variant="ghost" size="sm" to="/login/creator">Creator login</Button>
                <Button size="sm" to="/register/brand">Get started</Button>
              </div>
            )}
            {user && (
              <div className="mt-3 border-t border-(--color-line) pt-3">
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="w-full rounded-xl border border-(--color-line) py-2.5 text-sm font-medium text-(--color-ink) hover:bg-(--color-elevated) transition-colors"
                >
                  Log out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
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
