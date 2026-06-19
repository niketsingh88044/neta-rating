import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StarRating from '../components/StarRating.jsx';

const SORTS = [
  { key: 'recent', label: 'Most recent' },
  { key: 'highest', label: 'Highest' },
  { key: 'lowest', label: 'Lowest' },
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
    <div className="profile-on fade-in">
      <section className="on-hero on-hero-profile">
        <div className="on-hero-inner profile-banner-inner">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-ring" aria-hidden />
            <div className="profile-avatar-on">{initials(user.name)}</div>
          </div>
          <div className="profile-banner-info">
            <div className="profile-eyebrow">My profile</div>
            <h1 className="on-hero-title profile-banner-name">{user.name}</h1>
            <div className="profile-banner-email">{user.email}</div>
            <div className="profile-pills">
              {user.isAdmin && <span className="pill pill-MP">ADMIN</span>}
              <span className={`pill ${user.emailVerified ? 'pill-STATE' : 'pill-DISTRICT'}`}>
                {user.emailVerified ? 'EMAIL VERIFIED' : 'EMAIL NOT VERIFIED'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="on-stat-row">
        <div className="on-stat stat-pop">
          <div className="on-stat-num">{stats.total}</div>
          <div className="on-stat-label">{stats.total === 1 ? 'Review shared' : 'Reviews shared'}</div>
        </div>
        <div className="on-stat stat-pop">
          <div className="on-stat-num">{stats.total ? stats.avg.toFixed(1) : '—'}</div>
          <div className="on-stat-label">Avg score given</div>
        </div>
        <div className="on-stat stat-pop">
          <div className="on-stat-num">{stats.topCat || '—'}</div>
          <div className="on-stat-label">Top category</div>
        </div>
      </section>

      <section className="on-history">
        <div className="on-history-head">
          <h2 className="on-section-title">Review history</h2>
          {!!ratings.length && (
            <div className="on-sort">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  className={`on-sort-btn ${sort === s.key ? 'active' : ''}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {categories.length > 1 && (
          <div className="on-chip-row">
            <button
              className={`on-chip ${categoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ALL')}
            >
              All <span className="on-chip-count">{stats.total}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`on-chip ${categoryFilter === c ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c)}
              >
                {c} <span className="on-chip-count">{stats.byCat[c]}</span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="on-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="on-card on-card-skeleton">
                <div className="on-card-photo skel" />
                <div className="on-card-body">
                  <div className="skel skel-line skel-w-50" />
                  <div className="skel skel-line skel-w-30" />
                  <div className="skel skel-line skel-w-70" />
                </div>
              </div>
            ))}
          </div>
        )}
        {err && <div className="error">{err}</div>}
        {!loading && !err && ratings.length === 0 && (
          <div className="on-empty">
            <div className="on-empty-icon" aria-hidden>&#9734;</div>
            <h3>No reviews yet</h3>
            <p>Every star helps others decide. Pick a neta and share your honest take.</p>
            <Link to="/netas" className="on-btn-dark">Browse netas</Link>
          </div>
        )}
        {!loading && !err && ratings.length > 0 && visible.length === 0 && (
          <div className="muted" style={{ marginTop: 12 }}>
            No reviews in this category. <button className="link" onClick={() => setCategoryFilter('ALL')}>Show all</button>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="on-grid">
            {visible.map((r, i) => (
              <article
                key={r._id}
                className={`on-card on-review-card pop-in ${r.neta?.category ? `on-card-${r.neta.category}` : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="on-card-photo">
                  <div className="on-card-initials">{initials(r.neta?.name)}</div>
                  <div className={`on-card-party score-tag score-${r.score}`}>{r.score}/5</div>
                  <svg className="on-card-wave" viewBox="0 0 320 90" preserveAspectRatio="none">
                    <path d="M0,40 C80,90 240,0 320,50 L320,90 L0,90 Z" />
                  </svg>
                </div>
                <div className="on-card-body">
                  <div className="on-card-meta">
                    {r.neta?.category && (
                      <span className="on-meta-pill">
                        <span aria-hidden>&#127963;</span> {r.neta.category}
                      </span>
                    )}
                    <span className="on-meta-pill on-meta-date">
                      <span aria-hidden>&#128197;</span> {fmt(r.updatedAt || r.createdAt)}
                    </span>
                  </div>
                  {r.neta ? (
                    <Link to={`/netas/${r.neta._id}`} className="on-card-name on-card-link">
                      {r.neta.name}
                    </Link>
                  ) : (
                    <div className="on-card-name muted">(neta removed)</div>
                  )}
                  <div className="on-card-rating">
                    <StarRating value={r.score} readOnly />
                    <span className="on-rating-num">{r.score}.0 Rating</span>
                  </div>
                  {r.comment && (
                    <p className="on-review-quote">&ldquo;{r.comment}&rdquo;</p>
                  )}
                  <button className="on-remove-btn" onClick={() => remove(r)}>Remove rating</button>
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
