import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ApplyAdmin() {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const { applications } = await api.myApplications();
      setApps(applications);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (!user) return <Navigate to="/login" replace state={{ from: '/apply-admin' }} />;
  if (user.isAdmin) {
    return (
      <div className="auth-card">
        <h1>You're already an admin</h1>
        <p className="muted">No application needed.</p>
        <Link className="btn" to="/admin">Go to admin panel</Link>
      </div>
    );
  }

  const pending = apps.find((a) => a.status === 'pending');
  const lastDecided = apps.find((a) => a.status !== 'pending');

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.applyForAdmin(reason);
      setReason('');
      setMsg('Application submitted. An existing admin will review it.');
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-card" style={{ maxWidth: 560 }}>
      <h1>Apply for admin access</h1>
      <p className="muted small" style={{ margin: 0 }}>
        Admins can add, edit, and bulk-scrape neta records. Tell an existing admin why you need access.
      </p>

      {pending ? (
        <div className="prefill-card" style={{ marginTop: 12 }}>
          <strong>Application pending review</strong>
          <div className="muted small">Submitted {fmt(pending.createdAt)}</div>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{pending.reason}</div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <label className="field">
            <span>Why should you be an admin? <span className="muted small">(10–1000 chars)</span></span>
            <textarea
              className="input" required minLength={10} maxLength={1000} rows={5}
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. I'm researching UP 2027 candidates and would like to contribute scraped data..."
            />
          </label>
          <button className="btn" type="submit" disabled={busy || reason.trim().length < 10}>
            {busy ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      )}

      {msg && <div className="success small">{msg}</div>}
      {err && <div className="error small">{err}</div>}

      {lastDecided && (
        <div className="small muted" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <strong>Previous decision:</strong> {lastDecided.status} on {fmt(lastDecided.decidedAt)}
          {lastDecided.decisionNote ? <> — “{lastDecided.decisionNote}”</> : null}
        </div>
      )}

      {loading && <div className="muted small">Loading your application history...</div>}
    </div>
  );
}

function fmt(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}
