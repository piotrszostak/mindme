/* Klawiatura (tryb Normal: skrót zwykły + vim), wiersz poleceń „:” i wyszukiwanie „/”. */
/* ---- tryb Normal (klawiatura) ---- */
/* Skróty: dla każdej czynności standardowy (Ctrl/klawisz specjalny) i vim; dawne klawisze (F1, F2, F3, Shift+F10)
   zostają jako ukryte aliasy – działają, ale nie ma ich w pomocy, w menu ani w README (decyzja A.3); nowych nie dodajemy. */
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
      y: redo /* drugi zwykły skrót „Ponów” (jak w Office), widoczny w pomocy */,
      r: redo,
      s: save,
      o: openFile,
      c: copy,
      d: duplicate,
      x: cut,
      f: () => openCmd('/', true),
      k: () => openPal(),
      g: () => jump(sh ? -1 : 1),
      '/': toggleHelp,
      '.': () => {
        const [x, y] = nodeScreen();
        openEmoji(x, y);
      },
    };
    if (k === 'v') {
      /* wkleja zdarzenie `paste` (niżej) – bez preventDefault, inaczej nie nadejdzie; fokus na chwilę w niewidocznym
         polu, bo Firefox poza polem tekstowym nie wysyła `paste` dla Ctrl+Shift+V */
      pasteSib = sh;
      const c = $('clip');
      c.value = '';
      c.focus();
      setTimeout(() => document.activeElement === c && c.blur(), 300); /* nic nie wklejono – fokus wraca */
      return;
    }
    const m = ctrlKeys[k];
    if (m) {
      ev.preventDefault();
      m();
    }
    return;
  }
  if (ev.altKey) {
    /** @type {Record<string, () => void>} */
    if (c.startsWith('Arrow')) {
      ev.preventDefault();
      shift(c); /* zgodnie z układem, jak strzałki */
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
    case 'h':
    case 'j':
    case 'k':
    case 'l': {
      /* te same kierunki co strzałki, zgodnie z układem (h ←, j ↓, k ↑, l →); z licznikiem – tyle razy */
      const key = /** @type {Record<string, string>} */ ({
        h: 'ArrowLeft',
        j: 'ArrowDown',
        k: 'ArrowUp',
        l: 'ArrowRight',
      })[c];
      for (let i = 0; i < n; i++) arrow(key);
      break;
    }
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
    case 'H':
    case 'J':
    case 'K':
    case 'L': {
      /* przesuń, wsuń, wysuń – jak Alt+strzałki, zgodnie z układem; z licznikiem – tyle razy */
      const key = /** @type {Record<string, string>} */ ({
        H: 'ArrowLeft',
        J: 'ArrowDown',
        K: 'ArrowUp',
        L: 'ArrowRight',
      })[c];
      for (let i = 0; i < n; i++) shift(key);
      break;
    }
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
  $('cmdall').hidden = p !== '/'; /* „wszystkie” – lista trafień (2.5), na telefonie jedyna droga */
  c.value = p;
  c.focus();
}
function closeCmd() {
  const c = $('cmd');
  c.blur();
  c.style.display = 'none';
  $('cmdall').hidden = true;
  setMode('NORMAL');
} /* fokus nie może zostać w ukrytym polu (Chromium) */
$('cmd').addEventListener('keydown', ev => {
  ev.stopPropagation();
  const v = $('cmd').value,
    d = ev.shiftKey ? -1 : 1;
  if (ev.key === 'Escape') return closeCmd();
  if (ev.key === 'Enter' && ev.altKey && v[0] === '/') {
    ev.preventDefault();
    return hitList(v.slice(1)); /* lista wszystkich trafień (2.5) */
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'f') {
    /* Ctrl+F w otwartym polu: jak w przeglądarce zaznacz zapytanie (inaczej otworzy się szukanie na stronie) */
    ev.preventDefault();
    if (v[0] !== '/') return openCmd('/', true);
    findBar = true;
    $('cmd').setSelectionRange(1, v.length);
    return;
  }
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
/* Ctrl+V / Ctrl+Shift+V w trybie mapy: tekst ze schowka systemowego (bez pytania o zgodę, w odróżnieniu od
   navigator.clipboard.readText); pola tekstowe wklejają same */
let pasteSib = false;
document.addEventListener('paste', e => {
  const sib = pasteSib;
  pasteSib = false;
  const clip = e.target === $('clip');
  if (clip) $('clip').blur();
  if (mode !== 'NORMAL' || tv || editing || menuOpen || emoOpen) return;
  if (!clip && asEl(e.target)?.closest('input, textarea')) return;
  e.preventDefault();
  const cd = e.clipboardData;
  pasteText(cd?.getData('text/plain') || '', !sib, cd?.getData('text/html') || '');
});
/* kliknięcie poza polem (mapa, pasek) zamyka je – inaczej tryb zostaje SEARCH i klawisze nie sterują mapą,
   a Ctrl+F i „/” trafiają do przeglądarki; trafienia zostają dla n / N */
document.addEventListener(
  'pointerdown',
  e => {
    const t = e.target;
    if ($('cmd').style.display === 'block' && t !== $('cmd') && t !== $('cmdall')) closeCmd();
  },
  true
);
/** @param {string} q @param {number} [d] 1 – od pierwszego trafienia, −1 – od ostatniego */
function search(q, d = 1) {
  /* bez polskich znaków i wielkości liter, jak lista trafień (`matchAt` w palette.js) */
  hits = (function w(/** @type {MapNode} */ n, /** @type {number[]} */ a = []) {
    if (matchAt(q, n.text)) a.push(n.id);
    n.children.forEach(c => w(c, a));
    return a;
  })(root);
  hi = d > 0 ? -1 : 0;
  if (!hits.length) return info('0 trafień');
  jump(d);
}
/** następne (1) / poprzednie (−1) trafienie @param {number} d */
function jump(d) {
  if (hits.length) hitGo((hi + d + hits.length) % hits.length);
}
/** przejdź do i-tego trafienia (rozwija zwiniętych przodków) @param {number} i */
function hitGo(i) {
  hi = i;
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
    return { id: 'theme', t: arg === 'dark' ? 'Tryb ciemny' : 'Tryb jasny', f: () => toggleTheme(arg) };
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
