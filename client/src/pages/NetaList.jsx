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

  // Search input is controlled separately from the applied `q` so the user can
  // type without re-fetching on every keystroke; we re-sync when `q` changes
  // externally (e.g. when "Clear filters" runs).
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

  // If a filter change makes the current page out of range, drop back to page 1.
  useEffect(() => {
    if (!loading && total > 0 && page > totalPages) {
      update({ page: '' });
    }
  }, [totalPages, page, total, loading]); // eslint-disable-line

  // Filter changes should reset to page 1.
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

  return (
    <div>
      <div className="filters">
        <div className="tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key || 'all'}
              className={`tab ${category === c.key ? 'active' : ''}`}
              onClick={() => update({ category: c.key })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={state}
          onChange={(e) => update({ state: e.target.value })}
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Search by name / party / constituency"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') update({ q: searchInput.trim() });
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => update({ q: searchInput.trim() })}
          disabled={searchInput.trim() === q}
        >
          Search
        </button>
        {q && (
          <button
            type="button"
            className="link"
            onClick={() => { setSearchInput(''); update({ q: '' }); }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="top">Top rated</option>
          <option value="new">Newest</option>
          <option value="name">Name</option>
        </select>
        {(category || state || q) && (
          <button className="link" onClick={() => setParams(new URLSearchParams())}>Clear filters</button>
        )}
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <>
          <div className="muted small">
            {total} result{total === 1 ? '' : 's'}
            {total > 0 && <> — page {page} of {totalPages}</>}
          </div>
          <div className="grid">
            {items.map((n) => (
              <NetaCard key={n._id} neta={n} />
            ))}
          </div>
          {!items.length && <div className="muted">No netas found. Try adjusting filters.</div>}
          {totalPages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button
                className="pager-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <span className="pager-arrow">←</span> Prev
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
                Next <span className="pager-arrow">→</span>
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
