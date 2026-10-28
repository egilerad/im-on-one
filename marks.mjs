export function footprintOpacity(event, time) {
  const age=time-event.time;
  if(age<0||age>=6)return 0;
  return (event.type==='step'?.32:event.occluded?.04:.12)*(1-age/6)**2;
}

// rough marks: jagged spirals for people, irregular footprints. pure geometry in unit space.
const TAU = Math.PI * 2;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function jaggedSpiral(seed, {turns = 2.25, radius = 1, step = .48} = {}) {
  const n = Math.ceil(turns * TAU / step), pts = [];
  for (let i = 0; i <= n; i++) {
    const a = i * step + (i && i < n ? (hash(seed * 7.3 + i * 2.1) - .5) * step * .6 : 0);
    const r = radius * (i / n) * (i ? 1 + (hash(seed * 3.7 + i * 1.37) - .5) * .55 : 0);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}

export function jaggedPrint(seed, {length = 1, width = .45, points = 11} = {}) {
  const outline = [];
  for (let i = 0; i < points; i++) {
    const a = TAU * i / points, j = 1 + (hash(seed * 5.1 + i * 1.9) - .5) * .7;
    outline.push([Math.cos(a) * length * .5 * j, Math.sin(a) * width * .5 * j]);
  }
  const grit = [], count = 2 + Math.floor(hash(seed * 9.7) * 5);
  for (let i = 0; i < count; i++) {
    const a = TAU * hash(seed * 2.3 + i), d = .45 + .3 * hash(seed * 4.1 + i);
    grit.push({x: Math.cos(a) * length * d, y: Math.sin(a) * width * d * .8, size: .04 + .06 * hash(seed + i * 3.3)});
  }
  return {outline, grit};
}
