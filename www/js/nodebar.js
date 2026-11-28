/* Pasek nad zaznaczonym węzłem (3.3 krok 4) i przyciski „+” przy węźle (3.4) – elementy HTML nad mapą, poza `#g`,
   więc nie trafiają do eksportu, a `render()` ich nie przebudowuje (zwykły `click` działa). */
/* nazwy, ikony i skróty z `ACT`; „Więcej” = menu podręczne węzła */
const NB = ['child', 'sib', 'emoji', 'fold', 'moveto', 'menu'];
/** objaśnienie: nazwa i pierwszy skrót zwykły + vim, np. „Dodaj dziecko (Tab, a)” @param {Act} a */
const nbTip = a => {
  const ks = [a.k && a.k[0], a.v && a.v[0]].filter(Boolean).join(', ');
  return a.t + (ks ? ` (${ks})` : '');
};
$('nbar').innerHTML = NB.map(id => {
  const a = actOf(id),
    more = id === 'menu',
    t = more ? 'Więcej' : a.t,
    tip = more ? 'Więcej: ' + lc1(nbTip(a)) : nbTip(a);
  return `<button type="button" data-act="${id}" data-tip="${esc(tip)}" aria-label="${esc(t)}">${icon(more ? 'more' : a.ic || '')}</button>`;
}).join('');
for (const b of document.querySelectorAll('.plus')) {
  if (!(b instanceof HTMLElement)) continue;
  const a = actOf(b.dataset.k === 'sib' ? 'sib' : 'child');
  b.innerHTML = icon('plus');
  b.dataset.tip = nbTip(a);
  b.setAttribute('aria-label', a.t);
}
/** przyciski „+”: [dziecko (prawa / dół), dziecko z lewej (korzeń w „na obie strony”), brat] */
const plusEl = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('.plus')]);
/* klik nie zabiera fokusu: klawisze dalej trafiają do mapy (Enter po „Zwiń” nie klika drugi raz) */
for (const el of [$('nbar'), ...plusEl]) el.addEventListener('mousedown', e => e.preventDefault());
$('nbar').addEventListener('click', e => {
  const b = asEl(e.target)?.closest('button');
  if (!(b instanceof HTMLButtonElement) || b.disabled) return;
  const id = b.dataset.act || '';
  if (id === 'menu') {
    const r = b.getBoundingClientRect();
    return ctxMenu(r.left, r.bottom + 6, lastPT === 'touch');
  }
  actOf(id).f?.();
});
plusEl.forEach((b, i) =>
  b.addEventListener('click', () => {
    if (!sel || editing) return;
    if (i === 2) return addSib(sel, 1);
    const f = S();
    /* korzeń w „na obie strony”: lewe dzieci to druga połowa listy (layTree) – nowy węzeł po stronie klikniętego „+” */
    if (f && f.p === root && dir === 'both' && i === 0) {
      const n = f.n.children.length,
        m = Math.ceil(n / 2);
      return addChild(sel, n % 2 ? m - 1 : m);
    }
    addChild(sel);
  })
);
/* większe „+” po dotyku (ok. 28 px), także na laptopie z ekranem dotykowym */
document.addEventListener(
  'pointerdown',
  e => document.documentElement.classList.toggle('pt-touch', e.pointerType === 'touch'),
  true
);

/* ---- położenie: liczone w każdej klatce animacji (draw/apply), więc tylko z danych w pamięci, bez pomiarów DOM ---- */
/** stan z ostatniego `render()`; `gen` – numer przebiegu (nowy układ = nowy wybór miejsca paska) */
const nbS = { on: false, s: 1, root: false, both: false, gen: 0 };
/** wymiary z pamięci (odświeżane przy zmianie rozmiaru mapy) */
const nbM = { W: 0, H: 0, T: 0, bw: 0, bh: 0, R: 11 };
function nbMeasure() {
  const r = $('sv').getBoundingClientRect();
  nbM.W = r.width;
  nbM.H = r.height;
  nbM.T = topIn(r);
  nbM.bw = $('nbar').offsetWidth;
  nbM.bh = $('nbar').offsetHeight;
  nbM.R = document.documentElement.classList.contains('pt-touch') || matchMedia('(hover: none)').matches ? 14 : 11;
}
new ResizeObserver(() => {
  nbMeasure();
  placeNb();
}).observe($('sv'));
/* rozmiar „+” zależy od wskaźnika (klasa `pt-touch`) */
new MutationObserver(() => {
  nbMeasure();
  placeNb();
}).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
/** po `render()` i zmianie widoku: co widać, kolor gałęzi, dostępność czynności */
function nbSync() {
  const f = sel && !edId && !editing && !dnd && !tv ? S() : null;
  nbS.on = !!f;
  nbS.gen++;
  const bar = $('nbar');
  if (!f) {
    bar.hidden = true;
    for (const b of plusEl) b.hidden = true;
    return;
  }
  nbS.root = f.p === root;
  nbS.s = dir === 'down' ? 0 : nbS.root ? (dir === 'left' ? -1 : 1) : f.n.s || 1;
  nbS.both = nbS.root && dir === 'both' && f.n.children.length > 0;
  const was = bar.hidden;
  bar.hidden = false;
  for (const b of bar.querySelectorAll('button')) {
    if (!(b instanceof HTMLButtonElement)) continue;
    const a = actOf(b.dataset.act || '');
    b.disabled = !!(a.off && a.off());
  }
  const fb = bar.querySelector('[data-act="fold"]');
  if (fb) fb.innerHTML = icon(f.n.collapsed ? 'unfold' : 'fold');
  const d = drawN.find(d => d.n === f.n),
    col = (d && d.col) || 'var(--acc)';
  plusEl.forEach((b, i) => {
    b.hidden = i === 1 ? !nbS.both : i === 2 ? nbS.root : false;
    b.style.setProperty('--c', col);
  });
  if (was || !nbM.bw) nbMeasure();
}
/** @param {HTMLElement} el @param {number} x @param {number} y lewy górny róg w px mapy */
const nbAt = (el, x, y) => (el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`);
/** miejsce paska względem węzła: przesunięcie w poziomie i strona; `key` – widok i układ, dla których je wybrano */
const nbPick = { dx: 0, below: false, key: '' };
const NB_GAP = 10; /* pasek – węzeł (mieści się strzałka) */
/**
 * Wybór miejsca paska, żeby nie zasłaniał innych węzłów (klik w sąsiada trafiałby w przycisk): nad węzłem, potem
 * przesunięty w bok (strzałka dalej nad środkiem węzła), potem pod węzłem; wszędzie zasłania – tam, gdzie zasłania najmniej.
 * Liczony z pozycji docelowych, tylko przy zmianie widoku albo układu – w trakcie animacji pasek się nie przerzuca.
 * @param {MapNode} n @param {number} under ile miejsca pod węzłem zajmują „+”
 */
function nbChoose(n, under) {
  const { W, H, bw, bh } = nbM,
    top = nbM.T + 4,
    L = n.x * k + tx,
    w = n.w * k,
    T = (n.y - n.h / 2) * k + ty,
    cx = L + w / 2,
    yA = T - bh - NB_GAP,
    yB = T + n.h * k + under + NB_GAP;
  /** @type {[number, number, number, number][]} prostokąty sąsiadów w pobliżu (px mapy) */
  const near = [];
  for (const m of vis()) {
    if (m === n) continue;
    const l = m.x * k + tx,
      t = (m.y - m.h / 2) * k + ty,
      r = l + m.w * k,
      b = t + m.h * k;
    if (r > cx - bw && l < cx + bw && b > yA && t < yB + bh) near.push([l, t, r, b]);
  }
  const span = bw / 2 - 16,
    shifts = [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1, -1].map(f => f * span);
  let best = { dx: 0, below: yA < top },
    least = Infinity;
  for (const below of [false, true]) {
    const y = below ? yB : yA;
    if (y < top || y + bh > H - 4) continue;
    for (const dx of shifts) {
      const x = Math.max(4, Math.min(cx + dx - bw / 2, W - bw - 4));
      if (Math.abs(cx - x - bw / 2) > bw / 2 - 12) continue; /* strzałka poza paskiem */
      /* zasłonięta powierzchnia; zasłonięty środek węzła (tam się klika) liczy się dużo bardziej */
      let a = 0;
      for (const [l, t, r, b] of near) {
        const o = Math.max(0, Math.min(r, x + bw) - Math.max(l, x)) * Math.max(0, Math.min(b, y + bh) - Math.max(t, y)),
          mx = (l + r) / 2,
          my = (t + b) / 2;
        a += o + (o && mx > x && mx < x + bw && my > y && my < y + bh ? 1e6 : 0);
      }
      if (!a) return { dx, below };
      if (a < least) {
        least = a;
        best = { dx, below };
      }
    }
  }
  return best;
}
/** pasek i „+” przy wyświetlanej pozycji zaznaczonego węzła (jedzie razem z animacją, przesuwaniem i zoomem) */
function placeNb() {
  if (!nbS.on) return;
  const f = S();
  if (!f || f.n.x === undefined) return;
  const n = f.n,
    q = pos.get(n.id) || n,
    L = q.x * k + tx,
    w = n.w * k,
    h = n.h * k,
    T = (q.y - n.h / 2) * k + ty,
    cy = q.y * k + ty,
    { W, H, R } = nbM,
    G = 6; /* odstęp „+” od węzła */
  /* „+” – środki kółek */
  /** @type {[number, number][]} */
  const P =
    nbS.s === 0
      ? [
          [L + w / 2, T + h + R + G],
          [0, 0],
          [L + w + R + G, T + R - 2],
        ]
      : [
          [nbS.s > 0 ? L + w + R + G : L - R - G, cy],
          [L - R - G, cy],
          [nbS.s > 0 ? L + R - 2 : L + w - R + 2, T + h + R + G],
        ];
  plusEl.forEach((b, i) => nbAt(b, P[i][0] - R, P[i][1] - R));
  /* pasek: nad węzłem; przy górnej krawędzi (wyspy) albo gdy nad nim zasłaniałby sąsiadów – pod węzłem i pod „+” */
  const bar = $('nbar'),
    { bw, bh } = nbM,
    top = nbM.T + 4,
    out = L + w < 0 || L > W || T + h < top || T > H;
  bar.style.visibility = out ? 'hidden' : '';
  if (out) return;
  const under = nbS.s === 0 || !nbS.root ? 2 * R + G : 0,
    key = [k, tx, ty, W, H, bw, nbS.gen].join(' ');
  if (nbPick.key !== key) Object.assign(nbPick, nbChoose(n, under), { key });
  const below = nbPick.below,
    y = Math.max(top, below ? Math.min(T + h + under + NB_GAP, H - bh - 4) : T - bh - NB_GAP),
    cx = L + w / 2,
    x = Math.max(4, Math.min(cx + nbPick.dx - bw / 2, W - bw - 4));
  bar.classList.toggle('below', below);
  bar.style.setProperty('--ax', Math.max(12, Math.min(bw - 12, cx - x)) + 'px');
  nbAt(bar, x, y);
}
