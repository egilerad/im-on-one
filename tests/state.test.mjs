import test from 'node:test';
import assert from 'node:assert/strict';
import {PairState, Walker, peopleSteps} from '../state.mjs';
import {PATH_LENGTH, SPIRAL} from '../spiral.mjs';

test('frequency edits retain phase and smooth the same state used by sound and drawing', () => {
  const s = new PairState();
  s.target({a: 110, b: 110.25, gain: .12}, 0);
  s.advance(.5);
  const before = s.snapshot();
  s.target({a: 220, b: 220.25, gain: .12}, .5);
  assert.equal(s.snapshot().phaseA, before.phaseA);
  s.advance(.51);
  assert.ok(s.snapshot().a > 110 && s.snapshot().a < 220);
  assert.ok(s.snapshot().phaseA > before.phaseA);
  s.target({a: 220, b: null, gain: .12}, .51);
  s.advance(.53);
  assert.ok(s.snapshot().pairGain > 0 && s.snapshot().pairGain < .12);
});

test('walking a third of a metre per second advances about ten metres in thirty seconds', () => {
  const w = new Walker();
  w.target({walk: 1 / 3, side: 0}, 0);
  w.advance(30);
  const s = w.snapshot();
  assert.ok(s.s > 9.3 && s.s < 10, String(s.s));
  assert.equal(s.depth, s.s / PATH_LENGTH);
});

test('walking backward at the entrance stands still', () => {
  const w = new Walker();
  w.target({walk: -1, side: 0}, 0);
  const events = w.advance(10);
  assert.equal(w.snapshot().s, 0);
  assert.equal(events.steps.length, 0);
});

test('footsteps follow distance and alternate; judd units sound when passed in either direction', () => {
  const w = new Walker();
  w.target({walk: 1 / 3, side: 0}, 0);
  const out = w.advance(30);
  const expected = Math.floor(w.snapshot().travelled / SPIRAL.stride);
  assert.equal(out.steps.length, expected);
  out.steps.forEach((step, i) => { assert.equal(step.foot, i % 2); if (i) assert.ok(step.time > out.steps[i - 1].time); });
  assert.deepEqual(out.units.map(u => u.index), [0, 1, 2]);
  w.target({walk: -1 / 3, side: 0}, 30);
  const back = w.advance(62);
  assert.deepEqual(back.units.map(u => u.index), [2, 1, 0]);
});

test('damping only accumulates, even when walking back out', () => {
  const w = new Walker();
  w.target({walk: 2, side: 0}, 0);
  let last = 0;
  for (let t = 1; t <= 40; t++) { w.advance(t); assert.ok(w.snapshot().damp >= last); last = w.snapshot().damp; }
  w.target({walk: -2, side: 0}, 40);
  for (let t = 41; t <= 80; t++) { w.advance(t); assert.ok(w.snapshot().damp >= last); last = w.snapshot().damp; }
  assert.ok(last > .5 && last <= 1);
});

test('other people leave their own deterministic footsteps', () => {
  const steps = peopleSteps(3, 0, 20);
  assert.ok(steps.length > 10);
  for (const step of steps) { assert.ok(step.index < 3); assert.ok(step.time > 0 && step.time <= 20); assert.ok(Number.isFinite(step.x)); }
  assert.deepEqual(steps, peopleSteps(3, 0, 20));
  assert.equal(peopleSteps(0, 0, 20).length, 0);
  const split = [...peopleSteps(3, 0, 7), ...peopleSteps(3, 7, 20)];
  assert.equal(split.length, steps.length);
});

test('side eases the body toward a wall rather than jumping', () => {
  const w = new Walker();
  w.target({walk: 0, side: -1}, 0);
  w.advance(.1);
  assert.ok(w.snapshot().side > -.2);
  w.advance(8);
  assert.ok(w.snapshot().side < -.95);
});
