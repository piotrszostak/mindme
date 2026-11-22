/* Rysowanie SVG i animacja (sprężyny, „duchy” zwijanych węzłów), widok, dopasowanie. */
/* ---- animacja: pozycja wyświetlana (sprężyna) dąży do pozycji z układu ---- */
/** @type {Map<number, Pos>} pozycje wyświetlane węzłów */
const pos = new Map();
const RM = matchMedia('(prefers-reduced-motion: reduce)');
/** @type {DrawNode[]} */
let drawN = [];
/** @type {DrawEdge[]} */
let drawE = [];
let raf = 0;
let lastT = 0;
/** @type {DragState | null} */
let dnd = null;
/** @type {Map<number, number>} rodzic każdego węzła z poprzedniej klatki (dla duchów) */
let lastPar = new Map();
/** @type {Ghost[]} */
let ghosts = [];
/** pozycja wyświetlana węzła (tworzona przy pierwszym użyciu) @param {MapNode} n @returns {Pos} */
function P(n) {
  let p = pos.get(n.id);
  if (!p) {
    p = { x: n.x, y: n.y, vx: 0, vy: 0 };
    pos.set(n.id, p);
  }
  return p;
}
/* krzywa między pozycjami wyświetlanymi; strona liczona z położenia, więc gałąź „rozciąga się” za przeciąganym węzłem */
/** ścieżka SVG krawędzi rodzic → dziecko @param {MapNode} p @param {MapNode} c */
function edgeD(p, c) {
  const a = P(p),
    b = P(c),
    es = ST.edgeStyle;
  if (dir === 'down') {
    const x1 = a.x + p.w / 2,
      y1 = a.y + p.h / 2,
      x2 = b.x + c.w / 2,
      y2 = b.y - c.h / 2,
      m = Math.max(22, Math.abs(y2 - y1) / 2);
    if (es === 'straight') return `M${x1} ${y1}L${x2} ${y2}`;
    if (es === 'elbow') return `M${x1} ${y1}V${y1 + (y2 - y1) / 2}H${x2}V${y2}`;
    return `M${x1} ${y1}C${x1} ${y1 + m} ${x2} ${y2 - m} ${x2} ${y2}`;
  }
  const s = b.x + c.w / 2 >= a.x + p.w / 2 ? 1 : -1,
    x1 = s > 0 ? a.x + p.w : a.x,
    x2 = s > 0 ? b.x : b.x + c.w,
    m = Math.max(25, Math.abs(x2 - x1) / 2);
  if (es === 'straight') return `M${x1} ${a.y}L${x2} ${b.y}`;
  if (es === 'elbow') return `M${x1} ${a.y}H${x1 + (x2 - x1) / 2}V${b.y}H${x2}`;
  return `M${x1} ${a.y}C${x1 + m * s} ${a.y} ${x2 - m * s} ${b.y} ${x2} ${b.y}`;
}
/** @param {MapNode} n @param {string} col kolor gałęzi @param {string} [extra] dodatkowe klasy */
function nodeHTML(n, col, extra = '') {
  const cl = col || 'var(--acc)';
  if (n.ph)
    return `<g class="n ph" data-id="-1"><rect x="${n.x}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="${ST.radius}" stroke="${cl}"/></g>`;
  const cls = 'n' + (n.id === sel ? ' sel' : '') + (n.id === edId ? ' ed' : '') + extra;
  const y0 = n.y - ((n.lines.length - 1) * LH) / 2,
    ts = n.lines.map((l, i) => `<tspan x="${n.x + PX}" y="${y0 + i * LH}">${lineHTML(l)}</tspan>`).join('');
  /* wypełnienie inline (wygrywa z CSS i działa w eksporcie); zaznaczenie zostawia styl z CSS */
  const on = n.id !== sel && ST.fill !== 'none',
    fs = on ? ` style="fill:${cl};fill-opacity:${ST.fill === 'tint' ? 0.16 : 1}"` : '',
    tf = on && ST.fill === 'solid' ? ' style="fill:#fff"' : '';
  return `<g class="${cls}" data-id="${n.id}"><title>${esc(n.text)}</title><rect x="${n.x}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="${ST.radius}" stroke="${cl}"${fs}/><text${tf}>${ts}</text></g>`;
}
/** układ + przebudowa SVG; `keepView` – nie przesuwaj widoku do zaznaczenia @param {boolean} [keepView] */
function render(keepView) {
  lay();
  let nd = '';
  /** @type {[MapNode, string] | null} rodzic miejsca upuszczenia i jego kolor */
  let band = null;
  /** @type {[MapNode, MapNode, string, string][]} krawędzie: rodzic, dziecko, kolor, klasa */
  const E = [];
  /** @type {MapNode[]} */
  const N = [];
  /** @type {Map<number, number>} */
  const par = new Map();
  /** @type {Map<number, string>} */
  const C = new Map();
  /** @param {MapNode} n @param {string} col @param {MapNode} p */
  const w = (n, col, p) => {
    par.set(n.id, p.id);
    C.set(n.id, col);
    if (!pos.has(n.id)) {
      const q = pos.get(p.id);
      pos.set(n.id, q ? { x: q.x, y: q.y, vx: 0, vy: 0 } : { x: n.x, y: n.y, vx: 0, vy: 0 });
    } /* nowy węzeł „wyrasta” z rodzica */
    const ch = n.collapsed ? [] : n.children;
    ch.forEach((c, i) => {
      const cc = p === root ? COL[i % COL.length] : col;
      E.push([n, c, cc, c.ph ? 'phe' : '']);
      if (c.ph) band = [n, cc];
      w(c, cc, n);
    });
    N.push(n);
    nd += nodeHTML(n, col, band && band[0] === n ? ' target' : '');
  }; /* przyszły rodzic podświetlony */
  root.children.forEach(r => w(r, '', root));
  if (dnd) {
    const d = dnd;
    /** @param {MapNode} n @param {number} p */
    const v = (n, p) => {
      par.set(n.id, p);
      C.set(n.id, d.col);
      const ch = n.collapsed ? [] : n.children;
      ch.forEach(c => {
        E.push([n, c, d.col, '']);
        v(c, n.id);
      });
      N.push(n);
      nd += nodeHTML(n, d.col, ' dragging');
    };
    v(d.node, 0);
    if (band) E.push([band[0], d.node, band[1], 'band']);
  }
  /* duchy: węzły, które były widoczne, a teraz nie są – jadą do najbliższego widocznego przodka */
  const live = new Set(N.map(n => n.id));
  /** @type {Map<number, Ghost>} */
  const G = new Map();
  if (!RM.matches) {
    for (const g of ghosts) G.set(g.n.id, g);
    for (const d of drawN) if (d.n.id > 0 && !d.ghost && !live.has(d.n.id)) G.set(d.n.id, { n: d.n, col: d.col });
  }
  ghosts = [];
  for (const [id, g] of G) {
    if (live.has(id)) continue;
    let a = lastPar.get(id);
    while (a && !live.has(a)) a = lastPar.get(a);
    const f = a && find(a);
    if (!f) continue;
    g.anc = f.n;
    ghosts.push(g);
    const pp = lastPar.get(id);
    if (pp !== undefined) par.set(id, pp);
  }
  lastPar = par;
  const GE = ghosts.map(g => /** @type {[MapNode, MapNode, string, string]} */ ([g.anc, g.n, g.col, 'leave'])),
    AE = GE.concat(E);
  $('g').innerHTML =
    AE.map(e => `<path class="${e[3]}" fill="none" stroke="${e[2]}" stroke-width="${ST.edge}"/>`).join('') +
    ghosts.map(g => nodeHTML(g.n, g.col, ' leave')).join('') +
    nd;
  const ps = $('g').querySelectorAll('path'),
    gs = /** @type {NodeListOf<SVGGElement>} */ ($('g').querySelectorAll('g.n'));
  drawE = AE.map((e, i) => ({ p: e[0], c: e[1], el: ps[i], ghost: i < GE.length ? ghosts[i] : null }));
  /** @type {{n: MapNode, col: string, ghost?: Ghost}[]} */
  const all = ghosts.map(g => ({ n: g.n, col: g.col, ghost: g }));
  for (const n of N) all.push({ n, col: C.get(n.id) || '' });
  drawN = all.map((d, i) => ({ ...d, g: gs[i] }));
  if (!keepView) ensureVisible();
  apply();
  kick();
}
/* cel węzła: pozycja z układu, a w trakcie przeciągania – kursor (+ przesunięcie potomków) */
/** @param {MapNode} n @returns {[number, number]} */
function target(n) {
  if (dnd) {
    if (n === dnd.node) return [dnd.gx, dnd.gy];
    const o = dnd.off.get(n.id);
    if (o) return [dnd.gx + o[0], dnd.gy + o[1]];
  }
  return [n.x, n.y];
}
/** krok sprężyn; zwraca true, jeśli coś się jeszcze rusza @param {number} dt [s] @param {boolean} [snap] od razu do celu */
function step(dt, snap) {
  let moving = false;
  const K = 260,
    D = 24; /* lekko niedotłumiona sprężyna – delikatne „dobicie” */
  for (const d of drawN) {
    const n = d.n,
      p = P(n),
      gh = d.ghost;
    let gx, gy;
    if (gh) {
      const anc = /** @type {MapNode} */ (gh.anc),
        a = P(anc);
      gx = a.x + (anc.w - n.w) / 2;
      gy = a.y;
    } else [gx, gy] = target(n);
    if (snap || (dnd && n === dnd.node)) {
      p.x = gx;
      p.y = gy;
      p.vx = p.vy = 0;
      if (gh) gh.done = true;
      continue;
    }
    p.vx += (K * (gx - p.x) - D * p.vx) * dt;
    p.vy += (K * (gy - p.y) - D * p.vy) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (gh) {
      const dist = Math.hypot(gx - p.x, gy - p.y);
      if (!gh.d0) gh.d0 = Math.max(dist, 1);
      gh.k = Math.min(1, dist / gh.d0);
      if (dist < 3) {
        gh.done = true;
        p.x = gx;
        p.y = gy;
        p.vx = p.vy = 0;
      } else moving = true;
      continue;
    }
    if (Math.abs(gx - p.x) > 0.3 || Math.abs(gy - p.y) > 0.3 || Math.abs(p.vx) > 4 || Math.abs(p.vy) > 4) moving = true;
    else {
      p.x = gx;
      p.y = gy;
      p.vx = p.vy = 0;
    }
  }
  return moving;
}
function draw() {
  for (const d of drawN) {
    const p = P(d.n);
    d.g.setAttribute('transform', `translate(${p.x - d.n.x} ${p.y - d.n.y})`);
    if (d.ghost) d.g.style.opacity = String(d.ghost.done ? 0 : (d.ghost.k ?? 1));
  }
  for (const e of drawE) {
    e.el.setAttribute('d', edgeD(e.p, e.c));
    if (e.ghost) e.el.style.opacity = String(e.ghost.done ? 0 : (e.ghost.k ?? 1));
  }
  placeEd();
}
function reap() {
  if (!ghosts.some(g => g.done)) return;
  drawN = drawN.filter(d => !(d.ghost && d.ghost.done && (d.g.remove(), 1)));
  drawE = drawE.filter(e => !(e.ghost && e.ghost.done && (e.el.remove(), 1)));
  ghosts = ghosts.filter(g => !g.done);
}
function kick() {
  if (RM.matches) {
    step(0, true);
    draw();
    reap();
    return;
  }
  draw();
  if (!raf) {
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
/** @param {number} t czas z requestAnimationFrame */
function frame(t) {
  raf = 0;
  const dt = Math.min(1 / 30, Math.max(0, (t - lastT) / 1000)) || 1 / 60;
  lastT = t;
  if (dnd) edgePan();
  const m = step(dt);
  draw();
  reap();
  if (m || dnd) raf = requestAnimationFrame(frame);
}
function settle() {
  step(0, true);
  draw();
  reap();
}
function apply() {
  $('g').setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
  placeEd();
}
function ensureVisible() {
  const f = S();
  if (!f) return;
  const n = f.n,
    r = $('sv').getBoundingClientRect(),
    sx = n.x * k + tx,
    sy = n.y * k + ty;
  if (sx < 30 || sx + n.w * k > r.width - 30) tx = r.width / 2 - (n.x + n.w / 2) * k;
  if (sy < 30 || sy > r.height - 30 || ty === 0) ty = r.height / 2 - n.y * k;
}
function bounds(v = vis()) {
  return v.reduce(
    (a, n) => ({
      x0: Math.min(a.x0, n.x),
      x1: Math.max(a.x1, n.x + n.w),
      y0: Math.min(a.y0, n.y - n.h / 2),
      y1: Math.max(a.y1, n.y + n.h / 2),
    }),
    { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }
  );
}
function fitView() {
  lay();
  const b = bounds(),
    r = $('sv').getBoundingClientRect(),
    P = 30;
  k = Math.max(0.2, Math.min(1.5, (r.width - 2 * P) / (b.x1 - b.x0), (r.height - 2 * P) / (b.y1 - b.y0)));
  tx = r.width / 2 - ((b.x0 + b.x1) / 2) * k;
  ty = r.height / 2 - ((b.y0 + b.y1) / 2) * k;
  apply();
}
/** po zmianie modelu: render + autozapis @param {boolean} [keepView] */
function changed(keepView) {
  render(keepView);
  dirty = true;
  $('save').textContent = '● zmiany…';
  clearTimeout(timer);
  timer = setTimeout(autosave, 500);
}
function showSel() {
  let f = S();
  while (f && f.p) {
    if (f.p.collapsed) f.p.collapsed = false;
    f = find(f.p.id);
  }
}
