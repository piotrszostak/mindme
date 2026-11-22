/* Klawiatura (tryb Normal: skrót zwykły + vim), wiersz poleceń „:” i wyszukiwanie „/”. */
/* ---- tryb Normal (klawiatura) ---- */
/* Skróty: dla każdej czynności jeden standardowy (Ctrl/klawisz specjalny) i jeden vim – bez duplikatów. */
function normal(ev) {
  if (dnd) return;
  const c = ev.key,
    ctrl = ev.ctrlKey || ev.metaKey,
    sh = ev.shiftKey;
  if (ctrl) {
    const k = c.length === 1 ? c.toLowerCase() : c;
    const m = {
      z: sh ? null : undo,
      y: redo,
      r: redo,
      s: save,
      o: openFile,
      c: copy,
      x: cut,
      v: () => paste(!sh),
      f: () => openCmd('/'),
      '.': () => {
        const [x, y] = nodeScreen();
        openEmoji(x, y);
      },
    }[k];
    if (m) {
      ev.preventDefault();
      m();
    }
    return;
  }
  if (ev.altKey) {
    const m = { ArrowLeft: outdent, ArrowRight: indent, ArrowDown: () => moveSib(1), ArrowUp: () => moveSib(-1) }[c];
    if (m) {
      ev.preventDefault();
      m();
    }
    return;
  }
  if (c === 'ContextMenu' || (c === 'F10' && sh)) {
    ev.preventDefault();
    const [x, y] = nodeScreen();
    return ctxMenu(x, y);
  }
  /* każdy zwykły znak w trybie mapy należy do aplikacji – inaczej Firefox („szukaj podczas pisania”, „/”) przejmie klawiaturę */
  if (c.length === 1) ev.preventDefault();
  if (/^[0-9]$/.test(c) && (c !== '0' || cnt)) {
    cnt = cnt * 10 + +c;
    info(cnt + '');
    return;
  }
  const n = cnt || 1,
    f = S();
  if (pend) {
    const p = pend + c;
    pend = '';
    cnt = 0;
    if (p === 'gg') go(first().id);
    else if (p === 'dd') cut();
    else if (p === 'yy') copy();
    else if (p === 'za') fold();
    else if (p === 'zR') foldAll(false);
    else if (p === 'zM') foldAll(true);
    return;
  }
  if ('gdyz'.includes(c) && c.length === 1) {
    pend = c;
    return;
  }
  cnt = 0;
  switch (c) {
    case 'j':
      sibIdx(1, n);
      break;
    case 'k':
      sibIdx(-1, n);
      break;
    case 'h':
      if (!f) {
        go(first().id);
        break;
      }
      for (let i = 0; i < n; i++) {
        const q = S();
        if (q.p !== root) sel = q.p.id;
      }
      render();
      break;
    case 'l':
      if (!f) {
        go(first().id);
        break;
      }
      for (let i = 0; i < n; i++) toChild(S().n);
      render();
      break;
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      arrow(c);
      break;
    case 'Home':
    case 'End':
    case 'G': {
      const v = vis();
      go(c === 'Home' ? first().id : v[v.length - 1].id);
      break;
    }
    case '0':
      if (f && f.p) go(f.p.children[0].id);
      break;
    case '$':
      if (f && f.p) go(f.p.children[f.p.children.length - 1].id);
      break;
    case 'Enter':
      addSib(sel, !sh);
      break;
    case 'o':
      addSib(sel, 1);
      break;
    case 'O':
      addSib(sel, 0);
      break;
    case 'Tab':
    case 'a':
      addChild(sel);
      break;
    case 'F2':
    case 'i':
      startEdit(sel);
      break;
    case 'Delete':
    case 'x':
      del();
      break;
    case 'p':
      paste(1);
      break;
    case 'P':
      paste(0);
      break;
    case ' ':
      fold();
      break;
    case 'J':
      for (let i = 0; i < n; i++) moveSib(1);
      break;
    case 'K':
      for (let i = 0; i < n; i++) moveSib(-1);
      break;
    case 'L':
      indent();
      break;
    case 'H':
      outdent();
      break;
    case 'u':
      for (let i = 0; i < n; i++) undo();
      break;
    case 'F3':
      jump(sh ? -1 : 1);
      break;
    case 'n':
      jump(1);
      break;
    case 'N':
      jump(-1);
      break;
    case '=':
      fitView();
      break;
    case ':':
      openCmd(':');
      break;
    case '/':
      openCmd('/');
      break;
    case '?':
    case 'F1':
      toggleHelp();
      break;
    case 'Escape':
      if ($('help').classList.contains('open')) toggleHelp();
      else if ($('side').classList.contains('open')) toggleSide();
      else deselect();
      break;
    default:
      return;
  }
  ev.preventDefault();
}
/* ---- Command / wyszukiwanie ---- */
function openCmd(p) {
  setMode(p === ':' ? 'COMMAND' : 'SEARCH');
  const c = $('cmd');
  c.style.display = 'block';
  c.value = p;
  c.focus();
}
function closeCmd() {
  const c = $('cmd');
  c.blur();
  c.style.display = 'none';
  setMode('NORMAL');
} /* fokus nie może zostać w ukrytym polu (Chromium) */
$('cmd').addEventListener('keydown', ev => {
  ev.stopPropagation();
  if (ev.key === 'Escape') {
    closeCmd();
    return;
  }
  if (ev.key === 'Enter') {
    const v = $('cmd').value;
    closeCmd();
    v[0] === ':' ? exec(v.slice(1).trim()) : search(v.slice(1));
  }
});
function search(q) {
  q = q.toLowerCase();
  hits = q
    ? (function w(n, a = []) {
        if (n.text.toLowerCase().includes(q)) a.push(n.id);
        n.children.forEach(c => w(c, a));
        return a;
      })(root)
    : [];
  hi = -1;
  info(hits.length + ' trafień');
  jump(1);
}
function jump(d) {
  if (!hits.length) return;
  hi = (hi + d + hits.length) % hits.length;
  sel = hits[hi];
  showSel();
  go(sel);
}
function exec(c) {
  const [a, ...r] = c.split(/\s+/);
  if (a === 'w' || a === 'write') save();
  else if (a === 'e' || a === 'o') openFile();
  else if (a === 'new') {
    snap();
    root = forest([mk(r.join(' ') || 'Nowa mapa')]);
    sel = first().id;
    fh = null;
    changed();
  } else if (a === 'test') info(selfTest() ? 'round-trip OK' : 'round-trip BŁĄD');
  else if (a === 'layout' && LAY[r[0]]) setLayout(r[0]);
  else if (a === 'export') exportImg(r[0] || 'svg');
  else if (a === 'theme') toggleTheme(r[0]);
  else if (a === 'text') toggleText();
  else if (a === 'fit') fitView();
  else info('nieznana komenda: ' + a);
}
/* ---- zdarzenia: klawiatura ---- */
window.addEventListener('keydown', ev => {
  if (menuOpen) return menuKey(ev);
  if (emoOpen && ev.key === 'Escape') {
    ev.preventDefault();
    return closeEmoji();
  }
  if ($('side').classList.contains('open') && ev.target.closest && ev.target.closest('#side')) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      toggleSide();
    }
    return;
  }
  if (mode === 'NORMAL' && !tv) normal(ev);
});
