const { test, expect } = require('@playwright/test');
const { open, loadMap, expectNoOverlaps } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const LONG = 'To jest bardzo długi tekst węzła, który zdecydowanie nie zmieści się w jednej linii i musi zostać zawinięty';
const WORD = 'Konstantynopolitańczykowianeczka'.repeat(3);
const byText = (list) => Object.fromEntries(list.map(b => [b.text, b]));
const lines = (page, id) => page.$$eval(`#g .n[data-id="${id}"] tspan`, ts => ts.map(t => ({ s: t.textContent, y: +t.getAttribute('y') })));

test('krótki tekst: jedna linia, wysokość 30', async ({ page }) => {
  const b = byText(await loadMap(page, '# R\n- krótki\n'));
  expect(b['krótki'].h).toBe(30);
  expect(await lines(page, b['krótki'].id)).toHaveLength(1);
});

test('długi tekst zawija się na słowach, węzeł rośnie w pionie, nie w poziomie', async ({ page }) => {
  const b = byText(await loadMap(page, `# R\n- ${LONG}\n`));
  const n = b[LONG];
  const ls = await lines(page, n.id);
  expect(ls.length).toBeGreaterThan(2);
  expect(ls.map(l => l.s).join(' ')).toBe(LONG);         // nic nie zgubione, podział na spacjach
  expect(n.w).toBeLessThanOrEqual(220 + 22 + 1);
  expect(n.h).toBe(ls.length * 18 + 12);
  // linie równo rozłożone i wyśrodkowane w prostokącie
  for (let i = 1; i < ls.length; i++) expect(ls[i].y - ls[i - 1].y).toBeCloseTo(18);
  expect((ls[0].y + ls[ls.length - 1].y) / 2).toBeCloseTo(n.y);
  const rect = await page.locator(`#g .n[data-id="${n.id}"] rect`);
  await expect(rect).toHaveAttribute('height', String(n.h));
});

test('każda linia mieści się w prostokącie (pomiar w przeglądarce)', async ({ page }) => {
  const b = byText(await loadMap(page, `# R\n- ${LONG}\n- ${WORD}\n`));
  for (const t of [LONG, WORD]) {
    const widths = await page.$$eval(`#g .n[data-id="${b[t].id}"] tspan`, ts => ts.map(x => x.getComputedTextLength()));
    for (const w of widths) expect(w + 11).toBeLessThanOrEqual(b[t].w);
  }
});

test('słowo dłuższe niż limit jest dzielone na kawałki', async ({ page }) => {
  const b = byText(await loadMap(page, `# R\n- ${WORD}\n`));
  const ls = await lines(page, b[WORD].id);
  expect(ls.length).toBeGreaterThan(1);
  expect(ls.map(l => l.s).join('')).toBe(WORD);
  expect(b[WORD].w).toBeLessThanOrEqual(220 + 22 + 1);
});

test('wysokie węzły nie nachodzą na siebie w żadnym układzie', async ({ page }) => {
  const md = (d) => `# ${LONG}\n<!--layout:${d}-->\n- ${LONG}\n  - a\n  - ${WORD}\n- krótki\n  - ${LONG}\n- b\n- c\n- ${LONG} raz jeszcze\n`;
  for (const d of ['right', 'left', 'both', 'down']) {
    const list = await loadMap(page, md(d));
    expectNoOverlaps(list);
  }
});

test('rodzic wyższy niż jego dzieci nie nachodzi na sąsiada', async ({ page }) => {
  const b = byText(await loadMap(page, `# R\n- przed\n- ${LONG}\n  - x\n- po\n`));
  expect(b[LONG].top).toBeGreaterThanOrEqual(b['przed'].bottom);
  expect(b['po'].top).toBeGreaterThanOrEqual(b[LONG].bottom);
  expect(b.x.y).toBeCloseTo(b[LONG].y);   // jedyne dziecko na wysokości rodzica
});

test('dół: rząd ma wysokość najwyższego węzła, kolejny rząd zaczyna się niżej', async ({ page }) => {
  const b = byText(await loadMap(page, `# R\n<!--layout:down-->\n- ${LONG}\n  - x\n- krótki\n  - y\n`));
  expect(b['krótki'].y).toBeCloseTo(b[LONG].y);          // ten sam rząd, wyśrodkowane
  expect(b.x.top).toBeGreaterThan(b[LONG].bottom);
  expect(b.y.y).toBeCloseTo(b.x.y);
});

test('znacznik zwinięcia „…” trafia do ostatniej linii; zawijanie nie zmienia pliku', async ({ page }) => {
  const md = `# R\n\n- ${LONG} <!--c-->\n  - ukryte\n`;
  const b = byText(await loadMap(page, md));
  const ls = await lines(page, b[LONG].id);
  expect(ls[ls.length - 1].s.endsWith('…')).toBe(true);
  expect(await page.evaluate(() => serialize(root))).toBe(md);
});

test('edycja na długi tekst przelicza wysokość; znaki HTML są escapowane', async ({ page }) => {
  await loadMap(page, '# R\n- a\n');
  await page.keyboard.press('l');            // zaznacz „a”
  await page.keyboard.press('i');
  const txt = '<b>pogrubione?</b> ' + LONG;
  await page.fill('#ed', txt);
  await page.keyboard.press('Escape');
  const b = byText(await page.evaluate(() => vis().map(n => ({ text: n.text, h: n.h, id: n.id }))));
  expect(b[txt].h).toBeGreaterThan(30);
  await expect(page.locator(`#g .n[data-id="${b[txt].id}"] b`)).toHaveCount(0);
  await expect(page.locator(`#g .n[data-id="${b[txt].id}"] tspan`).first()).toHaveText(/^<b>pogrubione\?<\/b>/);
});

test('eksport SVG obejmuje pełną wysokość zawiniętych węzłów', async ({ page }) => {
  await loadMap(page, `# R\n- ${LONG}\n`);
  const dl = page.waitForEvent('download');
  await page.keyboard.press(':');
  await page.keyboard.type('export svg');
  await page.keyboard.press('Enter');
  const svg = await (await dl).createReadStream().then(s => new Promise(r => { let d = ''; s.on('data', c => d += c); s.on('end', () => r(d)); }));
  const h = +/height="([\d.]+)"/.exec(svg)[1];
  const [n] = (await page.evaluate(() => vis().map(n => n.h))).slice(1);
  expect(h).toBeGreaterThanOrEqual(n + 40);
  expect(svg).toContain('<tspan');
});

test('emoji: rysowane kolorową czcionką, mieszczą się w węźle, nie są cięte przy zawijaniu', async ({ page }) => {
  const E = '🚀✅🔥'.repeat(12);
  const b = byText(await loadMap(page, `# R\n- 🔍 Badania ✅\n- ${E}\n`));
  const n = b['🔍 Badania ✅'];
  await expect(page.locator(`#g .n[data-id="${n.id}"] .emo`)).toHaveCount(2);
  await expect(page.locator(`#g .n[data-id="${n.id}"] text`)).toHaveText('🔍 Badania ✅');
  expect(await page.$eval(`#g .n[data-id="${n.id}"] .emo`, e => getComputedStyle(e).fontFamily)).toContain('Color Emoji');
  for (const t of ['🔍 Badania ✅', E]) {
    const widths = await page.$$eval(`#g .n[data-id="${b[t].id}"] text > tspan`, ts => ts.map(x => x.getComputedTextLength()));
    for (const w of widths) expect(w + 11).toBeLessThanOrEqual(b[t].w + 1);
  }
  const ls = await page.$$eval(`#g .n[data-id="${b[E].id}"] text > tspan`, ts => ts.map(t => t.textContent));
  expect(ls.length).toBeGreaterThan(1);
  expect(ls.join('')).toBe(E);
  for (const l of ls) expect(l).not.toMatch(/[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/);   // żadnej połówki znaku
});
