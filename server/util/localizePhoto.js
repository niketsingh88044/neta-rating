const fs = require('fs');
const path = require('path');
const { HEADERS } = require('./scraperLib');

const PHOTOS_DIR = path.join(__dirname, '..', 'public', 'photos');

function pickExt(url) {
  const m = (url || '').split('?')[0].match(/\.(jpe?g|png|gif|webp)$/i);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.jpg';
}

/**
 * Download remoteUrl to server/public/photos/<id>.<ext> and return the local
 * path "/photos/<id>.<ext>". On any failure, returns the input unchanged so the
 * caller can fall back to remote rendering.
 *
 * Already-local paths (starting with "/photos/") are returned as-is.
 */
async function localizePhoto(remoteUrl, id) {
  if (!remoteUrl) return '';
  if (!/^https?:\/\//i.test(remoteUrl)) return remoteUrl;
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  const ext = pickExt(remoteUrl);
  const fname = `${id}${ext}`;
  const fpath = path.join(PHOTOS_DIR, fname);
  const localUrl = `/photos/${fname}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(remoteUrl, { headers: HEADERS, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) return remoteUrl;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!/image|octet-stream/.test(ct)) return remoteUrl;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) return remoteUrl;
    fs.writeFileSync(fpath, buf);
    return localUrl;
  } catch {
    return remoteUrl;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { localizePhoto };
