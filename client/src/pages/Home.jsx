import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = [
  { key: 'MP', title: 'Members of Parliament', desc: 'Lok Sabha & Rajya Sabha', icon: '\u{1F3DB}' },
  { key: 'MLA', title: 'MLAs', desc: 'State legislative assemblies', icon: '\u{1F5F3}' },
  { key: 'STATE', title: 'State Leaders', desc: 'CMs, state office-bearers', icon: '\u{1F3F0}' },
  { key: 'DISTRICT', title: 'District Leaders', desc: 'Mayors, district representatives', icon: '\u{1F3D9}' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="home fade-in">
      <section className="hero hero-fancy">
        <div className="hero-badge">
          <span className="hero-dot" /> Live · powered by myneta.info
        </div>
        <h1 className="hero-title">
          Rate <span className="gradient-text">your representatives</span>.
        </h1>
        <p className="hero-sub">
          Browse profiles by category, read affidavit info, and give the people who represent you
          a star rating they earn.
        </p>
        <div className="hero-cta">
          <Link to="/netas" className="btn btn-lg">Browse all netas <span aria-hidden>&rarr;</span></Link>
          <Link to={user ? '/profile' : '/login'} className="btn btn-secondary btn-lg">
            {user ? 'My profile & review history' : 'Login to see your reviews'}
          </Link>
        </div>
      </section>

      <section className="category-section">
        <div className="section-head">
          <h2>Browse by category</h2>
          <Link to="/netas" className="link small">View all &rarr;</Link>
        </div>
        <div className="grid">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.key}
              to={`/netas?category=${c.key}`}
              className={`card category-card cat-${c.key} pop-in`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="cat-icon" aria-hidden>{c.icon}</div>
              <div className="card-title">{c.title}</div>
              <div className="muted small">{c.desc}</div>
              <div className="cat-cta">Explore &rarr;</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
