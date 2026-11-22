/* Menu: podręczne (PPM / przytrzymanie / Shift+F10), „…”, układ. */
/* ---- menu kontekstowe (PPM / długie przytrzymanie / klawisz Menu) ---- */
function openMenu(items, x, y, touch) {
  closeMenu();
  const m = $('menu');
  m.innerHTML = '';
  const btn = (it, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('role', 'menuitem');
    if (it.id) b.dataset.act = it.id;
    if (it.tip) b.title = it.tip;
    b.disabled = !!it.off;
    if (it.on) b.classList.add('on');
    if (cls === 'mi') b.innerHTML = icon(it.ic) + `<span>${esc(it.t)}</span>` + (it.k ? `<kbd>${esc(it.k)}</kbd>` : '');
    else {
      b.innerHTML = icon(it.ic) + `<small>${esc(it.s || it.t)}</small>`;
      b.dataset.tip = it.t + (it.k ? ' (' + it.k + ')' : '');
      b.setAttribute('aria-label', it.t);
    }
    b.onclick = () => {
      closeMenu();
      it.f();
    };
    return b;
  };
  for (const it of items) {
    if (it === '-') {
      m.appendChild(document.createElement('hr'));
      continue;
    }
    if (it.head) {
      const h = document.createElement('div');
      h.className = 'mh';
      h.textContent = it.head;
      m.appendChild(h);
      continue;
    }
    if (it.row) {
      const r = document.createElement('div');
      r.className = 'row';
      it.row.forEach(x => r.appendChild(btn(x, '')));
      m.appendChild(r);
      continue;
    }
    m.appendChild(btn(it, 'mi'));
  }
  m.style.display = 'block';
  m.style.left = m.style.top = '0px';
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
  m.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
  /* palec po długim przytrzymaniu nie może „kliknąć” pozycji pod sobą */
  if (touch) {
    m.style.pointerEvents = 'none';
    setTimeout(() => (m.style.pointerEvents = ''), 350);
  }
  menuOpen = true;
  const first = m.querySelector('button:not(:disabled)');
  if (first && !touch) first.focus({ preventScroll: true });
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  $('menu').style.display = 'none';
}
function menuKey(ev) {
  const bs = [...$('menu').querySelectorAll('button:not(:disabled)')],
    i = bs.indexOf(document.activeElement);
  if (ev.key === 'Escape') {
    ev.preventDefault();
    closeMenu();
  } else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(ev.key)) {
    ev.preventDefault();
    const d = /Down|Right/.test(ev.key) ? 1 : -1;
    bs[(i + d + bs.length) % bs.length].focus();
  } else if (ev.key === 'Tab') {
    ev.preventDefault();
    bs[(i + (ev.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
  }
}
function ctxMenu(x, y, touch) {
  const f = S(),
    n = f && f.n,
    isRoot = !!f && f.p === root,
    one = root.children.length < 2;
  openMenu(
    [
      { head: n ? 'Węzeł: ' + (n.text || '…') : 'Brak zaznaczenia – cała mapa' },
      {
        ic: 'sibdown',
        t: !n ? 'Nowy korzeń' : isRoot ? 'Dodaj brata (nowy korzeń)' : 'Dodaj brata',
        k: 'Enter',
        f: () => addSib(sel, 1),
        id: 'sib',
      },
      { ic: 'child', t: 'Dodaj dziecko', k: 'Tab', f: () => addChild(sel), off: !n, id: 'child' },
      {
        ic: 'emoji',
        t: 'Wstaw emoji',
        k: 'Ctrl+.',
        tip: 'Na końcu tekstu węzła',
        f: () => openEmoji(x, y),
        off: !n,
        id: 'emoji',
      },
      {
        ic: n && n.collapsed ? 'unfold' : 'fold',
        t: n && n.collapsed ? 'Rozwiń' : 'Zwiń',
        k: 'Spacja',
        f: () => fold(),
        off: !n || !n.children.length,
        id: 'fold',
      },
      '-',
      { ic: 'copy', t: 'Kopiuj gałąź', k: 'Ctrl+C', f: copy, off: !n, id: 'copy' },
      { ic: 'cut', t: 'Wytnij gałąź', k: 'Ctrl+X', f: cut, off: !n || (isRoot && one), id: 'cut' },
      {
        ic: 'paste',
        t: n ? 'Wklej jako dziecko' : 'Wklej jako nowy korzeń',
        k: 'Ctrl+V',
        f: () => paste(1),
        off: !yank,
        id: 'paste',
      },
      {
        ic: 'del',
        t: 'Usuń gałąź',
        k: 'Del',
        tip: 'Usuwa bez kopiowania (Ctrl+Z cofa)',
        f: () => del(),
        off: !n || (isRoot && one),
        id: 'del',
      },
      '-',
      { ic: 'fit', t: 'Dopasuj widok', k: '=', f: fitView, id: 'fit' },
      { ic: 'unfold', t: 'Rozwiń wszystko', k: 'zR', f: () => foldAll(false), id: 'unfoldall' },
      { ic: 'fold', t: 'Zwiń wszystko', k: 'zM', f: () => foldAll(true), id: 'foldall' },
    ],
    x,
    y,
    touch
  );
}
function moreMenu(x, y) {
  openMenu(
    [
      { ic: 'open', t: 'Otwórz plik…', k: 'Ctrl+O', f: openFile, id: 'open' },
      { ic: 'save', t: 'Zapisz', k: 'Ctrl+S', f: save, id: 'save' },
      { ic: 'newmap', t: 'Nowa mapa', k: ':new', f: () => exec('new'), id: 'new' },
      '-',
      { ic: 'image', t: 'Eksportuj SVG', k: ':export svg', f: () => exportImg('svg'), id: 'svg' },
      { ic: 'image', t: 'Eksportuj PNG', k: ':export png', f: () => exportImg('png'), id: 'png' },
      '-',
      { ic: 'theme', t: 'Motyw jasny / ciemny', k: ':theme', f: () => toggleTheme(), id: 'theme' },
      { ic: 'help', t: 'Pomoc i skróty', k: '?', f: toggleHelp, id: 'help' },
    ],
    x,
    y
  );
}
function nodeScreen() {
  const f = S(),
    r = $('sv').getBoundingClientRect();
  if (!f) return [r.left + r.width / 2, r.top + r.height / 3];
  const n = f.n;
  return [r.left + (n.x + n.w / 2) * k + tx, r.top + (n.y + n.h / 2) * k + ty];
}
function setLayout(d) {
  if (!LAY[d]) return;
  dir = d;
  ty = 0;
  syncLayout();
  changed();
}
function syncLayout() {
  const b = $('bl');
  b.innerHTML = icon(LAY[dir][0]);
  b.dataset.tip = 'Układ mapy: ' + LAY[dir][1];
  b.setAttribute('aria-label', b.dataset.tip);
}
