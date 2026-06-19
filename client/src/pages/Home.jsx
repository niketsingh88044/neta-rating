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
      <section className="hero-flag">
        <div className="flag-stripes" aria-hidden>
          <div className="stripe stripe-saffron" />
          <div className="stripe stripe-white">
            <div className="chakra" />
          </div>
          <div className="stripe stripe-green" />
        </div>

        <div className="hero-content">
          <div className="hero-tagline">For the people. By the people.</div>
          <h1 className="hero-mega">
            <span className="word word-1">RATE.</span>{' '}
            <span className="word word-2">REVIEW.</span>{' '}
            <span className="word word-3">REPRESENT.</span>
          </h1>
          <p className="hero-sub-big">
            India's open scorecard for the people who represent you. Profile data from{' '}
            <a href="https://myneta.info" target="_blank" rel="noreferrer">myneta.info</a>.
          </p>
          <div className="hero-cta">
            <Link to="/netas" className="btn btn-lg btn-saffron">Browse all netas &rarr;</Link>
            <Link to={user ? '/profile' : '/login'} className="btn btn-lg btn-green">
              {user ? 'My review history' : 'Login to review'}
            </Link>
          </div>
        </div>
      </section>

      <section className="category-section">
        <div className="section-head">
          <h2 className="section-title">Browse by category</h2>
          <Link to="/netas" className="link small">View all &rarr;</Link>
        </div>
        <div className="cat-grid">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.key}
              to={`/netas?category=${c.key}`}
              className={`cat-tile cat-${c.key} pop-in`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="cat-tile-stripes" aria-hidden>
                <span className="strip s1" />
                <span className="strip s2" />
                <span className="strip s3" />
              </div>
              <div className="cat-icon" aria-hidden>{c.icon}</div>
              <div className="cat-tile-title">{c.title}</div>
              <div className="cat-tile-desc">{c.desc}</div>
              <div className="cat-cta">Explore &rarr;</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
