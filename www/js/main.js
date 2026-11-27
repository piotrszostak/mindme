/* Start: górny pasek, wczytanie zapisanej mapy, pierwszy render. */
buildHelp();
buildSide();
/* ---- górny pasek: tylko ikony + objaśnienia ---- */
document.querySelectorAll('[data-ic]').forEach(b => {
  if (!(b instanceof HTMLElement)) return;
  b.innerHTML = icon(b.dataset.ic || '');
  b.setAttribute('aria-label', b.dataset.tip || '');
});
/** punkt pod przyciskiem (pozycja menu) @param {Element} b @returns {[number, number]} */
const below = b => {
  const r = b.getBoundingClientRect();
  return [r.left, r.bottom + 4];
};
$('bp').onclick = toggleSide;
$('bu').onclick = undo;
$('br').onclick = redo;
$('bf').onclick = fitView;
$('bt').onclick = toggleText;
$('bl').onclick = () => {
  const [x, y] = below($('bl'));
  openMenu(
    Object.keys(LAY).map(d => mi('lay-' + d, { on: dir === d, k: undefined })),
    x,
    y
  );
};
$('bm').onclick = () => {
  const [x, y] = below($('bm'));
  moreMenu(x, y);
};
try {
  const th = localStorage.getItem('mm.theme');
  if (th) document.documentElement.dataset.theme = th;
} catch (e) {}
try {
  const s = (lsLast = localStorage.getItem('mm.md'));
  if (s) {
    root = parse(s);
    sel = first().id;
  }
} catch (e) {}
syncLayout();
syncText();
window.addEventListener('resize', () => {
  closeMenu();
  closeEmoji();
  render();
});
render();
info(selfTest() ? 'round-trip OK · ? = pomoc' : 'round-trip BŁĄD');
hint(
  matchMedia('(hover: none)').matches
    ? 'przytrzymaj – menu (na tle też odznacza) · stuknij 2× – edytuj'
    : 'dwuklik – edytuj · PPM – menu · przeciągnij węzeł – przenieś'
);
