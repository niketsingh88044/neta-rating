import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

export default function AdminLogin() {
  const { login, logout, sessionExpired } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from && loc.state.from.startsWith('/admin') ? loc.state.from : '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      // Re-fetch from server to verify isAdmin (login() trusts the server response,
      // but this double-checks against the source of truth before letting them in).
      const { user } = await api.me();
      if (!user?.isAdmin) {
        logout();
        setError('This account is not an administrator. Use the regular login.');
        return;
      }
      nav(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-card admin-login" onSubmit={submit}>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Admin sign in</h1>
        <span className="pill pill-MP">RESTRICTED</span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Administrator portal. Regular users should use the <Link to="/login">user login</Link>.
      </p>
      {sessionExpired && (
        <div className="error small">Your session expired. Please sign in again.</div>
      )}
      <input
        className="input" type="email" placeholder="Admin email" required autoComplete="username"
        value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="input" type="password" placeholder="Password" required autoComplete="current-password"
        value={password} onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
