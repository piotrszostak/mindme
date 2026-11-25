/* Pomocniki, styl mapy (domyślne wartości), model: parser i zapis Markdown, stan aplikacji, historia (cofnij/ponów). */
/**
 * Element strony o danym id; typ wynika z mapy `Elements` (types/globals.d.ts).
 * @template {keyof Elements} K
 * @param {K} id
 * @returns {Elements[K]}
 */
const $ = id => /** @type {any} */ (document.getElementById(id));
const DEF = {
  font: 'system',
  weight: 'normal',
  palette: 'Domyślna',
  edge: 2,
  edgeStyle: 'curve',
  nb: 2,
  radius: 8,
  fill: 'none',
  fs: 14,
  maxw: 220,
  gapX: 50,
  gapY: 10,
  gapTree: 60,
  colors: ['#e4572e', '#2f9e44', '#2f6fed', '#c2185b', '#f08c00', '#0b7285'],
};
/** @type {MapStyle} styl bieżącej mapy */
let ST = JSON.parse(JSON.stringify(DEF));
/** styl zmieniony – `applyStyle()` przeliczy stałe układu */
let stDirty = true;
/* czcionki systemowe (bez pobierania – działa offline); każda z zapasowymi krojami */
/** @type {Record<string, [string, string]>} krój: [nazwa, stos czcionek] */
const FONTS = {
  system: ['Systemowa', 'system-ui,sans-serif'],
  serif: ['Szeryfowa', 'Georgia,"Times New Roman","DejaVu Serif",serif'],
  mono: ['Maszynowa', 'ui-monospace,"Cascadia Code","DejaVu Sans Mono",monospace'],
  round: ['Zaokrąglona', 'ui-rounded,"SF Pro Rounded",Nunito,Quicksand,"Varela Round",system-ui,sans-serif'],
  hand: ['Odręczna', '"Comic Neue","Comic Sans MS","Segoe Print","Bradley Hand",cursive'],
  narrow: ['Wąska', '"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",sans-serif-condensed,sans-serif'],
};
/* emoji zawsze z kolorowej czcionki systemu – ta sama kolejność w pomiarze (canvas) i w SVG */
const EMOJI_FONTS = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
  EMOJI_FF = ',"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"';
const ff = () => (FONTS[ST.font] || FONTS.system)[1] + EMOJI_FF,
  fw = () => (ST.weight === 'bold' ? 'bold' : 'normal');
/* tylko różnice względem domyślnych trafiają do pliku */
function styleStr() {
  /** @type {Partial<MapStyle>} */
  const o = {};
  for (const key of /** @type {StyleKey[]} */ (Object.keys(DEF)))
    if (JSON.stringify(ST[key]) !== JSON.stringify(DEF[key])) /** @type {any} */ (o)[key] = ST[key];
  return Object.keys(o).length ? JSON.stringify(o) : '';
}
/** układ: right | left | both | down */
var dir = 'right';
let uid = 0;
/** @type {(t: string, ch?: MapNode[]) => MapNode} nowy węzeł (pola układu uzupełnia `lay()`) */
const mk = (t, ch = []) => /** @type {MapNode} */ ({ id: ++uid, text: t, children: ch, collapsed: false });
/** polska odmiana po liczbie: 1 węzeł, 2–4 węzły, 5 węzłów (ale 22 węzły, 12 węzłów)
 * @param {number} n @param {string} one @param {string} few @param {string} many */
const pl = (n, one, few, many) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
/** anulowanie okna wyboru pliku przez użytkownika @param {unknown} e */
const isAbort = e => e instanceof DOMException && e.name === 'AbortError';
/** cel zdarzenia jako element (lub null) @param {EventTarget | null} t @returns {Element | null} */
const asEl = t => (t instanceof Element ? t : null);
/** @param {string} s */
const esc = s =>
  s.replace(
    /[&<>"]/g,
    c => /** @type {Record<string, string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );
/* ---- model, parser, serializer ---- */
/* model: `root` to niewidoczny kontener (id 0); jego dzieci to korzenie map – każdy zapisany jako osobny nagłówek „# …” */
/** @param {MapNode[]} ch */
const forest = ch => /** @type {MapNode} */ ({ id: 0, text: '', children: ch, collapsed: false, top: true });
const C_RE = /\s*<!--c-->\s*$/;
/* linia dalszego ciągu tekstu węzła, która w pliku znaczyłaby co innego (lista, nagłówek, cytat, numer, tabela,
   blok kodu, znacznik), dostaje `\` na początku; bez `\` taka linia nie jest dalszym ciągiem */
const ESC_RE = /^([-*+>#|\\]|\d+[.)]|<!--|```|~~~)/;
/** gałąź jako lista Markdown, jak w pliku (także w schowku systemowym); kolejne linie tekstu węzła – wcięte pod punktem
 * @param {MapNode} n @param {number} [d] głębokość @returns {string} */
const branchMd = (n, d = 0) => {
  const [first, ...rest] = n.text.split('\n'),
    pad = '  '.repeat(d);
  return (
    pad +
    '- ' +
    first +
    (n.collapsed && n.children.length ? ' <!--c-->' : '') +
    '\n' +
    rest
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => pad + '  ' + (ESC_RE.test(l) ? '\\' : '') + l + '\n')
      .join('') +
    n.children.map(c => branchMd(c, d + 1)).join('')
  );
};
/** Model → Markdown. @param {MapNode} t kontener `root` */
function serialize(t) {
  return (
    (t.fm !== undefined ? t.fm + '\n' : '') +
    t.children
      .map((r, i) => {
        let o =
          '# ' +
          r.text.replace(/\n/g, ' ') /* tytuł mapy ma jedną linię */ +
          (r.collapsed && r.children.length ? ' <!--c-->' : '') +
          '\n' +
          (i === 0 && dir !== 'right' ? '<!--layout:' + dir + '-->\n' : '') +
          (i === 0 && styleStr() ? '<!--style:' + styleStr() + '-->\n' : '') +
          '\n';
        o += r.children.map(c => branchMd(c)).join('');
        return i < t.children.length - 1 ? o.replace(/\n\n$/, '\n') : o;
      })
      .join('\n')
  );
} /* bloki rozdziela dokładnie jedna pusta linia */
const FM_RE = /^---[ \t]*$/;
/** Markdown → model (zwraca kontener z licznikiem `skip`; ustawia też `dir` i `ST`). @param {string} md */
function parse(md) {
  const t = forest([]);
  t.skip = 0;
  let st = null;
  dir = 'right';
  ST = JSON.parse(JSON.stringify(DEF));
  stDirty = true;
  let ls = md.split(/\r?\n/);
  /* frontmatter: blok od `---` w pierwszej linii do następnego `---` – zostaje bez zmian, nie trafia na mapę */
  const e = FM_RE.test(ls[0]) ? ls.findIndex((l, i) => i > 0 && FM_RE.test(l)) : -1;
  if (e > 0) {
    t.fm = ls.slice(0, e + 1).join('\n');
    ls = ls.slice(e + 1);
  }
  /** @type {MapNode | null} punkt listy, którego dalszym ciągiem może być następna linia */
  let last = null,
    lastInd = 0;
  for (const line of ls) {
    const l = line.replace(/\t/g, '  ');
    let m;
    if (!l.trim()) {
      last = null; /* pusta linia kończy tekst punktu */
      continue;
    }
    if ((m = /^#\s+(.*)$/.exec(l))) {
      last = null;
      const r = mk(m[1].replace(C_RE, ''));
      r.collapsed = C_RE.test(m[1]);
      t.children.push(r);
      st = [r];
      continue;
    }
    if ((m = /^<!--layout:(\w+)-->/.exec(l))) {
      dir = m[1];
      continue;
    }
    if ((m = /^<!--style:(.*)-->\s*$/.exec(l))) {
      try {
        const o = JSON.parse(m[1]);
        for (const key of /** @type {StyleKey[]} */ (Object.keys(DEF)))
          if (key in o) /** @type {any} */ (ST)[key] = o[key];
      } catch (e) {}
      continue;
    }
    if ((m = /^(\s*)[-*+]\s+(.*)$/.exec(l))) {
      if (!st) {
        const r = mk('Mapa');
        t.children.push(r);
        st = [r];
      }
      let d = Math.min(Math.floor(m[1].length / 2), st.length - 1),
        x = m[2];
      const n = mk(x.replace(C_RE, ''));
      n.collapsed = C_RE.test(x);
      st[d].children.push(n);
      st.length = d + 1;
      st.push(n);
      last = n;
      lastInd = m[1].length;
    } else if (last && l.length - l.trimStart().length > lastInd && (l.trim()[0] === '\\' || !ESC_RE.test(l.trim()))) {
      /* wcięta linia tuż pod punktem: dalszy ciąg tekstu węzła (`>` to przyszłe notatki, `<!--` – znaczniki) */
      const x = l.trim();
      last.text += '\n' + (x[0] === '\\' ? x.slice(1) : x);
    } else t.skip++; /* linia, której mapa nie pokazuje (akapit, `##`, tabela…) */
  }
  if (!t.children.length) t.children.push(mk('Mapa'));
  return t;
}
/* próbka dla `:test` z rozszerzeniami formatu (frontmatter, wiele linii w węźle); nowe rozszerzenie = dopisz je tutaj */
const SELF_MD = '---\ntags:\n  - test\n---\n# Test\n\n- a\n  druga linia\n  \\- nie lista\n';
/** `:test`: zapis i odczyt bieżącej mapy oraz próbki dają ten sam tekst */
function selfTest() {
  const d = dir,
    st = ST,
    ok = [serialize(root), SELF_MD].every(a => serialize(parse(a)) === a);
  dir = d;
  ST = st;
  return ok;
}
/* ---- stan ---- */
let root = parse(
    '# Mapa myśli\n\n- Pomysł A\n  - Szczegół 1\n  - Szczegół 2\n- Pomysł B\n  - Szczegół 3\n- Pomysł C\n'
  ),
  sel = root.children[0].children[0].id;
/** tryb klawiatury: NORMAL | INSERT | COMMAND | SEARCH | TEKST */
let mode = 'NORMAL';
/** @type {string[]} historia cofania (zrzuty `snapStr()`) */
let undoS = [];
/** @type {string[]} */
let redoS = [];
/** @type {MapNode | null} skopiowana / wycięta gałąź */
let yank = null;
/** tekst, który aplikacja ostatnio zapisała do schowka systemowego (Ctrl+V z nim = wklej `yank`) */
let clipLast = '';
/** licznik vim (np. 3 w „3j”) i pierwszy znak skrótu dwuznakowego (np. g w „gg”) */
let cnt = 0;
let pend = '';
/** przesunięcie i zoom widoku */
let tx = 60;
let ty = 0;
let k = 1;
/** @type {EditState | null} */
let editing = null;
/** id węzła w edycji (0 = brak) */
let edId = 0;
/** @type {number[]} trafienia wyszukiwania i bieżący indeks */
let hits = [];
let hi = 0;
/** @type {FileSystemFileHandle | null} otwarty plik (File System Access API) */
let fh = null;
/** linie otwartego pliku, których mapa nie pokazuje; > 0 – autozapis do pliku wstrzymany do „Nadpisz” */
let fhSkip = 0;
/** zmiany, których nie ma jeszcze w otwartym pliku (przeładowanie z dysku pyta wtedy o zgodę) */
let dirty = false;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let timer;
let menuOpen = false;
/** widok tekstowy (Markdown) włączony */
let tv = false;
/** @type {(id: number, n?: MapNode, p?: MapNode | null) => Found | null} */
const find = (id, n = root, p = null) =>
  n.id === id ? { n, p } : n.children.reduce((/** @type {Found | null} */ r, c) => r || find(id, c, n), null);
const S = () => (sel ? find(sel) : null);
/* operacje na węźle bez zaznaczenia: komunikat zamiast błędu */
const need = () => {
  const f = S();
  if (!f) info('najpierw zaznacz węzeł');
  return f;
};
function deselect() {
  if (editing) endEdit();
  if (!sel) return;
  sel = 0;
  render(true);
  info('odznaczono');
}
const first = () => root.children[0];
/** @type {(n?: MapNode, a?: MapNode[]) => MapNode[]} widoczne węzły (bez zwiniętych) */
const vis = (n = root, a = []) => {
  if (!n.top) a.push(n);
  if (!n.collapsed) n.children.forEach(c => vis(c, a));
  return a;
};
/** @type {(n: MapNode) => MapNode} */
const clone = n =>
  /** @type {MapNode} */ ({ id: ++uid, text: n.text, collapsed: n.collapsed, children: n.children.map(clone) });
const snapStr = () => JSON.stringify({ root, sel, st: ST, dir });
function snap() {
  undoS.push(snapStr());
  if (undoS.length > 300) undoS.shift();
  redoS = [];
}
/** @param {string} s */
function restore(s) {
  const o = JSON.parse(s);
  root = o.root;
  sel = o.sel;
  if (o.dir && o.dir !== dir) {
    dir = o.dir;
    syncLayout();
  }
  if (o.st) {
    ST = o.st;
    stDirty = true;
    syncSide();
  }
}
function undo() {
  if (editing) endEdit();
  const s = undoS.pop();
  if (s === undefined) return info('nic do cofnięcia');
  redoS.push(snapStr());
  restore(s);
  changed();
}
function redo() {
  if (editing) endEdit();
  const s = redoS.pop();
  if (s === undefined) return info('nic do ponowienia');
  undoS.push(snapStr());
  restore(s);
  changed();
}
/** komunikat w pasku stanu @param {string} t */
function info(t) {
  const e = $('info');
  e.textContent = t;
  e.title = t; /* pełny tekst, gdy pasek go ucina */
}
/** podpowiedź w pasku stanu @param {string} t */
function hint(t) {
  $('hint').textContent = t;
}
/** @param {string} m */
function setMode(m) {
  mode = m;
  $('mode').textContent = m;
}
