import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmail() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  if (!user) return <Navigate to="/login" replace state={{ from: '/verify-email' }} />;
  if (user.emailVerified) {
    return (
      <div className="auth-card">
        <h1>Already verified</h1>
        <p className="success">Your email is verified.</p>
        <Link className="btn" to="/netas">Browse netas</Link>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await api.verifyCode(code.trim());
      await refreshUser();
      nav('/netas');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function resend() {
    setResendBusy(true); setResendMsg(''); setErr('');
    try {
      await api.resendVerification();
      setResendMsg('A new code has been sent to your email.');
    } catch (e) { setResendMsg(e.message); }
    finally { setResendBusy(false); }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Enter verification code</h1>
      <p className="muted small" style={{ margin: 0 }}>
        We sent a 6-digit code to <strong>{user.email}</strong>. Enter it below to verify your account.
      </p>
      <input
        className="input otp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      <button className="btn" type="submit" disabled={busy || code.length !== 6}>
        {busy ? 'Verifying...' : 'Verify'}
      </button>
      {err && <div className="error small">{err}</div>}
      <div className="row between" style={{ marginTop: 4 }}>
        <span className="muted small">Didn't get the code? Check spam, or</span>
        <button type="button" className="link" onClick={resend} disabled={resendBusy}>
          {resendBusy ? 'Sending...' : 'Resend code'}
        </button>
      </div>
      {resendMsg && <div className="small muted">{resendMsg}</div>}
    </form>
  );
}
