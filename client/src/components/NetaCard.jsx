import { useState } from 'react';
import { Link } from 'react-router-dom';

function initials(name = '') {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

function stars(value = 0) {
  const v = Math.round(value);
  return '★★★★★'.slice(0, v) + '☆☆☆☆☆'.slice(0, 5 - v);
}

export default function NetaCard({ neta }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = neta.photoUrl && !imgFailed;
  return (
    <Link to={`/netas/${neta._id}`} className={`on-card on-card-${neta.category} on-neta-card`}>
      <div className="on-card-photo">
        {showImg ? (
          <img
            src={neta.photoUrl}
            alt={neta.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="on-card-initials">{initials(neta.name)}</div>
        )}
        <div className="on-card-party">{neta.category}</div>
        <svg className="on-card-wave" viewBox="0 0 320 90" preserveAspectRatio="none">
          <path d="M0,40 C80,90 240,0 320,50 L320,90 L0,90 Z" />
        </svg>
      </div>
      <div className="on-card-body">
        <div className="on-card-meta">
          {neta.constituency && (
            <span className="on-meta-pill">
              <span aria-hidden>&#128205;</span> {neta.constituency}
            </span>
          )}
          {neta.party && (
            <span className="on-meta-pill on-meta-party">{neta.party}</span>
          )}
        </div>
        <div className="on-card-name on-card-link">{neta.name}</div>
        {neta.state && <div className="on-card-state">{neta.state}</div>}
        <div className="on-card-chips">
          {neta.education && <span className="on-mini-chip">{neta.education}</span>}
          {neta.criminalCases > 0 && (
            <span className="on-mini-chip on-mini-chip-danger">
              {neta.criminalCases} criminal case{neta.criminalCases > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="on-card-rating">
          <span className="on-stars" aria-hidden>{stars(neta.avgRating)}</span>
          <span className="on-rating-num">
            {neta.avgRating?.toFixed?.(1) || '0.0'} Rating
          </span>
        </div>
      </div>
    </Link>
  );
}
