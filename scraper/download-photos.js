/*
 * Download all candidate photos referenced in MongoDB from myneta.info to
 * server/public/photos/<netaId>.<ext>, then update each neta's photoUrl to
 * point at the local copy ("/photos/<netaId>.<ext>").
 *
 * Idempotent: skips netas whose photoUrl already starts with "/photos/" or
 * whose photoUrl is empty / non-http. Re-running picks up newly-scraped ones.
 *
 *   node download-photos.js
 *
 * Env vars:
 *   DELAY_MS   per-request delay (default 200)
 *   FORCE=1    re-download even if local file already exists
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Neta = require(path.join(__dirname, '..', 'server', 'models', 'Neta'));
const { HEADERS, sleep } = require('./lib');

const PHOTOS_DIR = path.join(__dirname, '..', 'server', 'public', 'photos');
const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 8;
const FORCE = process.env.FORCE === '1';

function pickExt(url) {
  const m = url.split('?')[0].match(/\.(jpe?g|png|gif|webp)$/i);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.jpg';
}

async function downloadOne(url) {
  // 15s timeout per image — myneta's CDN can stall.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!/image|octet-stream/.test(ct)) throw new Error(`Not an image: ${ct}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) throw new Error(`Suspiciously small (${buf.length} B)`);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  await mongoose.connect(process.env.MONGO_URI);

  const all = await Neta.find({ photoUrl: { $regex: /^https?:\/\//i } }).select('_id photoUrl');
  console.log(`Candidates with remote photos: ${all.length}`);

  let ok = 0, failed = 0, skipped = 0, done = 0;
  console.log(`Running with concurrency=${CONCURRENCY}...`);

  async function worker(n) {
    const ext = pickExt(n.photoUrl);
    const fname = `${n._id}${ext}`;
    const fpath = path.join(PHOTOS_DIR, fname);
    const localUrl = `/photos/${fname}`;

    if (!FORCE && fs.existsSync(fpath)) {
      if (n.photoUrl !== localUrl) {
        await Neta.updateOne({ _id: n._id }, { $set: { photoUrl: localUrl } });
      }
      skipped += 1;
      process.stdout.write('s');
    } else {
      try {
        const buf = await downloadOne(n.photoUrl);
        fs.writeFileSync(fpath, buf);
        await Neta.updateOne({ _id: n._id }, { $set: { photoUrl: localUrl } });
        ok += 1;
        process.stdout.write('.');
      } catch (_e) {
        failed += 1;
        process.stdout.write('x');
      }
    }
    done += 1;
    if (done % 80 === 0) process.stdout.write(` ${done}/${all.length}\n`);
  }

  // Pool: keep N in flight at a time.
  let idx = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }).map(async () => {
      while (true) {
        const i = idx++;
        if (i >= all.length) return;
        await worker(all[i]);
      }
    })
  );

  console.log(`\n\nDone. downloaded=${ok}  skipped=${skipped}  failed=${failed}  (of ${all.length})`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
