import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup, refreshUser } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState('signup'); // 'signup' | 'verify'

  // OTP stage state
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await signup(name, email, password);
      setStage('verify');
    } catch (err) {
      setError(err.message);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setCodeErr(''); setVerifyBusy(true);
    try {
      await api.verifyCode(code.trim());
      await refreshUser();
      nav('/netas');
    } catch (e) { setCodeErr(e.message); }
    finally { setVerifyBusy(false); }
  }

  async function resend() {
    setResendBusy(true); setResendMsg(''); setCodeErr('');
    try {
      await api.resendVerification();
      setResendMsg('A new code has been sent.');
    } catch (e) { setResendMsg(e.message); }
    finally { setResendBusy(false); }
  }

  if (stage === 'verify') {
    return (
      <form className="auth-card" onSubmit={verify}>
        <h1>Verify your email</h1>
        <p className="muted small" style={{ margin: 0 }}>
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish signing up.
        </p>
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
        <button className="btn" type="submit" disabled={verifyBusy || code.length !== 6}>
          {verifyBusy ? 'Verifying...' : 'Verify'}
        </button>
        {codeErr && <div className="error small">{codeErr}</div>}
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

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Sign up</h1>
      <input className="input" placeholder="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password (min 6 chars)" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" type="submit">Create account</button>
      {error && <div className="error">{error}</div>}
      <div className="muted small">Already have an account? <Link to="/login">Login</Link></div>
    </form>
  );
}
