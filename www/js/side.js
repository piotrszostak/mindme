/* Panel „Wygląd mapy”: czcionki, linie, węzły, odstępy, palety kolorów. */
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
let palOv = {};
try {
  palOv = JSON.parse(localStorage.getItem('mm.pal') || '{}');
} catch (e) {}
const pal = n => (palOv[n] || PAL0[n] || DEF.colors).slice();
let sideSnap = false,
  palEdit = false;
function setStyle(k, v, commit) {
  if (!sideSnap) {
    snap();
    sideSnap = true;
  }
  if (commit) sideSnap = false;
  ST[k] = v;
  stDirty = true;
  changed(true);
  syncSide();
}
function choosePal(n) {
  sideSnap = false;
  snap();
  ST.palette = n;
  ST.colors = pal(n);
  stDirty = true;
  changed(true);
  syncSide();
}
function buildSide() {
  const sd = $('side');
  sd.innerHTML =
    `<div class="hh"><b>Wygląd mapy</b><button id="sx" type="button" aria-label="Zamknij" title="Zamknij (Esc)">${icon('close')}</button></div><div class="sb">` +
    SIDE.map(
      ([h, items]) =>
        `<h3>${h}</h3>` +
        items
          .map(it =>
            it.opts
              ? `<label>${it.t}</label><div class="seg${it.font ? ' fonts' : ''}" data-k="${it.k}">${it.opts.map(([v, l]) => `<button type="button" data-v="${v}"${it.font ? ` style='font-family:${FONTS[v][1]}'` : ''}>${l}</button>`).join('')}</div>`
              : `<label for="st-${it.k}">${it.t}<output id="so-${it.k}"></output></label><input type="range" id="st-${it.k}" data-k="${it.k}" min="${it.min}" max="${it.max}" step="${it.step}">`
          )
          .join('')
    ).join('') +
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
  sd.querySelectorAll('input[type=range]').forEach(r => {
    r.oninput = () => setStyle(r.dataset.k, +r.value);
    r.onchange = () => {
      sideSnap = false;
    };
  });
  sd.querySelectorAll('.seg button').forEach(
    b =>
      (b.onclick = () => {
        sideSnap = false;
        setStyle(b.parentNode.dataset.k, b.dataset.v, true);
      })
  );
  sd.querySelectorAll('[data-pal]').forEach(b => (b.onclick = () => choosePal(b.dataset.pal)));
  $('paledit').onclick = () => {
    palEdit = !palEdit;
    syncSide();
  };
  /* edycja zmienia preset (na tym urządzeniu) i kolory bieżącej mapy */
  sd.querySelectorAll('input[type=color]').forEach(c => {
    c.oninput = () => {
      const a = ST.colors.slice();
      a[+c.dataset.ci] = c.value;
      palOv[ST.palette] = a;
      try {
        localStorage.setItem('mm.pal', JSON.stringify(palOv));
      } catch (e) {}
      setStyle('colors', a);
    };
    c.onchange = () => {
      sideSnap = false;
    };
  });
  $('palreset').onclick = () => {
    delete palOv[ST.palette];
    try {
      localStorage.setItem('mm.pal', JSON.stringify(palOv));
    } catch (e) {}
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
function syncSide() {
  const sd = $('side');
  if (!sd.firstChild) return;
  sd.querySelectorAll('input[type=range]').forEach(r => {
    r.value = ST[r.dataset.k];
    $('so-' + r.dataset.k).textContent = ST[r.dataset.k] + ' px';
  });
  sd.querySelectorAll('.seg').forEach(g =>
    g.querySelectorAll('button').forEach(b => b.classList.toggle('on', ST[g.dataset.k] === b.dataset.v))
  );
  sd.querySelectorAll('[data-pal]').forEach(b => {
    const n = b.dataset.pal;
    b.classList.toggle('on', ST.palette === n);
    b.querySelector('.sw').innerHTML = (n === ST.palette ? ST.colors : pal(n))
      .map(x => `<i style="background:${x}"></i>`)
      .join('');
  });
  $('paledit').textContent = (palEdit ? '▾ ' : '▸ ') + 'Edytuj paletę „' + ST.palette + '”';
  $('paled').hidden = !palEdit;
  $('palreset').hidden = !palOv[ST.palette];
  sd.querySelectorAll('input[type=color]').forEach(c => (c.value = ST.colors[+c.dataset.ci] || '#888888'));
}
function toggleSide() {
  closeMenu();
  const o = $('side').classList.toggle('open');
  $('bp').classList.toggle('on', o);
  if (o) {
    $('help').classList.contains('open') && toggleHelp();
    syncSide();
  } else if ($('side').contains(document.activeElement)) document.activeElement.blur();
} /* fokus nie może zostać w ukrytym panelu */
