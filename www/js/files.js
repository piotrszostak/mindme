/* Pliki (otwórz/zapisz/autozapis), widok tekstowy Markdown, tryb jasny / ciemny. */
/* ---- pliki i autozapis ---- */
/** zapis do pliku czeka na decyzję: plik zmieniono na dysku, a mapa ma niezapisane zmiany (zob. `diskAsk`) */
let fhConflict = false;
/** czas zmiany otwartego pliku przy ostatnim odczycie albo zapisie */
let lastMod = 0;
/** @type {string | null} autozapis, który ta karta ostatnio zapisała albo wczytała; inny w pamięci = zapis z innej karty */
let lsLast = null;
const DISK_Q = 'Plik zmieniono na dysku (np. Syncthing albo inny program), a mapa ma niezapisane zmiany.';
/** @returns {Promise<void>} */
async function autosave() {
  if (dnd) {
    clearTimeout(timer);
    timer = setTimeout(autosave, 500);
    return;
  }
  const md = serialize(root),
    ls = await toStorage(md);
  if (ls === 'other') return; /* mapa z innej karty: rozstrzyga pytanie */
  const toFile = !!fh && !fhSkip && !fhConflict; /* plik z liniami spoza mapy czeka na „Nadpisz” (zob. save) */
  if (fh && toFile) {
    try {
      const c = await diskChange(md);
      if (c) return diskAsk(c);
      const w = await fh.createWritable();
      await w.write(md);
      await w.close();
      lastMod = (await fh.getFile()).lastModified;
    } catch (e) {
      $('save').textContent = '⚠ błąd zapisu pliku';
      return;
    }
  }
  if (toFile || (!fh && ls === 'ok')) dirty = false;
  $('save').textContent = toFile
    ? '✓ zapisano w pliku'
    : ls === 'full'
      ? '⚠ nie zapisano w przeglądarce – zapisz plik (Ctrl+S)'
      : fhConflict
        ? '⚠ plik zmieniony na dysku – Ctrl+S'
        : '✓ zapisano lokalnie';
}
/**
 * Autozapis w pamięci przeglądarki. Bez otwartego pliku to jedyna kopia mapy, więc zapis z innej karty
 * (albo okna aplikacji) nie może zniknąć po cichu – wtedy pytanie.
 * @param {string} md @returns {Promise<'ok' | 'full' | 'other'>} `full` – brak miejsca, `other` – czeka na decyzję
 */
async function toStorage(md) {
  try {
    const cur = localStorage.getItem('mm.md');
    if (!fh && cur !== null && cur !== lsLast && cur !== md) {
      if (askRes) return 'other'; /* inne pytanie otwarte – zapytamy przy następnym zapisie */
      const c = await ask('Mapę zmieniono w innej karcie albo oknie aplikacji.', [
        'Wczytaj tamtą wersję',
        'Zostaw moją',
      ]);
      const v = localStorage.getItem('mm.md');
      if (c === 0 && v !== null) {
        lsLast = v;
        load(v);
        info('wczytano mapę z innej karty · Ctrl+Z przywraca twoją');
      }
      if (c !== 1) {
        if (c < 0) $('save').textContent = '⚠ mapa zmieniona w innej karcie';
        return 'other';
      }
    }
    localStorage.setItem('mm.md', md);
    lsLast = md;
    return 'ok';
  } catch (e) {
    return 'full';
  }
}
/* inna karta zapisała mapę: karta bez otwartego pliku i bez niezapisanych zmian wczytuje ją od razu;
   przy niezapisanych zmianach rozstrzyga pytanie w `toStorage` */
window.addEventListener('storage', e => {
  if (e.key !== 'mm.md' || e.newValue === null || fh || dirty || editing || tv || askRes) return;
  const v = e.newValue;
  if (v === serialize(root)) return void (lsLast = v);
  lsLast = v;
  load(v);
  info('wczytano mapę zmienioną w innej karcie');
});
/** otwarty plik zmieniony na dysku od ostatniego odczytu albo zapisu (tę samą treść pomija)
 * @param {string} md bieżąca mapa @returns {Promise<{ t: string, mod: number } | null>} */
async function diskChange(md) {
  if (!fh) return null;
  const f = await fh.getFile();
  if (f.lastModified <= lastMod) return null;
  const t = await f.text();
  if (t !== md) return { t, mod: f.lastModified };
  lastMod = f.lastModified;
  return null;
}
/** plik zmieniony na dysku: bez niezapisanych zmian – wczytaj; z nimi – zapytaj, a do decyzji nie zapisuj do pliku
 * @param {{ t: string, mod: number }} c @returns {Promise<void>} */
async function diskAsk(c) {
  if (!dirty) {
    lastMod = c.mod;
    if (!loadFile(c.t)) info('przeładowano zmiany z pliku');
    return;
  }
  fhConflict = true;
  $('save').textContent = '⚠ plik zmieniony na dysku – Ctrl+S';
  if (askRes) return; /* inne pytanie otwarte – zapytamy przy Ctrl+S */
  const k = await ask(DISK_Q, ['Zapisz jako nowy plik', 'Wczytaj z dysku', 'Nadpisz plik']);
  if (k < 0 || !fh) return;
  if (k === 0) return saveNew();
  const f = await fh.getFile();
  lastMod = f.lastModified;
  fhConflict = false;
  if (k === 2) return autosave();
  if (!loadFile(await f.text())) info('wczytano plik z dysku · Ctrl+Z przywraca twoje zmiany');
}
/** otwarty plik zmieniony na dysku (np. w innym programie) → wczytaj go ponownie albo zapytaj; sprawdzane co 2 s */
async function reloadIfChanged() {
  if (!fh || editing || fhConflict || askRes) return;
  try {
    const c = await diskChange(serialize(root));
    if (c) await diskAsk(c);
  } catch (e) {}
}
setInterval(reloadIfChanged, 2000);
async function save() {
  if (editing) endEdit();
  if (tv) {
    if (!(await textLossOk('Zapisz mimo to'))) return;
    root = parse($('txt').value);
    syncLayout();
  }
  fhConflict = false; /* Ctrl+S sprawdza plik na dysku od nowa (i pyta, jeśli się zmienił) */
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
/** zapis do nowego pliku: okno zapisu (Chrome/Edge), a bez niego pobranie `mapa.md` @returns {Promise<void>} */
async function saveNew() {
  if (window.showSaveFilePicker) {
    try {
      fh = await window.showSaveFilePicker({
        suggestedName: 'mapa.md',
        types: [{ accept: { 'text/markdown': ['.md'] } }],
      });
      fhSkip = 0;
      fhConflict = false;
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
  fhConflict = false;
  useNewLook(); /* wygląd nowych map, nie otwartej (decyzja 2026-11-28) */
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
      fhConflict = false;
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
/** tekst widoku Markdown przy otwarciu – bez zmian w nim zamknięcie nie wczytuje mapy od nowa */
let tvOrig = '';
/** linie tekstu, których mapa nie pokaże (bez zmiany układu i stylu bieżącej mapy) @param {string} md */
function skipOf(md) {
  const d = dir,
    s = ST,
    n = parse(md).skip || 0;
  dir = d;
  ST = s;
  stDirty = true;
  return n;
}
/** w widoku Markdown są linie, których mapa nie pokaże → pytanie; true – można iść dalej
 * @param {string} go napis przycisku „mimo to” */
async function textLossOk(go) {
  const n = skipOf($('txt').value);
  if (!n || (await ask(`Linie, których mapa nie pokaże (${n}), znikną.`, ['Wróć do tekstu', go])) === 1) return true;
  $('txt').focus();
  return false;
}
/** panel wyglądu był otwarty przed wejściem w widok .md */
let sideBack = false;
async function toggleText() {
  if (editing) endEdit();
  closeMenu();
  const t = $('txt');
  if (!tv) {
    /* panel wyglądu chowa się na czas widoku .md i wraca razem z mapą */
    sideBack = $('side').classList.contains('open');
    if (sideBack) toggleSide();
    tv = true;
    t.value = tvOrig = serialize(root);
    t.style.display = 'block';
    t.focus();
    setMode('TEKST');
    hint('Esc – wróć do mapy');
  } else {
    if (t.value !== tvOrig && !(await textLossOk('Zamknij mimo to'))) return;
    tv = false;
    t.style.display = 'none';
    setMode('NORMAL');
    hint('');
    if (t.value !== tvOrig) load(t.value);
    if (sideBack) toggleSide();
    sideBack = false;
  }
  syncText();
}
function syncText() {
  $('bt').setAttribute('aria-pressed', String(tv));
  $('bv').setAttribute('aria-pressed', String(!tv));
  /* „Aa” wyszarzone w widoku .md (makieta 3.2 C) */
  /** @type {const} */ (['bu', 'br', 'bf', 'bp']).forEach(i => ($(i).disabled = tv));
  nbSync(); /* pasek nad węzłem i „+” schowane w widoku .md */
  placeNb();
}
$('txt').addEventListener('keydown', e => {
  e.stopPropagation();
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
    e.preventDefault(); /* zapis mapy, nie okno „Zapisz stronę” przeglądarki */
    save();
  } else if (e.key === 'Escape') {
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
