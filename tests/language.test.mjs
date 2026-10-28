import test from 'node:test';
import assert from 'node:assert/strict';
import {compile, evaluateAt} from '../language.mjs';

const ZERO = {a: null, b: null, gain: .12, walk: 0, side: 0, metal: 0, people: 0, linger: .2};

test('the zero point: an empty score is valid and nothing sounds or moves', () => {
  for (const text of ['', '\n\n', '# nothing yet']) {
    const {values, errors} = evaluateAt(compile(text), {t: 12, depth: 0});
    assert.deepEqual(errors, []);
    assert.deepEqual(values, ZERO);
  }
});

test('each line adds only itself: a lone sine does not walk, beat, ring or crowd', () => {
  assert.deepEqual(evaluateAt(compile('sine 110'), {t: 30, depth: 0}).values, {...ZERO, a: 110});
  assert.deepEqual(evaluateAt(compile('pair 220'), {t: 0, depth: 0}).values, {...ZERO, b: 220});
  assert.deepEqual(evaluateAt(compile('walk 1/3'), {t: 0, depth: 0}).values, {...ZERO, walk: 1 / 3});
  assert.deepEqual(evaluateAt(compile('sine 110\npair sine + 1/4'), {t: 0, depth: 0}).values, {...ZERO, a: 110, b: 110.25});
});

test('the full language still computes with depth, time and arithmetic', () => {
  const p = compile('sine 110 + depth*40\npair sine + 1/4\nwalk 1/3\nside sin(t/7)/2\nmetal .6\npeople 2.6\nlinger 6');
  const {values, errors} = evaluateAt(p, {t: 0, depth: .5});
  assert.deepEqual(errors, []);
  assert.deepEqual(values, {a: 130, b: 130.25, gain: .12, walk: 1 / 3, side: 0, metal: .6, people: 3, linger: 6});
});

test('invalid scores are rejected with lowercase line-numbered messages', () => {
  for (const text of ['sine 0', 'walk 3', 'side 2', 'metal 2', 'people 9', 'linger 0', 'foo 2', 'sine 110\nsine 220',
    'sine globalThis.alert(1)', 'sine sine', 'pair sine + 1/4', 'walk 1\npair off\npair 200'])
    assert.throws(() => compile(text), e => /^line \d+: /.test(e.message) && e.message === e.message.toLowerCase(), text);
  assert.throws(() => compile('walk 1/3\npair sine * 2'), /line 2: .*sine/);
});

test('a later out-of-range line holds its last value while the other lines keep moving', () => {
  const p = compile('sine 110+t*100\npair sine+1/4\nside sin(t)');
  const first = evaluateAt(p, {t: 0, depth: 0}).values;
  const later = evaluateAt(p, {t: 30, depth: 0}, first);
  assert.equal(later.errors.length, 1);
  assert.equal(later.errors[0].line, 1);
  assert.match(later.errors[0].message, /30–2000/);
  assert.equal(later.values.a, 110);
  assert.equal(later.values.b, 110.25);
  assert.equal(later.values.side, Math.sin(30));
});

test('pair off is the same as no pair', () => {
  assert.equal(evaluateAt(compile('sine 110\npair off'), {t: 0, depth: 0}).values.b, null);
});
