/* Operacje na węzłach: usuń/wytnij/kopiuj/wklej, przesuwanie, zwijanie, nawigacja. */
/* ---- operacje ---- */
/* usuń – bez kopiowania; wytnij – kopiuje i usuwa */
/** @param {boolean} [cut] także skopiuj (wytnij) */
function del(cut) {
  const f = need();
  const p = f && f.p;
  if (!f || !p) return;
  if (p === root && root.children.length < 2) return info('nie można usunąć jedynego korzenia');
  snap();
  if (cut) clipPut((yank = clone(f.n)));
  const i = p.children.indexOf(f.n);
  p.children.splice(i, 1);
  sel = (p.children[i] || p.children[i - 1] || p).id;
  info(cut ? 'wycięto (Ctrl+V – wklej)' : 'usunięto (Ctrl+Z – cofnij)');
  changed();
}
function cut() {
  del(true);
}
/** duplikuj gałąź: kopia zaraz za oryginałem i zaznaczona (kopia korzenia = nowa mapa) */
function duplicate() {
  const f = need();
  if (!f || !f.p) return;
  snap();
  const c = clone(f.n);
  f.p.children.splice(f.p.children.indexOf(f.n) + 1, 0, c);
  sel = c.id;
  info('zduplikowano gałąź (Ctrl+Z – cofnij)');
  changed();
}
function copy() {
  const f = need();
  if (!f) return;
  clipPut((yank = clone(f.n)));
  info('skopiowano gałąź');
}
/** gałąź także do schowka systemowego (lista Markdown); gdy się nie da (brak zgody, http, WebView) – po cichu
 * @param {MapNode} n */
function clipPut(n) {
  const t = (clipLast = branchMd(n));
  /* najpierw zdarzenie „kopiuj” (działa też na http i w WebView, bez pytania o zgodę), potem Clipboard API */
  /** @param {ClipboardEvent} e */
  const h = e => {
    e.clipboardData?.setData('text/plain', t);
    e.preventDefault();
  };
  document.addEventListener('copy', h);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {}
  document.removeEventListener('copy', h);
  if (!ok)
    try {
      navigator.clipboard.writeText(t).catch(() => {});
    } catch (e) {}
}
/* bez zaznaczenia wklejana gałąź staje się bratem korzeni (nowym korzeniem) */
/** wklej gałąź z wewnętrznego schowka (vim p / P, menu) @param {boolean} asChild jako dziecko zaznaczonego (inaczej jako brat) */
function paste(asChild) {
  if (!yank) return info('schowek pusty');
  insert([clone(yank)], asChild);
}
/** Ctrl+V: tekst ze schowka systemowego; własny (skopiowany w aplikacji) albo pusty – gałąź z wewnętrznego schowka.
 * Wersja HTML (wyrenderowana notatka, strona WWW) ma strukturę, której zwykły tekst nie ma – wtedy ona wygrywa.
 * @param {string} t zwykły tekst @param {boolean} asChild @param {string} [html] wersja HTML schowka */
function pasteText(t, asChild, html = '') {
  t = t.replace(/\r\n?/g, '\n');
  /** @type {MapNode[]} */
  let ns = [];
  if (t !== clipLast) {
    if (/<(li|h[1-6])\b/i.test(html)) ns = htmlNodes(html);
    if (!ns.length) ns = textNodes(t);
  }
  if (!ns.length) return paste(asChild);
  insert(ns, asChild);
}
/** „Wklej” z menu (jak Ctrl+V): tekst (i HTML) ze schowka systemowego; gdy przeglądarka nie daje dostępu (http,
 * Firefox na Androidzie, WebView) albo odmówi – na dotyku okienko z polem, w które wkleja się systemowym „Wklej”,
 * a myszą gałąź skopiowana w mapie (na komputerze tekst z innych aplikacji wkleja Ctrl+V)
 * @param {boolean} asChild @param {boolean} [dialog] okienko „wklej tutaj” przy braku dostępu (dotyk) */
async function pasteClip(asChild, dialog = true) {
  let t = '',
    html = '',
    ok = false;
  try {
    for (const it of await navigator.clipboard.read()) {
      if (it.types.includes('text/plain')) t = await (await it.getType('text/plain')).text();
      if (it.types.includes('text/html')) html = await (await it.getType('text/html')).text();
    }
    ok = true;
  } catch (e) {
    try {
      t = await navigator.clipboard.readText();
      ok = true;
    } catch (e) {}
  }
  if (ok) return pasteText(t, asChild, html);
  if (!dialog) return yank ? paste(asChild) : info('przeglądarka nie daje dostępu do schowka – wklej przez Ctrl+V');
  const c = await ask(
    'Przytrzymaj pole i wybierz „Wklej”.',
    ['Wstaw', ...(yank ? ['Wklej skopiowaną gałąź'] : []), 'Anuluj'],
    true
  );
  if (c === -2) pasteText(askPaste.t, asChild, askPaste.html);
  else if (c === 0 && $('askf').value.trim()) pasteText($('askf').value, asChild); /* tekst z klawiatury ekranowej */
  else if (c === 1 && yank) paste(asChild);
}
/** Węzły pod nagłówkami: stos nagłówków (`#` › `##` …) i miejsce na kolejne węzły. */
function heads() {
  /** @type {MapNode[]} */
  const top = [];
  /** @type {{ lvl: number, n: MapNode }[]} */
  const hs = [];
  return {
    top,
    /** dzieci ostatniego nagłówka (bez nagłówka – najwyższy poziom) */
    into: () => (hs.length ? hs[hs.length - 1].n.children : top),
    /** nagłówek poziomu `lvl`: trafia pod najbliższy wyższy nagłówek @param {number} lvl @param {string} text */
    head(lvl, text) {
      while (hs.length && hs[hs.length - 1].lvl >= lvl) hs.pop();
      const n = mk(text);
      this.into().push(n);
      hs.push({ lvl, n });
    },
  };
}
/** tekst z innej aplikacji → węzły: nagłówki `#` tworzą poziomy, lista z wcięciami – hierarchię; kolejne zwykłe linie
 * (bez pustej linii między nimi) to jeden węzeł z kilkoma liniami, a linia pod punktem listy – jego kolejna linia
 * @param {string} t @returns {MapNode[]} */
function textNodes(t) {
  const HD = /^\s{0,3}(#{1,6})\s+(.*)$/,
    LI = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/,
    ls = t.split('\n').map(l => l.replace(/\t/g, '  ')),
    body = ls.filter(l => l.trim() && !HD.test(l)),
    base = body.length ? Math.min(...body.map(l => l.length - l.trimStart().length)) : 0;
  const h = heads();
  /** @type {MapNode[]} ostatni węzeł na każdej głębokości (pod bieżącym nagłówkiem) */
  let st = [];
  /** @type {MapNode | null} węzeł, do którego dokleja się następna zwykła linia */
  let last = null;
  for (const l of ls) {
    if (!l.trim()) {
      last = null; /* pusta linia kończy akapit */
      continue;
    }
    const hd = HD.exec(l);
    if (hd) {
      h.head(hd[1].length, hd[2].replace(C_RE, '').trim());
      st = [];
      last = null;
      continue;
    }
    const m = LI.exec(l);
    if (!m && last) {
      last.text += '\n' + l.trim(); /* kolejna linia tego samego węzła */
      continue;
    }
    const ind = m ? m[1].length : l.length - l.trimStart().length,
      d = Math.min(Math.floor((ind - base) / 2), st.length),
      x = (m ? m[2] : l.trim()).trimEnd(),
      n = mk(x.replace(C_RE, ''));
    n.collapsed = C_RE.test(x);
    (d ? st[d - 1].children : h.into()).push(n);
    st.length = d;
    st.push(n);
    last = n;
  }
  return h.top;
}
/** HTML ze schowka → węzły: nagłówki, listy (zagnieżdżone), akapity; tylko tekst, nic się nie wykonuje ani nie wczytuje
 * @param {string} html @returns {MapNode[]} */
function htmlNodes(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html'),
    BR = '\u2028' /* <br> – nowa linia w węźle (zwykłe \n w źródle HTML to tylko spacja) */,
    BLOCK = /^(H[1-6]|UL|OL|LI|P|DIV|PRE|BLOCKQUOTE|TABLE|TR|SECTION|ARTICLE|HEADER|FOOTER|MAIN|DL|DT|DD|FIGURE|HR)$/;
  doc.querySelectorAll('br').forEach(b => b.replaceWith(BR));
  doc.querySelectorAll('script, style, template, noscript').forEach(e => e.remove());
  const h = heads();
  /** @param {string} s */
  const lines = s => {
    /* akapit to jeden węzeł; <br> w nim – kolejna linia węzła */
    const x = s
      .split(BR)
      .map(p => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
    if (x) h.into().push(mk(x));
  };
  /** tekst punktu listy bez list w nim zagnieżdżonych @param {Element} li */
  const own = li => {
    const c = /** @type {Element} */ (li.cloneNode(true));
    c.querySelectorAll('ul, ol').forEach(x => x.remove());
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  };
  /** @param {Element} l lista @param {MapNode[]} into */
  const list = (l, into) => {
    for (const li of Array.from(l.children)) {
      if (li.tagName !== 'LI') continue;
      const n = mk(own(li));
      for (const sub of Array.from(li.querySelectorAll('ul, ol')))
        if (sub.parentElement && sub.parentElement.closest('li') === li) list(sub, n.children);
      if (n.text) into.push(n);
      else into.push(...n.children); /* punkt bez tekstu – jego dzieci idą piętro wyżej */
    }
  };
  /** @param {Element} el */
  const walk = el => {
    let buf = '';
    for (const c of Array.from(el.childNodes)) {
      if (c instanceof Element && BLOCK.test(c.tagName)) {
        lines(buf);
        buf = '';
        const tag = c.tagName;
        if (/^H[1-6]$/.test(tag)) h.head(Number(tag[1]), (c.textContent || '').replace(/\s+/g, ' ').trim());
        else if (tag === 'UL' || tag === 'OL') list(c, h.into());
        else if (tag === 'TR')
          lines(
            Array.from(c.children, td => (td.textContent || '').trim())
              .filter(Boolean)
              .join(' | ')
          );
        else walk(c);
      } else if (c.nodeType === Node.TEXT_NODE || c instanceof Element) buf += c.textContent; /* tekst w linii */
    }
    lines(buf);
  };
  walk(doc.body);
  return h.top.filter(n => n.text);
}
/** wstaw węzły jako dzieci / braci zaznaczonego (bez zaznaczenia – nowe mapy); jeden krok cofania
 * @param {MapNode[]} ns @param {boolean} asChild */
function insert(ns, asChild) {
  snap();
  const f = S();
  /* nowe mapy (bez zaznaczenia albo bracia tytułu mapy): tytuł mapy ma jedną linię */
  if (!f || (!asChild && f.p === root)) ns.forEach(n => (n.text = n.text.replace(/\n/g, ' ')));
  if (!f) root.children.push(...ns);
  else if (asChild || !f.p) {
    f.n.children.push(...ns);
    f.n.collapsed = false;
  } else f.p.children.splice(f.p.children.indexOf(f.n) + 1, 0, ...ns);
  sel = ns[0].id;
  /** @type {(n: MapNode) => number} */
  const size = n => 1 + n.children.reduce((a, c) => a + size(c), 0),
    c = ns.reduce((a, n) => a + size(n), 0);
  info(`wklejono ${c} ${pl(c, 'węzeł', 'węzły', 'węzłów')}`);
  changed();
}
/** @param {number} d −1 w górę, 1 w dół */
function moveSib(d) {
  const f = need();
  if (!f || !f.p) return;
  const a = f.p.children,
    i = a.indexOf(f.n),
    j = i + d;
  if (j < 0 || j >= a.length) return;
  snap();
  [a[i], a[j]] = [a[j], a[i]];
  changed();
}
function indent() {
  const f = need();
  if (!f || !f.p) return;
  const a = f.p.children,
    i = a.indexOf(f.n);
  if (!i) return;
  snap();
  a.splice(i, 1);
  a[i - 1].children.push(f.n);
  a[i - 1].collapsed = false;
  changed();
}
function outdent() {
  const f = need();
  if (!f || !f.p) return;
  const g = find(f.p.id);
  if (!g || !g.p) return;
  snap();
  f.p.children.splice(f.p.children.indexOf(f.n), 1);
  g.p.children.splice(g.p.children.indexOf(f.p) + 1, 0, f.n);
  changed();
}
/** @param {boolean} [v] zwiń/rozwiń; bez argumentu – przełącz */
function fold(v) {
  const f = need();
  if (!f || !f.n.children.length) return;
  snap();
  f.n.collapsed = v === undefined ? !f.n.collapsed : v;
  changed();
}
/** @param {boolean} v true – zwiń wszystko poniżej korzeni */
function foldAll(v) {
  snap();
  (function w(n, d) {
    if (d >= (v ? 2 : 1) && n.children.length) n.collapsed = v;
    n.children.forEach(c => w(c, d + 1));
  })(root, 0); /* zwiń: wszystko poniżej korzeni; rozwiń: wszystko */
  if (v) selVisible();
  changed();
}
/** pokaż do poziomu `lv` (vim z1–z9; korzeń = poziom 0): węzły na poziomie ≥ lv zwinięte, płytsze rozwinięte @param {number} lv */
function foldTo(lv) {
  snap();
  (function w(n, d) {
    if (!n.top && n.children.length) n.collapsed = d >= lv;
    n.children.forEach(c => w(c, n.top ? 0 : d + 1));
  })(root, 0);
  selVisible();
  changed();
}
/* zaznaczenie schowane w zwiniętej gałęzi przechodzi na najwyższego zwiniętego przodka */
function selVisible() {
  let f = S();
  while (f && f.p) {
    if (f.p.collapsed) sel = f.p.id;
    f = find(f.p.id);
  }
}
/** zaznacz węzeł @param {number} id @param {boolean} [keepView] */
function go(id, keepView) {
  sel = id;
  render(keepView);
}
/** przejdź o `d·n` braci @param {number} d @param {number} n */
function sibIdx(d, n) {
  const f = S();
  if (!f) return go(first().id);
  if (!f.p) return;
  const pf = find(f.p.id);
  /* dzieci korzenia w układzie „obie” – tylko te po tej samej stronie */
  const a = f.p !== root && pf && pf.p === root ? f.p.children.filter(c => c.s === f.n.s) : f.p.children;
  let i = a.indexOf(f.n) + d * n;
  i = Math.max(0, Math.min(a.length - 1, i));
  go(a[i].id);
}
/** @param {MapNode} n @param {(c: MapNode) => boolean} [pred] */
function toChild(n, pred = () => true) {
  if (n.collapsed && n.children.length) {
    n.collapsed = false;
    lay();
  }
  const c = (n.collapsed ? [] : n.children).find(pred);
  if (c) go(c.id);
}
/* strzałki zgodne z tym, co widać na ekranie (zależnie od układu i strony) */
/** strzałki zgodne z tym, co widać (układ i strona) @param {string} key */
function arrow(key) {
  const f = S();
  if (!f) return go(first().id);
  const n = f.n;
  const p = f.p;
  if (!p) return;
  if (dir === 'down') {
    if (key === 'ArrowUp') {
      if (p !== root) go(p.id);
    } else if (key === 'ArrowDown') toChild(n);
    else sibIdx(key === 'ArrowRight' ? 1 : -1, 1);
    return;
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') return sibIdx(key === 'ArrowDown' ? 1 : -1, 1);
  const s = key === 'ArrowRight' ? 1 : -1;
  if (p === root) return toChild(n, c => c.s === s);
  if (n.s === s) toChild(n);
  else go(p.id);
}
