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
