/*
 * One-off page inspector. Visit a myneta.info page, dump:
 *   - title
 *   - first 30 anchor hrefs
 *   - first 60 lines of <body> text
 * Use this to figure out the right listing URL & link pattern.
 */
const { chromium } = require('playwright');

const URL_TO_INSPECT = process.argv[2] || 'https://myneta.info/';

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
  const anchors = await page.$$eval('a', (els) =>
    els.slice(0, 60).map((a) => ({ text: (a.textContent || '').trim().slice(0, 60), href: a.href }))
  );
  const bodyText = (await page.locator('body').innerText()).split('\n').slice(0, 60).join('\n');

  console.log('URL  :', URL_TO_INSPECT);
  console.log('TITLE:', title);
  console.log('\n--- ANCHORS (first 60) ---');
  for (const a of anchors) console.log(`  [${a.text}] -> ${a.href}`);
  console.log('\n--- BODY (first 60 lines) ---');
  console.log(bodyText);

  await browser.close();
})();
