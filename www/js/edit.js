/* Edycja tekstu bezpośrednio w węźle (textarea nałożona na węzeł). */
/* ---- edycja bezpośrednio w węźle ---- */
function placeEd() {
  if (!edId) return;
  const f = find(edId);
  if (!f || f.n.x === undefined) return;
  const n = f.n,
    e = $('ed'),
    b = 2,
    q = pos.get(n.id) || n;
  Object.assign(e.style, {
    left: q.x * k + tx + 'px',
    top: (q.y - n.h / 2) * k + ty + 'px',
    width: n.w * k + 'px',
    height: n.h * k + 'px',
    fontSize: ST.fs * k + 'px',
    fontFamily: ff(),
    fontWeight: fw(),
    lineHeight: LH * k + 'px',
    borderRadius: ST.radius * k + 'px',
    padding: `${Math.max(0, ((n.h - n.lines.length * LH) / 2) * k - b)}px ${Math.max(0, PX * k - b - 2)}px ${Math.max(0, ((n.h - n.lines.length * LH) / 2) * k - b)}px ${Math.max(0, PX * k - b)}px`,
  });
  e.scrollTop = 0;
  e.scrollLeft = 0;
  const eb = $('edemo'),
    mw = $('main').clientWidth,
    bw = eb.offsetWidth || 30;
  eb.style.display = 'block';
  eb.style.left = Math.min(mw - bw - 4, (q.x + n.w) * k + tx + 6) + 'px';
  eb.style.top = q.y * k + ty - bw / 2 + 'px';
} /* 2 px zapasu po prawej; przeglądarka potrafi przewinąć pole do kursora przed powiększeniem */
/**
 * Edycja tekstu w węźle.
 * @param {number} id
 * @param {boolean} [isNew] nowy węzeł (pusty zostanie usunięty)
 * @param {number} [back] co zaznaczyć, jeśli nowy węzeł zniknie
 * @param {boolean} [blank] zacznij od pustego tekstu (vim `c`); pusty po zatwierdzeniu przywraca poprzedni
 */
function startEdit(id, isNew, back, blank) {
  if (!id) return;
  if (editing) {
    if (editing.id === id) return;
    endEdit();
  }
  closeMenu();
  const f = find(id);
  if (!f) return;
  sel = id;
  showSel();
  const pre = snapStr(),
    old = f.n.text;
  if (blank) f.n.text = '';
  edId = id;
  setMode('INSERT');
  render();
  const e = $('ed');
  e.value = f.n.text;
  edNl = (e.value.match(/\n/g) || []).length;
  e.style.display = 'block';
  e.focus({ preventScroll: true });
  e.setSelectionRange(e.value.length, e.value.length);
  editing = { id, isNew, pre, old, back };
  placeEd();
  hint('Enter / Esc / klik obok – zatwierdź · Tab – zatwierdź i dodaj dziecko · Ctrl+Enter – nowa linia');
}
/* zwraca true, jeśli węzeł został (pusty nowy węzeł jest usuwany) */
/** zatwierdź edycję; zwraca true, jeśli węzeł został @param {boolean} [keepFocus] @returns {boolean} */
function endEdit(keepFocus) {
  if (!editing) return false;
  const ed = editing,
    e = $('ed');
  editing = null;
  edId = 0;
  let kept = true;
  const f = find(ed.id);
  if (f) {
    /* każda linia osobno: spacje zwinięte, puste linie usunięte; tytuł mapy w jednej linii */
    const t = e.value
      .split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(f.p === root ? ' ' : '\n');
    if (!t) {
      if (ed.isNew && f.p) {
        f.p.children.splice(f.p.children.indexOf(f.n), 1);
        sel = ed.back || f.p.id;
        undoS.pop();
        kept = false;
      } else f.n.text = ed.old;
    } else {
      f.n.text = t;
      if (!ed.isNew && t !== ed.old) {
        undoS.push(ed.pre);
        redoS = [];
      }
    }
  }
  if (!keepFocus) e.blur();
  e.style.display = 'none';
  $('edemo').style.display = 'none';
  closeEmoji();
  setMode('NORMAL');
  hint('');
  changed();
  return kept;
}
const ed = $('ed');
/** liczba złamań linii wstawionych świadomie (Ctrl+Enter); nowe ponad nią to Enter z klawiatury ekranowej */
let edNl = 0;
ed.addEventListener('input', () => {
  if (!editing) return;
  const nl = (ed.value.match(/\n/g) || []).length;
  if (nl > edNl) {
    /* klawiatury ekranowe nie wysyłają keydown Enter, tylko wstawiają znak nowej linii – usuń go i zatwierdź */
    const i = ed.selectionStart - 1;
    ed.value =
      ed.value[i] === '\n' ? ed.value.slice(0, i) + ed.value.slice(i + 1) : ed.value.replace(/\n(?=[^\n]*$)/, '');
    return edKey('Enter');
  }
  edNl = nl;
  const f = find(editing.id);
  if (f) {
    f.n.text = ed.value;
    render();
  }
});
/** klawisze w polu edycji; true = obsłużony @param {string} key @param {boolean} [shift] */
function edKey(key, shift) {
  if (!editing) return false;
  const id = editing.id;
  if (key === 'Escape') {
    endEdit();
    return true;
  }
  if (key === 'Enter' && !shift) {
    endEdit();
    return true;
  } /* zatwierdź i zostaw węzeł zaznaczony; kolejny Enter doda brata */
  if (key === 'Tab' && !shift) {
    if (endEdit(true)) addChild(id);
    else ed.blur();
    return true;
  }
  if (key === 'Tab') {
    return true;
  } /* Shift+Tab: nie wychodź z pola */
  return false;
}
ed.addEventListener('keydown', ev => {
  if (!editing) return;
  ev.stopPropagation();
  if (emoOpen && ev.key === 'Escape') {
    ev.preventDefault();
    return closeEmoji();
  } /* Esc najpierw zamyka okienko emoji */
  if ((ev.ctrlKey || ev.metaKey) && ev.code === 'KeyS') {
    ev.preventDefault(); /* zapis mapy (zatwierdza edycję), nie okno „Zapisz stronę” przeglądarki */
    save();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
    /* Ctrl+Enter: nowa linia w tekście węzła (tytuł mapy ma jedną linię) */
    ev.preventDefault();
    const f = find(editing.id);
    if (!f || f.p === root) return;
    edNl++;
    ed.setRangeText('\n', ed.selectionStart, ed.selectionEnd, 'end');
    ed.dispatchEvent(new Event('input'));
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key === '.') {
    ev.preventDefault();
    const r = $('edemo').getBoundingClientRect();
    return openEmoji(r.left, r.bottom + 4);
  }
  if (edKey(ev.key, ev.shiftKey)) ev.preventDefault();
});
/* wklejanie w edycji: tylko tekst; nowe linie zostają liniami węzła (w tytule mapy – spacje); bez tego nowa linia
   zatwierdziłaby edycję jak Enter z klawiatury ekranowej */
ed.addEventListener('paste', e => {
  const t = e.clipboardData?.getData('text/plain');
  if (!editing || !t || !/[\r\n]/.test(t)) return;
  e.preventDefault();
  const f = find(editing.id),
    one = t
      .replace(/\r\n?/g, '\n')
      .replace(/^\s*\n|\n\s*$/g, '')
      .replace(/[ \t]*\n\s*/g, f && f.p === root ? ' ' : '\n');
  edNl += (one.match(/\n/g) || []).length;
  ed.setRangeText(one, ed.selectionStart, ed.selectionEnd, 'end');
  ed.dispatchEvent(new Event('input'));
});
ed.addEventListener('blur', () => {
  if (editing && document.hasFocus()) endEdit();
});
/** nowy brat (dla kontenera / korzenia bez rodzica – dziecko) @param {number} id @param {boolean | number} after */
function addSib(id, after) {
  const f = find(id);
  if (!f) return;
  const p = f.p;
  if (!p) return addChild(id);
  const back = sel;
  snap();
  const n = mk('');
  p.children.splice(p.children.indexOf(f.n) + (after ? 1 : 0), 0, n);
  startEdit(n.id, true, back);
}
/** @param {number} id */
function addChild(id) {
  const f = find(id),
    back = sel;
  if (!f) return;
  snap();
  const n = mk('');
  f.n.children.push(n);
  f.n.collapsed = false;
  startEdit(n.id, true, back);
}
