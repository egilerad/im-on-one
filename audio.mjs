import {PairState, Walker, peopleSteps} from './state.mjs';
import {bodyAt, personAt, PATH_LENGTH, wallRadius, toPlan} from './spiral.mjs';

// sound of walking through a schematic torqued spiral. expressive, not a measured acoustic model.
const SPEED = 343, LOOKAHEAD = .08;
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
  compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 6; compressor.attack.value = .004; compressor.release.value = .25;
  master.gain.value = .55; analyser.fftSize = 2048; shelf.gain.value = 0; direct.gain.value = 1;
  dry.connect(shelf); shelf.connect(dark); dark.connect(direct); direct.connect(out); compressor.connect(master); master.connect(analyser); analyser.connect(ctx.destination);

  // a distributed metallic skin on the entire world, not a local source.
  const auraDry=gain(); auraDry.gain.value=1; out.connect(auraDry); auraDry.connect(compressor);
  const aura=STRIKE.ratios.map((ratio,i)=>{
    const band=filter('bandpass',220*ratio,3), d=delay(.2,[.019,.031,.047,.071][i]), wet=gain(), p=pan(i%2?.65:-.65);
    wet.gain.value=0; out.connect(band); band.connect(d); d.connect(wet); wet.connect(p); p.connect(compressor);
    return {band,d,wet,ratio,i};
  });

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

  // walking changes transmission through the existing tones, not just a layer of attacks.
  const movementFilter=filter('lowpass',9000), movementGain=gain();
  movementFilter.connect(movementGain); movementGain.connect(dry); movementGain.gain.value=1;
  // The sine pair is independent of objects and their actions.
  const voices = [0, 1].map(i => {
    const level = gain(); level.gain.value = 0; level.connect(movementFilter);
    const oscillators = [1].map(ratio => {
      const o = add(ctx.createOscillator()); o.type = 'sine'; o.frequency.value = (i ? 110.25 : 110) * ratio;
      const g = gain(); g.gain.value = 1; o.connect(g); g.connect(level); o.start(start);
      return {o, g, ratio, amp: 1};
    });
    return {level, oscillators};
  });

  let dead = false, values = {a: null, b: null, gain: .12, walk: 0, side: 0, metal: 0, people: 0, linger: .2, size: 1, place: .12, strike: 0, every: 0, decay: 2, echo: .3, reach: 6}, peopleTime = 0, generation = 1;
  let nextOnset = null, repeatPeriod = 0;
  const recent = [];
  const remember = event => { recent.push(event); while (recent.length > 160) recent.shift(); };
  const at = local => start + local;
  const param = (p, v, time, tau = pair.tau) => p.setTargetAtTime(v, Math.max(start, time), tau);

  function step(time, level, panValue, cutoff) {
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    // soft sole/friction swell: no heel/toe clicks or abrupt noise cut-off.
    src.buffer = noise; lp.type = 'lowpass'; lp.frequency.value = Math.min(280,cutoff); lp.Q.value = -6; p.pan.value = clamp(panValue, -1, 1);
    const duration=.72, envelope=new Float32Array(128);
    for(let i=0;i<envelope.length;i++)envelope[i]=level*.18*Math.sin(Math.PI*i/(envelope.length-1))**2;
    g.gain.setValueCurveAtTime(envelope,time,duration);
    src.connect(lp); lp.connect(g); g.connect(p); p.connect(dry);
    src.start(time, (time * 7.31) % .2); src.stop(time + duration + .02);
    transient([src], [src, lp, g, p]);
  }
  const transients = new Set();
  // Each transient owns its entire graph. The final source's audio onended (not a
  // wall-clock timer) releases it, including when rendering faster than real time.
  function transient(sources, graph) {
    const entry = {sources, graph}; transients.add(entry);
    let remaining = sources.length;
    for (const source of sources) source.onended = () => {
      if (--remaining === 0) { for (const n of graph) n.disconnect(); transients.delete(entry); }
    };
  }
  // Ray/steel intersections on the schematic plan: no dependence on sounding sines.
  function spatial(body, source, reach = values.reach) {
    const dx = source.x - body.x, dy = source.y - body.y, distance = Math.hypot(dx, dy);
    let occluded = false, previous = toPlan(wallRadius(0), 0);
    for (let i = 1; i <= 600 && !occluded; i++) {
      const theta = Math.PI * 6 * i / 600, point = toPlan(wallRadius(theta), theta);
      const sx = point[0] - previous[0], sy = point[1] - previous[1], den = dx * sy - dy * sx;
      if (Math.abs(den) > 1e-9) {
        const px = previous[0] - body.x, py = previous[1] - body.y;
        const t = (px * sy - py * sx) / den, u = (px * dy - py * dx) / den;
        if (t > .001 && t < .999 && u >= 0 && u <= 1) occluded = true;
      }
      previous = point;
    }
    return {distance, occluded, pan: panTo(body, source.x, source.y), attenuation: (occluded ? .24 : 1) / (1 + (distance / reach) ** 2), cutoff: occluded ? 450 : 9000};
  }
  function strike(time, level, panValue, damp, cutoff = 9000, material = values) {
    const p = ctx.createStereoPanner(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = -6; lp.frequency.value = Math.min(cutoff, 9000 * (1-damp)**2 + 380);
    p.pan.value = clamp(panValue, -1, 1); p.connect(lp); lp.connect(out);
    const base = 220 / material.size, graph = [p, lp], sources = [];
    let lastReflection = 0;
    if (material.echo > 0) for (const [i, seconds] of [.045, .11, .23, .41, .68].entries()) {
      const d = ctx.createDelay(2), g = ctx.createGain(), reflectionPan = ctx.createStereoPanner();
      d.delayTime.value = seconds; g.gain.value = material.echo * .55 * .65 ** i;
      reflectionPan.pan.value = clamp((i % 2 ? 1 : -1) * .65 - panValue * .25, -1, 1);
      lp.connect(d); d.connect(g); g.connect(reflectionPan); reflectionPan.connect(out);
      graph.push(d, g, reflectionPan); lastReflection = seconds;
    }
    STRIKE.ratios.forEach((ratio, i) => {
      const f = base * ratio; if (f > ctx.sampleRate * .45) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), decay = material.decay * STRIKE.decays[i] / STRIKE.decays[0];
      o.frequency.value = f; g.gain.setValueAtTime(0, time); g.gain.linearRampToValueAtTime(level * STRIKE.amps[i], time + .002); g.gain.exponentialRampToValueAtTime(1e-7, time + Math.max(.008, decay)); g.gain.linearRampToValueAtTime(0, time + decay + .01);
      o.connect(g); g.connect(p); o.start(time); o.stop(time + decay + .05 + lastReflection); graph.push(o, g); sources.push(o);
    });
    transient(sources, graph);
  }
  function objectStrike(time) {
    if (!(values.metal > 0 && values.strike > 0)) return;
    const source = bodyAt(walker.s, walker.side);
    // the excitation belongs to the whole field; place no longer locates a box.
    strike(time, .16 * values.metal * values.strike * (1-.45*walker.damp), 0, walker.damp, 9000);
    remember({type: 'aura', index: 0, time: time - start, ...source, metal: values.metal, strength: values.strike, baseHz: 220 / values.size});
  }
  // pan of a point relative to where the body faces (−1 left, 1 right)
  const facing = body => { const dir = walker.speed < -.01 ? -1 : 1; return [body.heading[0] * dir, body.heading[1] * dir]; };
  const panTo = (body, x, y) => { const [fx, fy] = facing(body), dx = x - body.x, dy = y - body.y, d = Math.hypot(dx, dy) || 1; return (fy * dx - fx * dy) / d; };

  function contact(time, index, sequence, body) {
    const person = personAt(index, time), wall = person.side >= 0 ? 'inner' : 'outer';
    const r = wallRadius(person.theta + (wall === 'inner' ? 2 * Math.PI : 0));
    const [x, y] = toPlan(r, person.theta), source = {...person, r, x, y};
    const image = spatial(body, source, values.reach), kind = ['brush', 'touch', 'strike'][sequence % 3];
    if (kind === 'strike') strike(at(time), .13 * image.attenuation, image.pan, walker.damp, image.cutoff, {size: .85 + index * .12, decay: 1.1, echo: values.echo});
    else {
      const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
      const duration = kind === 'brush' ? .42 : .12, level = (kind === 'brush' ? .19 : .28) * image.attenuation;
      src.buffer = noise; lp.type = 'bandpass'; lp.Q.value = -6; lp.frequency.value = Math.min(image.cutoff, kind === 'brush' ? 1700 : 720); p.pan.value = image.pan;
      g.gain.setValueAtTime(0, at(time)); g.gain.linearRampToValueAtTime(level, at(time) + .012); g.gain.exponentialRampToValueAtTime(1e-7, at(time) + duration);
      src.connect(lp); lp.connect(g); g.connect(p); p.connect(out);
      const d=ctx.createDelay(2), wet=ctx.createGain(), ref=ctx.createBiquadFilter();
      d.delayTime.value=.035+Math.min(1,image.distance/343); wet.gain.value=values.echo*.5;
      ref.type='lowpass'; ref.Q.value=-6; ref.frequency.value=Math.min(image.cutoff,2000*(1-walker.damp)+300);
      p.connect(d); d.connect(ref); ref.connect(wet); wet.connect(out);
      src.start(at(time), (index * .137) % .5); src.stop(at(time) + duration + .1 + d.delayTime.value);
      transient([src], [src, lp, g, p, d, wet, ref]);
    }
    remember({type: 'contact', time, index, x, y, theta: person.theta, r, s: person.s, wall, kind, heading: person.heading, ...image});
  }

  function tick(time) {
    if (dead) return;
    const local = Math.max(0, time - start), ahead = local + LOOKAHEAD;
    const wallsNow = pair.advance(local).walls;
    if (values.every > 0 && nextOnset !== null) {
      // Advance the cursor rather than scheduling missed attacks after throttling.
      if (nextOnset < local - 1e-8) nextOnset += Math.ceil((local - nextOnset - 1e-8) / values.every) * values.every;
      while (nextOnset < ahead - 1e-8) {
        objectStrike(at(nextOnset)); nextOnset += values.every;
      }
    }
    const events = walker.advance(ahead), w = walker.snapshot(), damp = w.damp, body = bodyAt(w.s, w.side);
    for (const e of events.steps) {
      const b = bodyAt(e.s, e.side);
      step(at(e.time), .45 * (1 - .35 * damp), (e.foot ? .08 : -.08), 1100 * (1 - .5 * damp) + 220);
      remember({type: 'step', time: e.time, x: b.x, y: b.y, theta: b.theta, r: b.r, outer: b.outer, inner: b.inner, foot: e.foot, heading: b.heading});
    }
    // Walker unit crossings are deliberately ignored: only actions excite the object.
    for (const e of peopleSteps(values.people, Math.max(peopleTime, local), ahead)) {
      const distance = Math.hypot(e.x - body.x, e.y - body.y), occluded = wallsNow > .5 && (Math.abs(e.r - body.r) > .9 || Math.abs(e.theta - body.theta) > Math.PI / 2);
      step(at(e.time), .4 / (1 + distance * .5) * (occluded ? .35 : 1), panTo(body, e.x, e.y) * .8, occluded ? 320 : 1000 * (1 - .5 * damp) + 200);
      remember({type: 'person', time: e.time, index: e.index, x: e.x, y: e.y, theta: e.theta, r: e.r, outer: e.outer, inner: e.inner, occluded, foot: e.foot, heading: [e.heading[0] * e.direction, e.heading[1] * e.direction]});
    }
    for (let i = 0; i < values.people; i++) {
      const period = 2.8 + i * .47, first = .75 + i * .39;
      const from = Math.max(peopleTime, local);
      for (let k = Math.max(0, Math.ceil((from - first - 1e-8) / period)); first + k * period < ahead - 1e-8; k++) {
        const onset = first + k * period;
        if (onset >= from - 1e-8) contact(onset, i, k, body);
      }
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
    // velocity and travelled distance act on a shared resonant field. stopping releases it smoothly.
    const motion=Math.min(1,Math.abs(w.speed)/.18);
    const pressure=.5-.5*Math.cos(2*Math.PI*w.travelled/.7);
    param(movementFilter.frequency,9000*(1-motion)+motion*(180+420*(1-near)),now,.22);
    param(movementGain.gain,1-motion*(.55+.3*pressure),now,.18);
    param(auraDry.gain,1-.2*values.metal,now,.4);
    for(const line of aura){
      param(line.band.frequency,Math.min(ctx.sampleRate*.4,220*line.ratio/values.size),now,.4);
      param(line.band.Q,.8+Math.min(8,values.decay)*.5,now,.4);
      param(line.wet.gain,values.metal*(.4/(1+line.i*.45))*(1-.5*damp),now,.45);
      param(line.d.delayTime,[.019,.031,.047,.071][line.i]*(1+values.echo),now,.4);
    }
    param(shelf.gain, 6 * near, now, .15);
    param(dark.frequency, 9000 * (1 - damp) ** 2 + 380, now, .2);
    param(direct.gain, 1 - .45 * damp, now, .2);
    param(send.gain, .16 + .3 * damp, now, .2);
    const linger = values.linger * (1 + .6 * damp);
    for (const l of lines) {
      param(l.fb.gain, Math.min(.93, 10 ** (-3 * l.t / linger) * (1 - .025 * values.people)), now, .2);
      param(l.lp.frequency, 5000 * (1 - damp) ** 1.5 + 260, now, .2);
    }
    while (recent.length && recent[0].time < local - 30) recent.shift();
  }

  function update(v, time = ctx.currentTime) {
    if (dead) return;
    const t = Math.max(start, time), local = t - start;
    values = {...values, ...v};
    if (values.every !== repeatPeriod) {
      if (values.every > 0) {
        // Preserve fractional phase to the already pending onset when changing period.
        nextOnset = repeatPeriod > 0 && nextOnset !== null
          ? local + Math.max(0, (nextOnset - local) / repeatPeriod) * values.every : local;
      } else nextOnset = null;
      repeatPeriod = values.every;
    }
    const before = pair.advance(local), silent = [before.gain < 1e-3, before.pairGain < 1e-3];
    pair.target(values, local);
    walker.target({walk: values.walk, side: values.side}, Math.max(local, walker.time));
    voices.forEach((voice, i) => {
      const f = i ? values.b : values.a;
      if (f !== null && f !== undefined) for (const osc of voice.oscillators) {
        const hz = Math.min(f * osc.ratio, ctx.sampleRate * .45);
        if (silent[i]) { osc.o.frequency.cancelScheduledValues(t); osc.o.frequency.setValueAtTime(hz, t); }
        else param(osc.o.frequency, hz, t);
      }
      param(voice.level.gain, f === null || f === undefined ? 0 : values.gain, t);
    });
    tick(t);
  }

  function commit(v, time = ctx.currentTime) {
    update(v, time);
    if (!dead && values.every === 0) objectStrike(Math.max(start, time));
  }

  function snapshot(time = ctx.currentTime) {
    const local = Math.max(0, time - start), p = pair.advance(local), w = walker.snapshot();
    const objectBody = bodyAt(values.place * PATH_LENGTH);
    const object = {...objectBody, ...spatial(bodyAt(w.s, w.side), objectBody), enabled: values.metal > 0, metal: values.metal, index: 0, size: values.size, place: values.place, baseHz: 220 / values.size, strike: values.strike, every: values.every, decay: values.decay, echo: values.echo, reach: values.reach, nextOnset};
    return {...p, ...w, object, aura: {amount:values.metal,size:values.size,decay:values.decay,echo:values.echo}, time: local, body: bodyAt(w.s, w.side), people: Array.from({length: values.people}, (_, i) => personAt(i, local)), events: recent.filter(e => e.time <= local + .02), metal: values.metal, linger: values.linger, peopleCount: values.people};
  }

  function dispose() {
    if (dead) return;
    dead = true;
    for (const voice of voices) for (const osc of voice.oscillators) try { osc.o.stop(); } catch {}
    for (const entry of transients) {
      for (const source of entry.sources) { source.onended = null; try { source.stop(); } catch {} }
      for (const n of entry.graph) n.disconnect();
    }
    transients.clear();
    for (const n of nodes) n.disconnect();
  }
  return {commit, update, tick, snapshot, dispose, analyser, start, parts: {lines, loopFb, walls, voices, send, shelf, dark}, get generation() { return generation; }, get values() { return values; }};
}
