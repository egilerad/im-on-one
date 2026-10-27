import {chromium} from './tools.mjs';
// visual check: run a scripted walk and capture frames for inspection
const base = process.env.BASE_URL || 'http://127.0.0.1:8782/';
const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport: {width: 1440, height: 900}, deviceScaleFactor: 2});
page.on('pageerror', e => console.error('pageerror', e.message));
page.on('console', m => console.log('console', m.text()));
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => window.imOnOne);
const score = process.env.SCORE || 'sine 110\npair sine + 1/4\nwalk 1\nside sin(t/4)*.9\nmetal .7\npeople 3\nlinger 6';
await page.locator('#code').fill(score);
await page.locator('#play').click();
for (const [i, wait] of (process.env.FRAMES || '6,14').split(',').map(Number).entries()) {
  await page.waitForFunction(w => window.imOnOne.time > w, wait, {timeout: 120000});
  const info = await page.evaluate(() => { const s = window.imOnOne.state, W = innerWidth, H = innerHeight, R = 6.9, k = W > 760 ? Math.min(W * .76 / (2 * R * 1.1), H * .9 / (2 * R * .9)) : 0, screen = p => [Math.round(W * .6 + p.x * k), Math.round(H * .5 - p.y * k)]; return {t: s.time, s: s.s, depth: s.depth, damp: s.damp, side: s.side, outer: s.body.outer, inner: s.body.inner, events: s.events.length, types: [...new Set(s.events.map(e => e.type))], body: screen(s.body), people: s.people.map(screen)}; });
  console.log(JSON.stringify(info));
  await page.screenshot({path: `tests/frame-${i}.png`});
}
await browser.close();
