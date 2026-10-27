import test from 'node:test';
import assert from 'node:assert/strict';
import {compile, evaluateAt} from '../language.mjs';

test('the walking score has defaults, depth and arithmetic', () => {
  const p = compile('sine 110\npair sine + 1/4\nwalk 1/3\nside sin(t/7)/2\nmetal .6\npeople 3\nlinger 6');
  const {values, errors} = evaluateAt(p, {t: 0, depth: 0});
  assert.deepEqual(errors, []);
  assert.equal(values.a, 110);
  assert.equal(values.b, 110.25);
  assert.equal(values.walk, 1 / 3);
  assert.equal(values.side, 0);
  assert.equal(values.metal, .6);
  assert.equal(values.people, 3);
  assert.equal(values.linger, 6);
  assert.equal(values.gain, .12);

  const q = compile('sine 110 + depth*40\nside -1');
  const v = evaluateAt(q, {t: 0, depth: .5}).values;
  assert.equal(v.a, 130);
  assert.equal(v.side, -1);
  assert.equal(v.walk, 1 / 3);
  assert.equal(v.people, 0);
  assert.equal(v.metal, .5);
  assert.equal(v.linger, 4);
});

test('invalid scores are rejected with lowercase line-numbered messages', () => {
  for (const text of ['sine 0', 'sine 110\nwalk 3', 'sine 110\nside 2', 'sine 110\nmetal 2', 'sine 110\npeople 9',
    'sine 110\nlinger 0', 'sine 110\nfoo 2', 'sine 110\nsine 220', 'sine globalThis.alert(1)', 'walk 1', 'sine sine'])
    assert.throws(() => compile(text), e => /^line \d+: /.test(e.message) && e.message === e.message.toLowerCase(), text);
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

test('people are whole walkers and pair off removes the second wall tone', () => {
  const v = evaluateAt(compile('sine 110\npair off\npeople 2.6'), {t: 0, depth: 0}).values;
  assert.equal(v.people, 3);
  assert.equal(v.b, null);
});
