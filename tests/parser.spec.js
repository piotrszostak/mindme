const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const tree = (page, md) =>
  page.evaluate(m => {
    const strip = n => ({ text: n.text, ...(n.collapsed ? { collapsed: true } : {}), children: n.children.map(strip) });
    const f = parse(m);
    return { root: strip(f.children[0]), roots: f.children.map(strip), dir };
  }, md);

test('parsuje tytuł i zagnieżdżone listy', async ({ page }) => {
  const { root, dir } = await tree(page, '# Projekt\n\n- A\n  - A1\n  - A2\n    - A2a\n- B\n');
  expect(dir).toBe('right');
  expect(root).toEqual({
    text: 'Projekt',
    children: [
      {
        text: 'A',
        children: [
          { text: 'A1', children: [] },
          { text: 'A2', children: [{ text: 'A2a', children: [] }] },
        ],
      },
      { text: 'B', children: [] },
    ],
  });
});

test('akceptuje markery * i +, tabulatory i CRLF', async ({ page }) => {
  const { root } = await tree(page, '# T\r\n* a\r\n\t+ b\r\n\t\t- c\r\n');
  expect(root).toEqual({
    text: 'T',
    children: [{ text: 'a', children: [{ text: 'b', children: [{ text: 'c', children: [] }] }] }],
  });
});

test('bez nagłówka tworzy korzeń „Mapa”; pusty plik też', async ({ page }) => {
  expect((await tree(page, '- x\n- y')).root).toEqual({
    text: 'Mapa',
    children: [
      { text: 'x', children: [] },
      { text: 'y', children: [] },
    ],
  });
  expect((await tree(page, '')).root).toEqual({ text: 'Mapa', children: [] });
});

test('zbyt głębokie wcięcie jest przycinane do poziomu rodzic+1', async ({ page }) => {
  const { root } = await tree(page, '# T\n- a\n        - b\n- c');
  expect(root.children[0].children[0].text).toBe('b');
  expect(root.children[1].text).toBe('c');
});

test('każdy nagłówek # to osobny korzeń; zwykłe linie są ignorowane', async ({ page }) => {
  const { roots } = await tree(page, '# Pierwszy\nzwykły tekst\n- p1\n# Drugi\n- a\n  - a1\n## nie nagłówek mapy\n');
  expect(roots.map(r => r.text)).toEqual(['Pierwszy', 'Drugi']);
  expect(roots[0].children.map(c => c.text)).toEqual(['p1']);
  expect(roots[1].children[0]).toEqual({ text: 'a', children: [{ text: 'a1', children: [] }] });
});

test('pusty korzeń w środku nie zostawia podwójnych pustych linii', async ({ page }) => {
  const md = '# A\n\n- a\n\n# B\n\n# C\n\n- c\n';
  expect(await page.evaluate(m => serialize(parse(m)), md)).toBe(md);
});

test('wiele korzeni: zapis i odczyt bez strat, układ tylko raz pod pierwszym tytułem', async ({ page }) => {
  const md = '# A\n<!--layout:both-->\n\n- a1\n  - a11\n\n# B <!--c-->\n\n- b1\n\n# C\n\n';
  expect(await page.evaluate(m => serialize(parse(m)), md)).toBe(md);
  expect(
    await page.evaluate(m => {
      const f = parse(m);
      return [f.children.length, f.children[1].collapsed, dir];
    }, md)
  ).toEqual([3, true, 'both']);
});

test('<!--c--> oznacza zwinięty węzeł i jest usuwany z tekstu', async ({ page }) => {
  const { root } = await tree(page, '# T\n- a <!--c-->\n  - b\n');
  expect(root.children[0]).toEqual({ text: 'a', collapsed: true, children: [{ text: 'b', children: [] }] });
});

test('<!--layout:X--> ustawia kierunek', async ({ page }) => {
  for (const d of ['left', 'both', 'down', 'right'])
    expect((await tree(page, `# T\n<!--layout:${d}-->\n- a`)).dir).toBe(d);
});

test('serialize: format, zwinięcie tylko z dziećmi, layout tylko gdy ≠ right', async ({ page }) => {
  const out = await page.evaluate(() => {
    const r = parse('# T\n<!--layout:both-->\n- a <!--c-->\n  - b\n- liść <!--c-->\n');
    return serialize(r);
  });
  expect(out).toBe('# T\n<!--layout:both-->\n\n- a <!--c-->\n  - b\n- liść\n');
  expect(await page.evaluate(() => serialize(parse('# T\n- a')))).toBe('# T\n\n- a\n');
});

test('round-trip parse∘serialize jest stabilny (także znaki specjalne)', async ({ page }) => {
  const md =
    '# Zażółć <gęślą> & "jaźń"\n<!--layout:down-->\n\n- A & B\n  - <tag> <!--c-->\n    - głęboko\n- 100% * 2\n';
  expect(await page.evaluate(m => serialize(parse(m)), md)).toBe(md);
  expect(await page.evaluate(() => selfTest())).toBe(true);
});

test('komenda :test raportuje round-trip OK', async ({ page }) => {
  await page.keyboard.press(':');
  await page.keyboard.type('test');
  await page.keyboard.press('Enter');
  await expect(page.locator('#info')).toHaveText('round-trip OK');
});

test('widok tekstowy: edycja markdownu przebudowuje mapę', async ({ page }) => {
  await page.click('#bt');
  await page.fill('#txt', '# Nowa\n- x\n  - y\n- z\n');
  await page.keyboard.press('Escape');
  await expect(page.locator('#g .n')).toHaveCount(4);
  const texts = await page.$$eval('#g .n text', ts => ts.map(t => t.textContent).sort());
  expect(texts).toEqual(['Nowa', 'x', 'y', 'z']);
});
