/* Paleta komend (Ctrl+K, „:”, menu „…”): czynności z ACT, filtrowanie, komendy „:”, ostatnio użyte (mm.cmd). */
/* ---- paleta komend ---- */
let palOpen = false;
/** @type {PalItem[]} pozycje na liście: pełna komenda „:”, dostępne, potem niedostępne */
let palItems = [];
/** podświetlona pozycja (−1 – brak) */
let palHi = -1;
/** ostatnia pozycja myszy nad listą – przewijanie pod nieruchomym kursorem nie zmienia podświetlenia */
let palXY = '';
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
  r.append(t, ...(it.off ? [palEl('span', 'why', it.off)] : it.keys.map(k => palEl('kbd', '', k))));
  return r;
}
function drawPal() {
  palItems = palList($('palq').value);
  palHi = palItems.findIndex(it => !it.off);
  const L = $('pall');
  L.replaceChildren(...(palItems.length ? palItems.map(palRow) : [palEl('div', 'none', 'Brak pasujących poleceń')]));
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
/** @param {string} [pre] początek tekstu: '' (Ctrl+K, menu „…”) albo ':' (komenda) */
function openPal(pre = '') {
  if (tv) return;
  if (editing) endEdit();
  closeMenu();
  closeEmoji();
  closeCmd();
  setMode('COMMAND');
  palOpen = true;
  const p = $('pal');
  p.style.top = $('top').getBoundingClientRect().bottom + 8 + 'px'; /* tuż pod górnym paskiem */
  p.classList.add('open');
  $('palq').value = pre;
  drawPal();
  $('palq').focus();
}
function closePal() {
  if (!palOpen) return;
  palOpen = false;
  $('palq').blur(); /* fokus nie może zostać w schowanym polu (Chromium) */
  $('pal').classList.remove('open');
  setMode('NORMAL');
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
    if (v[0] !== ':') return; /* nic nie pasuje – paleta zostaje */
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
