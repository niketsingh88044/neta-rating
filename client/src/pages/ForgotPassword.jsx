import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function ForgotPassword() {
  const nav = useNavigate();
  const loc = useLocation();
  // If the user came from /admin/login, send them back there after reset; else /login.
  const returnTo = loc.state?.from === '/admin/login' ? '/admin/login' : '/login';

  const [stage, setStage] = useState('request'); // 'request' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  async function requestCode(e) {
    e.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    try {
      await api.forgotPassword(email);
      setInfo(`If an account exists for ${email}, a 6-digit reset code has been sent.`);
      setStage('reset');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.resetPassword({ email, code: code.trim(), newPassword });
      setStage('done');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function resend() {
    setErr(''); setInfo(''); setBusy(true);
    try {
      await api.forgotPassword(email);
      setInfo('A new code has been sent.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (stage === 'done') {
    return (
      <div className="auth-card">
        <h1>Password updated</h1>
        <p className="success">You can now sign in with your new password.</p>
        <button className="btn" onClick={() => nav(returnTo, { replace: true })}>
          Go to sign in
        </button>
      </div>
    );
  }

  if (stage === 'reset') {
    return (
      <form className="auth-card" onSubmit={resetPassword}>
        <h1>Enter reset code</h1>
        <p className="muted small" style={{ margin: 0 }}>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it along with your new password.
        </p>
        {info && <div className="small muted">{info}</div>}
        <input
          className="input otp-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          required autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <input
          className="input"
          type="password"
          placeholder="New password (min 6 chars)"
          required minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button className="btn" type="submit" disabled={busy || code.length !== 6 || newPassword.length < 6}>
          {busy ? 'Updating...' : 'Update password'}
        </button>
        {err && <div className="error small">{err}</div>}
        <div className="row between" style={{ marginTop: 4 }}>
          <button type="button" className="link" onClick={() => setStage('request')}>
            Use a different email
          </button>
          <button type="button" className="link" onClick={resend} disabled={busy}>
            Resend code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="auth-card" onSubmit={requestCode}>
      <h1>Forgot password</h1>
      <p className="muted small" style={{ margin: 0 }}>
        Enter the email you signed up with. We'll send a 6-digit code to reset your password.
      </p>
      <input
        className="input"
        type="email"
        placeholder="Email"
        required autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn" type="submit" disabled={busy || !email}>
        {busy ? 'Sending...' : 'Send reset code'}
      </button>
      {err && <div className="error small">{err}</div>}
      <div className="muted small">
        Remembered it? <Link to={returnTo}>Back to sign in</Link>
      </div>
    </form>
  );
}
