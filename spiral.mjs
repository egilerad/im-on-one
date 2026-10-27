// schematic torqued spiral (an interpretation, not a survey of serra's "2000").
// geometry is polar in metres; the plan view stretches it into a mild ellipse.
export const SPIRAL = {outer: 6.4, width: 1.4, turns: 3, ex: 1.1, ey: .9, stride: .7, unitEvery: 3.2, unitStart: 1.6, loop: 1.15, lean: .42};
const TAU = Math.PI * 2;
export const END = TAU * (SPIRAL.turns - 1);
export const wallRadius = theta => SPIRAL.outer - SPIRAL.width * theta / TAU;
const centre = theta => wallRadius(theta) - SPIRAL.width / 2;
export const toPlan = (r, theta) => [r * Math.cos(theta) * SPIRAL.ex, r * Math.sin(theta) * SPIRAL.ey];

// arc-length table along the corridor centre line
const N = 4000, table = [0];
for (let i = 1; i <= N; i++) {
  const t0 = END * (i - 1) / N, t1 = END * i / N;
  table.push(table[i - 1] + Math.hypot(centre(t1) * Math.cos(t1) - centre(t0) * Math.cos(t0), centre(t1) * Math.sin(t1) - centre(t0) * Math.sin(t0)));
}
export const PATH_LENGTH = table[N];
const thetaAt = s => {
  let lo = 0, hi = N;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (table[mid] <= s) lo = mid; else hi = mid; }
  const f = (s - table[lo]) / ((table[hi] - table[lo]) || 1);
  return END * (lo + f) / N;
};
// short transition from the corridor mouth into a circling loop inside the chamber
const MOUTH = centre(END), TURN_IN = Math.PI / 2;
let TRANSITION = 0;
for (let i = 1; i <= 200; i++) {
  const w0 = (i - 1) / 200, w1 = i / 200;
  const r0 = MOUTH + (SPIRAL.loop - MOUTH) * w0, r1 = MOUTH + (SPIRAL.loop - MOUTH) * w1, a0 = END + TURN_IN * w0, a1 = END + TURN_IN * w1;
  TRANSITION += Math.hypot(r1 * Math.cos(a1) - r0 * Math.cos(a0), r1 * Math.sin(a1) - r0 * Math.sin(a0));
}
export const LOOP = TAU * SPIRAL.loop;
export const CHAMBER_START = PATH_LENGTH + TRANSITION;
const innermost = theta => wallRadius(END + (((theta - END) % TAU) + TAU) % TAU);

function polar(s) {
  if (s <= PATH_LENGTH) return {theta: thetaAt(s), r: centre(thetaAt(s)), chamber: false};
  const u = s - PATH_LENGTH;
  if (u <= TRANSITION) { const w = u / TRANSITION; return {theta: END + TURN_IN * w, r: MOUTH + (SPIRAL.loop - MOUTH) * w, chamber: true}; }
  return {theta: END + TURN_IN + ((u - TRANSITION) % LOOP) / SPIRAL.loop, r: SPIRAL.loop, chamber: true};
}

export function bodyAt(s, side = 0) {
  s = Math.max(0, s);
  const p = polar(s), half = SPIRAL.width / 2;
  let r, outer, inner;
  if (!p.chamber) {
    r = p.r - side * half * .82;
    outer = wallRadius(p.theta) - r;
    inner = r - wallRadius(p.theta + TAU);
  } else {
    r = Math.max(.2, p.r - side * .5 * Math.min(1, (s - PATH_LENGTH) / TRANSITION));
    outer = innermost(p.theta) - r;
    inner = r + innermost(p.theta + Math.PI);
  }
  const [x, y] = toPlan(r, p.theta);
  const before = polar(Math.max(0, s - .02)), after = polar(s + .02);
  const [x0, y0] = toPlan(before.r, before.theta), [x1, y1] = toPlan(after.r, after.theta), length = Math.hypot(x1 - x0, y1 - y0) || 1;
  return {s, side, theta: p.theta, r, x, y, outer, inner, chamber: p.chamber, depth: Math.min(1, s / PATH_LENGTH), heading: [(x1 - x0) / length, (y1 - y0) / length]};
}

// floor edge: sine ripples the steel; top edge: torque leans the plate, breathing with pair's relative phase
export function edges(theta, look) {
  const level = (look.gain ?? .12) / .12, pairOn = look.gain > 0 ? Math.min(1, (look.pairGain ?? 0) / look.gain) : 0;
  const base = wallRadius(theta);
  const floor = base + .05 * level * Math.sin(theta * look.a / 10 - TAU * (look.slow || 0));
  const breath = .6 + .4 * pairOn * Math.sin(TAU * (look.relative || 0));
  const top = base + SPIRAL.lean * breath * Math.sin(2 * theta + .9) + .05 * level * pairOn * Math.sin(theta * (look.b ?? look.a) / 10 - TAU * ((look.slow || 0) + (look.relative || 0)));
  return {floor, top};
}

export function unitPositions() {
  const units = [];
  for (let s = SPIRAL.unitStart; s < PATH_LENGTH - .5; s += SPIRAL.unitEvery) units.push(s);
  return units;
}

const hash = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export function personAt(i, t) {
  const speed = .35 + .5 * hash(i + 1), offset = hash(i + 11) * PATH_LENGTH * 2, span = PATH_LENGTH * 2;
  const x = ((speed * t + offset) % span + span) % span, s = x < PATH_LENGTH ? x : span - x;
  const side = .65 * Math.sin(t / (4 + i * 1.3) + i * 2.1);
  return {...bodyAt(s, side), index: i, direction: x < PATH_LENGTH ? 1 : -1, speed};
}
