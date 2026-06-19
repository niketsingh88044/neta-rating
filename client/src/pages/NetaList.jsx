import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import NetaCard from '../components/NetaCard.jsx';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'MP', label: 'MPs' },
  { key: 'MLA', label: 'MLAs' },
  { key: 'STATE', label: 'State' },
  { key: 'DISTRICT', label: 'District' },
];

const CATEGORY_BLURB = {
  MP: 'Members of Parliament — Lok Sabha & Rajya Sabha',
  MLA: 'Members of Legislative Assembly across states',
  STATE: 'Chief Ministers & state office-bearers',
  DISTRICT: 'Mayors and district representatives',
};

const PAGE_SIZE = 24;

export default function NetaList() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const category = params.get('category') || '';
  const state = params.get('state') || '';
  const q = params.get('q') || '';
  const sort = params.get('sort') || 'top';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));

  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => { setSearchInput(q); }, [q]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    api.states().then(({ states }) => setStates(states)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const query = { limit: PAGE_SIZE, page };
    if (category) query.category = category;
    if (state) query.state = state;
    if (q) query.q = q;
    if (sort) query.sort = sort;
    api
      .listNetas(query)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, state, q, sort, page]);

  useEffect(() => {
    if (!loading && total > 0 && page > totalPages) {
      update({ page: '' });
    }
  }, [totalPages, page, total, loading]); // eslint-disable-line

  function update(patch) {
    const next = new URLSearchParams(params);
    const filterKeys = ['category', 'state', 'q', 'sort'];
    let touchedFilter = false;
    for (const [k, v] of Object.entries(patch)) {
      if (filterKeys.includes(k)) touchedFilter = true;
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (touchedFilter) next.delete('page');
    setParams(next);
  }

  function goToPage(p) {
    if (p < 1 || p > totalPages || p === page) return;
    update({ page: p === 1 ? '' : String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const heading = category
    ? `Browse ${CATEGORIES.find((c) => c.key === category)?.label || 'netas'}`
    : 'Browse all netas';
  const blurb = category
    ? CATEGORY_BLURB[category]
    : 'Evaluate the profile of your Neta by reviews, ratings and case history.';

  return (
    <div className="netalist-on fade-in">
      <section className="on-hero on-hero-list">
        <div className="on-hero-inner">
          <div className="on-hero-eyebrow">Public scorecard</div>
          <h1 className="on-hero-title">{heading}</h1>
          <p className="on-hero-sub">{blurb}</p>
        </div>
      </section>

      <div className="on-search">
        <div className="on-search-row on-search-row-list">
          <div className="on-field">
            <label className="on-field-label">
              <span className="on-icon" aria-hidden>&#128269;</span>
              <span>Search</span>
            </label>
            <input
              className="on-input"
              placeholder="Search by name / party / constituency"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') update({ q: searchInput.trim() });
              }}
            />
          </div>
          <div className="on-field">
            <label className="on-field-label">
              <span className="on-icon" aria-hidden>&#127760;</span>
              <span>State</span>
            </label>
            <select
              className="on-input on-input-select"
              value={state}
              onChange={(e) => update({ state: e.target.value })}
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="on-search-actions">
            <button
              type="button"
              className="on-btn-dark"
              onClick={() => update({ q: searchInput.trim() })}
              disabled={searchInput.trim() === q}
            >
              <span aria-hidden>&#128269;</span> Search
            </button>
            <button
              type="button"
              className="on-btn-light"
              onClick={() => {
                setSearchInput('');
                setParams(new URLSearchParams());
              }}
            >
              <span aria-hidden>&#8634;</span> Reset
            </button>
          </div>
        </div>
      </div>

      <div className="on-toolbar">
        <div className="on-chip-row" style={{ marginBottom: 0 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key || 'all'}
              className={`on-chip ${category === c.key ? 'active' : ''}`}
              onClick={() => update({ category: c.key })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="on-toolbar-right">
          <label className="on-sort-label">Sort</label>
          <select
            className="on-input on-input-select on-sort-select"
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
          >
            <option value="top">Top rated</option>
            <option value="new">Newest</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {!loading && !error && (
        <div className="on-result-bar">
          <span>
            <strong>{total}</strong> result{total === 1 ? '' : 's'}
            {total > 0 && <> — page {page} of {totalPages}</>}
          </span>
          {(category || state || q) && (
            <button className="link" onClick={() => setParams(new URLSearchParams())}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="on-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <>
          <div className="on-grid">
            {items.map((n, i) => (
              <div key={n._id} className="pop-in" style={{ animationDelay: `${(i % 12) * 30}ms` }}>
                <NetaCard neta={n} />
              </div>
            ))}
          </div>
          {!items.length && (
            <div className="on-empty">
              <div className="on-empty-icon" aria-hidden>&#128269;</div>
              <h3>No netas found</h3>
              <p>Try adjusting your filters or clearing them.</p>
              <button className="on-btn-dark" onClick={() => setParams(new URLSearchParams())}>
                Clear all filters
              </button>
            </div>
          )}
          {totalPages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button
                className="pager-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <span className="pager-arrow">&larr;</span> Prev
              </button>
              <span className="pager-status" aria-live="polite">
                Page <strong>{page}</strong> of {totalPages}
              </span>
              <button
                className="pager-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                Next <span className="pager-arrow">&rarr;</span>
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
