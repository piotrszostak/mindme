/* Pliki (otwórz/zapisz/autozapis), widok tekstowy Markdown, tryb jasny / ciemny. */
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
  const toFile = fh && !fhSkip; /* plik z liniami spoza mapy czeka na „Nadpisz” (zob. save) */
  if (fh && toFile) {
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
  if (!fh || toFile) dirty = false;
  $('save').textContent = toFile ? '✓ zapisano w pliku' : '✓ zapisano lokalnie';
}
async function save() {
  if (editing) endEdit();
  if (tv) {
    root = parse($('txt').value);
    syncLayout();
  }
  if (fh && fhSkip) {
    const c = await ask(
      `Ten plik ma treść, której mapa nie pokazuje (${fhSkip} ${lin(fhSkip, 'linia')}). Zapis ją usunie.`,
      ['Zapisz jako nowy plik', 'Nadpisz', 'Anuluj']
    );
    if (c === 1) {
      fhSkip = 0;
      return autosave();
    }
    if (c === 0) return saveNew();
    return;
  }
  return fh ? autosave() : saveNew();
}
/** zapis do nowego pliku: okno zapisu (Chrome/Edge), a bez niego pobranie `mapa.md` */
async function saveNew() {
  if (window.showSaveFilePicker) {
    try {
      fh = await window.showSaveFilePicker({
        suggestedName: 'mapa.md',
        types: [{ accept: { 'text/markdown': ['.md'] } }],
      });
      fhSkip = 0;
      return autosave();
    } catch (e) {
      if (isAbort(e)) return;
    }
  }
  dl(new Blob([serialize(root)], { type: 'text/markdown' }), 'mapa.md');
  $('save').textContent = '✓ pobrano mapa.md';
}
/** forma słowa „linia” po liczbie @param {number} n @param {'linia' | 'linię'} one forma dla 1 */
const lin = (n, one) => pl(n, one, 'linie', 'linii');
/** komunikat po otwarciu pliku z liniami spoza mapy @param {number} n */
const skipInfo = n => `Pominięto ${n} ${lin(n, 'linię')} spoza mapy – plik na dysku bez zmian`;
/**
 * Okienko z pytaniem; pierwszy przycisk jest domyślny (Enter), Esc = −1.
 * Z polem (`field`): wklejenie w pole kończy pytanie wynikiem −2, a tekst i HTML są w `askPaste`.
 * @param {string} text @param {string[]} labels @param {boolean} [field] pole tekstowe nad przyciskami
 * @returns {Promise<number>} numer wybranego przycisku
 */
function ask(text, labels, field = false) {
  const d = $('ask');
  askEnd(-1); /* poprzednie pytanie (jeśli jeszcze otwarte) kończy się jak „Anuluj” */
  askKey = false;
  d.classList.toggle('field', field);
  $('askf').value = '';
  $('askt').textContent = text;
  $('askb').replaceChildren(
    ...labels.map((l, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = l;
      b.onclick = e => {
        if (e.detail || askKey) askEnd(i); /* Enter, który otworzył okienko (np. z palety „:w”), nie wybiera */
      };
      return b;
    })
  );
  d.showModal();
  /** @type {HTMLElement} */ ($('askb').firstChild).focus();
  return new Promise(res => (askRes = res));
}
/* Wynik oddajemy od razu przy wyborze, nie w zdarzeniu `close`: przychodzi z opóźnieniem i trafiłoby
   w pytanie otwarte zaraz po nim; `returnValue` też nie – Esc w Chromium zamyka z pustym (Number('') = 0). */
/** @type {((i: number) => void) | null} */
let askRes = null;
/** klawisz naciśnięty w otwartym okienku – dopiero wtedy przycisk wybrany klawiaturą działa */
let askKey = false;
/** tekst i HTML wklejone w pole okienka (wynik −2) */
let askPaste = { t: '', html: '' };
$('askf').addEventListener('paste', e => {
  const cd = e.clipboardData;
  if (!cd) return;
  e.preventDefault();
  askPaste = { t: cd.getData('text/plain'), html: cd.getData('text/html') };
  askEnd(-2);
});
/** @param {number} i numer przycisku, −1 = Anuluj */
function askEnd(i) {
  const d = $('ask'),
    res = askRes;
  askRes = null;
  if (d.open) {
    if (asEl(document.activeElement)?.closest('#ask')) /** @type {HTMLElement} */ (document.activeElement).blur();
    d.close();
  }
  if (res) res(i);
}
$('ask').addEventListener('keydown', e => {
  askKey = true;
  e.stopPropagation(); /* klawisze okienka nie sterują mapą */
  if (e.key === 'Escape') {
    e.preventDefault();
    askEnd(-1);
  }
});
$('ask').addEventListener('cancel', e => {
  e.preventDefault(); /* inne prośby o zamknięcie (np. „wstecz” na Androidzie) – jak Anuluj */
  askEnd(-1);
});
/** wczytaj mapę z Markdownu (cofalne) @param {string} txt @returns {number} linie, których mapa nie pokazuje */
function load(txt) {
  if (editing) endEdit();
  snap();
  root = parse(txt);
  const n = root.skip || 0;
  delete root.skip;
  syncLayout();
  syncSide();
  sel = first().id;
  ty = 0;
  changed();
  return n;
}
/** nowa mapa z jednym korzeniem (cofalne) @param {string} t tytuł (pusty – „Nowa mapa”) */
function newMap(t) {
  snap();
  root = forest([mk(t || 'Nowa mapa')]);
  sel = first().id;
  fh = null;
  fhSkip = 0;
  changed();
}
/** otwarty plik: linie spoza mapy wstrzymują zapis do niego (zob. save) @param {string} txt */
function loadFile(txt) {
  fhSkip = load(txt);
  dirty = false;
  if (fhSkip) info(skipInfo(fhSkip));
  return fhSkip;
}
async function openFile() {
  if (window.showOpenFilePicker) {
    try {
      const [h] = await window.showOpenFilePicker({ types: [{ accept: { 'text/markdown': ['.md', '.txt'] } }] });
      fh = h;
      const f = await h.getFile();
      lastMod = f.lastModified;
      loadFile(await f.text());
      return;
    } catch (e) {
      if (isAbort(e)) return;
      fh = null;
      fhSkip = 0;
    }
  }
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = '.md,.txt';
  i.onchange = async () => {
    const file = i.files && i.files[0];
    if (file) loadFile(await file.text());
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
  /** @type {const} */ (['bu', 'br', 'bl', 'bf']).forEach(i => ($(i).disabled = tv));
}
$('txt').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    toggleText();
  }
});
/* ---- tryb jasny / ciemny ---- */
/** @param {string} [v] dark | light; bez argumentu – przełącz */
function toggleTheme(v) {
  const d = document.documentElement,
    now = d.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  d.dataset.theme = v === 'dark' || v === 'light' ? v : now === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('mm.theme', d.dataset.theme);
  } catch (e) {}
}
