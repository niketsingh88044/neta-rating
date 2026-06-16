/*
 * Enrich an existing scrape with photo URLs by visiting each candidate's detail page.
 *
 * Node port of add_photos.py. Reads data/lok_sabha_2024_winners.json (with the same
 * shape scrape.js produces), and fills in `photo` for any record that doesn't have
 * one. Skips records that already have a photo, so re-running is safe and resumes.
 *
 *   node add-photos.js                # default in/out path
 *   DELAY_MS=300 node add-photos.js   # tune politeness
 *   IN=path.json node add-photos.js   # custom input file (overwritten in place)
 */
const fs = require('fs');
const path = require('path');
const { sleep, fetchHtml, findPhoto } = require('./lib');

const IN_FILE = process.env.IN
  ? path.resolve(process.env.IN)
  : path.join(__dirname, 'data', 'lok_sabha_2024_winners.json');
const DELAY_MS = parseInt(process.env.DELAY_MS, 10) || 400;
const CHECKPOINT_EVERY = 25;

async function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Missing: ${IN_FILE}`);
    console.error('Run `node scrape.js` first (or with NO_PHOTOS=1) to produce it.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  console.log(`Loaded ${data.length} records from ${IN_FILE}`);

  const todo = data.filter((r) => !r.photo && r.detail_url);
  console.log(`${todo.length} records need a photo. Skipping ${data.length - todo.length} already filled.`);

  let done = 0;
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (r.photo || !r.detail_url) continue;

    await sleep(DELAY_MS);
    try {
      const html = await fetchHtml(r.detail_url);
      r.photo = findPhoto(html, r.detail_url);
      const status = r.photo ? r.photo.slice(0, 80) : 'NO PHOTO FOUND';
      console.log(`[${++done}/${todo.length}] ${r.candidate_id} ${r.name}: ${status}`);
    } catch (e) {
      console.log(`[${++done}/${todo.length}] ${r.candidate_id} ${r.name}: FAILED ${e.message}`);
    }
    if (done % CHECKPOINT_EVERY === 0) {
      fs.writeFileSync(IN_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
  }

  fs.writeFileSync(IN_FILE, JSON.stringify(data, null, 2), 'utf8');
  const filled = data.filter((r) => r.photo).length;
  console.log(`\nDone. Photos: ${filled}/${data.length}. Saved -> ${IN_FILE}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
