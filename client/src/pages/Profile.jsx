import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from '../components/StarRating.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const { ratings } = await api.myRatings();
      setRatings(ratings);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (!user) return <Navigate to="/login" replace state={{ from: '/profile' }} />;

  async function remove(r) {
    if (!confirm(`Remove your rating for ${r.neta?.name || 'this neta'}?`)) return;
    try {
      await api.removeRating(r._id);
      setRatings((xs) => xs.filter((x) => x._id !== r._id));
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <section className="profile-header">
        <div>
          <h1>{user.name}</h1>
          <div className="muted small">{user.email}</div>
          <div className="row gap" style={{ marginTop: 8 }}>
            {user.isAdmin && <span className="pill pill-MP">ADMIN</span>}
            <span className={`pill ${user.emailVerified ? 'pill-STATE' : 'pill-DISTRICT'}`}>
              {user.emailVerified ? 'EMAIL VERIFIED' : 'EMAIL NOT VERIFIED'}
            </span>
          </div>
        </div>
        <div className="profile-stats">
          <div className="stat">
            <div className="stat-num">{ratings.length}</div>
            <div className="muted small">{ratings.length === 1 ? 'rating' : 'ratings'}</div>
          </div>
        </div>
      </section>

      <h2 style={{ marginTop: 24 }}>Review history</h2>
      {loading && <div className="muted">Loading...</div>}
      {err && <div className="error">{err}</div>}
      {!loading && !err && ratings.length === 0 && (
        <div className="muted">
          You haven't rated anyone yet. <Link to="/netas">Browse netas</Link> and rate a few.
        </div>
      )}

      <div className="rating-history">
        {ratings.map((r) => (
          <article key={r._id} className="rating-row card">
            <div className="card-head">
              <div>
                {r.neta ? (
                  <Link to={`/netas/${r.neta._id}`} className="card-title">{r.neta.name}</Link>
                ) : (
                  <span className="card-title muted">(neta removed)</span>
                )}
              </div>
              {r.neta?.category && (
                <span className={`pill pill-${r.neta.category}`}>{r.neta.category}</span>
              )}
            </div>
            <div className="rating-row-stars">
              <StarRating value={r.score} readOnly />
              <span className="muted small">{r.score}/5</span>
            </div>
            {r.comment && <p className="rating-row-comment">{r.comment}</p>}
            <div className="row between" style={{ alignItems: 'center', marginTop: 6 }}>
              <span className="muted small">Rated {fmt(r.updatedAt || r.createdAt)}</span>
              <button className="link danger" onClick={() => remove(r)}>Remove rating</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function fmt(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
}
