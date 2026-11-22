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
/** Model → Markdown. @param {MapNode} t kontener `root` */
function serialize(t) {
  return t.children
    .map((r, i) => {
      let o =
        '# ' +
        r.text +
        (r.collapsed && r.children.length ? ' <!--c-->' : '') +
        '\n' +
        (i === 0 && dir !== 'right' ? '<!--layout:' + dir + '-->\n' : '') +
        (i === 0 && styleStr() ? '<!--style:' + styleStr() + '-->\n' : '') +
        '\n';
      (function w(n, d) {
        for (const c of n.children) {
          o += '  '.repeat(d) + '- ' + c.text + (c.collapsed && c.children.length ? ' <!--c-->' : '') + '\n';
          w(c, d + 1);
        }
      })(r, 0);
      return i < t.children.length - 1 ? o.replace(/\n\n$/, '\n') : o;
    })
    .join('\n');
} /* bloki rozdziela dokładnie jedna pusta linia */
/** Markdown → model (zwraca kontener; ustawia też `dir` i `ST`). @param {string} md */
function parse(md) {
  const t = forest([]);
  let st = null;
  dir = 'right';
  ST = JSON.parse(JSON.stringify(DEF));
  stDirty = true;
  for (let l of md.replace(/\t/g, '  ').split(/\r?\n/)) {
    let m;
    if ((m = /^#\s+(.*)$/.exec(l))) {
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
    }
  }
  if (!t.children.length) t.children.push(mk('Mapa'));
  return t;
}
function selfTest() {
  const a = serialize(root),
    b = serialize(parse(a));
  return a === b;
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
const snapStr = () => JSON.stringify({ root, sel, st: ST });
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
  $('info').textContent = t;
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
