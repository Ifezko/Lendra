import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const API_BASE = '';
const ADMIN_SESSION_KEY = 'lendra_admin_session';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restoreSession = useCallback(async () => {
    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!stored) { setLoading(false); return; }
      const { token } = JSON.parse(stored);
      const res = await fetch(`${API_BASE}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmin({ ...data, token });
      } else {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    setLoading(false);
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const login = async (email, password) => {
    setError(null);
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Login failed'); throw new Error(data.error); }
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ token: data.token }));
    setAdmin({ ...data.admin, token: data.token });
    return data;
  };

  const logout = () => {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    if (stored) {
      try {
        const { token } = JSON.parse(stored);
        fetch(`${API_BASE}/api/admin/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).then(() => {}, () => {});
      } catch {}
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAdmin(null);
  };

  const adminFetch = useCallback(async (path, options = {}) => {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!stored) throw new Error('Not authenticated');
    const { token } = JSON.parse(stored);
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return res;
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, error, login, logout, adminFetch, isSuperAdmin: admin?.role === 'super_admin' }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
