/* Panel „Wygląd mapy” (obok mapy, na całą wysokość): układ, kolory, czcionka, szczegóły; wygląd nowych map (`mm.def`). */
/** @type {[string, SideItem[]][]} szczegóły panelu: [nagłówek, pozycje]; czcionka stoi wyżej, obok układu i kolorów */
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
      { k: 'gapX', t: 'Między poziomami', min: 16, max: 160, step: 2, u: 'px', gap: 1 },
      { k: 'gapY', t: 'Między rodzeństwem', min: 0, max: 60, step: 1, u: 'px', gap: 1 },
      { k: 'gapTree', t: 'Między mapami', min: 20, max: 240, step: 5, u: 'px', gap: 1 },
    ],
  ],
];
/* palety: wszędzie te same; poprawki kolorów trafiają tylko do otwartej mapy (`ST.colors`, decyzja A.4 z 2026-11-28) */
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
/* styl z pliku trafia do SVG mapy i do panelu, więc przyjmujemy tylko wartości, które da się ustawić w panelu */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
/** czy wartość pola stylu z pliku jest poprawna @param {StyleKey} k @param {unknown} v */
function okStyle(k, v) {
  if (k === 'colors')
    return Array.isArray(v) && v.length === DEF.colors.length && v.every(c => typeof c === 'string' && HEX.test(c));
  if (k === 'palette') return typeof v === 'string' && has(PAL0, v);
  const it = SIDE.flatMap(s => s[1]).find(i => i.k === k);
  if (!it) return false; /* nowe pole w DEF: dopisz tu jego regułę */
  if (it.opts) return it.opts.some(([x]) => x === v);
  return typeof v === 'number' && it.min !== undefined && it.max !== undefined && v >= it.min && v <= it.max;
}
/** styl z pliku (`<!--style:…-->`) → tylko poprawne pola; nie-obiekt (np. zepsuty JSON) to pole „style”
 * @param {unknown} o @returns {[Partial<MapStyle>, string[]]} [poprawne pola, nazwy niepoprawnych] */
function cleanStyle(o) {
  /** @type {Record<string, unknown>} */
  const ok = {};
  /** @type {string[]} */
  const bad = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) return [ok, ['style']];
  for (const k of /** @type {StyleKey[]} */ (Object.keys(DEF)))
    if (has(o, k)) {
      const v = /** @type {Record<string, unknown>} */ (o)[k];
      if (okStyle(k, v)) ok[k] = v;
      else bad.push(k);
    }
  return [ok, bad];
}
/** kopia stylu @param {MapStyle} s @returns {MapStyle} */
const copyStyle = s => JSON.parse(JSON.stringify(s));
/* wygląd nowych map: własny z „Ustaw jako domyślny wygląd nowych map” (`mm.def` = {"style":{różnice od DEF},"layout":"…"})
   albo wbudowany (NEWDEF, układ w prawo); złe pola z `mm.def` pomijamy jak w pliku */
/** @returns {{ st: MapStyle, dir: string }} */
function newLook() {
  /** @type {unknown} */
  let o = null;
  try {
    o = JSON.parse(localStorage.getItem('mm.def') || 'null');
  } catch (e) {}
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { st: copyStyle(NEWDEF), dir: 'right' };
  const { style, layout } = /** @type {{ style?: unknown, layout?: unknown }} */ (o);
  return {
    st: { ...copyStyle(DEF), ...cleanStyle(style)[0] },
    dir: typeof layout === 'string' && has(LAY, layout) ? layout : 'right',
  };
}
/** bieżąca mapa dostaje wygląd nowych map (bez kroku cofania – robi go wywołujący) */
function useNewLook() {
  const l = newLook(),
    moved = l.dir !== dir;
  ST = l.st;
  dir = l.dir;
  stDirty = true;
  if (moved) ty = 0; /* inny układ – mapa na nowo na środku, jak przy zmianie układu */
  syncLayout();
  syncSide();
  return moved;
}
function saveNewLook() {
  try {
    localStorage.setItem('mm.def', JSON.stringify({ style: JSON.parse(styleStr() || '{}'), layout: dir }));
    info('nowe mapy zaczną z tym wyglądem');
  } catch (e) {
    info('nie udało się zapamiętać wyglądu (pamięć przeglądarki niedostępna)');
  }
}
/** kolory palety (zawsze oryginalne – poprawki są tylko w mapie) @param {string} n */
const pal = n => (PAL0[n] || DEF.colors).slice();
/** czy kolory mapy różnią się od jej palety */
const palChanged = () => JSON.stringify(ST.colors) !== JSON.stringify(pal(ST.palette));
/** jeden krok cofania na całe przeciągnięcie suwaka albo wpisywanie w jedno pole */
let sideSnap = false;
let palEdit = false;
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
/** pozycja szczegółów według klucza @param {StyleKey} k */
const sideItem = k => /** @type {SideItem} */ (SIDE.flatMap(s => s[1]).find(i => i.k === k));
/** liczba po polsku (przecinek dziesiętny) @param {number | undefined} v */
const num = v => String(v).replace('.', ',');
/* wspólna skala trzech odstępów: ta sama wartość stoi w tym samym miejscu każdego suwaka */
const GAP_MAX = 240;
const GAP_TICKS = [0, 40, 80, 120, 160, 200, 240];
/** @param {SideItem} it */
function sideItemHTML(it) {
  if (it.font)
    return `<select id="st-font" data-k="font">${(it.opts || [])
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join('')}</select>`;
  if (it.opts)
    return `<div class="row"><div class="rl">${it.t}</div><div class="seg" data-k="${it.k}">${it.opts
      .map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`)
      .join('')}</div></div>`;
  const range = `${num(it.min)}–${num(it.max)} ${it.u}`,
    numIn = `<input type="number" class="num" id="sn-${it.k}" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step}" aria-label="${it.t} (${it.u})"><span class="u">${it.u}</span>`;
  if (it.gap)
    return (
      `<div class="row"><div class="rl"><label for="st-${it.k}">${it.t}</label><small>można ${range}</small></div>` +
      `<div class="rr"><div class="gw"><input type="range" class="scale" id="st-${it.k}" data-k="${it.k}" min="0" max="${GAP_MAX}" step="${it.step}" style="--a:${(it.min || 0) / GAP_MAX};--b:${(it.max || 0) / GAP_MAX}">` +
      `<div class="ticks" aria-hidden="true">${GAP_TICKS.map(v => `<span style="left:${(v / GAP_MAX) * 100}%">${v}</span>`).join('')}</div></div>${numIn}</div></div>`
    );
  return (
    `<div class="row"><label for="st-${it.k}">${it.t}</label>` +
    `<div class="rr"><div class="gw"><input type="range" id="st-${it.k}" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step}"><small class="mm">${range}</small></div>${numIn}</div></div>`
  );
}
/** wartość z suwaka albo pola przycięta do dozwolonego zakresu @param {StyleKey} k @param {number} v */
const clampStyle = (k, v) => {
  const it = sideItem(k);
  return Math.max(it.min || 0, Math.min(it.max || 0, v));
};
function buildSide() {
  const font = sideItem('font');
  $('side').innerHTML =
    `<div class="hh"><b>Wygląd mapy</b><button id="sx" type="button" aria-label="Zamknij" title="Zamknij (Esc)">${icon('close')}</button></div><div class="sb">` +
    /* tu staną motywy (5.7) – przed układem */
    /* układ – z tabeli czynności, nowe układy dochodzą same */
    `<h3>Układ <span id="slay"></span></h3><div class="seg lays">${Object.keys(LAY)
      .map(
        d =>
          `<button type="button" data-act="lay-${d}" title="${actOf('lay-' + d).t}">${icon(LAY[d][0])}<span>${LAY[d][1]}</span></button>`
      )
      .join('')}</div>` +
    `<h3>Kolory gałęzi <span id="spal"></span></h3><div class="pals">${Object.keys(PAL0)
      .map(n => `<button type="button" data-pal="${n}" title="Paleta: ${n}" aria-label="Paleta: ${n}"></button>`)
      .join('')}</div>` +
    `<button type="button" id="paledit" class="link"></button><div id="paled" hidden><div class="cols">${DEF.colors.map((_, i) => `<input type="color" data-ci="${i}" title="Kolor ${i + 1}. gałęzi">`).join('')}</div>` +
    `<button type="button" id="palreset" class="link">Przywróć oryginalną paletę</button></div>` +
    `<h3><label for="st-font">${font.t}</label></h3>${sideItemHTML(font)}` +
    `<div class="det">Szczegóły</div>` +
    SIDE.map(
      ([h, items]) =>
        `<h4>${h}</h4>` +
        items
          .filter(i => !i.font)
          .map(sideItemHTML)
          .join('')
    ).join('') +
    `<div class="acts"><button type="button" id="sdef" class="pri">Ustaw jako domyślny wygląd nowych map</button>` +
    `<p class="note">Nowe mapy zaczną z tym wyglądem. Zapisane mapy się nie zmienią.</p>` +
    `<button type="button" id="sreset">Przywróć domyślny wygląd</button></div></div>`;
  $('sx').onclick = toggleSide;
  for (const r of sideAll('input[type=range]')) {
    const el = /** @type {HTMLInputElement} */ (r),
      k = styleKey(el);
    el.oninput = () => {
      const v = clampStyle(k, +el.value);
      if (v !== +el.value) el.value = String(v); /* wspólna skala odstępów: poza zakresem suwak staje na granicy */
      if (v !== ST[k]) setStyle(k, v);
    };
    el.onchange = () => (sideSnap = false);
  }
  /* pole liczbowe: w trakcie pisania tylko poprawne wartości; po zatwierdzeniu przycięte do zakresu */
  for (const n of sideAll('input.num')) {
    const el = /** @type {HTMLInputElement} */ (n),
      k = styleKey(el);
    el.oninput = () => {
      const v = el.valueAsNumber;
      if (!isNaN(v) && v === clampStyle(k, v) && v !== ST[k]) setStyle(k, v);
    };
    el.onchange = () => {
      const v = el.valueAsNumber;
      if (!isNaN(v) && clampStyle(k, v) !== ST[k]) setStyle(k, clampStyle(k, v), true);
      else sideSnap = false;
      el.value = String(ST[k]);
    };
  }
  for (const b of sideAll('.lays button')) b.onclick = () => actOf(b.dataset.act || '').f?.();
  for (const b of sideAll('.seg[data-k] button')) {
    const seg = /** @type {HTMLElement} */ (b.closest('.seg'));
    b.onclick = () => {
      sideSnap = false;
      setStyle(styleKey(seg), b.dataset.v || '', true);
    };
  }
  const fs = /** @type {HTMLSelectElement} */ (sideAll('#st-font')[0]);
  fs.onchange = () => {
    sideSnap = false;
    setStyle('font', fs.value, true);
  };
  for (const b of sideAll('[data-pal]')) b.onclick = () => choosePal(b.dataset.pal || '');
  $('paledit').onclick = () => {
    palEdit = !palEdit;
    syncSide();
  };
  /* edycja zmienia tylko kolory otwartej mapy (zapis w pliku) */
  for (const c of sideAll('input[type=color]')) {
    const el = /** @type {HTMLInputElement} */ (c);
    el.oninput = () => {
      const a = ST.colors.slice();
      a[Number(el.dataset.ci)] = el.value;
      setStyle('colors', a);
    };
    el.onchange = () => (sideSnap = false);
  }
  $('palreset').onclick = () => choosePal(ST.palette);
  $('sdef').onclick = saveNewLook;
  $('sreset').onclick = () => {
    sideSnap = false;
    snap();
    changed(!useNewLook());
    info('przywrócono domyślny wygląd');
  };
  syncSide();
  syncLayout();
}
/** pola panelu ← bieżący styl */
function syncSide() {
  if (!$('side').firstChild) return;
  const a = document.activeElement;
  for (const r of sideAll('input[type=range]')) {
    const el = /** @type {HTMLInputElement} */ (r),
      key = styleKey(el);
    el.value = String(ST[key]);
    if (el.classList.contains('scale')) el.style.setProperty('--v', String(+ST[key] / GAP_MAX));
  }
  /* pola, w którym ktoś pisze, nie poprawiamy pod palcami */
  for (const n of sideAll('input.num'))
    if (n !== a) /** @type {HTMLInputElement} */ (n).value = String(ST[styleKey(n)]);
  for (const g of sideAll('.seg[data-k]')) {
    const key = styleKey(g);
    g.querySelectorAll('button').forEach(b => b.classList.toggle('on', ST[key] === b.dataset.v));
  }
  const fs = /** @type {HTMLSelectElement} */ (sideAll('#st-font')[0]);
  fs.value = ST.font;
  fs.style.fontFamily = (FONTS[ST.font] || FONTS.system)[1];
  for (const b of sideAll('[data-pal]')) {
    const n = b.dataset.pal || '',
      c = n === ST.palette ? ST.colors : pal(n);
    b.classList.toggle('on', ST.palette === n);
    b.innerHTML = [0, 1, 2, 4].map(i => `<i style="background:${c[i]}"></i>`).join('');
  }
  $('spal').textContent = ST.palette + (palChanged() ? ' (zmieniona)' : '');
  $('paledit').textContent = (palEdit ? '▾ ' : '▸ ') + 'Edytuj paletę „' + ST.palette + '”';
  $('paledit').setAttribute('aria-expanded', String(palEdit));
  $('paled').hidden = !palEdit;
  $('palreset').hidden = !palChanged();
  for (const c of sideAll('input[type=color]'))
    /** @type {HTMLInputElement} */ (c).value = ST.colors[Number(c.dataset.ci)] || '#888888';
}
function toggleSide() {
  closeMenu();
  const o = $('side').classList.toggle('open');
  $('bp').classList.toggle('on', o);
  if (o) {
    if ($('help').classList.contains('open')) toggleHelp();
    /* podgląd krojów na liście dopiero teraz: zamknięty panel nie może pobierać plików czcionek przy starcie */
    for (const op of sideAll('#st-font option'))
      op.style.fontFamily = (FONTS[/** @type {HTMLOptionElement} */ (op).value] || FONTS.system)[1];
    syncSide();
    /* panel stoi obok mapy: mapa jedzie w lewo tylko tyle, żeby nie wejść pod panel (lewa krawędź zostaje na ekranie) */
    const r = $('sv').getBoundingClientRect(),
      b = bounds(),
      W = r.width - rightIn(r),
      x0 = b.x0 * k + tx,
      x1 = b.x1 * k + tx;
    if (x1 > W - 30) tx -= Math.max(0, Math.min(x1 - (W - 30), x0 - 30));
    ensureVisible();
    apply();
    return;
  }
  /* fokus nie może zostać w ukrytym panelu (połykałby skróty) */
  const a = document.activeElement;
  if (a instanceof HTMLElement && $('side').contains(a)) a.blur();
}
