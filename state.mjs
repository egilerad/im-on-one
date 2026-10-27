import {PATH_LENGTH, CHAMBER_START, LOOP, SPIRAL, unitPositions, personAt} from './spiral.mjs';

// frequencies use the same exponential smoothing applied to the audio params, so drawing and sound share phase.
export class PairState {
  constructor() {
    Object.assign(this, {time: 0, a: 110, b: 110.25, gain: 0, pairGain: 0, targetA: 110, targetB: 110.25, targetGain: 0, targetPairGain: 0, phaseA: 0, phaseB: 0, slow: 0, pair: true, tau: .12});
  }
  advance(time) {
    if (time < this.time) return this.snapshot();
    const dt = time - this.time, k = Math.exp(-dt / this.tau);
    for (const key of ['a', 'b']) {
      const target = key === 'a' ? this.targetA : this.targetB, old = this[key];
      const cycles = target * dt + (old - target) * this.tau * (1 - k);
      this[key] = target + (old - target) * k;
      if (key === 'a') { this.phaseA += cycles; this.slow += cycles / 110 * .18; } else this.phaseB += cycles;
    }
    this.gain = this.targetGain + (this.gain - this.targetGain) * k;
    this.pairGain = this.targetPairGain + (this.pairGain - this.targetPairGain) * k;
    this.time = time;
    return this.snapshot();
  }
  target(v, time) {
    this.advance(time);
    this.targetA = v.a; this.targetB = v.b ?? v.a; this.targetGain = v.gain;
    this.pair = v.b !== null && v.b !== undefined; this.targetPairGain = this.pair ? v.gain : 0;
    return this.snapshot();
  }
  snapshot() {
    return {time: this.time, a: this.a, b: this.b, gain: this.gain, pairGain: this.pairGain, pair: this.pair, phaseA: this.phaseA, phaseB: this.phaseB, relative: this.phaseB - this.phaseA, slow: this.slow};
  }
}

const UNITS = unitPositions();
// the walking body: position along the spiral, distance to the walls, and damping that only accumulates.
export class Walker {
  constructor() {
    Object.assign(this, {time: 0, s: 0, speed: 0, targetSpeed: 0, side: 0, targetSide: 0, travelled: 0, damp: 0, steps: 0, tauSpeed: .8, tauSide: 1.5, pending: {steps: [], units: []}});
  }
  target(v, time) {
    if (time > this.time) { const e = this.advance(time); this.pending = e; }
    this.targetSpeed = v.walk; this.targetSide = v.side;
  }
  advance(time) {
    const out = this.pending;
    this.pending = {steps: [], units: []};
    while (this.time < time - 1e-12) {
      const h = Math.min(.05, time - this.time), t0 = this.time;
      const ks = Math.exp(-h / this.tauSpeed), kside = Math.exp(-h / this.tauSide);
      let ds = this.targetSpeed * h + (this.speed - this.targetSpeed) * this.tauSpeed * (1 - ks);
      this.speed = this.targetSpeed + (this.speed - this.targetSpeed) * ks;
      this.side = this.targetSide + (this.side - this.targetSide) * kside;
      if (this.s + ds < 0) ds = -this.s;
      const s0 = this.s, s1 = s0 + ds;
      if (ds !== 0) for (const [index, u] of UNITS.entries())
        if ((s0 < u && s1 >= u) || (s0 > u && s1 <= u)) out.units.push({time: t0 + h * (u - s0) / ds, index, s: u});
      const tr0 = this.travelled, tr1 = tr0 + Math.abs(ds);
      for (let k = Math.floor(tr0 / SPIRAL.stride) + 1; k <= Math.floor(tr1 / SPIRAL.stride); k++) {
        const f = (k * SPIRAL.stride - tr0) / (tr1 - tr0);
        out.steps.push({time: t0 + h * f, foot: this.steps++ % 2, s: s0 + ds * f, side: this.side});
      }
      this.travelled = tr1;
      this.s = s1 > CHAMBER_START + LOOP ? s1 - LOOP : s1;
      this.time = t0 + h;
      this.damp = Math.max(this.damp, .8 * Math.min(1, this.s / PATH_LENGTH) + .2 * Math.min(1, this.time / 600));
    }
    out.units.sort((x, y) => x.time - y.time);
    return out;
  }
  snapshot() {
    return {time: this.time, s: this.s, speed: this.speed, side: this.side, depth: Math.min(1, this.s / PATH_LENGTH), damp: this.damp, travelled: this.travelled};
  }
}

// other walkers move at constant speed, so their footsteps fall where speed * time crosses each stride.
export function peopleSteps(count, t0, t1) {
  const steps = [];
  for (let i = 0; i < count; i++) {
    const speed = personAt(i, 0).speed;
    for (let k = Math.floor(speed * t0 / SPIRAL.stride) + 1; k <= Math.floor(speed * t1 / SPIRAL.stride); k++) {
      const time = k * SPIRAL.stride / speed;
      if (time <= t0 || time > t1) continue;
      steps.push({...personAt(i, time), time, foot: k % 2});
    }
  }
  return steps.sort((a, b) => a.time - b.time);
}
