/* Menu: podręczne (PPM / przytrzymanie / klawisz Menu), ☰, układ. */
/* ---- menu kontekstowe (PPM / długie przytrzymanie / klawisz Menu) ---- */
/** @param {MenuEntry[]} items @param {number} x @param {number} y @param {boolean} [touch] otwarte palcem */
function openMenu(items, x, y, touch) {
  closeMenu();
  const m = $('menu');
  m.innerHTML = '';
  /** @param {MenuItem} it */
  const btn = it => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mi';
    b.setAttribute('role', 'menuitem');
    if (it.id) b.dataset.act = it.id;
    if (it.tip) b.title = it.tip;
    b.disabled = !!it.off;
    if (it.on) b.classList.add('on');
    b.innerHTML = icon(it.ic) + `<span>${esc(it.t)}</span>` + (it.k ? `<kbd>${esc(it.k)}</kbd>` : '');
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
    if ('head' in it) {
      const h = document.createElement('div');
      h.className = 'mh';
      h.textContent = it.head;
      m.appendChild(h);
      continue;
    }
    m.appendChild(btn(it));
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
  if (!(first instanceof HTMLElement)) return;
  if (!touch) first.focus({ preventScroll: true });
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  $('menu').style.display = 'none';
}
/** klawiatura w otwartym menu @param {KeyboardEvent} ev */
function menuKey(ev) {
  const bs = [...$('menu').querySelectorAll('button:not(:disabled)')].filter(b => b instanceof HTMLElement),
    i = bs.findIndex(b => b === document.activeElement);
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
/** pozycja menu z tabeli czynności; `o` – zmiany zależne od stanu (np. etykieta) @param {string} id @param {Partial<MenuItem>} [o] @returns {MenuItem} */
function mi(id, o) {
  const a = actOf(id);
  return {
    ic: a.ic || '',
    t: a.t,
    k: actKey(a),
    tip: a.tip,
    f: a.f || (() => {}),
    off: !!(a.off && a.off()),
    id: a.id,
    ...o,
  };
}
/** jedno menu podręczne – zawsze dla zaznaczonego węzła @param {number} x @param {number} y @param {boolean} [touch] */
function ctxMenu(x, y, touch) {
  const f = S(),
    n = f && f.n,
    isRoot = !!f && f.p === root;
  openMenu(
    [
      { head: n ? 'Węzeł: ' + (n.text || '…') : 'Brak zaznaczenia – cała mapa' },
      mi('sib', { t: !n ? 'Nowy korzeń' : isRoot ? 'Dodaj brata (nowy korzeń)' : 'Dodaj brata' }),
      mi('child'),
      mi('emoji', { f: () => openEmoji(x, y) }),
      mi('fold', n && n.collapsed ? { ic: 'unfold', t: 'Rozwiń' } : { t: 'Zwiń' }),
      '-',
      mi('copy'),
      mi('dup'),
      mi('cut'),
      mi('paste', {
        t: n ? 'Wklej jako dziecko' : 'Wklej jako nowy korzeń',
        /* jak Ctrl+V: schowek systemowy (przeglądarka może zapytać o zgodę); bez dostępu na dotyku okienko z polem */
        tip: 'Tekst z innych aplikacji (lista → gałąź) albo gałąź skopiowana w mapie – jak Ctrl+V',
        f: () => pasteClip(true, !!touch) /* przy PPM `touch` bywa pominięte */,
        off: false,
      }),
      mi('moveto'),
      mi('del'),
      '-',
      mi('fit'),
      mi('unfoldall'),
      mi('foldall'),
    ],
    x,
    y,
    touch
  );
}
/** @param {number} x @param {number} y */
function moreMenu(x, y) {
  openMenu(
    [
      { head: 'Plik' },
      mi('open'),
      mi('save'),
      mi('new'),
      { head: 'Eksport' },
      mi('svg'),
      mi('png'),
      '-',
      mi('theme'),
      mi('help'),
      mi('pal'),
    ],
    x,
    y
  );
}
/** środek zaznaczonego węzła na ekranie (albo środek widoku) @returns {[number, number]} */
function nodeScreen() {
  const f = S(),
    r = $('sv').getBoundingClientRect();
  if (!f) return [r.left + r.width / 2, r.top + r.height / 3];
  const n = f.n;
  return [r.left + (n.x + n.w / 2) * k + tx, r.top + (n.y + n.h / 2) * k + ty];
}
/** @param {string} d right | left | both | down */
function setLayout(d) {
  if (!LAY[d] || d === dir) return;
  snap(); /* układ zapisuje się w pliku, więc jego zmianę da się cofnąć */
  dir = d;
  ty = 0;
  syncLayout();
  changed();
}
/** bieżący układ wciśnięty w panelu wyglądu */
function syncLayout() {
  for (const b of document.querySelectorAll('#side .lays button'))
    b.classList.toggle('on', b instanceof HTMLElement && b.dataset.act === 'lay-' + dir);
  const n = $('slay');
  if (n) n.textContent = LAY[dir][1];
}
