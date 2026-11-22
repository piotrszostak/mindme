/* Panel „Wygląd mapy”: czcionki, linie, węzły, odstępy, palety kolorów. */
/** @type {[string, SideItem[]][]} sekcje panelu: [nagłówek, pozycje] */
const SIDE = [
  [
    'Tekst',
    [
      { k: 'font', t: 'Czcionka', font: 1, opts: Object.entries(FONTS).map(([k, v]) => [k, v[0]]) },
      {
        k: 'weight',
        t: 'Grubość tekstu',
        opts: [
          ['normal', 'normalna'],
          ['bold', 'pogrubiona'],
        ],
      },
      { k: 'fs', t: 'Rozmiar tekstu', min: 10, max: 24, step: 1, u: 'px' },
      { k: 'maxw', t: 'Maks. szerokość tekstu', min: 100, max: 500, step: 10, u: 'px' },
    ],
  ],
  [
    'Linie',
    [
      { k: 'edge', t: 'Grubość linii', min: 0.5, max: 8, step: 0.5, u: 'px' },
      {
        k: 'edgeStyle',
        t: 'Kształt linii',
        opts: [
          ['curve', 'krzywe'],
          ['straight', 'proste'],
          ['elbow', 'łamane'],
        ],
      },
    ],
  ],
  [
    'Węzły',
    [
      { k: 'nb', t: 'Grubość obramowania', min: 0, max: 6, step: 0.5, u: 'px' },
      { k: 'radius', t: 'Zaokrąglenie rogów', min: 0, max: 24, step: 1, u: 'px' },
      {
        k: 'fill',
        t: 'Wypełnienie',
        opts: [
          ['none', 'brak'],
          ['tint', 'pastelowe'],
          ['solid', 'pełne'],
        ],
      },
    ],
  ],
  [
    'Odstępy',
    [
      { k: 'gapX', t: 'Między poziomami', min: 16, max: 160, step: 2, u: 'px' },
      { k: 'gapY', t: 'Między rodzeństwem', min: 0, max: 60, step: 1, u: 'px' },
      { k: 'gapTree', t: 'Między mapami', min: 20, max: 240, step: 5, u: 'px' },
    ],
  ],
];
/* palety: wbudowane presety + własne poprawki użytkownika (zapamiętane na urządzeniu) */
/** @type {Record<string, string[]>} */
const PAL0 = {
  Domyślna: DEF.colors,
  Pastelowa: ['#f4a6a6', '#9fd8a8', '#a6c4f4', '#e6a8d7', '#f7c99a', '#93d3d6'],
  Głęboka: ['#9b2226', '#2d6a4f', '#1d3557', '#6a1b9a', '#bb3e03', '#005f73'],
  Ocean: ['#0077b6', '#00a6c8', '#023e8a', '#48cae4', '#0096c7', '#5e60ce'],
  Las: ['#2d6a4f', '#7f8d2c', '#40916c', '#bc6c25', '#52796f', '#a47148'],
  'Zachód słońca': ['#ff6b6b', '#f06595', '#cc5de8', '#ff922b', '#f59f00', '#845ef7'],
  Neon: ['#ff006e', '#fb5607', '#e0a800', '#3a86ff', '#8338ec', '#06b88a'],
  Monochromatyczna: Array(6).fill('#2f6fed'),
};
/** @type {Record<string, string[]>} własne poprawki palet (localStorage) */
let palOv = {};
try {
  palOv = JSON.parse(localStorage.getItem('mm.pal') || '{}');
} catch (e) {}
/** kolory palety (z poprawkami użytkownika) @param {string} n */
const pal = n => (palOv[n] || PAL0[n] || DEF.colors).slice();
/** jeden krok cofania na całe przeciągnięcie suwaka */
let sideSnap = false;
let palEdit = false;
function savePalOv() {
  try {
    localStorage.setItem('mm.pal', JSON.stringify(palOv));
  } catch (e) {}
}
/** @param {StyleKey} k @param {MapStyle[StyleKey]} v @param {boolean} [commit] koniec gestu */
function setStyle(k, v, commit) {
  if (!sideSnap) {
    snap();
    sideSnap = true;
  }
  if (commit) sideSnap = false;
  /** @type {any} */ (ST)[k] = v; // klucz i wartość pochodzą z opisu panelu (SIDE)
  stDirty = true;
  changed(true);
  syncSide();
}
/** @param {string} n nazwa palety */
function choosePal(n) {
  sideSnap = false;
  snap();
  ST.palette = n;
  ST.colors = pal(n);
  stDirty = true;
  changed(true);
  syncSide();
}
/** elementy panelu według selektora @template {HTMLElement} T @param {string} sel @returns {T[]} */
const sideAll = sel => /** @type {T[]} */ ([...$('side').querySelectorAll(sel)]);
/** @param {HTMLElement} el */
const styleKey = el => /** @type {StyleKey} */ (el.dataset.k);
/** @param {SideItem} it */
function sideItemHTML(it) {
  if (it.opts)
    return `<label>${it.t}</label><div class="seg${it.font ? ' fonts' : ''}" data-k="${it.k}">${it.opts
      .map(
        ([v, l]) =>
          `<button type="button" data-v="${v}"${it.font ? ` style='font-family:${FONTS[v][1]}'` : ''}>${l}</button>`
      )
      .join('')}</div>`;
  return `<label for="st-${it.k}">${it.t}<output id="so-${it.k}"></output></label><input type="range" id="st-${it.k}" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step}">`;
}
function buildSide() {
  $('side').innerHTML =
    `<div class="hh"><b>Wygląd mapy</b><button id="sx" type="button" aria-label="Zamknij" title="Zamknij (Esc)">${icon('close')}</button></div><div class="sb">` +
    SIDE.map(([h, items]) => `<h3>${h}</h3>` + items.map(sideItemHTML).join('')).join('') +
    `<h3>Kolory gałęzi</h3><div class="pals">${Object.keys(PAL0)
      .map(
        n =>
          `<button type="button" data-pal="${n}" title="Paleta: ${n}"><span class="sw"></span><span>${n}</span></button>`
      )
      .join('')}</div>` +
    `<button type="button" id="paledit" class="wide"></button><div id="paled" hidden><div class="cols">${DEF.colors.map((_, i) => `<input type="color" data-ci="${i}" title="Kolor ${i + 1}. gałęzi">`).join('')}</div>` +
    `<button type="button" id="palreset" class="wide">Przywróć oryginalną paletę</button></div>` +
    `<button type="button" class="reset" id="sreset">Przywróć domyślne</button></div>`;
  $('sx').onclick = toggleSide;
  for (const r of sideAll('input[type=range]')) {
    const el = /** @type {HTMLInputElement} */ (r);
    el.oninput = () => setStyle(styleKey(el), +el.value);
    el.onchange = () => (sideSnap = false);
  }
  for (const b of sideAll('.seg button')) {
    const seg = /** @type {HTMLElement} */ (b.closest('.seg'));
    b.onclick = () => {
      sideSnap = false;
      setStyle(styleKey(seg), b.dataset.v || '', true);
    };
  }
  for (const b of sideAll('[data-pal]')) b.onclick = () => choosePal(b.dataset.pal || '');
  $('paledit').onclick = () => {
    palEdit = !palEdit;
    syncSide();
  };
  /* edycja zmienia preset (na tym urządzeniu) i kolory bieżącej mapy */
  for (const c of sideAll('input[type=color]')) {
    const el = /** @type {HTMLInputElement} */ (c);
    el.oninput = () => {
      const a = ST.colors.slice();
      a[Number(el.dataset.ci)] = el.value;
      palOv[ST.palette] = a;
      savePalOv();
      setStyle('colors', a);
    };
    el.onchange = () => (sideSnap = false);
  }
  $('palreset').onclick = () => {
    delete palOv[ST.palette];
    savePalOv();
    choosePal(ST.palette);
  };
  $('sreset').onclick = () => {
    sideSnap = false;
    snap();
    ST = JSON.parse(JSON.stringify(DEF));
    stDirty = true;
    changed(true);
    syncSide();
    info('przywrócono domyślny wygląd');
  };
  syncSide();
}
/** pola panelu ← bieżący styl */
function syncSide() {
  if (!$('side').firstChild) return;
  for (const r of sideAll('input[type=range]')) {
    const el = /** @type {HTMLInputElement} */ (r),
      key = styleKey(el);
    el.value = String(ST[key]);
    $(`so-${key}`).textContent = ST[key] + ' px';
  }
  for (const g of sideAll('.seg')) {
    const key = styleKey(g);
    g.querySelectorAll('button').forEach(b => b.classList.toggle('on', ST[key] === b.dataset.v));
  }
  for (const b of sideAll('[data-pal]')) {
    const n = b.dataset.pal || '',
      sw = b.querySelector('.sw');
    b.classList.toggle('on', ST.palette === n);
    if (sw) sw.innerHTML = (n === ST.palette ? ST.colors : pal(n)).map(x => `<i style="background:${x}"></i>`).join('');
  }
  $('paledit').textContent = (palEdit ? '▾ ' : '▸ ') + 'Edytuj paletę „' + ST.palette + '”';
  $('paled').hidden = !palEdit;
  $('palreset').hidden = !palOv[ST.palette];
  for (const c of sideAll('input[type=color]'))
    /** @type {HTMLInputElement} */ (c).value = ST.colors[Number(c.dataset.ci)] || '#888888';
}
function toggleSide() {
  closeMenu();
  const o = $('side').classList.toggle('open');
  $('bp').classList.toggle('on', o);
  if (o) {
    if ($('help').classList.contains('open')) toggleHelp();
    syncSide();
    return;
  }
  /* fokus nie może zostać w ukrytym panelu (połykałby skróty) */
  const a = document.activeElement;
  if (a instanceof HTMLElement && $('side').contains(a)) a.blur();
}
