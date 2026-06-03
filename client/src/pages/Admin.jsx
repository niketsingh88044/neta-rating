import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = ['MP', 'MLA', 'STATE', 'DISTRICT'];
const EMPTY = {
  name: '', party: '', constituency: '', state: '', category: 'MLA', election: '',
  education: '', assets: '', liabilities: '', criminalCases: 0,
  sourceUrl: '', photoUrl: '',
};

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('add');
  const [manageSearch, setManageSearch] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  function showInManage(query) {
    setManageSearch(query);
    setTab('manage');
  }

  // Re-verify admin status with the server on mount so a stale cached `user`
  // (e.g. demoted account, deleted user) can't keep the panel visible.
  useEffect(() => {
    let cancelled = false;
    api.me()
      .then(({ user }) => {
        if (cancelled) return;
        if (!user?.isAdmin) setVerifyError('Your account is no longer an administrator.');
        else setVerified(true);
      })
      .catch((e) => { if (!cancelled) setVerifyError(e.message); });
    return () => { cancelled = true; };
  }, []);

  if (verifyError) {
    return (
      <div className="auth-card">
        <h1>Access revoked</h1>
        <p className="error">{verifyError}</p>
        <p className="muted small">Reload after signing in again, or contact an administrator.</p>
      </div>
    );
  }
  if (!verified) return <div className="muted">Verifying admin access...</div>;

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Admin panel</h1>
        <div className="admin-badge">
          <span className="pill pill-MP">ADMIN</span>
          <span className="muted small">Signed in as {user?.name} ({user?.email})</span>
        </div>
      </div>
      <div className="tabs admin-tabs">
        <button className={`tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>Add neta</button>
        <button className={`tab ${tab === 'scrape' ? 'active' : ''}`} onClick={() => setTab('scrape')}>Bulk scrape</button>
        <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>Manage</button>
        <button className={`tab ${tab === 'applications' ? 'active' : ''}`} onClick={() => setTab('applications')}>Applications</button>
      </div>
      {tab === 'add' && <AddTab onShowInManage={showInManage} />}
      {tab === 'scrape' && <ScrapeForm />}
      {tab === 'manage' && <Manage initialQuery={manageSearch} />}
      {tab === 'applications' && <Applications />}
    </div>
  );
}

/* ---------- Add tab: URL prefill + manual form ---------- */

function AddTab({ onShowInManage }) {
  const [prefill, setPrefill] = useState(null);
  const [duplicate, setDuplicate] = useState(null); // { name, id }
  return (
    <>
      <UrlPrefill onLoaded={setPrefill} />
      {duplicate && (
        <div className="error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>{duplicate.message}</span>
          <button type="button" className="btn" onClick={() => onShowInManage(duplicate.name)}>
            Find in Manage
          </button>
        </div>
      )}
      <NetaForm
        key={prefill ? prefill.name : 'blank'}
        initial={prefill || EMPTY}
        submitLabel="Create"
        onSubmit={async (payload) => {
          setDuplicate(null);
          try {
            await api.admin.create(payload);
          } catch (e) {
            if (e.status === 409 && e.body?.duplicateId) {
              setDuplicate({ message: e.message, name: payload.name, id: e.body.duplicateId });
            }
            throw e;
          }
        }}
      />
    </>
  );
}

function UrlPrefill({ onLoaded }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');

  async function fetchIt() {
    if (!url) return;
    setBusy(true); setErr(''); setHint('');
    try {
      const { candidate } = await api.admin.scrapeCandidate(url);
      // Normalize the scraped fields to the Add form's shape.
      onLoaded({
        ...EMPTY,
        name: candidate.name || '',
        party: candidate.party || '',
        constituency: candidate.constituency || '',
        state: candidate.state || '',
        election: candidate.election || '',
        education: candidate.education || '',
        criminalCases: candidate.criminalCases || 0,
        assets: candidate.assets || '',
        liabilities: candidate.liabilities || '',
        sourceUrl: candidate.sourceUrl || url,
        photoUrl: candidate.photoUrl || '',
        category: 'MLA',
      });
      setHint('Form pre-filled. Review, set Category, then Create.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="prefill-card">
      <div className="muted small" style={{ marginBottom: 6 }}>Quick-add from a myneta.info candidate URL:</div>
      <div className="row gap">
        <input
          className="input" type="url" placeholder="https://myneta.info/.../candidate.php?candidate_id=..."
          value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }}
        />
        <button className="btn" onClick={fetchIt} disabled={busy || !url}>
          {busy ? 'Fetching...' : 'Prefill form'}
        </button>
      </div>
      {hint && <div className="success small" style={{ marginTop: 6 }}>{hint}</div>}
      {err && <div className="error small" style={{ marginTop: 6 }}>{err}</div>}
    </div>
  );
}

/* ---------- Reusable form ---------- */

function NetaForm({ initial = EMPTY, onSubmit, submitLabel = 'Create' }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setErr('');
    try {
      const payload = { ...form, criminalCases: Number(form.criminalCases) || 0 };
      await onSubmit(payload);
      setMsg('Saved.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="admin-form">
      <div className="row gap">
        <label className="field"><span>Name *</span><input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="field"><span>Category *</span>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="row gap">
        <label className="field"><span>Party</span><input className="input" value={form.party} onChange={(e) => set('party', e.target.value)} /></label>
        <label className="field"><span>Constituency</span><input className="input" value={form.constituency} onChange={(e) => set('constituency', e.target.value)} /></label>
      </div>
      <div className="row gap">
        <label className="field"><span>State</span><input className="input" value={form.state} onChange={(e) => set('state', e.target.value)} /></label>
        <label className="field"><span>Election</span><input className="input" placeholder="e.g. Uttar Pradesh 2022" value={form.election} onChange={(e) => set('election', e.target.value)} /></label>
      </div>
      <div className="row gap">
        <label className="field"><span>Education</span><input className="input" value={form.education} onChange={(e) => set('education', e.target.value)} /></label>
        <label className="field"><span>Criminal cases</span><input className="input" type="number" min="0" value={form.criminalCases} onChange={(e) => set('criminalCases', e.target.value)} /></label>
      </div>
      <div className="row gap">
        <label className="field"><span>Assets</span><input className="input" value={form.assets} onChange={(e) => set('assets', e.target.value)} /></label>
        <label className="field"><span>Liabilities</span><input className="input" value={form.liabilities} onChange={(e) => set('liabilities', e.target.value)} /></label>
      </div>
      <label className="field">
        <span>Photo URL <span className="muted small">(remote URLs are auto-downloaded to local storage on save)</span></span>
        <div className="row gap" style={{ alignItems: 'center' }}>
          <input className="input" value={form.photoUrl} onChange={(e) => set('photoUrl', e.target.value)} style={{ flex: 1 }} />
          {form.photoUrl && (
            <img src={form.photoUrl} alt="" className="photo-preview" referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
        </div>
      </label>
      <label className="field"><span>Source URL</span><input className="input" value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} /></label>
      <div className="row gap">
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : submitLabel}</button>
      </div>
      {msg && <div className="success">{msg}</div>}
      {err && <div className="error">{err}</div>}
    </form>
  );
}

/* ---------- Bulk scrape ---------- */

function ScrapeForm() {
  const [listingUrl, setListingUrl] = useState('');
  const [category, setCategory] = useState('MLA');
  const [state, setState] = useState('');
  const [election, setElection] = useState('');
  const [withPhotos, setWithPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(''); setResult(null);
    try {
      const r = await api.admin.scrapeImport({ listingUrl, category, state, election, withPhotos });
      setResult(r);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="admin-form">
      <label className="field"><span>myneta.info winners listing URL *</span>
        <input
          className="input" required type="url"
          placeholder="https://myneta.info/uttarpradesh2022/index.php?action=show_winners&sort=default"
          value={listingUrl} onChange={(e) => setListingUrl(e.target.value)}
        />
      </label>
      <div className="row gap">
        <label className="field"><span>Category *</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="field"><span>State</span>
          <input className="input" placeholder="e.g. Maharashtra" value={state} onChange={(e) => setState(e.target.value)} />
        </label>
        <label className="field"><span>Election label</span>
          <input className="input" placeholder="e.g. Maharashtra 2024" value={election} onChange={(e) => setElection(e.target.value)} />
        </label>
      </div>
      <label className="row gap" style={{ alignItems: 'center' }}>
        <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
        <span>Fetch photos (slow — capped at first 25 in sync mode; downloads to local storage)</span>
      </label>
      <button className="btn" type="submit" disabled={busy || !listingUrl}>
        {busy ? 'Scraping... (may take a minute)' : 'Scrape & import'}
      </button>
      {err && <div className="error">{err}</div>}
      {result && (
        <div className="success">
          Parsed {result.parsed} rows. <strong>Inserted {result.inserted}</strong>, updated {result.updated}.
          {result.photosFetched ? <> Fetched {result.photosFetched} photos ({result.photosLocalized} saved locally).</> : null}
          {result.note ? <div className="muted small">{result.note}</div> : null}
        </div>
      )}
    </form>
  );
}

/* ---------- Applications tab ---------- */

function Applications() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [acting, setActing] = useState(null); // { id, action } while a request is in flight

  async function load() {
    setBusy(true); setErr('');
    try {
      const { applications } = await api.admin.listApplications(statusFilter);
      setItems(applications);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  async function decide(app, action) {
    const verb = action === 'approve' ? 'approve' : 'reject';
    const note = prompt(`Optional note for the applicant (${verb}):`, '') || '';
    if (note === null) return;
    setActing({ id: app._id, action });
    try {
      if (action === 'approve') await api.admin.approveApplication(app._id, note);
      else await api.admin.rejectApplication(app._id, note);
      await load();
    } catch (e) { alert(e.message); }
    finally { setActing(null); }
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 14 }}>
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            className={`tab ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {err && <div className="error">{err}</div>}
      {busy ? <div className="muted">Loading...</div> : null}
      {!busy && !items.length && <div className="muted">No {statusFilter} applications.</div>}
      <table className="admin-table">
        <tbody>
          {items.map((app) => (
            <tr key={app._id}>
              <td style={{ minWidth: 200 }}>
                <div><strong>{app.user?.name || '(deleted user)'}</strong></div>
                <div className="muted small">{app.user?.email || ''}</div>
                <div className="muted small">Applied {fmt(app.createdAt)}</div>
              </td>
              <td style={{ whiteSpace: 'pre-wrap' }}>{app.reason}</td>
              <td style={{ minWidth: 180, textAlign: 'right' }}>
                {app.status === 'pending' ? (
                  <div className="row gap" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn"
                      disabled={!!acting}
                      onClick={() => decide(app, 'approve')}
                    >
                      {acting?.id === app._id && acting.action === 'approve' ? '...' : 'Approve'}
                    </button>
                    <button
                      className="link danger"
                      disabled={!!acting}
                      onClick={() => decide(app, 'reject')}
                    >
                      {acting?.id === app._id && acting.action === 'reject' ? '...' : 'Reject'}
                    </button>
                  </div>
                ) : (
                  <div className="small">
                    <span className={`pill ${app.status === 'approved' ? 'pill-STATE' : 'pill-DISTRICT'}`}>
                      {app.status.toUpperCase()}
                    </span>
                    <div className="muted" style={{ marginTop: 4 }}>
                      by {app.decidedBy?.name || '?'} • {fmt(app.decidedAt)}
                    </div>
                    {app.decisionNote && <div className="muted" style={{ marginTop: 4 }}>"{app.decisionNote}"</div>}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmt(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

/* ---------- Manage tab ---------- */

function Manage({ initialQuery = '' }) {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState('');
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load(query = q) {
    setBusy(true); setErr('');
    try {
      const params = { limit: 50 };
      if (query) params.q = query;
      if (category) params.category = category;
      const data = await api.listNetas(params);
      setItems(data.items);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  // Reload whenever an external initialQuery prop changes (e.g. AddTab pushed a duplicate name).
  useEffect(() => { setQ(initialQuery); load(initialQuery); /* eslint-disable-next-line */ }, [initialQuery]);

  async function remove(neta) {
    if (!confirm(`Delete ${neta.name}?`)) return;
    await api.admin.remove(neta._id);
    setItems((xs) => xs.filter((x) => x._id !== neta._id));
  }

  if (editing) {
    return (
      <div>
        <button className="link" onClick={() => setEditing(null)}>← Back to list</button>
        <h2>Editing {editing.name}</h2>
        <NetaForm
          initial={editing}
          submitLabel="Update"
          onSubmit={async (payload) => {
            const { neta } = await api.admin.update(editing._id, payload);
            setEditing(null);
            setItems((xs) => xs.map((x) => (x._id === neta._id ? neta : x)));
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="filters">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          className="input" placeholder="Search name / party / constituency"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="btn" onClick={load} disabled={busy}>{busy ? 'Loading...' : 'Search'}</button>
      </div>
      {err && <div className="error">{err}</div>}
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 60 }}>Photo</th>
            <th>Name</th>
            <th>Party</th>
            <th>Category</th>
            <th>Constituency</th>
            <th>State</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((n) => (
            <tr key={n._id}>
              <td>
                {n.photoUrl ? (
                  <img src={n.photoUrl} alt="" className="thumb" referrerPolicy="no-referrer"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <div className="thumb thumb-placeholder">—</div>
                )}
              </td>
              <td>{n.name}</td>
              <td>{n.party}</td>
              <td>{n.category}</td>
              <td>{n.constituency}</td>
              <td>{n.state}</td>
              <td className="row gap">
                <button className="link" onClick={() => setEditing(n)}>Edit</button>
                <button className="link danger" onClick={() => remove(n)}>Delete</button>
              </td>
            </tr>
          ))}
          {!items.length && !busy && <tr><td colSpan={7} className="muted">No netas. Try changing filters.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
