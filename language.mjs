// bounded mathematical score language for "i'm on one". it never executes javascript.
const NAMES = ['t', 'depth', 'sine', 'pi'];
const FUNCTIONS = ['sin', 'cos', 'abs'];
const ORDER = ['sine', 'pair', 'gain', 'walk', 'side', 'metal', 'people', 'linger', 'size', 'place', 'strike', 'every', 'decay', 'echo', 'reach'];
// the zero point: a word that is not written adds nothing (no tone, standing still, no metal, nobody, dry)
const DEFAULTS = {gain: '.12', walk: '0', side: '0', metal: '0', people: '0', linger: '.2', size: '1', place: '.12', strike: '0', every: '0', decay: '2', echo: '.3', reach: '6'};
const RANGES = {
  sine: [30, 2000, 'sine 30–2000 hz'],
  pair: [30, 2000, 'pair 30–2000 hz'],
  gain: [0, .25, 'gain 0–.25'],
  walk: [-2, 2, 'walk -2–2 metres per second'],
  side: [-1, 1, 'side -1 (outer wall) to 1 (inner wall)'],
  metal: [0, 1, 'metal 0–1'],
  people: [0, 8, 'people 0–8'],
  linger: [.2, 20, 'linger .2–20 seconds'],
  size: [.25,4,'size .25–4'], place: [0,1,'place 0–1 along the path'],
  strike: [0,1,'strike 0–1'], every: [0,60,'every 0 (one shot) or .25–60 seconds'],
  decay: [.1,12,'decay .1–12 seconds'], echo: [0,1,'echo 0–1'], reach: [.5,20,'reach .5–20 metres']
};
const fail = (line, message) => { throw Error(`line ${line}: ${message}`); };

export function expression(text, line = 1) {
  if (text.length > 200) fail(line, 'expression too long');
  const tokens = text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|\*\*|[()+\-*/%^]/g) || [];
  if (tokens.join('') !== text.replace(/\s/g, '')) fail(line, 'invalid expression');
  let i = 0, depth = 0;
  const atom = () => {
    if (++depth > 24) throw Error('expression too deep');
    const token = tokens[i++];
    let node;
    if (token === '(') { node = sum(); if (tokens[i++] !== ')') throw Error('missing )'); }
    else if (FUNCTIONS.includes(token)) {
      if (tokens[i++] !== '(') throw Error('function needs (...)');
      node = {op: token, a: sum()};
      if (tokens[i++] !== ')') throw Error('missing )');
    } else if (NAMES.includes(token)) node = {op: token};
    else if (token && /^[\d.]/.test(token)) node = {op: 'number', value: Number(token)};
    else throw Error('use numbers, t, depth, sine, pi, sin(), cos(), abs()');
    depth--;
    return node;
  };
  const power = () => { let n = atom(); if (tokens[i] === '^' || tokens[i] === '**') { i++; n = {op: '^', a: n, b: unary()}; } return n; };
  const unary = () => { if (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++]; return {op: 'u' + op, a: unary()}; } return power(); };
  const product = () => { let n = unary(); while (['*', '/', '%'].includes(tokens[i])) { const op = tokens[i++]; n = {op, a: n, b: unary()}; } return n; };
  const sum = () => { let n = product(); while (['+', '-'].includes(tokens[i])) { const op = tokens[i++]; n = {op, a: n, b: product()}; } return n; };
  try {
    const tree = sum();
    if (i !== tokens.length) throw Error('unexpected token');
    return {tree, text, line};
  } catch (e) {
    if (/^line \d+:/.test(e.message)) throw e;
    fail(line, e.message);
  }
}

export function evaluate(rule, env = {}) {
  const walk = n => {
    if (n.op === 'number') return n.value;
    if (n.op === 't') return env.t ?? 0;
    if (n.op === 'depth') return env.depth ?? 0;
    if (n.op === 'pi') return Math.PI;
    if (n.op === 'sine') { if (!Number.isFinite(env.sine)) throw Error(env.self ? 'sine cannot refer to itself' : 'there is no sine line to refer to'); return env.sine; }
    const a = walk(n.a);
    if (n.op === 'sin') return Math.sin(a);
    if (n.op === 'cos') return Math.cos(a);
    if (n.op === 'abs') return Math.abs(a);
    if (n.op === 'u-') return -a;
    if (n.op === 'u+') return a;
    const b = walk(n.b);
    if ((n.op === '/' || n.op === '%') && b === 0) throw Error('division by zero');
    return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : n.op === '/' ? a / b : n.op === '%' ? a % b : a ** b;
  };
  try {
    const value = walk(rule.tree);
    if (!Number.isFinite(value)) throw Error('non-finite result');
    return value;
  } catch (e) { fail(rule.line, e.message); }
}

export function compile(source) {
  if (source.length > 8000) fail(1, 'score too long');
  const program = {rules: {}, off: false, lines: {}};
  for (const [index, raw] of source.split('\n').entries()) {
    const line = index + 1, text = raw.replace(/#.*$/, '').trim();
    if (!text) continue;
    const match = /^([a-z]+)\s+(.+)$/.exec(text);
    if (!match || !ORDER.includes(match[1])) fail(line, 'unknown word; use sine, pair, walk, side, metal, size, place, strike, every, decay, echo, reach, people, linger, gain');
    const [, key, value] = match;
    if (program.rules[key] || (key === 'pair' && program.off)) fail(line, `duplicate ${key}`);
    if (key === 'pair' && value === 'off') { program.off = true; program.lines.pair = line; continue; }
    program.rules[key] = expression(value, line);
    program.lines[key] = line;
  }
  for (const key of ORDER) if (!program.rules[key] && DEFAULTS[key]) program.rules[key] = {...expression(DEFAULTS[key], 0), implicit: true};
  const {errors} = evaluateAt(program, {t: 0, depth: 0});
  if (errors.length) throw Error(`line ${errors[0].line}: ${errors[0].message}`);
  return program;
}

const NAMES_OUT = {sine: 'a', pair: 'b'};
// evaluates each line independently; a failing line holds its previous value and reports an error.
export function evaluateAt(program, env = {}, previous = null) {
  const values = {}, errors = [];
  for (const key of ORDER) {
    const out = NAMES_OUT[key] || key;
    const rule = program.rules[key];
    if (!rule) { values[out] = null; continue; }
    try {
      let value = evaluate(rule, {t: env.t ?? 0, depth: env.depth ?? 0, sine: key === 'sine' ? undefined : values.a, self: key === 'sine'});
      if (key === 'people') value = Math.round(value);
      const [low, high, message] = RANGES[key];
      if (value < low || value > high || (key === 'every' && value > 0 && value < .25)) throw Error(`line ${rule.line}: ${message}`);
      values[out] = value;
    } catch (e) {
      const line = rule.line || program.lines[key] || 1;
      errors.push({line, message: e.message.replace(/^line \d+: /, '')});
      values[out] = previous && Number.isFinite(previous[out]) ? previous[out] : null;
    }
  }
  return {values, errors};
}
