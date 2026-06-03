import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/netas';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      nav(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Login</h1>
      {sessionExpired && (
        <div className="error small">Your session expired. Please sign in again.</div>
      )}
      <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" type="submit">Login</button>
      {error && <div className="error">{error}</div>}
      <div className="muted small">No account? <Link to="/signup">Sign up</Link></div>
    </form>
  );
}
