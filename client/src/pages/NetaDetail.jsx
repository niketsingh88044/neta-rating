import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import StarRating from '../components/StarRating.jsx';

function initials(name = '') {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

export default function NetaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [neta, setNeta] = useState(null);
  const [recent, setRecent] = useState([]);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [imgFailed, setImgFailed] = useState(false);

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

  if (error && !neta) return <div className="error">{error}</div>;
  if (!neta) return <div>Loading...</div>;

  return (
    <div className="detail">
      <button className="back-btn" onClick={goBack}>← Back to search</button>

      <div className="detail-head">
        <div className="detail-photo">
          {neta.photoUrl && !imgFailed ? (
            <img
              src={neta.photoUrl}
              alt={neta.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="avatar-initials avatar-initials-lg">{initials(neta.name)}</span>
          )}
        </div>
        <div className="detail-head-info">
          <h1>{neta.name}</h1>
          <div className="muted">
            <span className={`pill pill-${neta.category}`}>{neta.category}</span>{' '}
            {neta.party && <strong>{neta.party}</strong>}
            {neta.constituency && <> · {neta.constituency}</>}
            {neta.state && <> · {neta.state}</>}
          </div>
          <div className="rating-summary">
            <StarRating value={neta.avgRating} readOnly />
            <span className="muted small">
              {neta.avgRating?.toFixed?.(1) || '0.0'} avg · {neta.ratingCount} rating{neta.ratingCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <section className="profile">
        <dl>
          {neta.election && (<><dt>Election</dt><dd>{neta.election}</dd></>)}
          {neta.age != null && (<><dt>Age</dt><dd>{neta.age}</dd></>)}
          {neta.education && (<><dt>Education</dt><dd>{neta.education}{neta.educationDetails ? ` — ${neta.educationDetails}` : ''}</dd></>)}
          {neta.selfProfession && (<><dt>Self profession</dt><dd>{neta.selfProfession}</dd></>)}
          {neta.spouseProfession && (<><dt>Spouse profession</dt><dd>{neta.spouseProfession}</dd></>)}
          {neta.assets && (<><dt>Total assets</dt><dd>{neta.assets}</dd></>)}
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
              <dd><a href={neta.sourceUrl} target="_blank" rel="noreferrer">View affidavit on myneta.info ↗</a></dd>
            </>
          )}
        </dl>
      </section>

      <section>
        <h2>Rate this neta</h2>
        <form onSubmit={submit} className="rate-form">
          <StarRating value={score} onChange={setScore} />
          <textarea
            className="input"
            rows={3}
            placeholder="Your view (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!score}>Submit rating</button>
        </form>
        {msg && <div className="success">{msg}</div>}
        {error && <div className="error">{error}</div>}
      </section>

      <section>
        <h2>Recent ratings</h2>
        {!recent.length && <div className="muted">No ratings yet. Be the first.</div>}
        <ul className="ratings">
          {recent.map((r) => (
            <li key={r._id}>
              <div className="row between">
                <strong>{r.user?.name || 'User'}</strong>
                <StarRating value={r.score} readOnly size={14} />
              </div>
              {r.comment && <div className="muted">{r.comment}</div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
