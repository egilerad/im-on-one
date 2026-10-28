import {SPIRAL, END, PATH_LENGTH, wallRadius, edges, unitPositions, bodyAt} from './spiral.mjs';
import {jaggedSpiral, jaggedPrint} from './marks.mjs';

// overhead plan, drawn roughly: steel edges, judd units, footprints, reflections and the body's rubbing at the walls.
// every mark comes from the running sound state; ring speed is slowed so reflections can be seen.
const TAU = Math.PI * 2, WALL_END = TAU * SPIRAL.turns, VIS_SPEED = 2.6, N = 900;
const UNITS = unitPositions().map(s => bodyAt(s, 0).theta);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const innermost = theta => wallRadius(END + (((theta - END) % TAU) + TAU) % TAU);

function makeGrain() {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  c.width = c.height = 192;
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${(.1 + rnd() * .5).toFixed(3)})`; g.fillRect(Math.floor(rnd() * 192), Math.floor(rnd() * 192), 1, 1 + (rnd() < .2)); }
  return c;
}

export function createVisual(canvas, getData) {
  const g = canvas.getContext('2d'), trail = document.createElement('canvas'), tg = trail.getContext('2d');
  const grain = g.createPattern(makeGrain(), 'repeat'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, k = 1, cx = 0, cy = 0, lastKey = '', generation = -1, lastFade = 0, lastSmudge = -1, lastFrame = 0;
  const seen = new Map();

  function layout() {
    W = canvas.clientWidth; H = canvas.clientHeight; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    trail.width = canvas.width; trail.height = canvas.height; tg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = SPIRAL.outer + .5;
    if (W > 760) { cx = W * .6; cy = H * .5; k = Math.min(W * .76 / (2 * R * SPIRAL.ex), H * .9 / (2 * R * SPIRAL.ey)); }
    else { cx = W / 2; cy = H * .28; k = Math.min(W * .94 / (2 * R * SPIRAL.ex), H * .52 / (2 * R * SPIRAL.ey)); }
    seen.clear();
  }
  const P = (r, th) => [cx + r * Math.cos(th) * SPIRAL.ex * k, cy - r * Math.sin(th) * SPIRAL.ey * k];
  const Q = (x, y) => [cx + x * k, cy - y * k];
  const tangent = (r, th) => { const [x0, y0] = P(r, th - .01), [x1, y1] = P(r, th + .01), l = Math.hypot(x1 - x0, y1 - y0) || 1; return [(x1 - x0) / l, (y1 - y0) / l]; };
  const line = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };

  // corridor test for reflection rings: sound stays between the steel walls
  function inside(x, y, theta) {
    const px = x / SPIRAL.ex, py = y / SPIRAL.ey, r = Math.hypot(px, py), phi = Math.atan2(py, px);
    const t = phi + TAU * Math.round((theta - phi) / TAU);
    if (t > END + .2) return r <= innermost(t) + .02;
    return r <= wallRadius(t) + .02 && r >= wallRadius(t + TAU) - .02;
  }
  function ring(ctx, x, y, radius, theta, alpha, seed, clip = true) {
    if (radius <= 0 || alpha < .004) return;
    ctx.strokeStyle = `rgba(0,0,0,${alpha.toFixed(3)})`; ctx.lineWidth = 1.3;
    const steps = Math.max(24, Math.min(120, Math.round(radius * 30)));
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= steps; i++) {
      const a = TAU * i / steps, wob = 1 + .04 * (hash(seed + i * .7) - .5), px = x + Math.cos(a) * radius * wob, py = y + Math.sin(a) * radius * wob;
      const ok = (!clip || inside(px, py, theta)) && hash(seed * 3.1 + Math.floor(i / 3)) > .18;
      const [sx, sy] = Q(px, py);
      if (ok && pen) ctx.lineTo(sx, sy); else if (ok) ctx.moveTo(sx, sy);
      pen = ok;
    }
    ctx.stroke();
  }

  function stamp(e, s) {
    const key = `${e.type}:${e.time.toFixed(4)}:${e.index ?? ''}`;
    if (seen.has(key)) return;
    seen.set(key, e.time);
    if (e.type === 'step' || e.type === 'person') {
      // an irregular scuff with grit, never a clean oval
      const [hx, hy] = e.heading || [1, 0], side = (e.foot ? 1 : -1) * .1, [x, y] = Q(e.x - hy * side, e.y + hx * side);
      const seed = e.time * 31.7 + (e.index ?? 0) * 7, print = jaggedPrint(seed, {length: .27, width: .13});
      const alpha = (e.type === 'step' ? .62 : e.occluded ? .1 : .24) * (.7 + .5 * hash(seed * 2));
      tg.save(); tg.translate(x, y); tg.rotate(-Math.atan2(hy, hx) + (hash(seed) - .5) * .6);
      tg.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
      tg.beginPath(); print.outline.forEach(([px, py], i) => i ? tg.lineTo(px * k, py * k) : tg.moveTo(px * k, py * k)); tg.closePath(); tg.fill();
      for (const grit of print.grit) { const size = grit.size * k * .5 + .7; tg.fillRect(grit.x * k, grit.y * k, size, size); }
      tg.restore();
    }
    if (e.type === 'contact') {
      const [x, y] = Q(e.x, e.y);
      tg.strokeStyle = `rgba(0,0,0,${(.08 + .2 * (e.metal ?? .5)).toFixed(3)})`; tg.lineWidth = .7;
      for (let i = 0; i < 7; i++) { const a = TAU * hash(e.time + i), l = (.2 + .5 * hash(e.time * 2 + i)) * k; tg.beginPath(); tg.moveTo(x, y); tg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); tg.stroke(); }
    }
  }
  // where a ring reaches a wall, the wall takes a faint mark
  function bounce(e, which, s) {
    const key = `b${which}:${e.type}:${e.time.toFixed(4)}`;
    if (seen.has(key)) return;
    seen.set(key, e.time);
    const r = which === 'outer' ? (e.r + e.outer) : (e.r - e.inner), th = e.theta, [tx, ty] = tangent(r, th), [x, y] = P(r, th);
    tg.strokeStyle = `rgba(0,0,0,${((e.type === 'step' ? .22 : .08) * (1 - .4 * s.damp)).toFixed(3)})`; tg.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) { const o = (hash(e.time + i) - .5) * .5 * k, l = (.15 + .3 * hash(e.time * 3 + i)) * k; tg.beginPath(); tg.moveTo(x + tx * (o - l), y + ty * (o - l)); tg.lineTo(x + tx * (o + l), y + ty * (o + l)); tg.stroke(); }
  }
  // the body rubbing along a wall it walks close to
  function smudge(s) {
    const b = s.body, near = Math.max(0, 1 - Math.min(b.outer, b.inner) / .8);
    if ((s.walls ?? 1) < .5 || near < .3 || s.time - lastSmudge < .12) return;
    lastSmudge = s.time;
    const outer = b.outer < b.inner, r = b.chamber ? innermost(b.theta) : outer ? wallRadius(b.theta) : wallRadius(b.theta + TAU);
    const [x, y] = P(r, b.theta), [tx, ty] = tangent(r, b.theta);
    tg.lineWidth = 1 + 1.4 * near; tg.strokeStyle = `rgba(0,0,0,${(.07 + .2 * near).toFixed(3)})`;
    for (let i = 0; i < 3; i++) { const o = (hash(s.time * 5 + i) - .5) * .3 * k, n = (hash(s.time * 7 + i) - .5) * .06 * k, l = (.1 + .25 * hash(s.time + i)) * k; tg.beginPath(); tg.moveTo(x + tx * (o - l) - ty * n, y + ty * (o - l) + tx * n); tg.lineTo(x + tx * (o + l) - ty * n, y + ty * (o + l) + tx * n); tg.stroke(); }
  }

  function drawWall(s) {
    const wA = s.existsA ?? 1, wB = s.existsB ?? 1, both = Math.min(wA, wB), walls = s.walls ?? Math.max(wA, wB);
    if (walls < .01) return;
    const look = {a: s.a, b: s.b, gain: s.gain, pairGain: s.pairGain, existsA: wA, existsB: wB, slow: s.slow, relative: s.relative}, rough = .022 * (1 + s.damp);
    const floors = [], tops = [], leans = [];
    for (let i = 0; i <= N; i++) {
      const th = WALL_END * i / N, e = edges(th, look), wob = rough * (hash(i * .71) - .5) + .01 * Math.sin(i * .21 + s.time * .4);
      floors.push(P(e.floor + wob, th)); tops.push(P(e.top + wob * 1.5, th)); leans.push(Math.abs(e.top - e.floor) / SPIRAL.lean);
    }
    // ruled strands between floor and top edge: the leaning steel
    for (const [lo, hi, alpha] of [[0, .45, .09], [.45, .8, .17], [.8, 9, .3]]) {
      g.beginPath();
      for (let i = 0; i <= N; i += 3) if (leans[i] >= lo && leans[i] < hi) { g.moveTo(...floors[i]); g.lineTo(...tops[i]); }
      g.strokeStyle = `rgba(0,0,0,${(alpha * both).toFixed(3)})`; g.lineWidth = .6; g.stroke();
    }
    line(g, tops); g.strokeStyle = `rgba(0,0,0,${(.42 * wB).toFixed(3)})`; g.lineWidth = .8; g.stroke();
    g.save(); g.translate(.7, .5); line(g, floors); g.strokeStyle = `rgba(0,0,0,${(.3 * wA).toFixed(3)})`; g.lineWidth = 1.2; g.stroke(); g.restore();
    line(g, floors); g.strokeStyle = `rgba(0,0,0,${(.88 * wA).toFixed(3)})`; g.lineWidth = 1.7; g.stroke();
    // walls near the body press darker
    const b = s.body;
    for (const [which, dist] of [['outer', b.outer], ['inner', b.inner]]) {
      if (b.chamber && which === 'inner') continue;
      const near = Math.max(0, 1 - dist / 1.1);
      if (near <= 0) continue;
      const centre = b.chamber ? END + (((b.theta - END) % TAU) + TAU) % TAU : which === 'outer' ? b.theta : b.theta + TAU;
      const from = Math.max(0, Math.floor((centre - .45) / WALL_END * N)), to = Math.min(N, Math.ceil((centre + .45) / WALL_END * N));
      if (to <= from) continue;
      line(g, floors.slice(from, to + 1));
      g.strokeStyle = `rgba(0,0,0,${((.25 + .6 * near) * walls).toFixed(3)})`; g.lineWidth = 1.7 + 3.4 * near; g.stroke();
    }
  }

  function drawAura(s) {
    const amount=s.aura?.amount ?? s.metal ?? 0;
    if(amount<=.001)return;
    const size=s.aura?.size ?? s.object?.size ?? 1;
    const pulse=s.events.filter(e=>e.type==='aura').reduce((v,e)=>v+Math.exp(-Math.max(0,s.time-e.time)/2)*(e.strength??.3),0);
    // offset broken skins across the whole steel spiral, no isolated boxes.
    for(let j=0;j<7;j++){
      g.beginPath();let pen=false;
      for(let i=0;i<=N;i++){
        const th=WALL_END*i/N;
        const spread=(j-3)*(.055+.025*size)*(1+.3*pulse);
        const r=wallRadius(th)+spread+.025*Math.sin(th*7/size-s.slow*TAU+j);
        const pt=P(r,th), visible=hash(Math.floor(i/5)+j*87)>.18;
        if(visible&&pen)g.lineTo(...pt);else if(visible)g.moveTo(...pt);pen=visible;
      }
      g.strokeStyle=`rgba(0,0,0,${Math.min(.35,amount*(.07+.08*pulse))})`;g.lineWidth=.6+j*.12;g.stroke();
    }
  }

  function drawRings(s) {
    const maxAge = Math.max(1.5, Math.min(8, (s.linger ?? 4) * .8)), walls = s.walls ?? 1, clip = walls > .5;
    for (const e of s.events) {
      const age = s.time - e.time;
      if (age < 0 || age > maxAge || (e.type === 'unit' && !(e.metal > 0))) continue;
      const base = e.type === 'unit' ? .75 : e.type === 'contact' ? .65 : e.type === 'step' ? .7 : e.occluded ? .1 : .3, fade = base * Math.exp(-age / (maxAge * .55)) * (1 - .3 * s.damp), radius = age * VIS_SPEED, seed = e.time * 13.7;
      const theta = e.theta, r = e.r ?? Math.hypot(e.x / SPIRAL.ex, e.y / SPIRAL.ey);
      ring(g, e.x, e.y, radius, theta, fade, seed, clip);
      if (e.outer === undefined || e.type === 'unit' || !clip) continue;
      // image sources behind each wall: the reflection returning into the corridor
      for (const [which, dist, imageR] of [['outer', e.outer, r + 2 * e.outer], ['inner', e.inner, r - 2 * e.inner]]) {
        if (radius < dist) continue;
        if (radius < dist + .4) bounce(e, which, s);
        const ix = imageR * Math.cos(theta) * SPIRAL.ex, iy = imageR * Math.sin(theta) * SPIRAL.ey;
        ring(g, ix, iy, radius, theta, fade * .7 * walls, seed + (which === 'outer' ? 5 : 9));
      }
    }
  }

  function drawFigures(s) {
    // every person is a small jagged spiral; it re-jags with each footstep
    for (const p of s.people || []) {
      const [x, y] = Q(p.x, p.y), seed = p.index * 101 + Math.floor(p.speed * s.time / SPIRAL.stride);
      figure(x, y, jaggedSpiral(seed, {turns: 2, radius: .24}), -Math.atan2(p.heading[1], p.heading[0]) + s.time * .6 * p.direction, 'rgba(0,0,0,.58)', 1.15);
    }
    const b = s.body, [x, y] = Q(b.x, b.y);
    // reach lines from the body to each wall, darker as it nears
    const walls = s.walls ?? 1;
    for (const [dist, r] of [[b.outer, b.r + b.outer], [b.inner, b.r - b.inner]]) {
      if ((b.chamber && r < b.r) || walls < .02) continue;
      const near = Math.max(0, 1 - dist / 1.2), [wx, wy] = P(r, b.theta);
      g.strokeStyle = `rgba(0,0,0,${((.25 + .65 * near) * walls).toFixed(3)})`; g.lineWidth = 1.1 + near; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(x, y); g.lineTo(wx, wy); g.stroke(); g.setLineDash([]);
    }
    // the body: a larger, darker jagged spiral turning with the slowed sine carrier
    const seed = 7 + Math.floor((s.travelled || 0) / SPIRAL.stride);
    figure(x, y, jaggedSpiral(seed, {turns: 2.6, radius: .36}), -Math.atan2(b.heading[1], b.heading[0]) + TAU * (s.slow || 0), 'rgba(0,0,0,.95)', 1.9);
    g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, .05 * k, 0, TAU); g.fill();
  }
  function figure(x, y, pts, turn, style, width) {
    const c = Math.cos(turn), sn = Math.sin(turn);
    g.beginPath();
    pts.forEach(([px, py], i) => { const X = x + (px * c - py * sn) * k, Y = y + (px * sn + py * c) * k; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.strokeStyle = style; g.lineWidth = width; g.lineJoin = 'miter'; g.miterLimit = 4; g.stroke(); g.lineJoin = 'round';
  }

  function draw(ms) {
    requestAnimationFrame(draw);
    const {state: s, running, generation: gen} = getData();
    if (reduced && running && ms - lastFrame < 110) return;
    const key = `${s.time}|${canvas.clientWidth}x${canvas.clientHeight}|${gen}|${s.a}|${s.b}|${s.side}|${s.metal}|${s.peopleCount}|${s.s}|${s.object?.size}|${s.object?.place}`;
    if (key === lastKey) return;
    lastKey = key; lastFrame = ms;
    if (canvas.clientWidth !== W || canvas.clientHeight !== H) layout();
    if (gen !== generation) { tg.clearRect(0, 0, W, H); seen.clear(); generation = gen; lastSmudge = -1; lastFade = s.time; }
    if (running && s.time - lastFade > 1) {
      tg.globalCompositeOperation = 'destination-out'; tg.fillStyle = 'rgba(0,0,0,.02)'; tg.fillRect(0, 0, W, H); tg.globalCompositeOperation = 'source-over'; lastFade = s.time;
      for (const [key, time] of seen) if (time < s.time - 40) seen.delete(key);
    }
    for (const e of s.events) if (e.time <= s.time) stamp(e, s);
    if (running) smudge(s);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    g.drawImage(trail, 0, 0, W, H);
    drawWall(s);
    drawAura(s);
    drawRings(s);
    drawFigures(s);
    g.globalAlpha = .03 + .08 * s.damp; g.fillStyle = grain; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  }
  requestAnimationFrame(draw);
  return {redraw() { lastKey = ''; }};
}
