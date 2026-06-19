import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from '../components/StarRating.jsx';

const SORTS = [
  { key: 'recent', label: 'Most recent' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest', label: 'Lowest rated' },
];

export default function Profile() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState('recent');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  async function load() {
    setLoading(true); setErr('');
    try {
      const { ratings } = await api.myRatings();
      setRatings(ratings);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = ratings.length;
    const avg = total ? ratings.reduce((s, r) => s + (r.score || 0), 0) / total : 0;
    const byCat = ratings.reduce((acc, r) => {
      const k = r.neta?.category || 'OTHER';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { total, avg, byCat, topCat };
  }, [ratings]);

  const visible = useMemo(() => {
    let list = ratings;
    if (categoryFilter !== 'ALL') list = list.filter((r) => r.neta?.category === categoryFilter);
    const arr = [...list];
    if (sort === 'recent') {
      arr.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    } else if (sort === 'highest') {
      arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sort === 'lowest') {
      arr.sort((a, b) => (a.score || 0) - (b.score || 0));
    }
    return arr;
  }, [ratings, sort, categoryFilter]);

  if (!user) return <Navigate to="/login" replace state={{ from: '/profile' }} />;

  async function remove(r) {
    if (!confirm(`Remove your rating for ${r.neta?.name || 'this neta'}?`)) return;
    try {
      await api.removeRating(r._id);
      setRatings((xs) => xs.filter((x) => x._id !== r._id));
    } catch (e) { alert(e.message); }
  }

  const categories = Object.keys(stats.byCat);

  return (
    <div className="profile-page fade-in">
      <section className="profile-header card">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden>{initials(user.name)}</div>
          <div>
            <h1 className="profile-name">{user.name}</h1>
            <div className="muted small">{user.email}</div>
            <div className="row gap" style={{ marginTop: 8 }}>
              {user.isAdmin && <span className="pill pill-MP">ADMIN</span>}
              <span className={`pill ${user.emailVerified ? 'pill-STATE' : 'pill-DISTRICT'}`}>
                {user.emailVerified ? 'EMAIL VERIFIED' : 'EMAIL NOT VERIFIED'}
              </span>
            </div>
          </div>
        </div>
        <div className="profile-stats">
          <div className="stat stat-pop">
            <div className="stat-num">{stats.total}</div>
            <div className="muted small">{stats.total === 1 ? 'review' : 'reviews'}</div>
          </div>
          <div className="stat stat-pop">
            <div className="stat-num">{stats.total ? stats.avg.toFixed(1) : '—'}</div>
            <div className="muted small">avg score</div>
          </div>
          <div className="stat stat-pop">
            <div className="stat-num">{stats.topCat || '—'}</div>
            <div className="muted small">top category</div>
          </div>
        </div>
      </section>

      <section className="history-section">
        <div className="section-head">
          <h2>Review history</h2>
          {!!ratings.length && (
            <div className="row gap" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="tabs">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    className={`tab ${sort === s.key ? 'active' : ''}`}
                    onClick={() => setSort(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {categories.length > 1 && (
          <div className="filter-row">
            <button
              className={`chip-btn ${categoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ALL')}
            >
              All <span className="chip-count">{stats.total}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`chip-btn pill-${c} ${categoryFilter === c ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c)}
              >
                {c} <span className="chip-count">{stats.byCat[c]}</span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="rating-history">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rating-row card skeleton-row">
                <div className="skel skel-line skel-w-50" />
                <div className="skel skel-line skel-w-30" />
                <div className="skel skel-line skel-w-70" />
              </div>
            ))}
          </div>
        )}
        {err && <div className="error">{err}</div>}
        {!loading && !err && ratings.length === 0 && (
          <div className="empty-state card">
            <div className="empty-icon" aria-hidden>&#9734;</div>
            <h3>No reviews yet</h3>
            <p className="muted">Every star helps others decide. Pick a neta and share your honest take.</p>
            <Link to="/netas" className="btn">Browse netas</Link>
          </div>
        )}
        {!loading && !err && ratings.length > 0 && visible.length === 0 && (
          <div className="muted" style={{ marginTop: 12 }}>
            No reviews in this category. <button className="link" onClick={() => setCategoryFilter('ALL')}>Show all</button>
          </div>
        )}

        {!loading && (
          <div className="rating-history">
            {visible.map((r, i) => (
              <article
                key={r._id}
                className="rating-row card hover-lift pop-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="rating-row-head">
                  <div className="rating-row-left">
                    {r.neta ? (
                      <Link to={`/netas/${r.neta._id}`} className="card-title rating-row-title">
                        {r.neta.name}
                      </Link>
                    ) : (
                      <span className="card-title muted">(neta removed)</span>
                    )}
                    {r.neta?.category && (
                      <span className={`pill pill-${r.neta.category}`}>{r.neta.category}</span>
                    )}
                  </div>
                  <div className={`score-badge score-${r.score}`}>
                    <span className="score-num">{r.score}</span>
                    <span className="score-of">/5</span>
                  </div>
                </div>
                <div className="rating-row-stars">
                  <StarRating value={r.score} readOnly />
                </div>
                {r.comment && <p className="rating-row-comment">"{r.comment}"</p>}
                <div className="rating-row-foot">
                  <span className="muted small">Rated {fmt(r.updatedAt || r.createdAt)}</span>
                  <button className="link danger" onClick={() => remove(r)}>Remove rating</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function fmt(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
}
