/* Pliki (otwórz/zapisz/autozapis), widok tekstowy Markdown, motyw. */
/* ---- pliki i autozapis ---- */
async function autosave() {
  if (dnd) {
    clearTimeout(timer);
    timer = setTimeout(autosave, 500);
    return;
  }
  try {
    localStorage.setItem('mm.md', serialize(root));
  } catch (e) {}
  if (fh) {
    try {
      const w = await fh.createWritable();
      await w.write(serialize(root));
      await w.close();
      lastMod = (await fh.getFile()).lastModified;
    } catch (e) {
      $('save').textContent = '⚠ błąd zapisu pliku';
      return;
    }
  }
  dirty = false;
  $('save').textContent = fh ? '✓ zapisano w pliku' : '✓ zapisano lokalnie';
}
async function save() {
  if (editing) endEdit();
  if (tv) {
    root = parse($('txt').value);
    syncLayout();
  }
  if (window.showSaveFilePicker && !fh) {
    try {
      fh = await showSaveFilePicker({ suggestedName: 'mapa.md', types: [{ accept: { 'text/markdown': ['.md'] } }] });
      return autosave();
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  if (fh) return autosave();
  dl(new Blob([serialize(root)], { type: 'text/markdown' }), 'mapa.md');
  $('save').textContent = '✓ pobrano mapa.md';
}
function load(txt) {
  if (editing) endEdit();
  snap();
  root = parse(txt);
  syncLayout();
  syncSide();
  sel = first().id;
  ty = 0;
  changed();
}
async function openFile() {
  if (window.showOpenFilePicker) {
    try {
      [fh] = await showOpenFilePicker({ types: [{ accept: { 'text/markdown': ['.md', '.txt'] } }] });
      const f = await fh.getFile();
      lastMod = f.lastModified;
      load(await f.text());
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      fh = null;
    }
  }
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = '.md,.txt';
  i.onchange = async () => {
    if (i.files[0]) load(await i.files[0].text());
  };
  i.click();
}
/* ---- widok tekstowy ---- */
function toggleText() {
  if (editing) endEdit();
  closeMenu();
  tv = !tv;
  const t = $('txt');
  if (tv) {
    t.value = serialize(root);
    t.style.display = 'block';
    t.focus();
    setMode('TEKST');
    hint('Esc – wróć do mapy');
  } else {
    t.style.display = 'none';
    setMode('NORMAL');
    hint('');
    load(t.value);
  }
  syncText();
}
function syncText() {
  const b = $('bt');
  b.innerHTML = icon(tv ? 'map' : 'text');
  b.dataset.tip = tv ? 'Wróć do mapy (Esc)' : 'Edytuj jako tekst Markdown (:text)';
  b.setAttribute('aria-label', b.dataset.tip);
  b.classList.toggle('on', tv);
  ['bu', 'br', 'bl', 'bf'].forEach(i => ($(i).disabled = tv));
}
$('txt').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    toggleText();
  }
});
/* ---- motyw ---- */
function toggleTheme(v) {
  const d = document.documentElement,
    now = d.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  d.dataset.theme = v === 'dark' || v === 'light' ? v : now === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('mm.theme', d.dataset.theme);
  } catch (e) {}
}
