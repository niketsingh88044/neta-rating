import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = [
  { key: 'MP', title: 'Member of Parliament', icon: '\u{1F3DB}' },
  { key: 'MLA', title: 'Legislative Assembly', icon: '\u{1F5F3}' },
  { key: 'STATE', title: 'State Leader', icon: '\u{1F3F0}' },
  { key: 'DISTRICT', title: 'District Leader', icon: '\u{1F3D9}' },
];

const GENDERS = ['Male', 'Female', 'Other'];

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [constituency, setConstituency] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');

  function onSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name) params.set('q', name);
    if (constituency) params.set('constituency', constituency);
    if (category) params.set('category', category);
    if (gender) params.set('gender', gender);
    nav(`/netas${params.toString() ? `?${params}` : ''}`);
  }

  function onReset() {
    setName(''); setConstituency(''); setCategory(''); setGender('');
  }

  return (
    <div className="home-on fade-in">
      <section className="on-hero">
        <div className="on-hero-inner">
          <h1 className="on-hero-title">
            Evaluate the profile of your{' '}
            <span className="on-hero-emph">Neta by reviews, ratings and case history</span>
          </h1>
          <p className="on-hero-sub">
            Profile data sourced from{' '}
            <a href="https://myneta.info" target="_blank" rel="noreferrer">myneta.info</a>.
            Browse, read affidavits, and rate the people who represent you.
          </p>
          {user && (
            <Link to="/profile" className="on-profile-btn">
              <span className="on-profile-avatar">{initials(user.name)}</span>
              <span className="on-profile-text">
                <span className="on-profile-label">Welcome back,</span>
                <span className="on-profile-name">{user.name} &rarr; My reviews</span>
              </span>
            </Link>
          )}
        </div>
        <div className="on-hero-faces" aria-hidden />
      </section>

      <form className="on-search" onSubmit={onSearch}>
        <div className="on-search-row">
          <div className="on-field">
            <label className="on-field-label">
              <span className="on-icon" aria-hidden>&#128100;</span>
              <span>Neta Name</span>
            </label>
            <input
              className="on-input"
              placeholder="Enter Neta Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="on-field">
            <label className="on-field-label">
              <span className="on-icon" aria-hidden>&#127960;</span>
              <span>Constituency</span>
            </label>
            <input
              className="on-input"
              placeholder="Select Constituency"
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
            />
          </div>
          <div className="on-search-actions">
            <button type="submit" className="on-btn-dark">
              <span aria-hidden>&#128269;</span> Search
            </button>
            <button type="button" className="on-btn-light" onClick={onReset}>
              <span aria-hidden>&#8634;</span> Reset
            </button>
          </div>
        </div>
      </form>

      <section className="on-body">
        <aside className="on-sidebar">
          <div className="on-side-card">
            <h3 className="on-side-title">Gender</h3>
            <div className="on-side-list">
              {GENDERS.map((g) => (
                <label key={g} className="on-radio">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === g}
                    onChange={() => setGender(g)}
                  />
                  <span className="on-radio-dot" />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="on-side-card">
            <h3 className="on-side-title">Neta Category</h3>
            <div className="on-side-list">
              {CATEGORIES.map((c) => (
                <label key={c.key} className="on-radio">
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.key}
                    onChange={() => setCategory(c.key)}
                  />
                  <span className="on-radio-dot" />
                  <span>{c.key}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="on-grid">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.key}
              to={`/netas?category=${c.key}`}
              className={`on-card on-card-${c.key} pop-in`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="on-card-photo">
                <div className="on-card-icon">{c.icon}</div>
                <div className="on-card-party" aria-hidden>&#9733;</div>
                <svg className="on-card-wave" viewBox="0 0 320 90" preserveAspectRatio="none">
                  <path d="M0,40 C80,90 240,0 320,50 L320,90 L0,90 Z" />
                </svg>
              </div>
              <div className="on-card-body">
                <div className="on-card-meta">
                  <span className="on-meta-pill"><span aria-hidden>&#128205;</span> All India</span>
                  <span className="on-meta-pill"><span aria-hidden>&#127963;</span> {c.key}</span>
                </div>
                <div className="on-card-name">{c.title}</div>
                <div className="on-card-rating">
                  <span className="on-stars" aria-hidden>{'★★★★☆'}</span>
                  <span className="on-rating-num">4.1 Rating</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
