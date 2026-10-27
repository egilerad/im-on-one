import {compile, evaluateAt} from './language.mjs';
import {createEngine} from './audio.mjs';
import {createVisual} from './visual.mjs';
import {bodyAt} from './spiral.mjs';

const $ = id => document.getElementById(id);
const code = $('code'), mirror = document.querySelector('.mirror');
let ctx, engine, timer, origin = 0, running = false, generation = 0, program, applied = '', last = null, frozen, imageURL;

// the zero point: every visit starts from an empty score
code.value = '';
program = compile(''); applied = '';

function idle(values) {
  const v = values || evaluateAt(program, {t: 0, depth: 0}).values, hasA = v.a !== null, hasB = v.b !== null;
  return {time: 0, a: v.a ?? 110, b: v.b ?? v.a ?? 110, gain: hasA ? v.gain : 0, pairGain: hasB ? v.gain : 0, pair: hasB, existsA: +hasA, existsB: +hasB, walls: +(hasA || hasB),
    phaseA: 0, phaseB: 0, relative: 0, slow: 0, s: 0, side: v.side, speed: 0, depth: 0, damp: 0, travelled: 0, body: bodyAt(0, v.side), people: [], events: [], metal: v.metal, linger: v.linger, peopleCount: 0};
}
frozen = idle();
const state = () => running ? engine.snapshot(ctx.currentTime) : frozen;
const time = () => running ? Math.max(0, ctx.currentTime - origin) : frozen.time;

const escape = text => text.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
function mark(errors) {
  const lines = new Set(errors.map(e => e.line));
  mirror.innerHTML = code.value.split('\n').map((text, i) => lines.has(i + 1) ? `<span class="error">${escape(text) || ' '}</span>` : escape(text)).join('\n') + '\n ';
  mirror.scrollTop = code.scrollTop;
  code.setAttribute('aria-invalid', String(errors.length > 0));
  $('announce').textContent = errors.map(e => `line ${e.line}: ${e.message}`).join(' · ');
}
const draft = () => code.classList.toggle('draft', code.value !== applied);
let runtimeKey = '';
function tick() {
  if (!running) return;
  const t = time(), {values, errors} = evaluateAt(program, {t, depth: engine.snapshot(ctx.currentTime).depth}, last);
  last = values;
  engine.update(values, ctx.currentTime);
  const key = errors.map(e => e.line + e.message).join();
  if (key !== runtimeKey) { runtimeKey = key; mark(errors); }
}
function update() {
  let next;
  try { next = compile(code.value); }
  catch (e) {
    const line = Number(/^line (\d+)/.exec(e.message)?.[1] || 1);
    mark([{line, message: e.message.replace(/^line \d+: /, '')}]);
    return false;
  }
  program = next; applied = code.value; runtimeKey = ''; mark([]); draft();
  if (running) tick(); else { frozen = idle(); }
  return true;
}
async function play() {
  if (running) { update(); return; }
  if (!update()) return;
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  engine?.dispose();
  origin = ctx.currentTime + .05;
  engine = createEngine(ctx, origin);
  generation++;
  last = evaluateAt(program, {t: 0, depth: 0}).values;
  engine.update(last, origin);
  running = true;
  clearInterval(timer); timer = setInterval(tick, 25);
  $('stop').hidden = false;
}
async function stop() {
  if (!running) return;
  frozen = engine.snapshot(ctx.currentTime);
  running = false; clearInterval(timer);
  $('stop').hidden = true;
  await ctx.suspend();
}

$('play').addEventListener('click', play);
$('stop').addEventListener('click', stop);
code.addEventListener('input', () => { draft(); mark([]); });
code.addEventListener('scroll', () => { mirror.scrollTop = code.scrollTop; });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); stop(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); running ? update() : play(); }
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
  if (!file || file.size > 15 * 1024 * 1024) return;
  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = URL.createObjectURL(file);
  $('image').src = imageURL; $('image').hidden = false;
});
mark([]);
code.focus();
createVisual($('visual'), () => ({state: state(), running, generation}));

window.imOnOne = {
  play, stop, update,
  get running() { return running; },
  get time() { return time(); },
  get generation() { return generation; },
  get state() { return state(); }
};
