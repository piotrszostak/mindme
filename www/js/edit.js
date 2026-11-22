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
function startEdit(id, isNew, back, selectAll) {
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
  edId = id;
  setMode('INSERT');
  render();
  const e = $('ed');
  e.value = old;
  e.style.display = 'block';
  e.focus({ preventScroll: true });
  if (selectAll) e.select();
  else e.setSelectionRange(old.length, old.length);
  editing = { id, isNew, pre, old, back };
  placeEd();
  hint('Enter / Esc / klik obok – zatwierdź · Tab – zatwierdź i dodaj dziecko');
}
/* zwraca true, jeśli węzeł został (pusty nowy węzeł jest usuwany) */
function endEdit(keepFocus) {
  if (!editing) return false;
  const ed = editing,
    e = $('ed');
  editing = null;
  edId = 0;
  let kept = true;
  const f = find(ed.id);
  if (f) {
    const t = e.value.replace(/\s+/g, ' ').trim();
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
ed.addEventListener('input', () => {
  if (!editing) return;
  if (/\n/.test(ed.value)) {
    ed.value = ed.value.replace(/\n/g, '');
    return edKey('Enter');
  } // klawiatury ekranowe bez keydown Enter
  const f = find(editing.id);
  if (f) {
    f.n.text = ed.value;
    render();
  }
});
function edKey(key, shift) {
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
  if ((ev.ctrlKey || ev.metaKey) && ev.key === '.') {
    ev.preventDefault();
    const r = $('edemo').getBoundingClientRect();
    return openEmoji(r.left, r.bottom + 4);
  }
  if (edKey(ev.key, ev.shiftKey)) ev.preventDefault();
});
ed.addEventListener('blur', () => {
  if (editing && document.hasFocus()) endEdit();
});
function addSib(id, after) {
  const f = find(id);
  if (!f.p) {
    return addChild(id);
  }
  const back = sel;
  snap();
  const n = mk('');
  const i = f.p.children.indexOf(f.n);
  f.p.children.splice(i + (after ? 1 : 0), 0, n);
  startEdit(n.id, true, back);
}
function addChild(id) {
  const f = find(id),
    back = sel;
  snap();
  const n = mk('');
  f.n.children.push(n);
  f.n.collapsed = false;
  startEdit(n.id, true, back);
}
