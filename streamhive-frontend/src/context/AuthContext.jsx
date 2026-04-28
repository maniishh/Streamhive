import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    // No token stored → definitely not logged in; skip the API call entirely.
    // This prevents a 401 → refresh cascade on every cold page load.
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data);
    } catch {
      // Token was invalid or expired and refresh also failed (interceptor
      // already cleared localStorage). Just ensure we're in a clean state.
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handler = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [fetchCurrentUser]);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    const { user: u, accessToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
