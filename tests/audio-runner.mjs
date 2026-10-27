import {chromium} from './tools.mjs';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.error(e.message));
  await page.goto(new URL('tests/audio.html', process.env.BASE_URL || 'http://127.0.0.1:8782/').href);
  await page.waitForFunction(() => window.audioResults, null, {timeout: 120000});
  const results = await page.evaluate(() => window.audioResults);
  console.log(JSON.stringify(results, null, 2));
  if (!results.pass) process.exitCode = 1;
} finally { await browser.close(); }
