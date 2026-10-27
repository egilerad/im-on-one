import test from 'node:test';
import assert from 'node:assert/strict';
import {SPIRAL, PATH_LENGTH, bodyAt, edges, unitPositions, personAt, toPlan} from '../spiral.mjs';

test('the path spirals inward from the entrance to the central chamber', () => {
  assert.ok(PATH_LENGTH > 40 && PATH_LENGTH < 120, String(PATH_LENGTH));
  assert.equal(bodyAt(0, 0).depth, 0);
  assert.equal(bodyAt(-5, 0).s, 0);
  assert.equal(bodyAt(PATH_LENGTH, 0).depth, 1);
  let last = -1, lastR = Infinity;
  for (let s = 0; s <= PATH_LENGTH; s += PATH_LENGTH / 40) {
    const b = bodyAt(s, 0);
    assert.ok(b.depth > last);
    assert.ok(b.r < lastR + 1e-9);
    last = b.depth; lastR = b.r;
  }
});

test('side moves the body between the outer and inner walls', () => {
  const s = PATH_LENGTH / 3, outer = bodyAt(s, -1), centre = bodyAt(s, 0), inner = bodyAt(s, 1);
  assert.ok(outer.outer < .3 && outer.inner > 1);
  assert.ok(inner.inner < .3 && inner.outer > 1);
  assert.ok(Math.abs(centre.outer - centre.inner) < 1e-9);
  assert.ok(Math.abs(centre.outer + centre.inner - SPIRAL.width) < 1e-9);
  assert.ok(Math.abs(Math.hypot(...centre.heading) - 1) < 1e-9);
});

test('beyond the corridor the body circles inside the chamber', () => {
  for (const s of [PATH_LENGTH + 1, PATH_LENGTH + 5, PATH_LENGTH + 50]) {
    const b = bodyAt(s, 0);
    assert.equal(b.chamber, true);
    assert.equal(b.depth, 1);
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
    assert.ok(b.r < SPIRAL.outer - SPIRAL.width * (SPIRAL.turns - 1));
    assert.ok(b.outer > 0 && b.inner > 0);
  }
});

test('the floor edge follows sine, while pair twists the top edge', () => {
  const look = {a: 110, b: 110.25, gain: .12, pairGain: .12, slow: 0, relative: 0};
  const twisted = {...look, relative: .25};
  const theta = 2.1;
  assert.equal(edges(theta, look).floor, edges(theta, twisted).floor);
  assert.notEqual(edges(theta, look).top, edges(theta, twisted).top);
  const faster = edges(theta, {...look, a: 220});
  assert.notEqual(faster.floor, edges(theta, look).floor);
  assert.ok(Math.abs(edges(theta, look).top - edges(theta, look).floor) < .6);
});

test('judd units sit at equal intervals and people walk deterministically', () => {
  const units = unitPositions();
  assert.ok(units.length > 8);
  for (let i = 1; i < units.length; i++) assert.ok(Math.abs(units[i] - units[i - 1] - SPIRAL.unitEvery) < 1e-9);
  assert.ok(units.at(-1) < PATH_LENGTH);
  const a = personAt(2, 31.5), b = personAt(2, 31.5);
  assert.deepEqual(a, b);
  assert.ok(a.s >= 0 && a.s <= PATH_LENGTH);
  assert.notDeepEqual(personAt(1, 10), personAt(2, 10));
  const [x, y] = toPlan(1, 0);
  assert.equal(y, 0);
  assert.equal(x, SPIRAL.ex);
});
