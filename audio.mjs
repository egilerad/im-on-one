import {PairState, Walker, peopleSteps} from './state.mjs';
import {bodyAt, personAt} from './spiral.mjs';

// sound of walking through a schematic torqued spiral. expressive, not a measured acoustic model.
const SPEED = 343, LOOKAHEAD = .08;
const METAL = {ratios: [2.76, 5.4, 8.93], amps: [.22, .11, .05]};
const STRIKE = {ratios: [1, 2.76, 5.4, 8.93], amps: [1, .45, .25, .12], decays: [2.6, 1.3, .7, .4]};
const noiseBuffer = ctx => {
  const length = ctx.sampleRate, buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
  let seed = 22222;
  for (let i = 0; i < length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
  return buffer;
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createEngine(ctx, start = ctx.currentTime) {
  const pair = new PairState(), walker = new Walker(), nodes = [], add = n => (nodes.push(n), n);
  // web audio lowpass q is in db: keep it at or below -3 db (no resonant peak) inside feedback loops
  const gain = () => add(ctx.createGain()), filter = (type, f, q = -3) => { const n = add(ctx.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const delay = (max, t) => { const n = add(ctx.createDelay(max)); n.delayTime.value = t; return n; };
  const pan = p => { const n = add(ctx.createStereoPanner()); n.pan.value = p; return n; };
  const noise = noiseBuffer(ctx);

  // master: dry → wall-pressure shelf → damping lowpass → out → compressor → analyser
  const dry = gain(), shelf = filter('lowshelf', 180), dark = filter('lowpass', 9000), direct = gain(), out = gain(), compressor = add(ctx.createDynamicsCompressor()), master = gain(), analyser = add(ctx.createAnalyser());
  Object.assign(compressor, {});
  compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 6; compressor.attack.value = .004; compressor.release.value = .25;
  master.gain.value = .55; analyser.fftSize = 2048; shelf.gain.value = 0; direct.gain.value = 1;
  dry.connect(shelf); shelf.connect(dark); dark.connect(direct); direct.connect(out); out.connect(compressor); compressor.connect(master); master.connect(analyser); analyser.connect(ctx.destination);

  // first reflections from each wall, then a flutter bouncing between them
  const walls = ['outer', 'inner'].map((name, i) => {
    const d = delay(.1, .004), lp = filter('lowpass', 6000), g = gain(), p = pan(i ? .6 : -.6);
    shelf.connect(d); d.connect(lp); lp.connect(g); g.connect(p); p.connect(out); g.gain.value = .2;
    return {name, d, lp, g, p};
  });
  const loop = delay(.2, .009), loopLp = filter('lowpass', 3500, -6), loopFb = gain(), loopOut = gain();
  for (const w of walls) w.g.connect(loop);
  loop.connect(loopLp); loopLp.connect(loopFb); loopFb.connect(loop); loopLp.connect(loopOut); loopOut.connect(out);
  loopFb.gain.value = .4; loopOut.gain.value = .3;

  // lingering: four damped feedback lines
  const send = gain(); shelf.connect(send); send.gain.value = .16;
  const lines = [.067, .097, .131, .181].map((t, i) => {
    const d = delay(.5, t), lp = filter('lowpass', 4500, -6), fb = gain(), wet = gain(), p = pan([-.7, .7, -.3, .3][i]);
    send.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(p); p.connect(out);
    fb.gain.value = .5; wet.gain.value = .35;
    return {t, lp, fb};
  });

  // two wall tones with metallic partials; the oscillators run for the whole performance
  const voices = [0, 1].map(i => {
    const level = gain(); level.gain.value = 0; level.connect(dry);
    const oscillators = [1, ...METAL.ratios].map((ratio, k) => {
      const o = add(ctx.createOscillator()); o.type = 'sine'; o.frequency.value = (i ? 110.25 : 110) * ratio;
      const g = gain(); g.gain.value = k ? 0 : 1; o.connect(g); g.connect(level); o.start(start);
      return {o, g, ratio, amp: k ? METAL.amps[k - 1] : 1};
    });
    return {level, oscillators};
  });

  // people in the room: a faint shared presence
  const room = add(ctx.createBufferSource()), roomBand = filter('bandpass', 450, .6), roomGain = gain();
  room.buffer = noise; room.loop = true; room.connect(roomBand); roomBand.connect(roomGain); roomGain.connect(dry); roomGain.gain.value = 0; room.start(start);

  let dead = false, values = {a: null, b: null, gain: .12, walk: 0, side: 0, metal: 0, people: 0, linger: .2}, peopleTime = 0, generation = 1;
  const recent = [];
  const remember = event => { recent.push(event); while (recent.length > 160) recent.shift(); };
  const at = local => start + local;
  const param = (p, v, time, tau = pair.tau) => p.setTargetAtTime(v, Math.max(start, time), tau);

  function step(time, level, panValue, cutoff) {
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    src.buffer = noise; lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = .7; p.pan.value = clamp(panValue, -1, 1);
    g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(level, time + .003); g.gain.exponentialRampToValueAtTime(level * .05 + 1e-5, time + .045);
    g.gain.linearRampToValueAtTime(level * .5, time + .055); g.gain.exponentialRampToValueAtTime(1e-5, time + .17);
    src.connect(lp); lp.connect(g); g.connect(p); p.connect(dry);
    src.start(time, (time * 7.31) % .7, .2); src.stop(time + .2);
    src.onended = () => { src.disconnect(); lp.disconnect(); g.disconnect(); p.disconnect(); };
  }
  function strike(time, level, panValue, damp) {
    const p = ctx.createStereoPanner(); p.pan.value = clamp(panValue, -1, 1); p.connect(dry);
    const base = (pair.existsA >= pair.existsB ? pair.a : pair.b) * 2, parts = [];
    STRIKE.ratios.forEach((ratio, i) => {
      const f = base * ratio; if (f > ctx.sampleRate * .45) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), decay = STRIKE.decays[i] * (1 - .45 * damp) + .08;
      o.frequency.value = f; g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(level * STRIKE.amps[i], time + .002); g.gain.exponentialRampToValueAtTime(1e-5, time + decay);
      o.connect(g); g.connect(p); o.start(time); o.stop(time + decay + .05); parts.push(o, g);
      o.onended = () => { o.disconnect(); g.disconnect(); };
    });
    setTimeout?.(() => p.disconnect(), 6000);
  }
  // pan of a point relative to where the body faces (−1 left, 1 right)
  const facing = body => { const dir = walker.speed < -.01 ? -1 : 1; return [body.heading[0] * dir, body.heading[1] * dir]; };
  const panTo = (body, x, y) => { const [fx, fy] = facing(body), dx = x - body.x, dy = y - body.y, d = Math.hypot(dx, dy) || 1; return (fy * dx - fx * dy) / d; };

  function tick(time) {
    if (dead) return;
    const local = Math.max(0, time - start), ahead = local + LOOKAHEAD;
    const wallsNow = pair.advance(local).walls;
    const events = walker.advance(ahead), w = walker.snapshot(), damp = w.damp, body = bodyAt(w.s, w.side);
    for (const e of events.steps) {
      const b = bodyAt(e.s, e.side);
      step(at(e.time), .45 * (1 - .35 * damp), (e.foot ? .08 : -.08), 1100 * (1 - .5 * damp) + 220);
      remember({type: 'step', time: e.time, x: b.x, y: b.y, theta: b.theta, r: b.r, outer: b.outer, inner: b.inner, foot: e.foot, heading: b.heading});
    }
    for (const e of events.units) {
      const b = bodyAt(e.s, w.side), near = clamp(1 - b.outer / 1.2, 0, 1);
      const outward = [Math.cos(b.theta), Math.sin(b.theta)];
      if (values.metal > 0) strike(at(e.time), values.metal * .28 * (.6 + .4 * near), panTo(b, b.x + outward[0], b.y + outward[1]) * .7, damp);
      remember({type: 'unit', time: e.time, index: e.index, x: b.x, y: b.y, theta: b.theta, metal: values.metal});
    }
    for (const e of peopleSteps(values.people, peopleTime, ahead)) {
      const distance = Math.hypot(e.x - body.x, e.y - body.y), occluded = wallsNow > .5 && (Math.abs(e.r - body.r) > .9 || Math.abs(e.theta - body.theta) > Math.PI / 2);
      step(at(e.time), .4 / (1 + distance * .5) * (occluded ? .35 : 1), panTo(body, e.x, e.y) * .8, occluded ? 320 : 1000 * (1 - .5 * damp) + 200);
      remember({type: 'person', time: e.time, index: e.index, x: e.x, y: e.y, theta: e.theta, r: e.r, outer: e.outer, inner: e.inner, occluded, foot: e.foot, heading: [e.heading[0] * e.direction, e.heading[1] * e.direction]});
    }
    peopleTime = ahead;

    // continuous field: wall distances, proximity, damping, lingering
    const now = Math.max(start, time), outerD = Math.max(.1, body.outer), innerD = Math.max(.1, body.inner), near = clamp(1 - Math.min(outerD, innerD) / .8, 0, 1);
    const outward = [Math.cos(body.theta), Math.sin(body.theta)], outerPan = panTo(body, body.x + outward[0], body.y + outward[1]) * .75;
    const pans = [outerPan, -outerPan], dists = [outerD, innerD];
    walls.forEach((wall, i) => {
      param(wall.d.delayTime, 2 * dists[i] / SPEED, now, .08);
      param(wall.g.gain, wallsNow * .55 / (1 + 1.6 * dists[i]), now, .08);
      param(wall.p.pan, pans[i], now, .2);
      param(wall.lp.frequency, 7000 * (1 - damp) + 400, now, .2);
    });
    param(loop.delayTime, clamp(2 * (outerD + innerD) / SPEED, .006, .19), now, .1);
    param(loopFb.gain, .5 * (1 - .4 * damp), now, .2);
    param(loopOut.gain, .3 * wallsNow, now, .2);
    param(loopLp.frequency, 4000 * (1 - damp) + 300, now, .2);
    param(shelf.gain, 6 * near, now, .15);
    param(dark.frequency, 9000 * (1 - damp) ** 2 + 380, now, .2);
    param(direct.gain, 1 - .45 * damp, now, .2);
    param(send.gain, .16 + .3 * damp, now, .2);
    const linger = values.linger * (1 + .6 * damp);
    for (const l of lines) {
      param(l.fb.gain, Math.min(.93, 10 ** (-3 * l.t / linger) * (1 - .025 * values.people)), now, .2);
      param(l.lp.frequency, 5000 * (1 - damp) ** 1.5 + 260, now, .2);
    }
    param(roomGain.gain, values.people * .006 * (1 - .3 * damp), now, .5);
    while (recent.length && recent[0].time < local - 30) recent.shift();
  }

  function update(v, time = ctx.currentTime) {
    if (dead) return;
    const t = Math.max(start, time), local = t - start;
    values = {...values, ...v};
    const before = pair.advance(local), silent = [before.gain < 1e-3, before.pairGain < 1e-3];
    pair.target(values, local);
    walker.target({walk: values.walk, side: values.side}, Math.max(local, walker.time));
    voices.forEach((voice, i) => {
      const f = i ? values.b : values.a;
      if (f !== null && f !== undefined) for (const osc of voice.oscillators) {
        const hz = Math.min(f * osc.ratio, ctx.sampleRate * .45);
        if (silent[i]) { osc.o.frequency.cancelScheduledValues(t); osc.o.frequency.setValueAtTime(hz, t); }
        else param(osc.o.frequency, hz, t);
        if (osc.ratio !== 1) param(osc.g.gain, f * osc.ratio < ctx.sampleRate * .45 ? osc.amp * values.metal : 0, t, .3);
      }
      param(voice.level.gain, f === null || f === undefined ? 0 : values.gain, t);
    });
    tick(t);
  }

  function snapshot(time = ctx.currentTime) {
    const local = Math.max(0, time - start), p = pair.advance(local), w = walker.snapshot();
    return {...p, ...w, time: local, body: bodyAt(w.s, w.side), people: Array.from({length: values.people}, (_, i) => personAt(i, local)), events: recent.filter(e => e.time <= local + .02), metal: values.metal, linger: values.linger, peopleCount: values.people};
  }

  function dispose() {
    if (dead) return;
    dead = true;
    for (const voice of voices) for (const osc of voice.oscillators) try { osc.o.stop(); } catch {}
    try { room.stop(); } catch {}
    for (const n of nodes) n.disconnect();
  }
  return {update, tick, snapshot, dispose, analyser, start, parts: {lines, loopFb, walls, voices, send, shelf, dark}, get generation() { return generation; }, get values() { return values; }};
}
