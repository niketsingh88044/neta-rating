import { useState } from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.jsx';

const CATEGORY_LABEL = {
  MP: 'Member of Parliament',
  MLA: 'Member of Legislative Assembly',
  STATE: 'State Leader',
  DISTRICT: 'District Leader',
};

function initials(name = '') {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

export default function NetaCard({ neta }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = neta.photoUrl && !imgFailed;
  return (
    <Link to={`/netas/${neta._id}`} className="card neta-card">
      <div className="neta-card-body">
        <div className="avatar">
          {showImg ? (
            <img
              src={neta.photoUrl}
              alt={neta.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="avatar-initials">{initials(neta.name)}</span>
          )}
        </div>
        <div className="neta-card-info">
          <div className="card-head">
            <div className="card-title">{neta.name}</div>
            <span className={`pill pill-${neta.category}`}>{neta.category}</span>
          </div>
          <div className="muted small">
            {neta.party ? <strong>{neta.party}</strong> : null}
            {neta.constituency ? ` · ${neta.constituency}` : ''}
            {neta.state ? ` · ${neta.state}` : ''}
          </div>
          <div className="card-meta">
            {neta.education && <span className="chip">{neta.education}</span>}
            {neta.assets && <span className="chip">Assets: {neta.assets.replace(/Rs\s*/, '₹').split('~')[0].trim()}</span>}
            {neta.criminalCases > 0 && (
              <span className="chip chip-danger">{neta.criminalCases} criminal case{neta.criminalCases > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="card-foot">
            <StarRating value={neta.avgRating} readOnly size={16} />
            <span className="muted small">
              {neta.avgRating?.toFixed?.(1) || '0.0'} · {neta.ratingCount} rating{neta.ratingCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
