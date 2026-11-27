/* Czynności: jedna tabela (`ACT`) dla pomocy (sekcja „Klawiatura”), menu podręcznego, menu „…”, menu układu i palety komend. */
/* Skróty są tu tylko do wyświetlania – naciśnięcia obsługuje `normal()` w keys.js. Nowy albo zmieniony skrót: oba miejsca. */
/* ---- dostępność: powód albo '' (dostępna) ---- */
const needSel = () => (S() ? '' : 'najpierw zaznacz węzeł');
/** usuwanie i wycinanie: jedynego korzenia nie można */
const needDel = () => {
  const f = S();
  if (!f) return 'najpierw zaznacz węzeł';
  return f.p === root && root.children.length < 2 ? 'nie można usunąć jedynego korzenia' : '';
};
/** „Przenieś do…”: korzeń jedynej mapy nie ma dokąd iść (wszystko inne to jego potomkowie) */
const needMove = () => {
  const f = S();
  if (!f) return 'najpierw zaznacz węzeł';
  return f.p === root && root.children.length < 2 ? 'nie ma dokąd przenieść' : '';
};
const needYank = () => (yank ? '' : 'schowek pusty');
const needKids = () => {
  const f = S();
  return !f ? 'najpierw zaznacz węzeł' : f.n.children.length ? '' : 'węzeł nie ma dzieci';
};
/** @type {Act[]} kolejność = kolejność w pomocy i w palecie: ruch, węzeł, widok, układy, plik, pomoc */
const ACT = [
  /* ruch – tylko w pomocy (bez `f`): paleta nie ma samego poruszania się */
  {
    id: 'move',
    t: 'Poruszanie',
    k: ['↑ ↓ ← →'],
    v: ['h j k l'],
    d: 'zgodnie z układem; vim z licznikiem, np. 3j',
    cnt: true,
  },
  /* osobno, bo dymek po „g” pokazuje tylko gg (decyzja 2026-11-27) */
  { id: 'first', t: 'Pierwszy węzeł', k: ['Home'], v: ['gg'] },
  { id: 'last', t: 'Ostatni węzeł', k: ['End'], v: ['G'] },
  { id: 'sibends', t: 'Pierwszy / ostatni brat', v: ['0', '$'] },
  /* węzeł */
  { id: 'edit', ic: 'edit', t: 'Edytuj', k: ['Spacja'], v: ['i', 'e'], f: () => startEdit(sel), off: needSel },
  {
    id: 'blank',
    ic: 'edit',
    t: 'Edytuj od pustego tekstu',
    v: ['c'],
    f: () => startEdit(sel, false, undefined, true),
    off: needSel,
  },
  {
    id: 'sib',
    ic: 'sibdown',
    t: 'Dodaj brata',
    k: ['Enter'],
    v: ['o', 's'],
    d: 'poniżej; przy korzeniu – nowy korzeń',
    f: () => addSib(sel, 1),
  },
  { id: 'sibup', ic: 'sibup', t: 'Dodaj brata powyżej', k: ['Shift+Enter'], v: ['O', 'S'], f: () => addSib(sel, 0) },
  { id: 'child', ic: 'child', t: 'Dodaj dziecko', k: ['Tab'], v: ['a'], f: () => addChild(sel), off: needSel },
  {
    id: 'emoji',
    ic: 'emoji',
    t: 'Wstaw emoji',
    k: ['Ctrl+.'],
    tip: 'Na końcu tekstu węzła',
    f: () => {
      const [x, y] = nodeScreen();
      openEmoji(x, y);
    },
    off: needSel,
  },
  { id: 'fold', ic: 'fold', t: 'Zwiń / rozwiń', k: ['Shift+Spacja'], v: ['za'], f: () => fold(), off: needKids },
  { id: 'copy', ic: 'copy', t: 'Kopiuj gałąź', k: ['Ctrl+C'], v: ['yy'], f: () => copy(), off: needSel },
  {
    id: 'dup',
    ic: 'dup',
    t: 'Duplikuj gałąź',
    k: ['Ctrl+D'],
    tip: 'Kopia zaraz za oryginałem',
    f: () => duplicate(),
    off: needSel,
  },
  { id: 'cut', ic: 'cut', t: 'Wytnij gałąź', k: ['Ctrl+X'], v: ['dd'], f: () => cut(), off: needDel },
  {
    id: 'paste',
    ic: 'paste',
    t: 'Wklej jako dziecko',
    k: ['Ctrl+V'],
    v: ['p'],
    tip: 'Ctrl+V także tekst z innych aplikacji (lista → gałąź)',
    f: () => paste(true),
    off: needYank,
  },
  {
    id: 'pastesib',
    ic: 'paste',
    t: 'Wklej jako brata',
    k: ['Ctrl+Shift+V'],
    v: ['P'],
    f: () => paste(false),
    off: needYank,
  },
  {
    id: 'del',
    ic: 'del',
    t: 'Usuń gałąź',
    k: ['Del', 'Backspace'],
    v: ['x'],
    tip: 'Usuwa bez kopiowania (Ctrl+Z cofa)',
    d: 'bez kopiowania',
    f: () => del(),
    off: needDel,
  },
  { id: 'up', ic: 'up', t: 'Przesuń w górę', k: ['Alt+↑'], v: ['K'], cnt: true, f: () => moveSib(-1), off: needSel },
  { id: 'down', ic: 'down', t: 'Przesuń w dół', k: ['Alt+↓'], v: ['J'], cnt: true, f: () => moveSib(1), off: needSel },
  { id: 'indent', ic: 'indent', t: 'Wsuń poziom', k: ['Alt+→'], v: ['L'], cnt: true, f: () => indent(), off: needSel },
  {
    id: 'outdent',
    ic: 'outdent',
    t: 'Wysuń poziom',
    k: ['Shift+Tab', 'Alt+←'],
    v: ['H'],
    cnt: true,
    f: () => outdent(),
    off: needSel,
  },
  {
    id: 'moveto',
    ic: 'moveto',
    t: 'Przenieś do…',
    k: ['Ctrl+M'],
    v: ['m'],
    c: 'm',
    ca: ['move'],
    tip: 'Jako ostatnie dziecko węzła wybranego z listy',
    d: 'jako ostatnie dziecko węzła z listy',
    f: () => moveList(),
    off: needMove,
  },
  {
    id: 'undo',
    ic: 'undo',
    t: 'Cofnij',
    k: ['Ctrl+Z'],
    v: ['u'],
    cnt: true,
    f: () => undo(),
    off: () => (undoS.length ? '' : 'nic do cofnięcia'),
  },
  {
    id: 'redo',
    ic: 'redo',
    t: 'Ponów',
    k: ['Ctrl+Shift+Z', 'Ctrl+Y'],
    v: ['Ctrl+R'],
    f: () => redo(),
    off: () => (redoS.length ? '' : 'nic do ponowienia'),
  },
  /* widok */
  { id: 'find', t: 'Szukaj', k: ['Ctrl+F'], v: ['/'], f: () => openCmd('/', true) },
  { id: 'next', t: 'Następne trafienie', k: ['Ctrl+G'], v: ['n'] },
  { id: 'prev', t: 'Poprzednie trafienie', k: ['Ctrl+Shift+G'], v: ['N'] },
  { id: 'fit', ic: 'fit', t: 'Dopasuj całą mapę', k: ['Shift+1'], v: ['='], c: 'fit', f: () => fitView() },
  {
    id: 'center',
    t: 'Pokaż zaznaczony węzeł',
    k: ['Shift+2'],
    v: ['zz'],
    d: 'na środku; Shift+2 także przybliża',
    f: () => centerSel(true),
    off: needSel,
  },
  { id: 'unfoldall', ic: 'unfold', t: 'Rozwiń wszystko', v: ['zR'], f: () => foldAll(false) },
  { id: 'foldall', ic: 'fold', t: 'Zwiń wszystko', v: ['zM'], f: () => foldAll(true) },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    n =>
      /** @type {Act} */ ({
        id: 'lv' + n,
        t: 'Pokaż do poziomu ' + n,
        v: ['z' + n],
        f: () => foldTo(n),
        /* w pomocy jeden wiersz na wszystkie poziomy */
        help: n === 1 ? ['z1 … z9', 'pokaż do poziomu 1–9 (głębsze zwinięte)'] : false,
      })
  ),
  { id: 'text', ic: 'text', t: 'Widok Markdown', c: 'text', f: () => toggleText() },
  { id: 'side', ic: 'sliders', t: 'Wygląd mapy', f: () => toggleSide() },
  { id: 'theme', ic: 'theme', t: 'Tryb jasny / ciemny', c: 'theme', f: () => toggleTheme() },
  /* układy – z listy układów, nowe dochodzą same */
  ...Object.keys(LAY).map(
    d =>
      /** @type {Act} */ ({
        id: 'lay-' + d,
        ic: LAY[d][0],
        t: 'Układ ' + LAY[d][1],
        c: 'layout ' + d,
        f: () => setLayout(d),
      })
  ),
  /* plik */
  { id: 'open', ic: 'open', t: 'Otwórz plik…', k: ['Ctrl+O'], c: 'e', ca: ['o'], f: () => openFile() },
  { id: 'save', ic: 'save', t: 'Zapisz', k: ['Ctrl+S'], c: 'w', ca: ['write'], f: () => save() },
  { id: 'new', ic: 'newmap', t: 'Nowa mapa', c: 'new', f: () => newMap('') },
  { id: 'svg', ic: 'image', t: 'Eksportuj SVG', c: 'export svg', ca: ['export'], f: () => exportImg('svg') },
  { id: 'png', ic: 'image', t: 'Eksportuj PNG', c: 'export png', f: () => exportImg('png') },
  /* pomoc */
  { id: 'help', ic: 'help', t: 'Pomoc i skróty', k: ['Ctrl+/'], v: ['?'], f: () => toggleHelp() },
  {
    id: 'pal',
    ic: 'cmd',
    t: 'Wszystkie polecenia…',
    k: ['Ctrl+K'],
    v: [':'],
    d: 'paleta komend',
    f: () => openPal(),
    off: () => (tv ? 'najpierw wróć do mapy' : ''),
    pal: false,
  },
  { id: 'menu', t: 'Menu podręczne', k: ['Menu'] },
];
/** czynność o danym id @param {string} id @returns {Act} */
const actOf = id => /** @type {Act} */ (ACT.find(a => a.id === id));
/** skrót pokazywany w menu: zwykły, inaczej vim, inaczej komenda „:” @param {Act} a */
const actKey = a => (a.k && a.k[0]) || (a.v && a.v[0]) || (a.c ? ':' + a.c : '');
