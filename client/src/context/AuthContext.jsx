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

  const registerCreator = useCallback(async (payload) => {
    const res = await api.post('/auth/register/creator', payload);
    const me = await api.get('/auth/me');
    setUser(me.data);
    return res.data;
  }, []);

  const loginCreator = useCallback(async (email, password) => {
    await api.post('/auth/login/creator', { email, password });
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

  // Re-read the signed-in account (e.g. after saving profile settings).
  const refreshUser = useCallback(async () => {
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, registerBrand, loginBrand, registerCreator, loginCreator, loginAdmin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
