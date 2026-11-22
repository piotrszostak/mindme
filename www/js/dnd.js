/* Przeciąganie węzłów (mysz i dotyk), miejsce upuszczenia, auto-przewijanie. */
/* ---- przeciąganie węzłów (mysz i dotyk) ---- */
const sv = $('sv'),
  nodeAt = t => {
    const g = t && t.closest && t.closest('.n'),
      id = g ? +g.dataset.id : 0;
    return id > 0 ? id : 0;
  };
function mapPt(cx, cy) {
  const r = sv.getBoundingClientRect();
  return [(cx - r.left - tx) / k, (cy - r.top - ty) / k];
}
function branchCol(f) {
  if (f.p === root) return 'var(--acc)';
  while (find(f.p.id).p !== root) f = find(f.p.id);
  return COL[f.p.children.indexOf(f.n) % COL.length];
}
function dndStart(id, cx, cy) {
  const f = find(id);
  if (!f || (f.p === root && root.children.length < 2))
    return false; /* jedynego korzenia nie przenosimy – przesuwa widok */
  if (editing) endEdit();
  closeMenu();
  const pre = snapStr(),
    col = branchCol(f),
    n = f.n,
    a = f.p.children,
    i = a.indexOf(n),
    p0 = P(n),
    [mx, my] = mapPt(cx, cy);
  const ph = { id: -1, text: '', children: [], collapsed: false, ph: true, w: n.w, h: n.h };
  a.splice(i, 1, ph); /* węzeł wyjęty z drzewa, w jego miejscu „dziura” */
  const off = new Map();
  (function w(c) {
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
    from: [f.p.id, i],
    gdx: mx - p0.x,
    gdy: my - p0.y,
    gx: p0.x,
    gy: p0.y,
    cx,
    cy,
    home: { p: f.p, before: a[i + 1] || null },
  };
  sel = id;
  sv.classList.add('dnd');
  hint('upuść: na prawej części węzła – jako dziecko, obok – jako brat · Esc – anuluj');
  render(true);
  return true;
}
/* gdzie trafi węzeł, jeśli puścimy go w punkcie (x,y) mapy; null = bez zmian */
function dropAt(x, y) {
  const ph = dnd.ph;
  if (
    ph.x !== undefined &&
    x >= ph.x - 8 &&
    x <= ph.x + ph.w + 8 &&
    y >= ph.y - ph.h / 2 - 6 &&
    y <= ph.y + ph.h / 2 + 6
  )
    return null;
  let best = null,
    bd = 1e9;
  for (const n of vis()) {
    if (n.ph) continue;
    const d = Math.hypot(Math.max(n.x - x, 0, x - n.x - n.w), Math.max(n.y - n.h / 2 - y, 0, y - n.y - n.h / 2));
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  if (!best || bd > 80) return dnd.home;
  const f = find(best.id);
  const child =
    dir === 'down'
      ? y > best.y + best.h * 0.15
      : ((best.s || 1) > 0 ? (x - best.x) / best.w : (best.x + best.w - x) / best.w) > 0.6;
  if (child) return { p: best, before: null };
  const a = f.p.children.filter(c => !c.ph),
    i = a.indexOf(best),
    after = dir === 'down' ? x > best.x + best.w / 2 : y > best.y;
  return { p: f.p, before: after ? a[i + 1] || null : best };
}
function placePh(c) {
  const ph = dnd.ph,
    cur = find(-1),
    a = cur.p.children,
    i = a.indexOf(ph);
  if (cur.p === c.p && (a[i + 1] || null) === c.before) return false;
  a.splice(i, 1);
  const b = c.p.children,
    j = c.before ? b.indexOf(c.before) : -1;
  b.splice(j < 0 ? b.length : j, 0, ph);
  c.p.collapsed = false;
  return true;
}
function dndUpdate(cx, cy) {
  dnd.cx = cx;
  dnd.cy = cy;
  const [mx, my] = mapPt(cx, cy);
  dnd.gx = mx - dnd.gdx;
  dnd.gy = my - dnd.gdy;
  const c = dropAt(mx, my);
  if (c && placePh(c)) render(true);
}
function dndMove(cx, cy) {
  dndUpdate(cx, cy);
  kick();
}
/* auto-przewijanie przy krawędzi: rusza dopiero po chwili (chwycenie węzła przy krawędzi nie przesuwa widoku)
   i łagodnie przyspiesza do 5 px/klatkę */
function edgePan() {
  const r = sv.getBoundingClientRect(),
    M = 40,
    now = performance.now(),
    v = (a, lo, hi) => (a < lo + M ? Math.min(1, (lo + M - a) / M) : a > hi - M ? -Math.min(1, (a - hi + M) / M) : 0);
  const fx = v(dnd.cx, r.left, r.right),
    fy = v(dnd.cy, r.top, r.bottom);
  if (!fx && !fy) {
    dnd.edgeT = 0;
    return;
  }
  if (!dnd.edgeT) {
    dnd.edgeT = now;
    return;
  }
  const t = now - dnd.edgeT - 350;
  if (t < 0) return;
  const sp = 5 * Math.min(1, t / 700);
  tx += fx * sp;
  ty += fy * sp;
  apply();
  dndUpdate(dnd.cx, dnd.cy);
}
function dndEnd(cancel) {
  const d = dnd;
  dnd = null;
  sv.classList.remove('dnd');
  hint('');
  pos.delete(-1);
  if (cancel) {
    restore(d.pre);
    return render(true);
  }
  const f = find(-1),
    a = f.p.children,
    i = a.indexOf(d.ph);
  a.splice(i, 1, d.node);
  sel = d.id;
  if (f.p.id === d.from[0] && i === d.from[1]) return render(true);
  undoS.push(d.pre);
  if (undoS.length > 300) undoS.shift();
  redoS = [];
  info((f.p === root ? 'przeniesiono jako nowy korzeń' : 'przeniesiono pod „' + f.p.text + '”') + ' (Ctrl+Z cofa)');
  changed(true);
}
