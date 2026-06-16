/*
 * Scrape myneta.info Lok Sabha 2024 winners into JSON.
 *
 * Node port of scrape_myneta.py — same headers, same parsing logic, same JSON shape.
 *
 *   node scrape.js                    # list + per-candidate photos (~5 min)
 *   NO_PHOTOS=1 node scrape.js        # list only, fast (~5 sec)
 *   MAX=10 node scrape.js             # only first 10 (for testing)
 *   DELAY_MS=200 node scrape.js       # tune politeness
 *   BASE=... LIST=... node scrape.js  # point at a different election listing
 *
 * Writes data/lok_sabha_2024_winners.json. Then run `node import-ls2024.js`.
 */
const fs = require('fs');
const path = require('path');
const { sleep, fetchHtml, parseList, findPhoto } = require('./lib');

const BASE = process.env.BASE || 'https://myneta.info/LokSabha2024/';
const LIST_URL = process.env.LIST || BASE + 'index.php?action=show_winners&sort=default';
const OUT_DIR = path.join(__dirname, 'data');
const OUT_FILE = process.env.OUT
  ? path.resolve(OUT_DIR, process.env.OUT)
  : path.join(OUT_DIR, 'lok_sabha_2024_winners.json');
const DELAY_MS = parseInt(process.env.DELAY_MS, 10) || 400;
const NO_PHOTOS = process.env.NO_PHOTOS === '1';
const MAX = parseInt(process.env.MAX, 10) || Infinity;

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Fetching list -> ${LIST_URL}`);
  const listHtml = await fetchHtml(LIST_URL);
  const rows = parseList(listHtml, BASE).slice(0, MAX);
  console.log(`Parsed ${rows.length} candidates.`);

  if (!NO_PHOTOS) {
    console.log('Fetching photos (visits each detail page) ...');
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await sleep(DELAY_MS);
      try {
        const detailHtml = await fetchHtml(r.detail_url);
        r.photo = findPhoto(detailHtml, r.detail_url);
        process.stdout.write(r.photo ? '.' : '?');
      } catch (_e) {
        process.stdout.write('x');
      }
      if ((i + 1) % 25 === 0) {
        fs.writeFileSync(OUT_FILE, JSON.stringify(rows, null, 2), 'utf8');
      }
    }
    process.stdout.write('\n');
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(rows, null, 2), 'utf8');
  const withPhotos = rows.filter((r) => r.photo).length;
  console.log(`\nSaved ${rows.length} records (photos: ${withPhotos}/${rows.length}) -> ${OUT_FILE}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
