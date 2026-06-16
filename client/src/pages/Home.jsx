import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = [
  { key: 'MP', title: 'Members of Parliament', desc: 'Lok Sabha & Rajya Sabha' },
  { key: 'MLA', title: 'MLAs', desc: 'State legislative assemblies' },
  { key: 'STATE', title: 'State Leaders', desc: 'CMs, state office-bearers' },
  { key: 'DISTRICT', title: 'District Leaders', desc: 'Mayors, district representatives' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <section className="hero">
        <h1>Rate your representatives.</h1>
        <p className="muted">
          Profile data sourced from <a href="https://myneta.info" target="_blank" rel="noreferrer">myneta.info</a>.
          Browse by category, read affidavit info, and rate the people who represent you.
        </p>
        <div className="row gap" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <Link to="/netas" className="btn">Browse all netas</Link>
          <Link to={user ? '/profile' : '/login'} className="btn btn-secondary">
            {user ? 'My profile & review history' : 'Login to see your review history'}
          </Link>
        </div>
      </section>

      <section>
        <h2>Browse by category</h2>
        <div className="grid">
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={`/netas?category=${c.key}`} className="card category-card">
              <div className="card-title">{c.title}</div>
              <div className="muted small">{c.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
