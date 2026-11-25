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

// Strażnik formatu: plik zapisany przez wersję 0.3 – nie zmieniać. Nowy format = nowa stała obok, stare muszą się wczytywać.
const FORMAT_0_3 =
  '# 🗺️ Plan & „marzenia” <!--c-->\n<!--layout:both-->\n<!--style:{"edgeStyle":"elbow","fs":16}-->\n\n' +
  '- Praca <b>\n  - Projekt "Alfa" <!--c-->\n    - Szczegół 100%\n  - Spotkania\n- Dom 🏠\n\n' +
  '# Pusty\n\n# Drugi korzeń\n\n- Jeden\n  - Dwa\n';

test('strażnik formatu: plik z wersji 0.3 wczytuje się bez strat', async ({ page }) => {
  const { roots, dir } = await tree(page, FORMAT_0_3);
  expect(dir).toBe('both');
  expect(await page.evaluate(() => [ST.edgeStyle, ST.fs])).toEqual(['elbow', 16]);
  expect(roots).toEqual([
    {
      text: '🗺️ Plan & „marzenia”',
      collapsed: true,
      children: [
        {
          text: 'Praca <b>',
          children: [
            { text: 'Projekt "Alfa"', collapsed: true, children: [{ text: 'Szczegół 100%', children: [] }] },
            { text: 'Spotkania', children: [] },
          ],
        },
        { text: 'Dom 🏠', children: [] },
      ],
    },
    { text: 'Pusty', children: [] },
    { text: 'Drugi korzeń', children: [{ text: 'Jeden', children: [{ text: 'Dwa', children: [] }] }] },
  ]);
  expect(await page.evaluate(m => serialize(parse(m)), FORMAT_0_3)).toBe(FORMAT_0_3);
});

test('strażnik formatu: mapa z autozapisu (mm.md) otwiera się po starcie', async ({ page }) => {
  await page.addInitScript(md => localStorage.setItem('mm.md', md), FORMAT_0_3);
  await open(page);
  expect(await page.evaluate(() => serialize(root))).toBe(FORMAT_0_3);
  await expect(page.locator('#g')).toContainText('Jeden');
});

// Strażnik formatu (frontmatter, od 2026-11-25): blok `---` z pierwszej linii zostaje w pliku bez zmian.
const FM_BLOCK = '---\ntitle: "Wyjazd"  \ntags:\n  - wyjazd\n  - lato\nopis: |\n\n\tlinia z tabulatorem\n---';
const FORMAT_FM = FM_BLOCK + '\n# Plan <!--c-->\n<!--layout:both-->\n\n- Bilety\n  - Pociąg\n\n# Drugi\n\n- x\n';

test('frontmatter: zostaje w pliku bez zmian i nie trafia na mapę', async ({ page }) => {
  const { roots } = await tree(page, FORMAT_FM);
  expect(roots).toEqual([
    { text: 'Plan', collapsed: true, children: [{ text: 'Bilety', children: [{ text: 'Pociąg', children: [] }] }] },
    { text: 'Drugi', children: [{ text: 'x', children: [] }] },
  ]);
  expect(await page.evaluate(m => serialize(parse(m)), FORMAT_FM)).toBe(FORMAT_FM);
});

test('frontmatter tylko od pierwszej linii i tylko z zamykającym ---', async ({ page }) => {
  const save = md => page.evaluate(m => serialize(parse(m)), md);
  expect(await save('# T\n---\na: 1\n---\n- x\n')).toBe('# T\n\n- x\n');
  expect(await save('\n---\na: 1\n---\n# T\n')).toBe('# T\n\n');
  expect(await save('---\na: 1\n# T\n- x\n')).toBe('# T\n\n- x\n');
  expect(await save('---\n---\n# T\n')).toBe('---\n---\n# T\n\n');
  expect(await save('---\r\na: 1\r\n---\r\n# T\r\n- x\r\n')).toBe('---\na: 1\n---\n# T\n\n- x\n');
});

test('frontmatter: przechowują go autozapis, cofanie i widok tekstowy; nowa mapa zaczyna bez niego', async ({
  page,
}) => {
  await page.addInitScript(md => localStorage.setItem('mm.md', md), FORMAT_FM);
  await open(page);
  expect(await page.evaluate(() => serialize(root))).toBe(FORMAT_FM);
  expect(await page.evaluate(() => selfTest())).toBe(true);

  await page.click('#bt');
  expect(await page.inputValue('#txt')).toBe(FORMAT_FM);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => serialize(root))).toBe(FORMAT_FM);

  await page.evaluate(() => load('# Inna\n\n- y\n'));
  expect(await page.evaluate(() => root.fm)).toBeUndefined();
  await page.evaluate(() => undo());
  expect(await page.evaluate(() => serialize(root))).toBe(FORMAT_FM);

  /* nowa mapa zachowuje bieżący układ (tu „obie strony”), ale nie frontmatter */
  await page.evaluate(() => newMap('Nowa'));
  expect(await page.evaluate(() => serialize(root))).toBe('# Nowa\n<!--layout:both-->\n\n');
});

// Strażnik formatu (wiele linii w węźle, od 2026-11-25): wcięta linia tuż pod punktem to dalszy ciąg tekstu węzła.
const FORMAT_ML =
  '# R\n\n- pierwsza\n  druga linia\n  - dziecko\n    linia dziecka\n- zwinięty <!--c-->\n  ciąg dalszy\n  - ukryty\n' +
  '- z ucieczką\n  \\- nie lista\n  \\> nie cytat\n  \\# nie nagłówek\n  \\1. nie numer\n  \\<!-- nie znacznik\n  \\\\ukośnik\n';

test('wiele linii w węźle: wcięte linie pod punktem to dalszy ciąg tekstu; zapis bez zmian', async ({ page }) => {
  const { root } = await tree(page, FORMAT_ML);
  expect(root.children).toEqual([
    {
      text: 'pierwsza\ndruga linia',
      children: [{ text: 'dziecko\nlinia dziecka', children: [] }],
    },
    { text: 'zwinięty\nciąg dalszy', collapsed: true, children: [{ text: 'ukryty', children: [] }] },
    {
      text: 'z ucieczką\n- nie lista\n> nie cytat\n# nie nagłówek\n1. nie numer\n<!-- nie znacznik\n\\ukośnik',
      children: [],
    },
  ]);
  expect(await page.evaluate(m => serialize(parse(m)), FORMAT_ML)).toBe(FORMAT_ML);
  expect(await page.evaluate(m => parse(m).skip, FORMAT_ML)).toBe(0);
});

test('wiele linii: dalszy ciąg musi być wcięty; cytat, nagłówek, numer, znacznik i akapit po pustej linii – nie', async ({
  page,
}) => {
  const md =
    '# R\n\n- a\nbez wcięcia\n- b\n  > cytat\n  <!--znacznik-->\n  ## nagłówek\n  1. numer\n\n  po pustej linii\n- c\n';
  const { root } = await tree(page, md);
  expect(root.children.map(n => n.text)).toEqual(['a', 'b', 'c']);
  expect(await page.evaluate(m => parse(m).skip, md)).toBe(6);
  expect(await page.evaluate(() => parse('# R\nakapit pod tytułem\n- a\n').skip)).toBe(1); // pod tytułem mapy – jak dotąd
});

test('wiele linii: puste linie w tekście węzła nie trafiają do pliku', async ({ page }) => {
  const out = await page.evaluate(() => {
    const t = parse('# R\n\n- x\n');
    t.children[0].children[0].text = 'a\n\n   \nb';
    return serialize(t);
  });
  expect(out).toBe('# R\n\n- a\n  b\n');
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
