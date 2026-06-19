import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function initials(name = '') {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

const CATEGORY_LABEL = {
  MP: 'Member of Parliament',
  MLA: 'Member of Legislative Assembly',
  STATE: 'State Leader',
  DISTRICT: 'District Leader',
};

export default function NetaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [neta, setNeta] = useState(null);
  const [recent, setRecent] = useState([]);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiSource, setAiSource] = useState('admin');
  const [aiErr, setAiErr] = useState('');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState('');

  function load() {
    api
      .getNeta(id)
      .then(({ neta, recentRatings }) => {
        setNeta(neta);
        setRecent(recentRatings);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [id]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.rate({ netaId: id, score, comment });
      setMsg('Thanks for rating!');
      setComment('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate('/netas');
  }

  function openAiPanel() {
    setAiErr(''); setAiSaved('');
    setAiText(neta?.editorialReview?.text || '');
    setAiSource(neta?.editorialReview?.source || 'admin');
    setAiOpen(true);
  }

  async function generateReview() {
    setAiErr(''); setAiSaved(''); setAiLoading(true);
    try {
      const { review } = await api.admin.aiReview(id);
      setAiText(review);
      setAiSource('ai');
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveReview() {
    setAiErr(''); setAiSaved(''); setAiSaving(true);
    try {
      const { editorialReview } = await api.admin.saveEditorialReview(id, {
        text: aiText,
        source: aiSource,
      });
      setNeta((n) => ({ ...n, editorialReview }));
      setAiSaved('Review saved.');
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiSaving(false);
    }
  }

  if (error && !neta) return <div className="error">{error}</div>;
  if (!neta) return (
    <div className="on-detail fade-in">
      <div className="on-detail-hero skel-hero" />
    </div>
  );

  return (
    <div className="on-detail fade-in">
      <button className="on-back" onClick={goBack}>
        <span aria-hidden>&larr;</span> Back to search
      </button>

      <section className={`on-detail-hero on-card-${neta.category}`}>
        <div className="on-detail-photo">
          {neta.photoUrl && !imgFailed ? (
            <img
              src={neta.photoUrl}
              alt={neta.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="on-card-initials" style={{ fontSize: '3.8rem' }}>{initials(neta.name)}</div>
          )}
          <svg className="on-card-wave" viewBox="0 0 320 90" preserveAspectRatio="none">
            <path d="M0,40 C80,90 240,0 320,50 L320,90 L0,90 Z" />
          </svg>
        </div>
        <div className="on-detail-info">
          <div className="on-detail-eyebrow">{CATEGORY_LABEL[neta.category] || 'Representative'}</div>
          <h1 className="on-detail-name">{neta.name}</h1>
          <div className="on-detail-meta">
            <span className={`pill pill-${neta.category}`}>{neta.category}</span>
            {neta.party && <span className="on-meta-pill on-meta-party">{neta.party}</span>}
            {neta.constituency && (
              <span className="on-meta-pill">
                <span aria-hidden>&#128205;</span> {neta.constituency}
              </span>
            )}
            {neta.state && (
              <span className="on-meta-pill">
                <span aria-hidden>&#127760;</span> {neta.state}
              </span>
            )}
          </div>
          <div className="on-detail-rating">
            <StarRating value={neta.avgRating} readOnly />
            <span className="on-rating-num">
              {neta.avgRating?.toFixed?.(1) || '0.0'} avg &middot; {neta.ratingCount} rating{neta.ratingCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </section>

      {(neta.editorialReview?.text || user?.isAdmin) && (
        <section className="on-editorial">
          <div className="on-editorial-head">
            <h2 className="on-section-title">Editorial review</h2>
            {user?.isAdmin && (
              <button className="on-btn-dark on-btn-sm" onClick={openAiPanel}>
                <span aria-hidden>&#9889;</span>
                {neta.editorialReview?.text ? 'Edit / regenerate' : 'Generate with AI'}
              </button>
            )}
          </div>
          {neta.editorialReview?.text ? (
            <div className="on-editorial-body">
              {neta.editorialReview.text.split(/\n\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <div className="on-editorial-foot">
                {neta.editorialReview.source === 'ai' && (
                  <span className="on-editorial-tag">AI-assisted draft &middot; reviewed by admin</span>
                )}
                {neta.editorialReview.updatedAt && (
                  <span className="muted small">
                    Updated {new Date(neta.editorialReview.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="muted small">No editorial review yet. As an admin you can generate a draft with AI and publish it after editing.</div>
          )}
        </section>
      )}

      {aiOpen && user?.isAdmin && (
        <section className="on-ai-panel">
          <div className="on-ai-head">
            <h3>AI review draft</h3>
            <button className="on-back" onClick={() => setAiOpen(false)}>Close</button>
          </div>
          <p className="muted small">
            The AI uses this neta's profile data and may add publicly known context. Always read carefully and edit before publishing — you are responsible for what gets saved.
          </p>
          <div className="on-ai-actions">
            <button className="on-btn-dark" onClick={generateReview} disabled={aiLoading}>
              {aiLoading ? 'Generating…' : (aiText ? 'Regenerate' : 'Generate review')}
            </button>
            {aiText && (
              <span className="on-editorial-tag">
                Source: {aiSource === 'ai' ? 'AI draft (edit before saving)' : 'Admin written'}
              </span>
            )}
          </div>
          {aiErr && <div className="error">{aiErr}</div>}
          <textarea
            className="on-textarea on-ai-textarea"
            rows={12}
            placeholder="Click 'Generate review' to draft with AI, or write the review manually."
            value={aiText}
            onChange={(e) => { setAiText(e.target.value); setAiSource('admin'); }}
          />
          <div className="on-ai-footer">
            <button
              className="link danger"
              onClick={() => { setAiText(''); setAiSource('admin'); }}
              disabled={!aiText}
            >
              Clear
            </button>
            <div className="row gap">
              <button className="on-btn-light" onClick={() => setAiOpen(false)}>Cancel</button>
              <button className="on-btn-dark" onClick={saveReview} disabled={aiSaving}>
                {aiSaving ? 'Saving…' : 'Save review'}
              </button>
            </div>
          </div>
          {aiSaved && <div className="on-rate-success" style={{ marginTop: 10 }}>{aiSaved}</div>}
        </section>
      )}

      <section className="on-detail-grid">
        <div className="on-info-card">
          <h2 className="on-section-title">Profile</h2>
          <dl className="on-info-list">
            {neta.election && (<><dt>Election</dt><dd>{neta.election}</dd></>)}
            {neta.age != null && (<><dt>Age</dt><dd>{neta.age}</dd></>)}
            {neta.education && (
              <>
                <dt>Education</dt>
                <dd>{neta.education}{neta.educationDetails ? ` — ${neta.educationDetails}` : ''}</dd>
              </>
            )}
            {neta.selfProfession && (<><dt>Self profession</dt><dd>{neta.selfProfession}</dd></>)}
            {neta.spouseProfession && (<><dt>Spouse profession</dt><dd>{neta.spouseProfession}</dd></>)}
            {neta.assets && (<><dt>Total assets</dt><dd className="hl-amount">{neta.assets}</dd></>)}
            {neta.liabilities && (<><dt>Liabilities</dt><dd>{neta.liabilities}</dd></>)}
            {neta.criminalCases != null && (
              <>
                <dt>Criminal cases</dt>
                <dd className={neta.criminalCases > 0 ? 'has-cases' : ''}>
                  {neta.criminalCases}
                  {neta.pendingCases ? ` (${neta.pendingCases} pending)` : ''}
                  {neta.convictedCases ? `, ${neta.convictedCases} convicted` : ''}
                </dd>
              </>
            )}
            {neta.sourceUrl && (
              <>
                <dt>Source</dt>
                <dd>
                  <a href={neta.sourceUrl} target="_blank" rel="noreferrer">
                    View affidavit on myneta.info <span aria-hidden>&#8599;</span>
                  </a>
                </dd>
              </>
            )}
          </dl>
        </div>

        <aside className="on-side">
          <div className="on-rate-card">
            <h2 className="on-section-title">Rate this neta</h2>
            <form onSubmit={submit} className="on-rate-form">
              <div className="on-rate-stars">
                <StarRating value={score} onChange={setScore} size={32} />
                <span className="on-rate-hint">{score ? `${score}/5` : 'Tap a star'}</span>
              </div>
              <textarea
                className="on-textarea"
                rows={4}
                placeholder="Your view (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="on-btn-dark on-btn-full" type="submit" disabled={!score}>
                Submit rating
              </button>
            </form>
            {msg && <div className="on-rate-success">{msg}</div>}
            {error && <div className="error">{error}</div>}
          </div>
        </aside>
      </section>

      <section className="on-recent">
        <h2 className="on-section-title">Recent ratings</h2>
        {!recent.length && (
          <div className="on-empty on-empty-compact">
            <div className="on-empty-icon" aria-hidden>&#9734;</div>
            <h3>No ratings yet</h3>
            <p>Be the first to share your view.</p>
          </div>
        )}
        {recent.length > 0 && (
          <div className="on-recent-list">
            {recent.map((r) => (
              <article key={r._id} className="on-recent-row">
                <div className="on-recent-avatar">{initials(r.user?.name || 'U')}</div>
                <div className="on-recent-body">
                  <div className="on-recent-head">
                    <strong className="on-recent-name">{r.user?.name || 'User'}</strong>
                    <StarRating value={r.score} readOnly size={14} />
                  </div>
                  {r.comment && <p className="on-recent-comment">&ldquo;{r.comment}&rdquo;</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
