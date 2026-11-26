const { test, expect } = require('@playwright/test');
const { open, loadMap, boxes, expectNoOverlaps } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const MD = d =>
  `# Środek\n<!--layout:${d}-->\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n  - 2a\n    - 2a-i\n    - 2a-ii\n- Trzy\n- Cztery z dłuższym tekstem\n  - 4a\n`;
const byText = list => Object.fromEntries(list.map(b => [b.text, b]));

test('prawo: dzieci na prawo od rodzica, brak nakładania', async ({ page }) => {
  const b = byText(await loadMap(page, MD('right')));
  for (const t of ['Jeden', 'Dwa', 'Trzy', 'Cztery z dłuższym tekstem'])
    expect(b[t].x).toBeGreaterThan(b['Środek'].right);
  expect(b['2a-i'].x).toBeGreaterThan(b['2a'].right);
  expectNoOverlaps(Object.values(b));
});

test('lewo: dzieci na lewo od rodzica, brak nakładania', async ({ page }) => {
  const b = byText(await loadMap(page, MD('left')));
  for (const t of ['Jeden', 'Dwa', 'Trzy', 'Cztery z dłuższym tekstem']) expect(b[t].right).toBeLessThan(b['Środek'].x);
  expect(b['2a-i'].right).toBeLessThan(b['2a'].x);
  expectNoOverlaps(Object.values(b));
});

test('obie: pierwsza połowa (ceil) w prawo, reszta w lewo', async ({ page }) => {
  const b = byText(await loadMap(page, MD('both')));
  const r = b['Środek'];
  expect(b['Jeden'].x).toBeGreaterThan(r.right);
  expect(b['Dwa'].x).toBeGreaterThan(r.right);
  expect(b['Trzy'].right).toBeLessThan(r.x);
  expect(b['Cztery z dłuższym tekstem'].right).toBeLessThan(r.x);
  expect(b['4a'].right).toBeLessThan(b['Cztery z dłuższym tekstem'].x);
  expectNoOverlaps(Object.values(b));
});

test('obie: nieparzysta liczba dzieci – więcej po prawej', async ({ page }) => {
  const b = byText(await loadMap(page, '# R\n<!--layout:both-->\n- a\n- b\n- c\n'));
  expect(b.a.x).toBeGreaterThan(b.R.right);
  expect(b.b.x).toBeGreaterThan(b.R.right);
  expect(b.c.right).toBeLessThan(b.R.x);
});

test('dół: poziomy rosną w dół, rodzic wyśrodkowany nad dziećmi', async ({ page }) => {
  const b = byText(await loadMap(page, MD('down')));
  expect(b['Jeden'].top).toBeGreaterThan(b['Środek'].bottom);
  expect(b['1a'].top).toBeGreaterThan(b['Jeden'].bottom);
  expect(b['2a-i'].top).toBeGreaterThan(b['2a'].bottom);
  // rodzeństwo w jednym rzędzie
  expect(b['Jeden'].y).toBe(b['Trzy'].y);
  const mid = (b['2a-i'].x + b['2a-ii'].right) / 2;
  expect(Math.abs(b['2a'].x + b['2a'].w / 2 - mid)).toBeLessThan(1);
  expectNoOverlaps(Object.values(b));
});

test('poziomo: rodzic wyśrodkowany pionowo między skrajnymi dziećmi', async ({ page }) => {
  for (const d of ['right', 'left']) {
    const b = byText(await loadMap(page, MD(d)));
    expect(b['Dwa'].y).toBeCloseTo((b['2a'].y + b['2a'].y) / 2);
    expect(b['2a'].y).toBeCloseTo((b['2a-i'].y + b['2a-ii'].y) / 2);
    expect(b['Jeden'].y).toBeCloseTo((b['1a'].y + b['1b'].y) / 2);
  }
});

/** Głęboka gałąź z nagrania: ta sama 7-węzłowa gałąź wklejana raz po raz jako dziecko poprzedniej. */
const DEEP = (d, n = 15) => {
  const kids = i => {
    const p = '  '.repeat(i);
    return `${p}- Gówno\n${p}  - Szczegół 1\n${p}  - Szczegół 2\n${p}- Dupa\n${p}  - Szczegół 3\n${p}- Cycki\n`;
  };
  let md = `# Mapa myśli\n<!--layout:${d}-->\n` + kids(0);
  for (let i = 0; i < n; i++) md += `${'  '.repeat(i)}- Mapa myśli\n` + kids(i + 1);
  return md;
};
/** Rodzic i jego skrajne dzieci (pierwsze, ostatnie) dla każdego widocznego węzła z dziećmi. */
const families = page =>
  page.evaluate(() =>
    vis()
      .filter(n => !n.collapsed && n.children.length)
      .map(n => {
        const b = /** @param {MapNode} m */ m => ({ text: m.text, x: m.x, y: m.y, w: m.w, cx: m.x + m.w / 2 });
        return { p: b(n), f: b(n.children[0]), l: b(n.children[n.children.length - 1]), top: n === root.children[0] };
      })
  );

test('głęboka gałąź: korzeń zostaje przy dzieciach (prawo, lewo)', async ({ page }) => {
  for (const d of ['right', 'left']) {
    await loadMap(page, DEEP(d));
    const r = (await families(page)).find(f => f.top);
    expect(r.p.y, `układ ${d}: korzeń w połowie między skrajnymi dziećmi`).toBeCloseTo((r.f.y + r.l.y) / 2);
  }
});

test('głęboka gałąź: korzeń zostaje przy dzieciach (obie strony)', async ({ page }) => {
  await loadMap(page, DEEP('both'));
  const [r, ...c] = await page.evaluate(() => [root.children[0], ...root.children[0].children].map(n => n.y));
  // prawa strona: Gówno, Dupa; lewa: Cycki, Mapa myśli
  expect(r, 'prawa strona').toBeCloseTo((c[0] + c[1]) / 2);
  expect(r, 'lewa strona').toBeCloseTo((c[2] + c[3]) / 2);
});

test('głęboka gałąź: w układzie „dół” rodzic nad skrajnymi dziećmi, bez długich linii', async ({ page }) => {
  await loadMap(page, DEEP('down'));
  for (const { p, f, l } of await families(page))
    expect(p.cx, `„${p.text}” między „${f.text}” a „${l.text}”`).toBeCloseTo((f.x + l.x + l.w) / 2);
});

test('zwinięte węzły ukrywają dzieci i dostają „…”', async ({ page }) => {
  const list = await loadMap(page, '# R\n- a <!--c-->\n  - ukryte\n- b\n');
  expect(list.map(b => b.text)).toEqual(['R', 'a', 'b']);
  const a = list.find(b => b.text === 'a');
  await expect(page.locator(`#g .n[data-id="${a.id}"] text`)).toHaveText('a …');
  await expect(page.locator('#g .n')).toHaveCount(3);
});

test('szerokość węzła rośnie z długością tekstu', async ({ page }) => {
  const b = byText(await loadMap(page, '# R\n- x\n- średni tekst\n- znacznie dłuższy tekst węzła\n'));
  expect(b.x.w).toBeGreaterThanOrEqual(44);
  expect(b['średni tekst'].w).toBeGreaterThan(b.x.w);
  expect(b['znacznie dłuższy tekst węzła'].w).toBeGreaterThan(b['średni tekst'].w);
});

test('SVG odpowiada modelowi (prostokąty i krawędzie)', async ({ page }) => {
  const list = await loadMap(page, MD('right'));
  const rects = await page.$$eval('#g .n', gs =>
    gs.map(g => {
      const r = g.querySelector('rect');
      return {
        id: +g.dataset.id,
        x: +r.getAttribute('x'),
        y: +r.getAttribute('y'),
        w: +r.getAttribute('width'),
        h: +r.getAttribute('height'),
      };
    })
  );
  expect(rects.length).toBe(list.length);
  for (const r of rects) {
    const b = list.find(n => n.id === r.id);
    expect(r.x).toBeCloseTo(b.x);
    expect(r.y).toBeCloseTo(b.top);
    expect(r.w).toBeCloseTo(b.w);
    expect(r.h).toBeCloseTo(b.h);
  }
  await expect(page.locator('#g path')).toHaveCount(list.length - 1);
});

test(':layout i przycisk układu zmieniają układ i są zapisywane w markdownie', async ({ page }) => {
  await loadMap(page, MD('right'));
  await page.keyboard.press(':');
  await page.keyboard.type('layout down');
  await page.keyboard.press('Enter');
  await expect(page.locator('#bl')).toHaveAttribute('data-tip', /w dół/);
  expect(await page.evaluate(() => serialize(root))).toContain('<!--layout:down-->');
  await page.click('#bl');
  await page.click('#menu [data-act="lay-left"]');
  expect(await page.evaluate(() => dir)).toBe('left');
  const b = byText(await boxes(page));
  expect(b['Jeden'].right).toBeLessThan(b['Środek'].x);
});

test('cofanie obejmuje układ: zmianę układu i wczytanie pliku z innym układem', async ({ page }) => {
  const state = () => page.evaluate(() => [dir, first().text, $('bl').dataset.tip]);
  await page.evaluate(() => load('# A\n<!--layout:both-->\n\n- a\n'));
  await page.evaluate(() => setLayout('down'));
  expect((await state())[0]).toBe('down');
  await page.evaluate(() => undo());
  expect(await state()).toEqual(['both', 'A', 'Układ mapy: ' + (await page.evaluate(() => LAY.both[1]))]);
  await page.evaluate(() => redo());
  expect((await state())[0]).toBe('down');

  await page.evaluate(() => load('# B\n\n- b\n'));
  expect((await state()).slice(0, 2)).toEqual(['right', 'B']);
  await page.evaluate(() => undo());
  expect((await state()).slice(0, 2)).toEqual(['down', 'A']);
});
