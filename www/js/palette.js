/* Pole „Szukaj w mapie lub wpisz polecenie…” w górnym pasku (paleta komend; Ctrl+K, „:”, „/”, Ctrl+F): czynności z ACT,
   węzły mapy, filtrowanie, komendy „:”, ostatnio użyte (mm.cmd).
   Tryb listy (`openList`): to samo pole z dowolnymi pozycjami – lista trafień (2.5), „Przenieś do…”, `:lint`. */
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
/* ---- pole „Szukaj w mapie lub wpisz polecenie…” w górnym pasku (3.3 krok 3) ---- */
/* Jedno miejsce do pisania: Ctrl+K i klik – ostatnio użyte, po wpisaniu węzły i czynności, po „:” komendy;
   „/” i Ctrl+F – tylko węzły. Tryb listy (`openList`) też tutaj. Na telefonie lupa (#srBtn) i pole na cały ekran. */
const SR_PH = 'Szukaj w mapie lub wpisz polecenie…';
/** @type {'all' | 'find'} 'all' – Ctrl+K i klik; 'find' – „/” i Ctrl+F (tylko węzły) */
let srKind = 'all';
/* „/” jak w vim: Enter idzie do trafienia i zamyka pole, dalej n / N. Ctrl+F jak w przeglądarce: pole zostaje,
   Enter / Shift+Enter (też Ctrl+G / Ctrl+Shift+G, F3) – następne / poprzednie trafienie, Esc zamyka. */
let findBar = false;
/** @type {string | null} zapytanie obecnych trafień w polu Ctrl+F (inne = szukaj od nowa) */
let findQ = null;
/** pozycję wybrano strzałką – Enter idzie do niej, a nie do następnego trafienia */
let palMoved = false;
/**
 * węzły pasujące do zapytania jako pozycje pola – jak lista trafień: bez polskich znaków, tekst w jednym wierszu,
 * ścieżka od korzenia; wybór ustawia trafienia (dalej n / N) i nie trafia do ostatnio użytych
 * @param {string} q @returns {PalItem[]}
 */
function nodeHits(q) {
  const items = nodeItems(n => matchAt(q, n.text)),
    ids = items.map(it => it.id);
  return items.map((it, i) => ({
    id: 'n' + it.id,
    t: it.t,
    sub: it.sub,
    keys: [],
    off: '',
    rec: '',
    hit: it.hit,
    f: () => {
      hits = ids;
      hitGo(i);
    },
  }));
}
/** grupy pozycji dla wpisanego tekstu: nagłówek ('' – bez) i pozycje @param {string} q @returns {[string, PalItem[]][]} */
function srGroups(q) {
  if (palL) return [['', listItems(palL, q)]];
  /** @returns {[string, PalItem[]][]} */
  const nodes = () => {
    const n = nodeHits(q);
    return n.length ? [[`W mapie (${n.length})`, n]] : [];
  };
  if (srKind === 'find') return q ? nodes() : [];
  if (q[0] === ':') return [['', palList(q)]];
  if (!q.trim()) {
    /* puste pole: ostatnio użyte, pod nimi wszystkie pozostałe czynności (dostępne, potem szare) */
    const all = palList(''),
      rec = all.filter(it => palRecent.includes(it.rec)),
      rest = all.filter(it => !palRecent.includes(it.rec));
    return [
      ...(rec.length ? [/** @type {[string, PalItem[]]} */ (['Ostatnio użyte', rec])] : []),
      [`Czynności (${rest.length})`, rest],
    ];
  }
  const a = palList(q);
  return [...nodes(), ...(a.length ? [/** @type {[string, PalItem[]]} */ ([`Czynności (${a.length})`, a])] : [])];
}
/** element z klasą i tekstem (zawsze `textContent`, nigdy HTML) @param {string} tag @param {string} cls @param {string} t */
function palEl(tag, cls, t) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = t;
  return e;
}
/** wiersz listy; dopasowane litery w `<span class="m">` (sąsiednie razem) @param {PalItem} it @param {number} i */
function palRow(it, i) {
  const r = palEl('div', 'pi' + (it.off ? ' off' : '') + (it.sub ? ' two' : ''), '');
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
  /* węzły: pod tekstem drobna ścieżka (lista trafień, „Przenieś do…”) */
  const c = it.sub ? palEl('span', 'pc', '') : t;
  if (it.sub) c.append(t, palEl('span', 'ps', it.sub));
  r.append(c, ...(it.off ? [palEl('span', 'why', it.off)] : it.keys.map(k => palEl('kbd', '', k))));
  return r;
}
function drawPal() {
  const q = $('sr').value,
    groups = srGroups(q);
  palItems = groups.flatMap(g => g[1]);
  palHi = palItems.findIndex(it => !it.off);
  palMoved = false;
  const none = palL
    ? palL.none || 'Nic nie pasuje'
    : srKind === 'find'
      ? q
        ? 'Brak trafień'
        : 'Wpisz kawałek tekstu węzła'
      : q[0] === ':'
        ? 'Brak pasujących poleceń'
        : 'Brak pasujących węzłów i poleceń';
  let i = 0;
  const L = $('srL');
  L.replaceChildren(
    ...(palItems.length
      ? groups.flatMap(([h, items]) => [...(h ? [palEl('div', 'sh', h)] : []), ...items.map(it => palRow(it, i++))])
      : [palEl('div', 'none', none)])
  );
  L.scrollTop = 0;
  palSet(palHi);
}
/** podświetl pozycję @param {number} i @param {boolean} [scroll] przewiń listę, żeby była widoczna */
function palSet(i, scroll = true) {
  palHi = i;
  const L = $('srL');
  L.querySelectorAll('.pi').forEach((r, j) => {
    r.classList.toggle('hi', j === i);
    r.setAttribute('aria-selected', String(j === i));
  });
  const r = L.querySelector('.pi.hi');
  if (r instanceof HTMLElement) {
    $('sr').setAttribute('aria-activedescendant', r.id);
    if (!scroll) return;
    /* nad pierwszą pozycją grupy widać też jej nagłówek */
    const h = r.previousElementSibling,
      top = h instanceof HTMLElement && h.classList.contains('sh') ? h.offsetTop : r.offsetTop;
    if (top < L.scrollTop) L.scrollTop = top;
    else if (r.offsetTop + r.offsetHeight > L.scrollTop + L.clientHeight)
      L.scrollTop = r.offsetTop + r.offsetHeight - L.clientHeight;
  } else $('sr').removeAttribute('aria-activedescendant');
}
/** następna (1) / poprzednia (−1) dostępna pozycja, z zawijaniem @param {number} d */
function palMove(d) {
  const on = palItems.flatMap((it, i) => (it.off ? [] : [i]));
  if (!on.length) return;
  const j = on.indexOf(palHi);
  palSet(j < 0 ? on[d > 0 ? 0 : on.length - 1] : on[(j + d + on.length) % on.length]);
  palMoved = true;
}
/**
 * otwórz pole (Ctrl+K, klik, „:”) @param {string} [pre] początek tekstu: '' albo ':' (komenda)
 * @param {PalList | null} [L] tryb listy @param {'all' | 'find'} [kind] 'find' – tylko węzły („/”, Ctrl+F; `openFind`)
 */
function openPal(pre = '', L = null, kind = 'all') {
  if (tv) return;
  if (editing) endEdit();
  closeMenu();
  closeEmoji();
  setMode(kind === 'find' && !L ? 'SEARCH' : 'COMMAND');
  palOpen = true;
  palL = L;
  srKind = L ? 'all' : kind;
  findBar = false;
  findQ = null;
  const q = $('sr');
  document.body.classList.add('srch'); /* telefon: pole na cały ekran */
  $('srRes').hidden = false;
  q.setAttribute('aria-expanded', 'true');
  /* tryb listy: tytuł nad listą; bez zawężania pole tylko do odczytu (na telefonie nie wysuwa się klawiatura) */
  $('srT').textContent = L ? L.title : '';
  $('srT').hidden = !L;
  q.readOnly = !!L && !L.filter;
  q.placeholder = L
    ? L.hint || (L.filter ? 'Wpisz, żeby zawęzić…' : L.title)
    : kind === 'find'
      ? 'Szukaj w mapie…'
      : SR_PH;
  q.value = pre;
  drawPal();
  q.focus();
}
/** szukanie węzłów w polu: „/” (bar = false, Enter zamyka) albo Ctrl+F (bar = true, pole zostaje) @param {boolean} bar */
function openFind(bar) {
  openPal('', null, 'find');
  findBar = bar;
}
/**
 * tryb listy (2.5): własne pozycje zamiast poleceń; Enter / klik – `L.pick(pozycja)` po zamknięciu pola,
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
  srKind = 'all';
  findBar = false;
  const q = $('sr');
  q.blur(); /* fokus nie może zostać w schowanym polu (Chromium) */
  q.value = '';
  q.readOnly = false;
  q.placeholder = SR_PH;
  q.setAttribute('aria-expanded', 'false');
  q.removeAttribute('aria-activedescendant');
  $('srRes').hidden = true;
  $('srT').hidden = true;
  $('srL').replaceChildren();
  document.body.classList.remove('srch');
  setMode('NORMAL');
}
/**
 * pole dostępne (mapa) albo schowane – widok .md ma w tym miejscu pasek edycji Markdown (krok 5 planu 3.3);
 * jedyne miejsce, które chowa pole i lupę (klasa `sr-off` na body) @param {boolean} on
 */
function srAvail(on) {
  if (!on) closePal();
  document.body.classList.toggle('sr-off', !on);
}
/* ---- lista trafień (2.5): Alt+Enter w polu ---- */
/** @param {string} q zapytanie z pola */
function hitList(q) {
  const items = nodeItems(n => matchAt(q, n.text));
  hits = items.map(it => it.id); /* te same trafienia co „/” (ta sama kolejność) – dalej n / N */
  hi = -1;
  if (!items.length) return info('0 trafień'); /* pole zostaje – można poprawić zapytanie */
  openList({ title: `Trafienia (${items.length})`, items, pick: it => hitGo(hits.indexOf(it.id)) });
  $('sr').value = q; /* zapytanie widać w polu (tylko do odczytu) */
}
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
$('srIc').innerHTML = icon('search');
$('sr').addEventListener('focus', () => {
  if (tv) $('sr').blur();
  else if (!palOpen) openPal(); /* klik w pole = Ctrl+K */
});
/* klik obok pola, ale w jego ramce (ikona, „Ctrl+K”) też otwiera */
$('srBox').addEventListener('click', e => asEl(e.target)?.closest('#srBack') || $('sr').focus());
$('srBtn').addEventListener('click', () => openPal());
$('srBack').addEventListener('click', closePal);
$('sr').addEventListener('input', drawPal);
$('sr').addEventListener('keydown', ev => {
  ev.stopPropagation(); /* klawisze nie trafiają do `normal()` – Ctrl+S obsługujemy tutaj */
  if (!palOpen || ev.isComposing) return;
  const k = ev.key,
    lk = k.length === 1 ? k.toLowerCase() : k,
    ctrl = ev.ctrlKey || ev.metaKey,
    q = $('sr'),
    v = q.value,
    d = ev.shiftKey ? -1 : 1,
    find = srKind === 'find' && !palL;
  if (k === 'Escape') {
    ev.preventDefault();
    return closePal(); /* zamyka wszystko – także listę trafień (trafienia zostają dla n / N) */
  }
  if (ctrl && lk === 's') {
    ev.preventDefault(); /* inaczej przeglądarka otworzy „Zapisz stronę” */
    closePal();
    return save();
  }
  if (ctrl && lk === 'f') {
    /* Ctrl+F w otwartym polu: szukanie węzłów jak w przeglądarce, zapytanie zaznaczone */
    ev.preventDefault();
    if (!find) {
      openFind(true);
      q.value = v[0] === ':' ? '' : v;
      drawPal();
    }
    findBar = true;
    return q.select();
  }
  if (ctrl && lk === 'k') {
    ev.preventDefault();
    if (find || palL) openPal(v); /* z szukania i z listy – węzły i czynności z tym samym tekstem */
    return;
  }
  if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Tab') {
    ev.preventDefault(); /* Tab jak w menu: fokus zostaje w polu */
    return palMove(k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey) ? -1 : 1);
  }
  if (k === 'Enter' && ev.altKey) {
    ev.preventDefault();
    if (!palL && v[0] !== ':') hitList(v); /* lista wszystkich trafień (2.5) */
    return;
  }
  if (find && findBar && !palMoved && (k === 'Enter' || k === 'F3' || (ctrl && lk === 'g'))) {
    ev.preventDefault();
    if (v === findQ) jump(d);
    else {
      findQ = v;
      search(v, d);
    }
    return palSet(palItems.findIndex(it => it.id === 'n' + sel));
  }
  if (k !== 'Enter') return;
  ev.preventDefault();
  if (find && !palMoved) {
    /* „/”: Enter – pierwsze trafienie, Shift+Enter – ostatnie; pole się zamyka */
    closePal();
    return search(v, d);
  }
  if (palHi >= 0) return palRun(palHi);
  if (palL || v[0] !== ':') return; /* nic nie pasuje – pole zostaje */
  closePal();
  exec(v.slice(1).trim()); /* nieznana komenda – komunikat jak dawniej */
});
/* klik w pozycję nie zabiera fokusu polu (klawiatura ekranowa zostaje) */
['pointerdown', 'mousedown'].forEach(t =>
  $('srL').addEventListener(t, e => {
    if (asEl(e.target)?.closest('.pi')) e.preventDefault();
  })
);
$('srL').addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const xy = e.clientX + ',' + e.clientY;
  if (xy === palXY) return;
  palXY = xy;
  const r = asEl(e.target)?.closest('.pi');
  if (r instanceof HTMLElement && !r.classList.contains('off')) palSet(Number(r.dataset.i), false);
});
$('srL').addEventListener('click', e => {
  const r = asEl(e.target)?.closest('.pi');
  if (r instanceof HTMLElement) palRun(Number(r.dataset.i));
});
