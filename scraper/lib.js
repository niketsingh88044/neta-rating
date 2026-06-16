/*
 * Shared helpers for scrape.js and add-photos.js.
 *
 * Mirrors the Python scrape_myneta.py + add_photos.py logic exactly:
 *   - same User-Agent / Accept / Referer headers
 *   - same table-finding heuristic (header text contains 'criminal' + 'constituency')
 *   - same money-splitter ("Rs X ~ Y Crore+" -> [amount, approx])
 *   - same photo-finder (IGNORE regex + preference for profile/candidate/photo)
 */
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://myneta.info/',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const html = await res.text();
  if (/Blocked site/i.test(html)) {
    throw new Error('NETWORK BLOCKED — gateway is filtering myneta.info. Switch network and retry.');
  }
  return html;
}

function abs(base, href) {
  try { return new URL(href, base).toString(); } catch { return ''; }
}

function splitMoney(text) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/^(Rs[\d,]+)\s*(~.*)?$/);
  if (m) return [m[1].trim(), (m[2] || '').trim()];
  return [cleaned, ''];
}

function parseList(html, baseUrl) {
  const $ = cheerio.load(html);

  // Find the table whose header row mentions both "criminal" and "constituency".
  let target = null;
  $('table').each((_, t) => {
    const head = $(t).text().toLowerCase();
    if (head.includes('criminal') && head.includes('constituency')) {
      target = t;
      return false;
    }
  });
  if (!target) throw new Error('Could not locate the winners table.');

  const rows = [];
  $(target).find('tr').each((_, tr) => {
    const cells = $(tr).find('td').toArray();
    if (cells.length < 8) return;

    const sno = $(cells[0]).text().trim();
    if (!/^\d+$/.test(sno)) return;

    // First candidate.php link with non-empty text (the named link, not the photo link).
    let nameLink = null;
    $(cells[1]).find('a[href*="candidate.php"]').each((__, a) => {
      if ($(a).text().trim()) { nameLink = a; return false; }
    });
    if (!nameLink) return;

    const href = $(nameLink).attr('href') || '';
    const cidMatch = href.match(/candidate_id=(\d+)/);
    const [assetsAmt, assetsApprox] = splitMoney($(cells[6]).text());
    const [liabAmt, liabApprox] = splitMoney($(cells[7]).text());

    rows.push({
      sno: parseInt(sno, 10),
      name: $(nameLink).text().trim(),
      candidate_id: cidMatch ? cidMatch[1] : null,
      detail_url: abs(baseUrl, href),
      photo: null,
      constituency: $(cells[2]).text().trim(),
      party: $(cells[3]).text().replace(/\s+/g, ' ').trim(),
      criminal_cases: $(cells[4]).text().trim(),
      education: $(cells[5]).text().trim(),
      total_assets: assetsAmt,
      total_assets_approx: assetsApprox,
      liabilities: liabAmt,
      liabilities_approx: liabApprox,
    });
  });
  return rows;
}

const IGNORE_IMG =
  /(logo|banner|spinner|loader|fb|facebook|twitter|whatsapp|share|icon|placeholder|blank|no[_-]?image|default)/i;

function findPhoto(html, pageUrl) {
  const $ = cheerio.load(html);
  const candidates = [];

  $('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || '';
    if (!src) return;
    const attrs = [
      src,
      $(img).attr('alt') || '',
      ($(img).attr('class') || ''),
      $(img).attr('id') || '',
    ].join(' ');
    if (IGNORE_IMG.test(attrs)) return;
    candidates.push({ src, attrs: attrs.toLowerCase() });
  });

  if (!candidates.length) return null;

  // Prefer images whose attrs mention profile / candidate / photo.
  const preferred = candidates.find((c) => /(profile|candidate|photo)/.test(c.attrs));
  return abs(pageUrl, (preferred || candidates[0]).src);
}

module.exports = { HEADERS, sleep, fetchHtml, abs, splitMoney, parseList, findPhoto };
