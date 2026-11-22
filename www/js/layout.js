/* Układ mapy: pomiar i zawijanie tekstu, układy right/left/both/down, wiele korzeni. */
/* ---- układ + render ---- */
let H = 30,
  GAP = 10,
  COL = DEF.colors.slice(),
  PX = 11,
  PY = 12;
/* zawijanie: maks. szerokość tekstu MAXT px, wysokość linii LH; pomiar przez canvas */
let LH = 18,
  MAXT = 220;
/** kontekst 2D do pomiaru tekstu (zawsze dostępny w przeglądarkach) */
function ctx2d() {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) throw new Error('Brak obsługi canvas 2D');
  return c;
}
const cv = ctx2d();
cv.font = '14px system-ui,sans-serif';
/* przelicz stałe układu ze stylu (domyślnie: tekst 14 px → węzeł 30 px, linia 18 px, margines 11 px) */
function applyStyle() {
  if (!stDirty) return;
  stDirty = false;
  const f = ST.fs / 14;
  H = Math.round(30 * f);
  LH = Math.round(18 * f);
  PX = Math.round(11 * f);
  PY = Math.round(12 * f);
  MAXT = ST.maxw;
  GAP = ST.gapY;
  COL = ST.colors;
  cv.font = fw() + ' ' + ST.fs + 'px ' + ff();
  cvE.font = ST.fs + 'px ' + EMOJI_FONTS;
  wc.clear();
  const g = $('g');
  g.style.setProperty('--nb', String(ST.nb));
  g.style.setProperty('--fs', ST.fs + 'px');
  g.style.setProperty('--ff', ff());
  g.style.setProperty('--fw', fw());
}
/* emoji mierzone i rysowane kolorową czcionką emoji (czcionka tekstu bywa z czarno-białymi wersjami, np. DejaVu) */
const EMO_RE =
  /(\p{Regional_Indicator}{2}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*)/u;
const cvE = ctx2d();
/** tekst → odcinki [tekst, czyEmoji] @type {(s: string) => [string, boolean][]} */
const segs = s =>
  s
    .split(EMO_RE)
    .map((t, i) => /** @type {[string, boolean]} */ ([t, i % 2 === 1]))
    .filter(x => x[0]); /* [tekst, czy emoji] */
/** szerokość tekstu w px @param {string} s */
const tw = s => {
  if (!EMO_RE.test(s)) return cv.measureText(s).width;
  let w = 0;
  for (const [t, e] of segs(s)) w += (e ? cvE : cv).measureText(t).width;
  return w;
};
/** linia węzła jako SVG (emoji w osobnych tspan) @param {string} l */
const lineHTML = l =>
  segs(l)
    .map(([t, e]) => (e ? `<tspan class="emo">${t}</tspan>` : esc(t)))
    .join('');
/** @type {(w: string) => string[]} */
const graphemes = w =>
  window.Intl && Intl.Segmenter
    ? [...new Intl.Segmenter('pl', { granularity: 'grapheme' }).segment(w)].map(x => x.segment)
    : Array.from(w);
/** zawija tekst do szerokości MAXT @param {string} s @returns {string[]} */
function wrap(s) {
  const out = [];
  let line = '';
  for (let word of s.split(/\s+/).filter(Boolean)) {
    const t = line ? line + ' ' + word : word;
    if (tw(t) <= MAXT) {
      line = t;
      continue;
    }
    if (line) out.push(line);
    /* zbyt długie słowo dzielone po grafemach – nigdy w środku emoji */
    if (tw(word) > MAXT) {
      let g = graphemes(word),
        cur = '';
      for (const ch of g) {
        if (cur && tw(cur + ch) > MAXT) {
          out.push(cur);
          cur = '';
        }
        cur += ch;
      }
      word = cur;
    }
    line = word;
  }
  if (line || !out.length) out.push(line);
  return out;
}
/** @type {Map<string, {L: string[], w: number, h: number}>} pamięć pomiaru tekstu */
const wc = new Map();
/** rozmiar węzła i jego linie (z pamięci `wc`) @param {MapNode} n */
function fit(n) {
  if (n.ph) {
    n.lines = [];
    return n;
  }
  const s = n.text + (n.collapsed && n.children.length ? ' …' : '');
  let r = wc.get(s);
  if (!r) {
    const L = wrap(s);
    r = { L, w: Math.max(44, Math.ceil(Math.max(...L.map(tw))) + 2 * PX), h: Math.max(H, L.length * LH + PY) };
    if (wc.size > 5000) wc.clear();
    wc.set(s, r);
  }
  n.lines = r.L;
  n.w = r.w;
  n.h = r.h;
  return r;
}
/** @param {MapNode} n */
function W(n) {
  return fit(n).w;
}
/** przesuń gałąź w pionie @param {MapNode} n @param {number} d */
function shY(n, d) {
  n.y += d;
  if (!n.collapsed) n.children.forEach(c => shY(c, d));
}
/** układ poziomy gałęzi; zwraca jej wysokość @param {MapNode} n @param {number} x @param {number} y @param {number} s strona @returns {number} */
function layN(n, x, y, s) {
  n.x = x;
  n.s = s;
  n.w = W(n);
  const ch = n.collapsed ? [] : n.children;
  if (!ch.length) {
    n.y = y + n.h / 2;
    return n.h;
  }
  let t = grp(ch, x, n.w, y, s);
  if (t < n.h) {
    ch.forEach(c => shY(c, (n.h - t) / 2));
    t = n.h;
  }
  n.y = (ch[0].y + ch[ch.length - 1].y) / 2;
  return t;
}
/** układ rodzeństwa @param {MapNode[]} list @param {number} px @param {number} pw @param {number} y @param {number} s */
function grp(list, px, pw, y, s) {
  let t = 0;
  for (const c of list) {
    const w = W(c),
      x = s > 0 ? px + pw + ST.gapX : px - ST.gapX - w;
    t += layN(c, x, y + t, s) + GAP;
  }
  return t - GAP;
}
/** szerokość gałęzi w układzie „dół” @param {MapNode} n @returns {number} */
function sw(n) {
  n.w = W(n);
  const ch = n.collapsed ? [] : n.children;
  return Math.max(n.w, ch.reduce((a, c) => a + sw(c), 0) + Math.max(0, ch.length - 1) * (ST.gapY + 6));
}
/** @type {number[]} */
let RT = [];
/** @type {number[]} */
let RH = []; /* układ w dół: górna krawędź i wysokość każdego rzędu (poziomu) */
/** wysokości rzędów w układzie „dół” @param {MapNode} n @param {number} d @param {number[]} a @returns {number[]} */
function rows(n, d, a) {
  W(n);
  a[d] = Math.max(a[d] || 0, n.h);
  if (!n.collapsed) n.children.forEach(c => rows(c, d + 1, a));
  return a;
}
/** układ „dół” @param {MapNode} n @param {number} l lewa krawędź @param {number} d poziom */
function layD(n, l, d) {
  n.s = 0;
  const w = sw(n),
    ch = n.collapsed ? [] : n.children;
  n.x = l + (w - n.w) / 2;
  n.y = RT[d] + RH[d] / 2;
  let x = l;
  for (const c of ch) {
    layD(c, x, d + 1);
    x += sw(c) + ST.gapY + 6;
  }
}
/** układ jednego drzewa (korzeń w x=0) @param {MapNode} r */
function layTree(r) {
  r.w = W(r);
  r.s = 1;
  r.x = 0;
  const ch = r.collapsed ? [] : r.children;
  if (dir === 'down') {
    RH = rows(r, 0, []);
    RT = [];
    RH.reduce((y, h, i) => ((RT[i] = y), y + h + ST.gapX - 4), 0);
    return layD(r, 0, 0);
  }
  let R = ch;
  /** @type {MapNode[]} lewa strona (układy left/both) */
  let L = [];
  if (dir === 'left') {
    R = [];
    L = ch;
  } else if (dir === 'both') {
    const m = Math.ceil(ch.length / 2);
    R = ch.slice(0, m);
    L = ch.slice(m);
  }
  const hr = R.length ? grp(R, 0, r.w, 0, 1) : 0,
    hl = L.length ? grp(L, 0, r.w, 0, -1) : 0,
    T = Math.max(hr, hl, H);
  R.forEach(c => shY(c, (T - hr) / 2));
  L.forEach(c => shY(c, (T - hl) / 2));
  r.y = T / 2;
}
/** @param {MapNode} n @param {number} dx @param {number} dy */
function shXY(n, dx, dy) {
  n.x += dx;
  n.y += dy;
  if (!n.collapsed) n.children.forEach(c => shXY(c, dx, dy));
}
function lay() {
  applyStyle();
  let off = 0;
  for (const r of root.children) {
    layTree(r);
    const b = bounds(vis(r));
    if (dir === 'down') {
      shXY(r, off - b.x0, 0);
      off += b.x1 - b.x0 + ST.gapTree + 20;
    } else {
      shXY(r, 0, off - b.y0);
      off += b.y1 - b.y0 + ST.gapTree;
    }
  }
}
