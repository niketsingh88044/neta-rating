/*
 * Hit every listingUrl in sources.js with a headless browser and report:
 *   - status (loaded / blocked / 404 / nav error)
 *   - candidate links found
 *
 * Run this BEFORE scrape.js so you know which URLs need fixing.
 *
 *     node verify-sources.js
 *
 * If a row reports 0 candidate links, the URL slug is probably wrong — open
 * https://myneta.info/ in your browser, find the right path for that state's
 * latest election, and fix it in sources.js.
 */
const { chromium } = require('playwright');
const sources = require('./sources');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function checkOne(page, src) {
  const out = { ...src, status: '', title: '', candidates: 0 };
  try {
    const resp = await page.goto(src.listingUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    out.title = (await page.title()) || '';
    const httpStatus = resp ? resp.status() : 0;

    if (/blocked|blocked site/i.test(out.title)) {
      out.status = 'NETWORK-BLOCKED';
    } else if (httpStatus >= 400) {
      out.status = `HTTP ${httpStatus}`;
    } else {
      const links = await page.$$eval(
        'a[href*="candidate.php"]',
        (els) => new Set(els.map((a) => a.getAttribute('href'))).size
      );
      out.candidates = links;
      out.status = links > 0 ? 'OK' : 'NO-LINKS';
    }
  } catch (e) {
    out.status = `ERR ${e.message.split('\n')[0].slice(0, 80)}`;
  }
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: UA, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  console.log(`\nChecking ${sources.length} source URLs...\n`);
  const results = [];
  for (const src of sources) {
    const r = await checkOne(page, src);
    results.push(r);
    const tag = r.status === 'OK' ? 'OK ' : (r.status === 'NETWORK-BLOCKED' ? '!! ' : 'XX ');
    console.log(
      `${tag}${r.category.padEnd(8)} ${r.state.padEnd(20)} ${String(r.candidates).padStart(4)} links  ${r.status}`
    );
  }

  await browser.close();

  const ok = results.filter((r) => r.status === 'OK').length;
  const broken = results.filter((r) => r.status !== 'OK').length;
  console.log(`\n${ok}/${results.length} URLs returned candidate data. ${broken} need a fix.`);

  if (results.some((r) => r.status === 'NETWORK-BLOCKED')) {
    console.log(
      '\nNote: NETWORK-BLOCKED rows mean a gateway/proxy is filtering myneta.info.'
    );
    console.log('Switch to a non-filtered network (mobile hotspot / VPN) and re-run.');
  }
})();
