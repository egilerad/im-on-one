import {chromium} from './tools.mjs';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://127.0.0.1:8782/';
const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
const errors = [];
const visibleText = page => page.evaluate(() => {
  const words = [];
  const walk = node => {
    if (node.nodeType === 3) { if (node.textContent.trim() && node.parentElement.checkVisibility() && node.parentElement.tagName !== 'TEXTAREA' && !node.parentElement.closest('.mirror,.sr')) words.push(node.textContent.trim()); return; }
    for (const child of node.childNodes) walk(child);
  };
  walk(document.body);
  return words;
});
const darkPixels = page => page.locator('#visual').evaluate(c => { const a = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i] > 60) n++; return n; });
const canvasHash = page => page.locator('#visual').evaluate(c => { const a = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < a.length; i += 97) h = (h * 31 + a[i]) >>> 0; return h; });

try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(() => window.imOnOne, null, {timeout: 5000});

  // name, type, and no explanatory text
  assert.equal(await page.title(), "i'm on one");
  assert.equal(await page.locator('input[type=range]').count(), 0);
  assert.deepEqual(await visibleText(page), ['play']);
  for (const selector of ['body', '#code', '#play']) assert.match(await page.locator(selector).evaluate(e => getComputedStyle(e).fontFamily), /^arial/i);

  // the score floats, semi-transparent, over a full-screen drawing
  const layout = await page.evaluate(() => {
    const code = document.querySelector('#code'), canvas = document.querySelector('#visual'), c = code.getBoundingClientRect(), v = canvas.getBoundingClientRect(), style = getComputedStyle(code.closest('.editor'));
    const alpha = (style.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(',')[3] ?? '1') * 1;
    return {position: getComputedStyle(code.closest('.score')).position, overlaps: c.left < v.right && c.right > v.left && c.top < v.bottom && c.bottom > v.top, alpha, canvasWidth: v.width, canvasHeight: v.height};
  });
  assert.ok(['absolute', 'fixed'].includes(layout.position));
  assert.ok(layout.overlaps);
  assert.ok(layout.alpha > 0 && layout.alpha < 1);
  assert.ok(layout.canvasWidth >= 1400 && layout.canvasHeight >= 880);

  // the zero point: no code, nothing drawn but the body, silence even after play
  assert.equal(await page.locator('#code').inputValue(), '');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'code');
  const empty = await darkPixels(page);
  await page.locator('#play').click();
  await page.waitForFunction(() => window.imOnOne.running && window.imOnOne.time > 1.5);
  assert.deepEqual(await visibleText(page), ['play', 'stop']);
  const zero = await page.evaluate(() => { const s = window.imOnOne.state; return {gain: s.gain, pairGain: s.pairGain, walls: s.walls, s: s.s, events: s.events.length, people: s.people.length}; });
  assert.deepEqual(zero, {gain: 0, pairGain: 0, walls: 0, s: 0, events: 0, people: 0});
  assert.ok(await darkPixels(page) <= empty * 1.5 + 50);

  // one line adds only itself: a sine raises the walls, nothing walks, rings or crowds
  await page.locator('#code').fill('sine 110');
  await page.locator('#code').press('Control+Enter');
  await page.waitForFunction(() => window.imOnOne.state.walls > .95, null, {timeout: 6000});
  const lone = await page.evaluate(() => { const s = window.imOnOne.state; return {s: s.s, events: s.events.length, people: s.people.length, pair: s.pairGain}; });
  assert.deepEqual(lone, {s: 0, events: 0, people: 0, pair: 0});
  assert.ok(await darkPixels(page) > empty * 5 + 1000);
  await page.locator('#code').fill('pair sine + 1/4');
  await page.locator('#code').press('Control+Enter');
  assert.equal(await page.locator('#code').getAttribute('aria-invalid'), 'true');
  assert.match(await page.locator('#announce').textContent(), /line 1: .*sine/);
  await page.locator('#code').fill('sine 110\npair sine + 1/4');
  await page.locator('#code').press('Control+Enter');
  await page.waitForFunction(() => window.imOnOne.state.existsB > .9, null, {timeout: 6000});
  const before = await page.evaluate(() => ({t: window.imOnOne.time, phase: window.imOnOne.state.phaseA, s: window.imOnOne.state.s, generation: window.imOnOne.generation}));
  await page.locator('#code').fill('sine 130\npair sine + 1/2\nwalk 1\nside -1\nmetal .8\npeople 3\nlinger 8');
  await page.locator('#code').press('Control+Enter');
  await page.waitForFunction(s => window.imOnOne.state.s > s + .5, before.s, {timeout: 8000});
  const after = await page.evaluate(() => ({t: window.imOnOne.time, phase: window.imOnOne.state.phaseA, generation: window.imOnOne.generation, people: window.imOnOne.state.people.length}));
  assert.equal(after.generation, before.generation);
  assert.ok(after.t > before.t && after.phase > before.phase);
  assert.equal(after.people, 3);
  await page.waitForFunction(() => window.imOnOne.state.events.some(e => e.type === 'step'), null, {timeout: 8000});

  // invalid edits: keep running, underline the line, announce the reason (lowercase)
  await page.locator('#code').fill('sine 130\nsine 0');
  await page.locator('#code').press('Control+Enter');
  assert.equal(await page.evaluate(() => window.imOnOne.running), true);
  assert.equal(await page.locator('#code').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('.mirror .error').count(), 1);
  const announce = await page.locator('#announce').textContent();
  assert.match(announce, /line 2/);
  assert.equal(announce, announce.toLowerCase());
  await page.locator('#code').fill('sine 110\npair sine + 1/4\nwalk 1\nside sin(t/3)\nmetal .7\npeople 2\nlinger 6');
  await page.locator('#code').press('Control+Enter');
  assert.equal(await page.locator('#code').getAttribute('aria-invalid'), 'false');
  assert.equal(await page.locator('.mirror .error').count(), 0);

  // the drawing moves, is monochrome, and freezes on stop
  const h1 = await canvasHash(page); await page.waitForTimeout(400); const h2 = await canvasHash(page);
  assert.notEqual(h1, h2);
  const mono = await page.locator('#visual').evaluate(c => { const a = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i + 3]) { if (a[i] !== a[i + 1] || a[i] !== a[i + 2]) return false; n++; } return n > 1000; });
  assert.equal(mono, true);
  await page.waitForTimeout(1500);
  await page.screenshot({path: 'tests/desktop.png'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.imOnOne.running);
  assert.deepEqual(await visibleText(page), ['play']);
  await page.waitForTimeout(300);
  const f1 = await canvasHash(page); await page.waitForTimeout(400);
  assert.equal(await canvasHash(page), f1);

  // play after stop restarts with a new graph from the entrance
  await page.locator('#play').click();
  await page.waitForFunction(g => window.imOnOne.running && window.imOnOne.generation === g + 1, before.generation);
  assert.ok(await page.evaluate(() => window.imOnOne.time) < 2);

  // a dropped image appears faintly behind the drawing, without any controls or text
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 20; c.getContext('2d').fillRect(0, 0, 10, 10);
    const blob = await new Promise(r => c.toBlob(r)), data = new DataTransfer();
    data.items.add(new File([blob], 'wall.png', {type: 'image/png'}));
    document.dispatchEvent(new DragEvent('drop', {dataTransfer: data, bubbles: true, cancelable: true}));
  });
  await page.waitForFunction(() => !document.querySelector('#image').hidden && document.querySelector('#image').src.startsWith('blob:'));
  assert.deepEqual(await visibleText(page), ['play', 'stop']);

  // a reload returns to the zero point
  await page.reload();
  await page.waitForFunction(() => window.imOnOne);
  assert.equal(await page.locator('#code').inputValue(), '');
  await page.close();

  // narrow screens
  const phone = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  phone.on('pageerror', e => errors.push(e.message));
  await phone.goto(base);
  await phone.waitForFunction(() => window.imOnOne);
  const fit = await phone.evaluate(() => { const c = document.querySelector('#code').getBoundingClientRect(), p = document.querySelector('#play').getBoundingClientRect(); return {overflow: document.documentElement.scrollWidth > innerWidth, code: c.left >= 0 && c.right <= innerWidth && c.height > 120, play: p.bottom <= innerHeight && p.width >= 40}; });
  assert.deepEqual(fit, {overflow: false, code: true, play: true});
  await phone.locator('#play').tap();
  await phone.waitForFunction(() => window.imOnOne.running && window.imOnOne.time > 1);
  await phone.locator('#code').fill('sine 110\npair sine + 1/4\nwalk 1\nmetal .5');
  await phone.locator('#play').tap();
  await phone.waitForFunction(() => window.imOnOne.state.walls > .9 && window.imOnOne.state.s > 1, null, {timeout: 8000});
  await phone.screenshot({path: 'tests/phone.png'});
  assert.deepEqual(errors, []);
  console.log('pass: zero point (empty, silent, body only), one line adds only itself, lowercase arial overlay, live update continuity, invalid-line hold, monochrome motion, stop freeze, restart, image drop, phone layout');
} finally { await browser.close(); }
