import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onAuthFail() {
      if (!localStorage.getItem('token')) return;
      localStorage.removeItem('token');
      setUser(null);
      setSessionExpired(true);
    }
    window.addEventListener('auth:failure', onAuthFail);
    return () => window.removeEventListener('auth:failure', onAuthFail);
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('token', token);
    setUser(user);
    setSessionExpired(false);
  }

  async function signup(name, email, password) {
    const { token, user } = await api.signup({ name, email, password });
    localStorage.setItem('token', token);
    setUser(user);
    setSessionExpired(false);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setSessionExpired(false);
  }

  async function refreshUser() {
    if (!localStorage.getItem('token')) return null;
    try {
      const { user } = await api.me();
      setUser(user);
      return user;
    } catch {
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
