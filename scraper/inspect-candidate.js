/*
 * Dump a candidate detail page's full HTML structure so we know exactly what
 * fields to extract. Saves the HTML to ./data/_inspect.html for manual review.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const URL_TO_INSPECT =
  process.argv[2] || 'https://myneta.info/LokSabha2024/candidate.php?candidate_id=5395';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  await page.goto(URL_TO_INSPECT, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const title = await page.title();
  const h2 = (await page.locator('h2').first().textContent().catch(() => '')) || '';
  const h3 = (await page.locator('h3').first().textContent().catch(() => '')) || '';

  const imgs = await page.$$eval('img', (els) =>
    els.slice(0, 8).map((i) => ({ src: i.src, alt: i.alt, w: i.width, h: i.height }))
  );

  // Pull every <table> as label/value rows so we can see structure.
  const tables = await page.$$eval('table', (tables) =>
    tables.slice(0, 12).map((t, i) => {
      const rows = Array.from(t.querySelectorAll('tr'))
        .slice(0, 30)
        .map((tr) => Array.from(tr.children).map((c) => (c.textContent || '').trim().slice(0, 160)));
      return { i, rows };
    })
  );

  console.log('URL  :', URL_TO_INSPECT);
  console.log('TITLE:', title);
  console.log('H2   :', h2.trim().slice(0, 200));
  console.log('H3   :', h3.trim().slice(0, 200));

  console.log('\n--- IMAGES ---');
  for (const img of imgs) console.log('  ', img);

  console.log('\n--- TABLES (first rows of each) ---');
  for (const t of tables) {
    console.log(`\n[table ${t.i}]`);
    for (const r of t.rows) console.log('  ', r);
  }

  // Save full HTML for manual reference if needed
  const html = await page.content();
  const outDir = path.join(__dirname, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, '_inspect.html'), html, 'utf8');
  console.log(`\nFull HTML saved to data/_inspect.html (${html.length} bytes)`);

  await browser.close();
})();
