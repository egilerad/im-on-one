import test from 'node:test';
import assert from 'node:assert/strict';
import {jaggedSpiral, jaggedPrint} from '../marks.mjs';

const radius = ([x, y]) => Math.hypot(x, y);

test('a figure is a small jagged spiral, not a circle', () => {
  const pts = jaggedSpiral(3, {turns: 2.25, radius: 1});
  assert.deepEqual(pts, jaggedSpiral(3, {turns: 2.25, radius: 1}));
  assert.notDeepEqual(pts, jaggedSpiral(4, {turns: 2.25, radius: 1}));
  assert.ok(radius(pts[0]) < .05);
  assert.ok(radius(pts.at(-1)) > .6 && radius(pts.at(-1)) < 1.4);
  const third = Math.floor(pts.length / 3), mean = list => list.reduce((s, p) => s + radius(p), 0) / list.length;
  assert.ok(mean(pts.slice(-third)) > 2 * mean(pts.slice(0, third)));
  // it winds: unwrapped angle covers about the requested turns
  let turned = 0;
  for (let i = 2; i < pts.length; i++) { let d = Math.atan2(pts[i][1], pts[i][0]) - Math.atan2(pts[i - 1][1], pts[i - 1][0]); d -= 2 * Math.PI * Math.round(d / (2 * Math.PI)); turned += d; }
  assert.ok(Math.abs(turned / (2 * Math.PI) - 2.25) < .4, String(turned / (2 * Math.PI)));
  // and it is jagged: radii stray from a smooth spiral
  const stray = pts.reduce((s, p, i) => s + Math.abs(radius(p) - i / (pts.length - 1)), 0) / pts.length;
  assert.ok(stray > .04, String(stray));
});

test('a footprint is an irregular mark with grit, not a smooth ellipse', () => {
  const print = jaggedPrint(11, {length: 1, width: .45});
  assert.deepEqual(print, jaggedPrint(11, {length: 1, width: .45}));
  assert.notDeepEqual(print, jaggedPrint(12, {length: 1, width: .45}));
  assert.ok(print.outline.length >= 8);
  for (const [x, y] of print.outline) assert.ok(Math.abs(x) < .8 && Math.abs(y) < .45);
  const deviation = print.outline.reduce((s, [x, y], i) => {
    const a = 2 * Math.PI * i / print.outline.length, ideal = Math.hypot(.5 * Math.cos(a), .225 * Math.sin(a));
    return s + Math.abs(Math.hypot(x, y) - ideal) / ideal;
  }, 0) / print.outline.length;
  assert.ok(deviation > .08, String(deviation));
  assert.ok(print.grit.length >= 2 && print.grit.length <= 6);
});
