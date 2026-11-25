/* Zdarzenia myszy i dotyku: klik, dwuklik, przytrzymanie, PPM, zoom, pinch. */
/* ---- zdarzenia: mysz i dotyk ---- */
/** @type {PointerDrag | null} */
let drag = null;
let moved = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let hold;
let lastTap = { t: 0, id: 0 },
  pd = 0,
  lastMod = 0,
  lastPT = 'mouse';
document.addEventListener(
  'pointerdown',
  e => {
    const t = e.target instanceof Node ? e.target : null;
    if (menuOpen && !$('menu').contains(t)) closeMenu();
    if (palOpen && !$('pal').contains(t)) closePal();
    if (emoOpen && !$('emo').contains(t) && t !== $('edemo')) closeEmoji();
  },
  true
);
sv.addEventListener('pointerdown', e => {
  lastPT = e.pointerType;
  if (e.button > 0 || pd || dnd) return;
  const id = nodeAt(e.target),
    touch = e.pointerType === 'touch';
  drag = { x: e.clientX, y: e.clientY, tx, ty, id, touch };
  moved = 0;
  try {
    sv.setPointerCapture(e.pointerId);
  } catch (_) {}
  clearTimeout(hold);
  /* dotyk: przytrzymanie gdziekolwiek = menu podręczne, jak PPM (na węźle najpierw go zaznacza) */
  if (touch) hold = setTimeout(holdFire, 500);
});
function holdFire() {
  clearTimeout(hold);
  if (!drag || !drag.touch || moved > 10 || pd || dnd || menuOpen) return;
  navigator.vibrate && navigator.vibrate(15);
  const d = drag;
  drag = null;
  if (editing) endEdit();
  if (d.id) go(d.id, true);
  else deselect();
  ctxMenu(d.x, d.y, true);
} /* przytrzymanie: węzeł → jego menu; tło → odznacz i menu całej mapy (tam „Wklej jako nowy korzeń”) */
sv.addEventListener('pointermove', e => {
  if (!drag) return;
  if (dnd) return dndMove(e.clientX, e.clientY);
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
  if (moved <= (drag.touch ? 10 : 4)) return;
  clearTimeout(hold);
  if (drag.id && dndStart(drag.id, drag.x, drag.y)) return dndMove(e.clientX, e.clientY);
  tx = drag.tx + dx;
  ty = drag.ty + dy;
  apply();
});
sv.addEventListener('pointerup', e => {
  clearTimeout(hold);
  if (!drag) return;
  const d = drag;
  drag = null;
  if (dnd) return dndEnd(false);
  if (moved > (d.touch ? 10 : 4)) return;
  /* własne wykrywanie dwukliku/dwustuknięcia: render po 1. kliknięciu usuwa element, więc przeglądarka nie wyśle click/dblclick */
  const now = Date.now(),
    key = d.id || -1,
    dbl = lastTap.id === key && now - lastTap.t < 400;
  lastTap = dbl ? { t: 0, id: 0 } : { t: now, id: key };
  if (!d.id) {
    if (editing) endEdit();
    else if (dbl) d.touch ? ctxMenu(e.clientX, e.clientY, true) : deselect();
    return;
  } /* 2× tło: dotyk → menu, mysz → odznacz */
  if (editing && editing.id !== d.id) endEdit();
  if (dbl) return startEdit(d.id);
  go(d.id, true);
}); /* klik nie przesuwa widoku – inaczej 2. klik dwukliku trafia obok */
sv.addEventListener('pointercancel', () => {
  clearTimeout(hold);
  if (dnd) dndEnd(true);
  drag = null;
});
window.addEventListener(
  'keydown',
  e => {
    if (e.key === 'Escape' && dnd) {
      e.preventDefault();
      e.stopPropagation();
      drag = null;
      dndEnd(true);
    }
  },
  true
);
sv.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (lastPT === 'touch' || e.pointerType === 'touch')
    return holdFire(); /* Android: systemowe „przytrzymanie” przychodzi przed naszym licznikiem */
  clearTimeout(hold);
  if (menuOpen || dnd) return;
  drag = null;
  if (editing) endEdit();
  const id = nodeAt(e.target);
  if (id) go(id, true);
  ctxMenu(e.clientX, e.clientY);
});
sv.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || drag) return;
  hint(
    nodeAt(e.target)
      ? 'dwuklik – edytuj · PPM – menu · przeciągnij – przenieś'
      : 'przeciągnij – przesuń widok · kółko – zoom · PPM – menu · dwuklik – odznacz'
  );
});
sv.addEventListener('pointerleave', () => {
  if (!editing && !drag) hint('');
});
sv.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    closeMenu();
    const r = sv.getBoundingClientRect(),
      mx = e.clientX - r.left,
      my = e.clientY - r.top,
      nk = Math.max(0.2, Math.min(3, k * (e.deltaY < 0 ? 1.1 : 0.9)));
    tx = mx - ((mx - tx) * nk) / k;
    ty = my - ((my - ty) * nk) / k;
    k = nk;
    apply();
  },
  { passive: false }
);
sv.addEventListener(
  'touchstart',
  e => {
    if (e.touches.length === 2) {
      pd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (dnd) dndEnd(true);
      drag = null;
      clearTimeout(hold);
    }
  },
  { passive: true }
);
sv.addEventListener(
  'touchmove',
  e => {
    if (e.touches.length !== 2 || !pd) return;
    const a = e.touches[0],
      b = e.touches[1],
      d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      r = sv.getBoundingClientRect(),
      mx = (a.clientX + b.clientX) / 2 - r.left,
      my = (a.clientY + b.clientY) / 2 - r.top,
      nk = Math.max(0.2, Math.min(3, (k * d) / pd));
    tx = mx - ((mx - tx) * nk) / k;
    ty = my - ((my - ty) * nk) / k;
    k = nk;
    pd = d;
    apply();
  },
  { passive: true }
);
sv.addEventListener('touchend', () => {
  pd = 0;
});
/** otwarty plik zmieniony na dysku (np. w innym programie) → wczytaj go ponownie; sprawdzane co 2 s */
async function reloadIfChanged() {
  if (!fh || editing) return;
  try {
    const f = await fh.getFile();
    if (f.lastModified <= lastMod) return;
    const t = await f.text();
    lastMod = f.lastModified;
    if (t === serialize(root)) return;
    if (dirty && !confirm('Plik zmieniony na dysku. Wczytać (utrata lokalnych zmian)?')) return;
    if (!loadFile(t)) info('przeładowano zmiany z pliku');
  } catch (e) {}
}
setInterval(reloadIfChanged, 2000);
/** pobierz plik @param {Blob} b @param {string} n nazwa */
function dl(b, n) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = n;
  a.click();
}
/** eksport mapy @param {string} t svg | png */
function exportImg(t) {
  if (editing) endEdit();
  settle();
  const b = bounds();
  const v = (/** @type {string} */ p) => getComputedStyle(document.documentElement).getPropertyValue(p).trim(),
    P = 20,
    w = b.x1 - b.x0 + 2 * P,
    h = b.y1 - b.y0 + 2 * P;
  const inner = $('g')
    .innerHTML.replace(/var\(--acc\)/g, v('--acc'))
    .replace(/ class="n[^"]*"/g, '');
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.x0 - P} ${b.y0 - P} ${w} ${h}"><rect x="${b.x0 - P}" y="${b.y0 - P}" width="${w}" height="${h}" style="fill:${v('--bg')}"/><style>.emo{font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;font-weight:normal}rect{fill:${v('--card')};stroke-width:${ST.nb}}text{fill:${v('--fg')};font:${fw()} ${ST.fs}px ${ff().replace(/"/g, "'")};dominant-baseline:central}</style>${inner}</svg>`;
  if (t === 'png') {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = w * 2;
      c.height = h * 2;
      const x = c.getContext('2d');
      if (!x) return;
      x.scale(2, 2);
      x.drawImage(im, 0, 0);
      c.toBlob(bl => bl && dl(bl, 'mapa.png'));
    };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  } else dl(new Blob([s], { type: 'image/svg+xml' }), 'mapa.svg');
}
