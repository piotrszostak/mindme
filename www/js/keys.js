/* Klawiatura (tryb Normal: skrót zwykły + vim), wiersz poleceń „:” i wyszukiwanie „/”. */
/* ---- tryb Normal (klawiatura) ---- */
/* Skróty: dla każdej czynności standardowy (Ctrl/klawisz specjalny) i vim; dawne klawisze (F1, F2, F3, Shift+F10, Ctrl+Y)
   zostają jako ukryte aliasy – działają, ale nie ma ich w pomocy, w menu ani w README. */
/* Nie przypisujemy: Ctrl+Alt+litera (AltGr: ą ć ę…), Alt+litera (menu przeglądarki, znaki na macOS), Ctrl+W/T/N/Tab,
   Ctrl+Shift+N/T (przeglądarka ich nie oddaje), Ctrl+Spacja (macOS), Ctrl+strzałki (pulpity macOS), Alt+1…8 (karty Chrome). */
/** tryb Normal: wszystkie skróty mapy @param {KeyboardEvent} ev */
function normal(ev) {
  if (dnd) return;
  const ctrl = ev.ctrlKey || ev.metaKey,
    sh = ev.shiftKey;
  let c = ev.key;
  /* Caps Lock: o wielkości litery decyduje Shift – inaczej „j” staje się „J” i zamiast poruszać, przesuwa węzły */
  if (c.length === 1 && c.toLowerCase() !== c.toUpperCase() && ev.getModifierState('CapsLock'))
    c = sh ? c.toUpperCase() : c.toLowerCase();
  if (ctrl && ev.altKey) {
    if (c.length === 1) ev.preventDefault(); /* AltGr (ą ć ę ł ń ó ś ź ż na Windowsie) – w trybie mapy nic nie robi */
    return;
  }
  if (ctrl) {
    const k = c.length === 1 ? c.toLowerCase() : c;
    /** @type {Record<string, (() => unknown) | null>} */
    const ctrlKeys = {
      z: sh ? redo : undo,
      y: redo /* ukryty alias */,
      r: redo,
      s: save,
      o: openFile,
      c: copy,
      d: duplicate,
      x: cut,
      v: () => paste(!sh),
      f: () => openCmd('/', true),
      k: () => openPal(),
      g: () => jump(sh ? -1 : 1),
      '/': toggleHelp,
      '.': () => {
        const [x, y] = nodeScreen();
        openEmoji(x, y);
      },
    };
    const m = ctrlKeys[k];
    if (m) {
      ev.preventDefault();
      m();
    }
    return;
  }
  if (ev.altKey) {
    /** @type {Record<string, () => void>} */
    const alt = { ArrowLeft: outdent, ArrowRight: indent, ArrowDown: () => moveSib(1), ArrowUp: () => moveSib(-1) };
    const m = alt[c];
    if (m) {
      ev.preventDefault();
      m();
    }
    return;
  }
  if (c === 'ContextMenu' || (c === 'F10' && sh) /* Shift+F10 – ukryty alias */) {
    ev.preventDefault();
    const [x, y] = nodeScreen();
    return ctxMenu(x, y);
  }
  /* każdy zwykły znak w trybie mapy należy do aplikacji – inaczej Firefox („szukaj podczas pisania”, „/”) przejmie klawiaturę */
  if (c.length === 1) ev.preventDefault();
  /* Shift+1 / Shift+2 po fizycznym klawiszu: znak (!, @, 1…) zależy od układu klawiatury */
  if (sh && (ev.code === 'Digit1' || ev.code === 'Digit2')) {
    ev.preventDefault();
    pend = '';
    cnt = 0;
    return ev.code === 'Digit1' ? fitView() : centerSel(true);
  }
  /* z + cyfra = pokaż do poziomu N; sprawdzane przed licznikiem, inaczej cyfra zostałaby licznikiem */
  if (pend === 'z' && /^[1-9]$/.test(c)) {
    pend = '';
    cnt = 0;
    return foldTo(+c);
  }
  if (/^[0-9]$/.test(c) && (c !== '0' || cnt)) {
    cnt = cnt * 10 + +c;
    info(cnt + '');
    return;
  }
  const n = cnt || 1,
    f = S();
  if (pend) {
    const p = pend + c;
    pend = '';
    cnt = 0;
    if (p === 'gg') go(first().id);
    else if (p === 'dd') cut();
    else if (p === 'yy') copy();
    else if (p === 'za') fold();
    else if (p === 'zz') centerSel();
    else if (p === 'zR') foldAll(false);
    else if (p === 'zM') foldAll(true);
    return;
  }
  if ('gdyz'.includes(c) && c.length === 1) {
    pend = c;
    return;
  }
  cnt = 0;
  switch (c) {
    case 'j':
      sibIdx(1, n);
      break;
    case 'k':
      sibIdx(-1, n);
      break;
    case 'h':
      if (!f) {
        go(first().id);
        break;
      }
      for (let i = 0; i < n; i++) {
        const q = S();
        if (q && q.p && q.p !== root) sel = q.p.id;
      }
      render();
      break;
    case 'l':
      if (!f) {
        go(first().id);
        break;
      }
      for (let i = 0; i < n; i++) {
        const q = S();
        if (q) toChild(q.n);
      }
      render();
      break;
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      arrow(c);
      break;
    case 'Home':
    case 'End':
    case 'G': {
      const v = vis();
      go(c === 'Home' ? first().id : v[v.length - 1].id);
      break;
    }
    case '0':
      if (f && f.p) go(f.p.children[0].id);
      break;
    case '$':
      if (f && f.p) go(f.p.children[f.p.children.length - 1].id);
      break;
    case 'Enter':
      addSib(sel, !sh);
      break;
    case 'o':
    case 's':
      addSib(sel, 1);
      break;
    case 'O':
    case 'S':
      addSib(sel, 0);
      break;
    case 'Tab':
      if (sh) outdent();
      else addChild(sel);
      break;
    case 'a':
      addChild(sel);
      break;
    case ' ':
      if (sh) fold();
      else startEdit(sel);
      break;
    case 'F2': // ukryty alias
    case 'i':
    case 'e':
      startEdit(sel);
      break;
    case 'c':
      startEdit(sel, false, undefined, true);
      break;
    case 'Delete':
    case 'Backspace': // Mac nie ma klawisza Delete
    case 'x':
      del();
      break;
    case 'p':
      paste(true);
      break;
    case 'P':
      paste(false);
      break;
    case 'J':
      for (let i = 0; i < n; i++) moveSib(1);
      break;
    case 'K':
      for (let i = 0; i < n; i++) moveSib(-1);
      break;
    case 'L':
      indent();
      break;
    case 'H':
      outdent();
      break;
    case 'u':
      for (let i = 0; i < n; i++) undo();
      break;
    case 'F3': // ukryty alias
      jump(sh ? -1 : 1);
      break;
    case 'n':
      jump(1);
      break;
    case 'N':
      jump(-1);
      break;
    case '=':
      fitView();
      break;
    case ':':
      openPal(':');
      break;
    case '/':
      openCmd('/');
      break;
    case '?':
    case 'F1': // ukryty alias
      toggleHelp();
      break;
    case 'Escape':
      if ($('help').classList.contains('open')) toggleHelp();
      else if ($('side').classList.contains('open')) toggleSide();
      else deselect();
      break;
    default:
      return;
  }
  ev.preventDefault();
}
/* ---- Command / wyszukiwanie ---- */
/* Szukanie po „/” jak w vim: Enter szuka i zamyka pole, dalej n / N. Po Ctrl+F jak w przeglądarce: pole zostaje,
   Enter / Shift+Enter (też Ctrl+G / Ctrl+Shift+G) – następne / poprzednie trafienie, Esc zamyka. */
let findBar = false;
/** @type {string | null} zapytanie obecnych trafień w polu Ctrl+F (inne = szukaj od nowa) */
let findQ = null;
/** @param {string} p ':' albo '/' @param {boolean} [bar] pole szukania zostaje otwarte (Ctrl+F) */
function openCmd(p, bar) {
  setMode(p === ':' ? 'COMMAND' : 'SEARCH');
  findBar = !!bar && p === '/';
  findQ = null;
  const c = $('cmd');
  c.style.display = 'block';
  c.value = p;
  c.focus();
}
function closeCmd() {
  const c = $('cmd');
  c.blur();
  c.style.display = 'none';
  setMode('NORMAL');
} /* fokus nie może zostać w ukrytym polu (Chromium) */
$('cmd').addEventListener('keydown', ev => {
  ev.stopPropagation();
  const v = $('cmd').value,
    d = ev.shiftKey ? -1 : 1;
  if (ev.key === 'Escape') return closeCmd();
  if (findBar) {
    const g = (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'g';
    if (ev.key === 'Enter' || ev.key === 'F3' || g) {
      ev.preventDefault();
      const q = v.slice(1);
      if (q === findQ) return jump(d);
      findQ = q;
      search(q, d);
    }
    return;
  }
  if (ev.key === 'Enter') {
    closeCmd();
    v[0] === ':' ? exec(v.slice(1).trim()) : search(v.slice(1), d);
  }
});
/** @param {string} q @param {number} [d] 1 – od pierwszego trafienia, −1 – od ostatniego */
function search(q, d = 1) {
  q = q.toLowerCase();
  hits = q
    ? (function w(/** @type {MapNode} */ n, /** @type {number[]} */ a = []) {
        if (n.text.toLowerCase().includes(q)) a.push(n.id);
        n.children.forEach(c => w(c, a));
        return a;
      })(root)
    : [];
  hi = d > 0 ? -1 : 0;
  if (!hits.length) return info('0 trafień');
  jump(d);
}
/** następne (1) / poprzednie (−1) trafienie @param {number} d */
function jump(d) {
  if (!hits.length) return;
  hi = (hi + d + hits.length) % hits.length;
  sel = hits[hi];
  showSel();
  go(sel);
  info(`trafienie ${hi + 1} z ${hits.length}`);
}
/** komenda „:” → czynność (null – nieznana) @param {string} c @returns {{ id: string, t: string, f: () => unknown } | null} */
function cmdFind(c) {
  const [a, ...r] = c.trim().split(/\s+/),
    arg = r.join(' '),
    full = [a, ...r].join(' ');
  if (a === 'test')
    return { id: '', t: 'Test zapisu', f: () => info(selfTest() ? 'round-trip OK' : 'round-trip BŁĄD') };
  if (a === 'new' && arg) return { id: 'new', t: `Nowa mapa „${arg}”`, f: () => newMap(arg) };
  if (a === 'theme' && (arg === 'dark' || arg === 'light'))
    return { id: 'theme', t: arg === 'dark' ? 'Motyw ciemny' : 'Motyw jasny', f: () => toggleTheme(arg) };
  /** @param {(n: string) => boolean} ok */
  const by = ok => ACT.find(x => x.f && x.c && [x.c, ...(x.ca || [])].some(ok));
  /* cała komenda (np. „layout down”), inaczej pierwsze słowo komendy bez argumentów (np. „w plik.md” jak „w”) */
  const x = by(n => n === full) || by(n => !n.includes(' ') && n === a);
  return x && x.f ? { id: x.id, t: x.t, f: x.f } : null;
}
/** komenda „:” (w palecie i z pola na dole) @param {string} c */
function exec(c) {
  const x = cmdFind(c);
  if (x) x.f();
  else info('nieznana komenda: ' + c.trim().split(/\s+/)[0]);
}
/* ---- zdarzenia: klawiatura ---- */
window.addEventListener('keydown', ev => {
  if (menuOpen) return menuKey(ev);
  if (emoOpen && ev.key === 'Escape') {
    ev.preventDefault();
    return closeEmoji();
  }
  if ($('side').classList.contains('open') && asEl(ev.target)?.closest('#side')) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      toggleSide();
    }
    return;
  }
  if (mode === 'NORMAL' && !tv) normal(ev);
});
