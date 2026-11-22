/* Przeciąganie węzłów (mysz i dotyk), miejsce upuszczenia, auto-przewijanie. */
/* ---- przeciąganie węzłów (mysz i dotyk) ---- */
const sv = $('sv');
/** id węzła pod celem zdarzenia (0 = tło / miejsce upuszczenia) @param {EventTarget | null} t */
const nodeAt = t => {
  const g = asEl(t)?.closest('.n'),
    id = g instanceof SVGElement ? Number(g.dataset.id) : 0;
  return id > 0 ? id : 0;
};
/** punkt ekranu → współrzędne mapy @param {number} cx @param {number} cy @returns {[number, number]} */
function mapPt(cx, cy) {
  const r = sv.getBoundingClientRect();
  return [(cx - r.left - tx) / k, (cy - r.top - ty) / k];
}
/** kolor gałęzi węzła (z indeksu gałęzi głównej) @param {Found} f */
function branchCol(f) {
  let cur = f;
  for (;;) {
    const p = cur.p;
    if (!p || p === root) return 'var(--acc)';
    const pf = find(p.id);
    if (!pf || pf.p === root) return COL[p.children.indexOf(cur.n) % COL.length];
    cur = pf;
  }
}
/** zacznij przeciągać; false = nie da się (np. jedyny korzeń) @param {number} id @param {number} cx @param {number} cy */
function dndStart(id, cx, cy) {
  const f = find(id);
  const p = f && f.p;
  if (!f || !p || (p === root && root.children.length < 2))
    return false; /* jedynego korzenia nie przenosimy – przesuwa widok */
  if (editing) endEdit();
  closeMenu();
  const pre = snapStr(),
    col = branchCol(f),
    n = f.n,
    a = p.children,
    i = a.indexOf(n),
    p0 = P(n),
    [mx, my] = mapPt(cx, cy);
  const ph = mk('');
  Object.assign(ph, { id: -1, ph: true, w: n.w, h: n.h });
  a.splice(i, 1, ph); /* węzeł wyjęty z drzewa, w jego miejscu „dziura” */
  /** @type {Map<number, [number, number]>} położenie potomków względem przeciąganego węzła */
  const off = new Map();
  (function w(/** @type {MapNode} */ c) {
    if (c !== n) {
      const q = P(c);
      off.set(c.id, [q.x - p0.x, q.y - p0.y]);
    }
    if (!c.collapsed) c.children.forEach(w);
  })(n);
  pos.set(-1, { x: p0.x, y: p0.y, vx: 0, vy: 0 });
  dnd = {
    id,
    node: n,
    ph,
    pre,
    col,
    off,
    from: [p.id, i],
    gdx: mx - p0.x,
    gdy: my - p0.y,
    gx: p0.x,
    gy: p0.y,
    cx,
    cy,
    home: { p, before: a[i + 1] || null },
  };
  sel = id;
  sv.classList.add('dnd');
  hint('upuść: na prawej części węzła – jako dziecko, obok – jako brat · Esc – anuluj');
  render(true);
  return true;
}
/** gdzie trafi węzeł puszczony w punkcie (x, y) mapy; null = bez zmian
 * @param {DragState} d @param {number} x @param {number} y @returns {DropTarget | null} */
function dropAt(d, x, y) {
  const ph = d.ph;
  if (x >= ph.x - 8 && x <= ph.x + ph.w + 8 && y >= ph.y - ph.h / 2 - 6 && y <= ph.y + ph.h / 2 + 6) return null;
  /** @type {MapNode | null} */
  let best = null,
    bd = 1e9;
  for (const n of vis()) {
    if (n.ph) continue;
    const dist = Math.hypot(Math.max(n.x - x, 0, x - n.x - n.w), Math.max(n.y - n.h / 2 - y, 0, y - n.y - n.h / 2));
    if (dist < bd) {
      bd = dist;
      best = n;
    }
  }
  if (!best || bd > 80) return d.home;
  const b = best,
    f = find(b.id);
  if (!f || !f.p) return null;
  const child =
    dir === 'down' ? y > b.y + b.h * 0.15 : ((b.s || 1) > 0 ? (x - b.x) / b.w : (b.x + b.w - x) / b.w) > 0.6;
  if (child) return { p: b, before: null };
  const a = f.p.children.filter(c => !c.ph),
    i = a.indexOf(b),
    after = dir === 'down' ? x > b.x + b.w / 2 : y > b.y;
  return { p: f.p, before: after ? a[i + 1] || null : b };
}
/** przenieś miejsce upuszczenia; true = zmieniło się @param {DragState} d @param {DropTarget} c */
function placePh(d, c) {
  const cur = find(-1);
  if (!cur || !cur.p) return false;
  const a = cur.p.children,
    i = a.indexOf(d.ph);
  if (cur.p === c.p && (a[i + 1] || null) === c.before) return false;
  a.splice(i, 1);
  const b = c.p.children,
    j = c.before ? b.indexOf(c.before) : -1;
  b.splice(j < 0 ? b.length : j, 0, d.ph);
  c.p.collapsed = false;
  return true;
}
/** @param {number} cx @param {number} cy */
function dndUpdate(cx, cy) {
  const d = dnd;
  if (!d) return;
  d.cx = cx;
  d.cy = cy;
  const [mx, my] = mapPt(cx, cy);
  d.gx = mx - d.gdx;
  d.gy = my - d.gdy;
  const c = dropAt(d, mx, my);
  if (c && placePh(d, c)) render(true);
}
/** @param {number} cx @param {number} cy */
function dndMove(cx, cy) {
  dndUpdate(cx, cy);
  kick();
}
/* auto-przewijanie przy krawędzi: rusza dopiero po chwili (chwycenie węzła przy krawędzi nie przesuwa widoku)
   i łagodnie przyspiesza do 5 px/klatkę */
function edgePan() {
  const d = dnd;
  if (!d) return;
  const r = sv.getBoundingClientRect(),
    M = 40,
    now = performance.now(),
    /** siła przewijania −1…1 przy krawędzi @type {(a: number, lo: number, hi: number) => number} */
    v = (a, lo, hi) => (a < lo + M ? Math.min(1, (lo + M - a) / M) : a > hi - M ? -Math.min(1, (a - hi + M) / M) : 0);
  const fx = v(d.cx, r.left, r.right),
    fy = v(d.cy, r.top, r.bottom);
  if (!fx && !fy) {
    d.edgeT = 0;
    return;
  }
  if (!d.edgeT) {
    d.edgeT = now;
    return;
  }
  const t = now - d.edgeT - 350;
  if (t < 0) return;
  const sp = 5 * Math.min(1, t / 700);
  tx += fx * sp;
  ty += fy * sp;
  apply();
  dndUpdate(d.cx, d.cy);
}
/** zakończ przeciąganie @param {boolean} [cancel] przywróć stan sprzed */
function dndEnd(cancel) {
  const d = dnd;
  if (!d) return;
  dnd = null;
  sv.classList.remove('dnd');
  hint('');
  pos.delete(-1);
  const f = find(-1);
  if (cancel || !f || !f.p) {
    restore(d.pre);
    return render(true);
  }
  const p = f.p,
    a = p.children,
    i = a.indexOf(d.ph);
  a.splice(i, 1, d.node);
  sel = d.id;
  if (p.id === d.from[0] && i === d.from[1]) return render(true);
  undoS.push(d.pre);
  if (undoS.length > 300) undoS.shift();
  redoS = [];
  info((p === root ? 'przeniesiono jako nowy korzeń' : 'przeniesiono pod „' + p.text + '”') + ' (Ctrl+Z cofa)');
  changed(true);
}
