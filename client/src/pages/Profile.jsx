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
      <section className="profile-banner">
        <div className="banner-stripes" aria-hidden>
          <div className="b-stripe b-saffron" />
          <div className="b-stripe b-white"><div className="chakra chakra-sm" /></div>
          <div className="b-stripe b-green" />
        </div>
        <div className="banner-body">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-ring" aria-hidden />
            <div className="profile-avatar">{initials(user.name)}</div>
          </div>
          <div className="banner-info">
            <h1 className="profile-name">{user.name}</h1>
            <div className="profile-email">{user.email}</div>
            <div className="profile-pills">
              {user.isAdmin && <span className="pill pill-MP">ADMIN</span>}
              <span className={`pill ${user.emailVerified ? 'pill-STATE' : 'pill-DISTRICT'}`}>
                {user.emailVerified ? 'EMAIL VERIFIED' : 'EMAIL NOT VERIFIED'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="stat-strip">
        <div className="stat-tile stat-saffron stat-pop">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">{stats.total === 1 ? 'review shared' : 'reviews shared'}</div>
        </div>
        <div className="stat-tile stat-white stat-pop">
          <div className="stat-num">{stats.total ? stats.avg.toFixed(1) : '—'}</div>
          <div className="stat-label">avg score given</div>
        </div>
        <div className="stat-tile stat-green stat-pop">
          <div className="stat-num">{stats.topCat || '—'}</div>
          <div className="stat-label">top category</div>
        </div>
      </section>

      <section className="history-section">
        <div className="section-head">
          <h2 className="section-title">Review history</h2>
          {!!ratings.length && (
            <div className="bold-tabs">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  className={`bold-tab ${sort === s.key ? 'active' : ''}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {categories.length > 1 && (
          <div className="filter-row">
            <button
              className={`big-pill ${categoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ALL')}
            >
              All <span className="big-pill-count">{stats.total}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`big-pill big-pill-${c} ${categoryFilter === c ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c)}
              >
                #{c} <span className="big-pill-count">{stats.byCat[c]}</span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="rating-history">
            {[1, 2, 3].map((i) => (
              <div key={i} className="review-card skeleton-row">
                <div className="skel skel-line skel-w-50" />
                <div className="skel skel-line skel-w-30" />
                <div className="skel skel-line skel-w-70" />
              </div>
            ))}
          </div>
        )}
        {err && <div className="error">{err}</div>}
        {!loading && !err && ratings.length === 0 && (
          <div className="empty-state">
            <div className="empty-chakra chakra" aria-hidden />
            <h3>No reviews yet</h3>
            <p>Every star helps others decide. Pick a neta and share your honest take.</p>
            <Link to="/netas" className="btn btn-lg btn-saffron">Browse netas</Link>
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
                className="review-card pop-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="review-flag" aria-hidden>
                  <span /><span /><span />
                </div>
                <div className="review-body">
                  <div className="review-head">
                    <div className="review-head-left">
                      {r.neta ? (
                        <Link to={`/netas/${r.neta._id}`} className="review-title">
                          {r.neta.name}
                        </Link>
                      ) : (
                        <span className="review-title muted">(neta removed)</span>
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
                  <div className="review-stars">
                    <StarRating value={r.score} readOnly />
                  </div>
                  {r.comment && (
                    <blockquote className="review-quote">
                      <span className="quote-mark" aria-hidden>&ldquo;</span>
                      {r.comment}
                      <span className="quote-mark" aria-hidden>&rdquo;</span>
                    </blockquote>
                  )}
                  <div className="review-foot">
                    <span className="muted small">Rated {fmt(r.updatedAt || r.createdAt)}</span>
                    <button className="link danger" onClick={() => remove(r)}>Remove rating</button>
                  </div>
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
