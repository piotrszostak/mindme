/* Widok .md (3.3 krok 5): pasek edycji linii – na komputerze na środku górnego paska, na telefonie na dole.
   Czynności działają na liniach z kursorem albo zaznaczeniem i idą przez execCommand('insertText'),
   więc Ctrl+Z w polu tekstowym je cofa (historia przeglądarki). Szukanie w tekście – małe pole pod paskiem. */

/** @type {MdAct[]} czynności paska – jedna tabela dla paska, pomocy i (krok 6) dolnego paska telefonu */
const MDA = [
  { id: 'del', ic: 'delline', t: 'Usuń całą linię', k: 'Ctrl+Shift+K', l: 'Usuń' },
  { id: 'up', ic: 'up', t: 'Przenieś linię w górę', k: 'Alt+↑', l: 'W górę' },
  { id: 'down', ic: 'down', t: 'Przenieś linię w dół', k: 'Alt+↓', l: 'W dół' },
  { id: 'indent', ic: 'indent', t: 'Wcięcie', k: 'Tab', l: 'Wcięcie', d: '2 spacje' },
  { id: 'outdent', ic: 'outdent', t: 'Wysunięcie', k: 'Shift+Tab', l: 'Wysuń' },
  { id: 'paste', ic: 'paste', t: 'Wklej', k: 'Ctrl+V', l: 'Wklej', sep: true, d: 'ze schowka systemowego' },
  {
    id: 'item',
    ic: 'newitem',
    t: 'Nowy punkt listy',
    k: 'Enter',
    l: 'Punkt',
    d: 'Enter na linii listy, przycisk – pod bieżącą linią',
  },
  { id: 'find', ic: 'search', t: 'Szukaj w tekście', k: 'Ctrl+F', l: 'Szukaj', sep: true },
];
/** przyciski czynności (pasek u góry albo – później – dolny pasek telefonu) */
const mdButtons = () =>
  MDA.map(
    a =>
      (a.sep ? '<span class="sep"></span>' : '') +
      `<button type="button" data-md="${a.id}" data-tip="${a.t} (${a.k})" ` +
      `aria-label="${a.t}">${icon(a.ic)}<span class="ml">${a.l}</span></button>`
  ).join('');

/** numer linii pozycji @param {string} v @param {number} p */
const lineAt = (v, p) => v.slice(0, p).split('\n').length - 1;
/**
 * linie z kursorem / zaznaczeniem: a..b; zaznaczenie kończące się na początku linii jej nie obejmuje
 * @param {string} v @param {number} s @param {number} e
 */
function mdLines(v, s, e) {
  const L = v.split('\n'),
    /** @type {number[]} początki linii */
    st = [];
  L.reduce((o, l) => (st.push(o), o + l.length + 1), 0);
  const a = lineAt(v, s);
  let b = lineAt(v, e);
  if (b > a && v[e - 1] === '\n') b--;
  return { L, st, a, b, end: (/** @type {number} */ i) => st[i] + L[i].length };
}
/** znak listy na początku linii: [całość, wcięcie, znak] @param {string} l */
const listMark = l => l.match(/^(\s*)([-*+]) /);

/**
 * zmiana tekstu przez czynność: zastąp [from, to) tekstem `text`, potem zaznacz [s, e) (pozycje w nowym tekście);
 * null – czynność nic nie zmienia (pierwsza linia w górę, brak wcięcia…)
 * @param {string} id @param {string} v @param {number} s @param {number} e @returns {MdEdit | null}
 */
function mdEdit(id, v, s, e) {
  const { L, st, a, b, end } = mdLines(v, s, e),
    blk = L.slice(a, b + 1).join('\n');
  if (id === 'del') {
    if (!v) return null;
    if (b < L.length - 1) return { from: st[a], to: st[b + 1], text: '', s: st[a], e: st[a] };
    if (a > 0) return { from: st[a] - 1, to: v.length, text: '', s: st[a - 1], e: st[a - 1] };
    return { from: 0, to: v.length, text: '', s: 0, e: 0 };
  }
  if (id === 'up') {
    if (a === 0) return null;
    const d = L[a - 1].length + 1;
    return { from: st[a - 1], to: end(b), text: blk + '\n' + L[a - 1], s: s - d, e: e - d };
  }
  if (id === 'down') {
    if (b === L.length - 1) return null;
    const d = L[b + 1].length + 1;
    return { from: st[a], to: end(b + 1), text: L[b + 1] + '\n' + blk, s: s + d, e: e + d };
  }
  if (id === 'indent' || id === 'outdent') {
    /** zmiana długości początku każdej linii a..b (dodane +2 / usunięte −n spacji) */
    const dl = L.slice(a, b + 1).map(l =>
      id === 'indent' ? (a === b || l.trim() ? 2 : 0) : -(l.match(/^(\t| {1,2})/)?.[0].length || 0)
    );
    if (dl.every(x => !x)) return null;
    /** pozycja po zmianie @param {number} p @param {boolean} keep zaznaczenie od początku linii zostaje na nim */
    const map = (p, keep) => {
      let o = p;
      for (let i = a; i <= b; i++) {
        const x = dl[i - a];
        if (p < st[i] || (p === st[i] && keep && x > 0)) break;
        o += x < 0 ? -Math.min(-x, p - st[i]) : x;
      }
      return o;
    };
    const text = L.slice(a, b + 1)
      .map((l, i) => (dl[i] > 0 ? '  ' + l : l.slice(-dl[i])))
      .join('\n');
    return { from: st[a], to: end(b), text, s: map(s, s < e), e: map(e, false) };
  }
  if (id === 'item') {
    const m = listMark(L[b]),
      ins = '\n' + (m ? m[1] + m[2] : '-') + ' ',
      p = end(b) + ins.length;
    return { from: end(b), to: end(b), text: ins, s: p, e: p };
  }
  if (id === 'enter') {
    /* Enter na linii listy (kursor za znakiem listy): nowy punkt; na pustym punkcie – koniec listy */
    const m = listMark(L[a]);
    if (!m || a !== b || s - st[a] < m[0].length) return null;
    if (L[a] === m[0] && s === e && s === end(a)) return { from: st[a], to: end(a), text: '', s: st[a], e: st[a] };
    const ins = '\n' + m[1] + m[2] + ' ';
    return { from: s, to: e, text: ins, s: s + ins.length, e: s + ins.length };
  }
  return null;
}

/** wykonaj zmianę w polu tak, by trafiła do historii cofania przeglądarki @param {MdEdit} p */
function mdApply(p) {
  const t = $('txt'),
    want = t.value.slice(0, p.from) + p.text + t.value.slice(p.to);
  t.focus();
  t.setSelectionRange(p.from, p.to);
  if (p.from !== p.to || p.text) {
    const ok = p.text ? document.execCommand('insertText', false, p.text) : document.execCommand('delete');
    if (!ok || t.value !== want) {
      /* przeglądarka bez execCommand w polu: zmiana bez kroku cofania */
      t.value = want;
      t.dispatchEvent(new Event('input'));
    }
  }
  t.setSelectionRange(p.s, p.e);
}
/** czynność paska na liniach z kursorem / zaznaczeniem @param {string} id */
async function mdDo(id) {
  const t = $('txt');
  if (!tv) return;
  if (id === 'find') return mdFindOpen();
  if (id === 'paste') {
    let c;
    try {
      c = await navigator.clipboard.readText();
    } catch (e) {
      return info(
        'przeglądarka nie daje dostępu do schowka – ' +
          (matchMedia('(hover: none)').matches ? 'przytrzymaj tekst i wybierz „Wklej”' : 'wklej przez Ctrl+V')
      );
    }
    if (!c) return info('schowek jest pusty');
    const p = t.selectionStart + c.length;
    return mdApply({ from: t.selectionStart, to: t.selectionEnd, text: c, s: p, e: p });
  }
  const p = mdEdit(id, t.value, t.selectionStart, t.selectionEnd);
  if (p) mdApply(p);
  else t.focus();
}
$('txt').addEventListener('keydown', e => {
  if (e.isComposing || e.defaultPrevented) return;
  const c = e.ctrlKey || e.metaKey,
    k = e.key;
  let id = '';
  if (e.altKey && !c && !e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) id = k === 'ArrowUp' ? 'up' : 'down';
  else if (k === 'Tab' && !c && !e.altKey) id = e.shiftKey ? 'outdent' : 'indent';
  else if (c && e.shiftKey && !e.altKey && e.code === 'KeyK') id = 'del';
  else if (c && !e.shiftKey && !e.altKey && e.code === 'KeyF') id = 'find';
  else if (k === 'Enter' && !c && !e.shiftKey && !e.altKey) {
    const t = $('txt'),
      p = mdEdit('enter', t.value, t.selectionStart, t.selectionEnd);
    if (!p) return; /* zwykła nowa linia */
    e.preventDefault();
    return mdApply(p);
  }
  if (!id) return;
  e.preventDefault();
  mdDo(id);
});

/* ---- szukanie w tekście ---- */
/** @type {[number, number][]} trafienia [od, do) w tekście */
let mdHits = [];
let mdHi = -1;
/** pozycja kursora przy otwarciu pola – od niej szuka się pierwszego trafienia */
let mdFrom = 0;
/**
 * wystąpienia zapytania bez polskich znaków i wielkości liter (jak szukanie na mapie)
 * @param {string} q @param {string} v @returns {[number, number][]}
 */
function textHits(q, v) {
  const w = plain(q);
  if (!w) return [];
  let s = '',
    off = 0;
  /** @type {number[]} pozycja w `v` (UTF-16) każdego znaku `s` */
  const at = [];
  for (const ch of v) {
    let p = plainC.get(ch);
    if (p === undefined) plainC.set(ch, (p = plain(ch)));
    s += p;
    for (let k = 0; k < p.length; k++) at.push(off);
    off += ch.length;
  }
  at.push(off);
  /** @type {[number, number][]} */
  const r = [];
  for (let j = s.indexOf(w); j >= 0; j = s.indexOf(w, j + w.length)) r.push([at[j], at[j + w.length]]);
  return r;
}
function mdFindOpen() {
  const t = $('txt'),
    q = $('mdQ'),
    sel = t.value.slice(t.selectionStart, t.selectionEnd);
  mdFrom = t.selectionStart;
  if (sel && !sel.includes('\n')) q.value = sel;
  $('mdFind').hidden = false;
  document.body.classList.add('md-find');
  q.focus();
  q.select();
  if (q.value) mdSearch(0);
}
/** @param {boolean} [back] fokus z powrotem w tekście */
function mdFindClose(back = true) {
  if ($('mdFind').hidden) return;
  if (document.activeElement === $('mdQ')) $('mdQ').blur();
  $('mdFind').hidden = true;
  document.body.classList.remove('md-find');
  mdMark(null);
  if (back && tv) $('txt').focus();
}
/** pokaż trafienie: 0 – pierwsze od kursora (wpisywanie), 1 – następne, −1 – poprzednie @param {number} d */
function mdSearch(d) {
  const t = $('txt'),
    q = $('mdQ'),
    n = $('mdQn');
  mdHits = textHits(q.value, t.value);
  if (!q.value || !mdHits.length) {
    mdMark(null);
    return (n.textContent = q.value ? '0 trafień' : '');
  }
  if (d === 0 || mdHi < 0)
    mdHi = Math.max(
      0,
      mdHits.findIndex(h => h[0] >= mdFrom)
    );
  else mdHi = (mdHi + d + mdHits.length) % mdHits.length;
  const [a, b] = mdHits[mdHi];
  n.textContent = `${mdHi + 1} z ${mdHits.length}`;
  /* zaznaczenie w tekście; chwilowy fokus przewija pole do trafienia */
  t.focus({ preventScroll: true });
  t.setSelectionRange(a, b);
  q.focus({ preventScroll: true });
  mdMark([a, b]);
}
/**
 * wyróżnienie trafienia pod tekstem – zaznaczenia w polu bez fokusu przeglądarka nie pokazuje (fokus jest w polu
 * szukania); warstwa `#mdHl` ma ten sam krój, odstępy i zawijanie co `#txt`, a tekst – przezroczysty
 * @param {[number, number] | null} h
 */
function mdMark(h) {
  const d = $('mdHl'),
    t = $('txt');
  document.body.classList.toggle('md-hl', !!h);
  if (!h) return void (d.textContent = '');
  const v = t.value,
    esc = (/** @type {string} */ x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  d.style.padding = getComputedStyle(t).padding;
  d.style.paddingRight = parseFloat(getComputedStyle(t).paddingRight) + t.offsetWidth - t.clientWidth + 'px';
  d.innerHTML = `${esc(v.slice(0, h[0]))}<mark>${esc(v.slice(h[0], h[1]))}</mark>${esc(v.slice(h[1]))}\n`;
  d.scrollTop = t.scrollTop;
}

/* ---- budowa paska i pola szukania ---- */
$('mdBar').innerHTML = mdButtons();
$('mdQx').innerHTML = icon('close');
/* przycisk nie zabiera fokusu z tekstu (na telefonie klawiatura zostaje) */
$('mdBar').addEventListener('mousedown', e => e.preventDefault());
$('mdBar').addEventListener('click', e => {
  const b = asEl(e.target)?.closest('[data-md]');
  if (b instanceof HTMLElement && b.dataset.md) mdDo(b.dataset.md);
});
$('mdQ').addEventListener('input', () => mdSearch(0));
$('mdQ').addEventListener('keydown', e => {
  e.stopPropagation();
  const c = e.ctrlKey || e.metaKey;
  if (c && e.code === 'KeyS') {
    e.preventDefault(); /* zapis mapy, nie okno „Zapisz stronę” */
    save();
  } else if (c && e.code === 'KeyF') {
    e.preventDefault();
    $('mdQ').select();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    mdSearch(e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    mdFindClose();
  }
});
$('mdQx').addEventListener('click', () => mdFindClose());
/* tekst się zmienił – wyróżnienie nieaktualne; przewijanie – warstwa jedzie z tekstem */
$('txt').addEventListener('input', () => mdMark(null));
$('txt').addEventListener('scroll', () => ($('mdHl').scrollTop = $('txt').scrollTop));
/** pasek między wyspami górnego paska (na telefonie CSS kładzie go na dole) */
function mdPlace() {
  const l = $('tl').getBoundingClientRect().right,
    r = $('tr').getBoundingClientRect().left,
    s = document.documentElement.style;
  s.setProperty('--mdL', l + 8 + 'px');
  s.setProperty('--mdR', innerWidth - r + 8 + 'px');
  /* mieści się – bez przewijania, żeby objaśnienia pod przyciskami nie były ucinane */
  const b = $('mdBar');
  b.classList.remove('fits');
  b.classList.toggle('fits', b.scrollWidth <= b.clientWidth);
}
/** wejście w widok .md i wyjście z niego (z `syncText`) */
function mdView() {
  document.body.classList.toggle('v-md', tv);
  /* pole szukania z kroku 3 (palette.js) – w widoku .md jego miejsce zajmuje ten pasek */
  srAvail(!tv);
  if (tv) mdPlace();
  else mdFindClose(false);
}
window.addEventListener('resize', () => {
  if (!tv) return;
  mdPlace();
  if (document.body.classList.contains('md-hl') && mdHits[mdHi]) mdMark(mdHits[mdHi]);
});
