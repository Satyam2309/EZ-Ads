import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/auth/me')
      .then((res) => alive && setUser(res.data))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const registerBrand = useCallback(async (payload) => {
    const res = await api.post('/auth/register/brand', payload);
    const me = await api.get('/auth/me');
    setUser(me.data);
    return res.data;
  }, []);

  const loginBrand = useCallback(async (email, password) => {
    await api.post('/auth/login/brand', { email, password });
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  }, []);

  // Admin credentials are provisioned only via the server-side seed script.
  const loginAdmin = useCallback(async (email, password) => {
    await api.post('/auth/login/admin', { email, password });
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  const connectInstagram = useCallback(async () => {
    const start = await api.get('/auth/instagram/start');
    const { mode, state } = start.data;
    if (mode === 'live') {
      window.location.href = state; // real Meta authorization screen
      return { mode };
    }
    // Development-only mock flow — the user is told plainly this is NOT real Instagram.
    // In real-mode this page never appears; Meta's own authorization screen is shown.
    const mockUser = prompt(
      'DEVELOPMENT MOCK (no real Instagram authentication):\n' +
      'Meta app credentials are not configured, so this flow simulates the OAuth exchange.\n' +
      'Enter a mock username to simulate a professional creator account:'
    );
    if (!mockUser) return { mode: 'mock', cancelled: true };
    const cb = await api.post('/auth/instagram/mock-callback', { state, mockUser });
    const me = await api.get('/auth/me');
    setUser(me.data);
    return { mode: 'mock', user: cb.data };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, registerBrand, loginBrand, loginAdmin, logout, connectInstagram }}>
      {children}
    </AuthContext.Provider>
  );
}
