/* Operacje na węzłach: usuń/wytnij/kopiuj/wklej, przesuwanie, zwijanie, nawigacja. */
/* ---- operacje ---- */
/* usuń – bez kopiowania; wytnij – kopiuje i usuwa */
function del(cut) {
  const f = need();
  if (!f) return;
  if (f.p === root && root.children.length < 2) return info('nie można usunąć jedynego korzenia');
  snap();
  if (cut) yank = clone(f.n);
  const i = f.p.children.indexOf(f.n);
  f.p.children.splice(i, 1);
  sel = (f.p.children[i] || f.p.children[i - 1] || f.p).id;
  info(cut ? 'wycięto (Ctrl+V – wklej)' : 'usunięto (Ctrl+Z – cofnij)');
  changed();
}
function cut() {
  del(true);
}
function copy() {
  const f = need();
  if (!f) return;
  yank = clone(f.n);
  info('skopiowano gałąź');
}
/* bez zaznaczenia wklejana gałąź staje się bratem korzeni (nowym korzeniem) */
function paste(asChild) {
  if (!yank) return info('schowek pusty');
  snap();
  const f = S(),
    c = clone(yank);
  if (!f) root.children.push(c);
  else if (asChild || !f.p) {
    f.n.children.push(c);
    f.n.collapsed = false;
  } else f.p.children.splice(f.p.children.indexOf(f.n) + 1, 0, c);
  sel = c.id;
  changed();
}
function moveSib(d) {
  const f = need();
  if (!f || !f.p) return;
  const a = f.p.children,
    i = a.indexOf(f.n),
    j = i + d;
  if (j < 0 || j >= a.length) return;
  snap();
  [a[i], a[j]] = [a[j], a[i]];
  changed();
}
function indent() {
  const f = need();
  if (!f || !f.p) return;
  const a = f.p.children,
    i = a.indexOf(f.n);
  if (!i) return;
  snap();
  a.splice(i, 1);
  a[i - 1].children.push(f.n);
  a[i - 1].collapsed = false;
  changed();
}
function outdent() {
  const f = need();
  if (!f || !f.p) return;
  const g = find(f.p.id);
  if (!g.p) return;
  snap();
  f.p.children.splice(f.p.children.indexOf(f.n), 1);
  g.p.children.splice(g.p.children.indexOf(f.p) + 1, 0, f.n);
  changed();
}
function fold(v) {
  const f = need();
  if (!f || !f.n.children.length) return;
  snap();
  f.n.collapsed = v === undefined ? !f.n.collapsed : v;
  changed();
}
function foldAll(v) {
  snap();
  (function w(n, d) {
    if (d >= (v ? 2 : 1) && n.children.length) n.collapsed = v;
    n.children.forEach(c => w(c, d + 1));
  })(root, 0); /* zwiń: wszystko poniżej korzeni; rozwiń: wszystko */
  if (v && S()) {
    let f = S();
    while (f.p) {
      if (f.p.collapsed) sel = f.p.id;
      f = find(f.p.id);
    }
  }
  changed();
}
function go(id, keepView) {
  sel = id;
  render(keepView);
}
function sibIdx(d, n) {
  const f = S();
  if (!f) return go(first().id);
  if (!f.p) return;
  const a = f.p !== root && find(f.p.id).p === root ? f.p.children.filter(c => c.s === f.n.s) : f.p.children;
  let i = a.indexOf(f.n) + d * n;
  i = Math.max(0, Math.min(a.length - 1, i));
  go(a[i].id);
}
function toChild(n, pred = () => true) {
  if (n.collapsed && n.children.length) {
    n.collapsed = false;
    lay();
  }
  const c = (n.collapsed ? [] : n.children).find(pred);
  if (c) go(c.id);
}
/* strzałki zgodne z tym, co widać na ekranie (zależnie od układu i strony) */
function arrow(key) {
  const f = S();
  if (!f) return go(first().id);
  const n = f.n;
  if (dir === 'down') {
    if (key === 'ArrowUp') {
      if (f.p !== root) go(f.p.id);
    } else if (key === 'ArrowDown') toChild(n);
    else sibIdx(key === 'ArrowRight' ? 1 : -1, 1);
    return;
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') return sibIdx(key === 'ArrowDown' ? 1 : -1, 1);
  const s = key === 'ArrowRight' ? 1 : -1;
  if (f.p === root) return toChild(n, c => c.s === s);
  if (n.s === s) toChild(n);
  else go(f.p.id);
}
