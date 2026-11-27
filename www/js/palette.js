/* Paleta komend (Ctrl+K, „:”, menu „…”): czynności z ACT, filtrowanie, komendy „:”, ostatnio użyte (mm.cmd).
   Tryb listy (`openList`): ta sama paleta z dowolnymi pozycjami – lista trafień (2.5), „Przenieś do…”, `:lint`. */
/* ---- paleta komend ---- */
let palOpen = false;
/** @type {PalItem[]} pozycje na liście: pełna komenda „:”, dostępne, potem niedostępne */
let palItems = [];
/** podświetlona pozycja (−1 – brak) */
let palHi = -1;
/** ostatnia pozycja myszy nad listą – przewijanie pod nieruchomym kursorem nie zmienia podświetlenia */
let palXY = '';
/** @type {PalList | null} tryb listy (`openList`); null – polecenia */
let palL = null;
/** czynności w palecie: wszystkie z `f`, bez samego poruszania się i bez samej palety */
const palActs = () => ACT.filter(a => a.f && a.pal !== false);
/** @type {string[]} ostatnio użyte: id czynności, najnowsza pierwsza, najwyżej 5 (mm.cmd) */
let palRecent = [];
try {
  const r = JSON.parse(localStorage.getItem('mm.cmd') || '[]');
  /* nieznane id (np. czynność usunięta w nowszej wersji) i powtórki pomijamy */
  if (Array.isArray(r)) palRecent = [...new Set(r)].filter(id => palActs().some(a => a.id === id)).slice(0, 5);
} catch (e) {}
/** bez polskich znaków i wielkości liter @param {string} s */
const plain = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
/** @type {Map<string, string>} `plain` pojedynczych znaków (szukanie przechodzi przez każdy węzeł) */
const plainC = new Map();
/**
 * tekst bez polskich znaków z pozycjami: `at[j]` – numer znaku `[...t]`, z którego pochodzi j-ty znak `s`
 * @param {string} t @returns {{s: string, at: number[]}}
 */
function plainAt(t) {
  let s = '';
  /** @type {number[]} */
  const at = [];
  [...t].forEach((c, i) => {
    let p = plainC.get(c);
    if (p === undefined) plainC.set(c, (p = plain(c)));
    s += p;
    for (let k = 0; k < p.length; k++) at.push(i);
  });
  return { s, at };
}
/**
 * szukanie węzłów (Ctrl+F, „/”, n / N, lista trafień): podciąg bez polskich znaków i wielkości liter
 * @param {string} q zapytanie @param {string} t tekst węzła
 * @returns {number[] | null} pozycje znaków `[...t]` wszystkich wystąpień; null – nie pasuje (także puste zapytanie)
 */
function matchAt(q, t) {
  const w = plainAt(q).s;
  if (!w) return null;
  const { s, at } = plainAt(t),
    r = new Set();
  for (let j = s.indexOf(w); j >= 0; j = s.indexOf(w, j + w.length))
    for (let k = j; k < j + w.length; k++) r.add(at[k]);
  return r.size ? [...r] : null;
}
/** słowa do dopasowania @param {string} s */
const words = s =>
  plain(s)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
/** ocena dopasowania (2.3): litera na początku słowa, na początku nazwy, tuż po poprzedniej; kara za przerwę (najwyżej) */
const FZ = { word: 8, start: 4, next: 4, gap: 4 };
/**
 * dopasowanie przybliżone: litery każdego słowa zapytania po kolei, niekoniecznie obok siebie; oceny słów się sumują
 * @param {string[]} w słowa zapytania (już bez polskich znaków) @param {string} t przeszukiwany tekst
 * @returns {{s: number, at: number[]} | null} ocena i pozycje dopasowanych znaków (`[...t]`); null – nie pasuje
 */
function fuzzy(w, t) {
  const h = [...t].map(c => plain(c)[0] || ' '),
    n = h.length,
    isWord = (/** @type {number} */ j) => j === 0 || !/[a-z0-9]/.test(h[j - 1]);
  let s = 0;
  /** @type {Set<number>} */
  const at = new Set();
  for (const q of w) {
    /* best[i][j] – najlepsza ocena, gdy i-ta litera zapytania stoi na znaku j; from – poprzednia litera */
    const best = [...q].map(() => Array(n).fill(-Infinity)),
      from = [...q].map(() => Array(n).fill(-1));
    for (let i = 0; i < q.length; i++)
      for (let j = i; j < n; j++) {
        if (h[j] !== q[i]) continue;
        const own = 1 + (isWord(j) ? FZ.word : 0) + (j === 0 ? FZ.start : 0);
        if (i === 0) best[0][j] = own;
        for (let k = i - 1; i > 0 && k < j; k++) {
          const v = best[i - 1][k] + own + (k === j - 1 ? FZ.next : -Math.min(j - k - 1, FZ.gap));
          if (v > best[i][j]) [best[i][j], from[i][j]] = [v, k];
        }
      }
    const last = best[q.length - 1],
      top = Math.max(...last);
    if (top === -Infinity) return null;
    s += top;
    for (let i = q.length - 1, j = last.indexOf(top); i >= 0; j = from[i][j], i--) at.add(j);
  }
  return { s, at: [...at].sort((a, b) => a - b) };
}
/** skróty w palecie: zwykły i vim (gdy vim nie ma – komenda „:”) @param {Act} a @returns {string[]} */
const palKeys = a =>
  [a.k && a.k[0], (a.v && a.v[0]) || (a.c && ':' + a.c)].filter(/** @returns {x is string} */ x => !!x);
/** pozycje dla wpisanego tekstu @param {string} q @returns {PalItem[]} */
function palList(q) {
  const isCmd = q[0] === ':',
    s = (isCmd ? q.slice(1) : q).trim(),
    w = words(s),
    x = isCmd && s ? cmdFind(s) : null;
  /** @type {PalItem[]} pełna, znana komenda jest pierwsza */
  const top = x ? [{ id: x.id || 'cmd', t: x.t, keys: [':' + s], off: '', f: () => exec(s), rec: x.id }] : [];
  const all = palActs(),
    order = [...palRecent.map(id => all.find(a => a.id === id)), ...all].filter(
      /** @returns {a is Act} */ (a, i, l) => !!a && l.indexOf(a) === i
    );
  /* litery każdego wpisanego słowa po kolei w nazwie (po „:” także w komendzie); najlepsze dopasowanie na górze,
     przy równej ocenie kolejność z `order` (sortowanie stabilne): ostatnio użyte, potem stała */
  const len = (/** @type {Act} */ a) => [...a.t].length;
  const items = order
    .filter(a => a.id !== (x && x.id))
    .flatMap(a => {
      const m = fuzzy(w, a.t + (isCmd && a.c ? ' ' + a.c : ''));
      return m ? [{ a, m }] : [];
    })
    .sort((p, q) => q.m.s - p.m.s)
    .map(({ a, m }) => ({
      id: a.id,
      t: a.t,
      keys: palKeys(a),
      off: a.off ? a.off() : '',
      f: a.f || (() => {}),
      rec: a.id,
      hit: m.at.filter(i => i < len(a)), // litery z komendy „:” nie mają czego wyróżnić w nazwie
    }));
  return [...top, ...items.filter(i => !i.off), ...items.filter(i => i.off)];
}
/** pozycje trybu listy dla wpisanego tekstu: bez tekstu wszystkie w podanej kolejności, inaczej dopasowanie z 2.3
 * @param {PalList} L @param {string} q @returns {PalItem[]} */
function listItems(L, q) {
  const w = L.filter ? words(q) : [];
  const items = L.items
    .flatMap(it => {
      const len = [...it.t].length,
        own = w.length ? fuzzy(w, it.t) : { s: 0, at: it.hit || [] },
        /* z `path` – gdy sam tekst nie pasuje, próba z tekstem i ścieżką; takie pozycje idą pod trafienia w tekście */
        m = own || (L.path && it.sub ? fuzzy(w, it.t + ' › ' + it.sub) : null);
      /* litery dopasowane w ścieżce nie są wyróżniane (wyróżnienie tylko w tekście) */
      return m ? [{ it, txt: !!own, m: { s: m.s, at: m.at.filter(i => i < len) } }] : [];
    })
    .sort((p, q) => Number(q.txt) - Number(p.txt) || q.m.s - p.m.s)
    .map(({ it, m }) => ({
      id: String(it.id),
      t: it.t,
      sub: it.sub,
      keys: [],
      off: it.off || '',
      f: () => L.pick(it),
      rec: '',
      hit: m.at,
    }));
  return [...items.filter(i => !i.off), ...items.filter(i => i.off)];
}
/** tekst węzła w jednym wierszu: linie złączone „ · ”; `hit` (pozycje `[...text]`) przeliczone na ten wiersz
 * @param {string} text @param {number[]} [hit] @returns {{t: string, hit: number[]}} */
function oneLine(text, hit = []) {
  const h = new Set(hit),
    out = /** @type {number[]} */ ([]);
  /** @type {string[]} znaki wiersza */
  const t = [];
  [...text].forEach((c, i) => {
    if (c === '\n') return t.push(' ', '·', ' ');
    if (h.has(i)) out.push(t.length);
    t.push(c);
  });
  return { t: t.join(''), hit: out };
}
/**
 * pozycje listy dla węzłów wszystkich map, w kolejności drzewa (jak szukanie): tekst w jednym wierszu i ścieżka
 * od korzenia mapy (pierwsze linie przodków, „ › ”; korzeń – bez ścieżki)
 * @param {(n: MapNode) => number[] | boolean | null} keep węzeł na liście? tablica – pozycje liter `[...n.text]` do wyróżnienia
 * @returns {ListItem[]}
 */
function nodeItems(keep) {
  /** @type {ListItem[]} */
  const out = [];
  (function w(/** @type {MapNode} */ n, /** @type {string[]} */ path) {
    const k = n.top ? null : keep(n);
    if (k) out.push({ id: n.id, ...oneLine(n.text, Array.isArray(k) ? k : []), sub: path.join(' › ') });
    const p = n.top ? path : [...path, n.text.split('\n')[0]];
    n.children.forEach(c => w(c, p));
  })(root, []);
  return out;
}
/** element z klasą i tekstem (zawsze `textContent`, nigdy HTML) @param {string} tag @param {string} cls @param {string} t */
function palEl(tag, cls, t) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = t;
  return e;
}
/** wiersz palety; dopasowane litery w `<span class="m">` (sąsiednie razem) @param {PalItem} it @param {number} i */
function palRow(it, i) {
  const r = palEl('div', 'pi' + (it.off ? ' off' : ''), '');
  r.id = 'pi' + i;
  r.setAttribute('role', 'option');
  r.dataset.i = String(i);
  r.dataset.act = it.id;
  if (it.off) r.setAttribute('aria-disabled', 'true');
  const t = palEl('span', 'pt', ''),
    hit = new Set(it.hit);
  /** @type {{m: boolean, s: string}[]} kawałki nazwy: dopasowane i zwykłe na przemian */
  const parts = [];
  [...it.t].forEach((c, k) => {
    const m = hit.has(k),
      p = parts[parts.length - 1];
    if (p && p.m === m) p.s += c;
    else parts.push({ m, s: c });
  });
  parts.forEach(p => t.append(p.m ? palEl('span', 'm', p.s) : p.s));
  /* tryb listy: pod tekstem drobna ścieżka (lista trafień, „Przenieś do…”) */
  const c = it.sub ? palEl('span', 'pc', '') : t;
  if (it.sub) c.append(t, palEl('span', 'ps', it.sub));
  r.append(c, ...(it.off ? [palEl('span', 'why', it.off)] : it.keys.map(k => palEl('kbd', '', k))));
  return r;
}
function drawPal() {
  palItems = palL ? listItems(palL, $('palq').value) : palList($('palq').value);
  palHi = palItems.findIndex(it => !it.off);
  const L = $('pall'),
    none = palL ? palL.none || 'Nic nie pasuje' : 'Brak pasujących poleceń';
  L.classList.toggle(
    'sub',
    palItems.some(it => it.sub)
  );
  L.replaceChildren(...(palItems.length ? palItems.map(palRow) : [palEl('div', 'none', none)]));
  L.scrollTop = 0;
  palSet(palHi);
}
/** podświetl pozycję @param {number} i @param {boolean} [scroll] przewiń listę, żeby była widoczna */
function palSet(i, scroll = true) {
  palHi = i;
  const L = $('pall');
  L.querySelectorAll('.pi').forEach((r, j) => {
    r.classList.toggle('hi', j === i);
    r.setAttribute('aria-selected', String(j === i));
  });
  const r = L.querySelector('.pi.hi');
  if (r instanceof HTMLElement) {
    $('palq').setAttribute('aria-activedescendant', r.id);
    if (!scroll) return;
    if (r.offsetTop < L.scrollTop) L.scrollTop = r.offsetTop;
    else if (r.offsetTop + r.offsetHeight > L.scrollTop + L.clientHeight)
      L.scrollTop = r.offsetTop + r.offsetHeight - L.clientHeight;
  } else $('palq').removeAttribute('aria-activedescendant');
}
/** następna (1) / poprzednia (−1) dostępna pozycja, z zawijaniem @param {number} d */
function palMove(d) {
  const on = palItems.flatMap((it, i) => (it.off ? [] : [i]));
  if (!on.length) return;
  const j = on.indexOf(palHi);
  palSet(j < 0 ? on[d > 0 ? 0 : on.length - 1] : on[(j + d + on.length) % on.length]);
}
/** @param {string} [pre] początek tekstu: '' (Ctrl+K, menu „…”) albo ':' (komenda) @param {PalList | null} [L] tryb listy */
function openPal(pre = '', L = null) {
  if (tv) return;
  if (editing) endEdit();
  closeMenu();
  closeEmoji();
  closeCmd();
  setMode('COMMAND');
  palOpen = true;
  palL = L;
  const p = $('pal'),
    q = $('palq');
  p.style.top = $('top').getBoundingClientRect().bottom + 8 + 'px'; /* tuż pod górnym paskiem */
  p.classList.add('open');
  /* tryb listy: tytuł nad listą; bez zawężania pole tylko do odczytu i niewidoczne (fokus zostaje na klawisze,
     na telefonie nie wysuwa się klawiatura) */
  p.classList.toggle('ro', !!L && !L.filter);
  p.setAttribute('aria-label', L ? L.title : 'Wszystkie polecenia');
  $('palt').textContent = L ? L.title : '';
  $('palt').hidden = !L;
  q.readOnly = !!L && !L.filter;
  q.placeholder = L ? L.hint || 'Wpisz, żeby zawęzić…' : 'Szukaj polecenia…';
  q.value = pre;
  drawPal();
  q.focus();
}
/**
 * tryb listy palety (2.5): własne pozycje zamiast poleceń; Enter / klik – `L.pick(pozycja)` po zamknięciu palety,
 * Esc zamyka, strzałki i Tab jak w palecie. Pozycje dla węzłów mapy daje `nodeItems`.
 * @param {PalList} L
 */
function openList(L) {
  openPal('', L);
}
function closePal() {
  if (!palOpen) return;
  palOpen = false;
  palL = null;
  $('palq').blur(); /* fokus nie może zostać w schowanym polu (Chromium) */
  $('pal').classList.remove('open');
  setMode('NORMAL');
}
/* ---- lista trafień (2.5): Alt+Enter albo przycisk „wszystkie” w polu szukania ---- */
/** @param {string} q zapytanie z pola szukania (bez „/”) */
function hitList(q) {
  const items = nodeItems(n => matchAt(q, n.text));
  hits = items.map(it => it.id); /* te same trafienia co „/” (ta sama kolejność) – dalej n / N */
  hi = -1;
  if (!items.length) return info('0 trafień'); /* pole szukania zostaje – można poprawić zapytanie */
  openList({ title: `Trafienia (${items.length})`, items, pick: it => hitGo(hits.indexOf(it.id)) });
}
/* przycisk nie zabiera fokusu polu szukania (klawiatura ekranowa) */
['pointerdown', 'mousedown'].forEach(t => $('cmdall').addEventListener(t, e => e.preventDefault()));
$('cmdall').addEventListener('click', () => {
  hitList($('cmd').value.slice(1));
  if (!palOpen) $('cmd').focus();
});
/** uruchom pozycję i zapamiętaj ją jako ostatnio użytą @param {number} i */
function palRun(i) {
  const it = palItems[i];
  if (!it || it.off) return;
  closePal();
  if (it.rec) {
    palRecent = [it.rec, ...palRecent.filter(id => id !== it.rec)].slice(0, 5);
    try {
      localStorage.setItem('mm.cmd', JSON.stringify(palRecent));
    } catch (e) {}
  }
  it.f();
}
$('palq').addEventListener('input', drawPal);
$('palq').addEventListener('keydown', ev => {
  ev.stopPropagation();
  if (ev.isComposing) return;
  const k = ev.key;
  if (k === 'Escape') {
    ev.preventDefault();
    closePal();
  } else if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Tab') {
    ev.preventDefault(); /* Tab jak w menu: fokus zostaje w palecie */
    palMove(k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey) ? -1 : 1);
  } else if (k === 'Enter') {
    ev.preventDefault();
    if (palHi >= 0) return palRun(palHi);
    const v = $('palq').value;
    if (palL || v[0] !== ':') return; /* nic nie pasuje – paleta zostaje */
    closePal();
    exec(v.slice(1).trim()); /* nieznana komenda – komunikat jak dawniej */
  } else if ((ev.ctrlKey || ev.metaKey) && k.toLowerCase() === 'k') ev.preventDefault();
});
/* klik w pozycję nie zabiera fokusu polu (klawiatura ekranowa zostaje) */
['pointerdown', 'mousedown'].forEach(t =>
  $('pall').addEventListener(t, e => {
    if (asEl(e.target)?.closest('.pi')) e.preventDefault();
  })
);
$('pall').addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const xy = e.clientX + ',' + e.clientY;
  if (xy === palXY) return;
  palXY = xy;
  const r = asEl(e.target)?.closest('.pi');
  if (r instanceof HTMLElement && !r.classList.contains('off')) palSet(Number(r.dataset.i), false);
});
$('pall').addEventListener('click', e => {
  const r = asEl(e.target)?.closest('.pi');
  if (r instanceof HTMLElement) palRun(Number(r.dataset.i));
});
