// Dołączone kroje (css/fonts.css, www/fonts/): polskie znaki, przeliczenie układu po wczytaniu pliku, osadzenie w eksporcie.
const { test, expect } = require('@playwright/test');
const { open, loadMap, box } = require('./helpers');

const PL = 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ';
const map = (font, text = 'Środek') => `<!--style:{"font":"${font}"}-->\n# ${text}\n- Jeden\n- Dwa\n`;

test.beforeEach(async ({ page }) => open(page));

for (const [key, fam] of [
  ['round', 'Nunito'],
  ['hand', 'Kalam'],
  ['narrow', 'Archivo Narrow'],
]) {
  test(`${key} → ${fam}: obie grubości wczytują się, polskie znaki z dołączonego kroju`, async ({ page }) => {
    await loadMap(page, map(key));
    const r = await page.evaluate(
      async ([fam, pl]) => {
        const out = [];
        for (const w of ['normal', 'bold']) {
          const f = await document.fonts.load(`${w} 16px '${fam}'`, 'A' + pl);
          /* brakujący znak wziąłby się z kroju zapasowego – z monospace i serif wyszłyby różne szerokości */
          const c = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d'));
          c.font = `${w} 16px '${fam}',monospace`;
          const a = c.measureText(pl).width;
          c.font = `${w} 16px '${fam}',serif`;
          out.push({
            faces: f.length,
            same: a === c.measureText(pl).width,
            check: document.fonts.check(`${w} 16px '${fam}'`, pl),
          });
        }
        return out;
      },
      [fam, PL]
    );
    for (const x of r) expect(x).toEqual({ faces: 2, same: true, check: true }); // latin + latin-ext
    expect(await page.evaluate(() => ff())).toMatch(new RegExp(`^"?${fam}"?,`));
  });
}

test('po wczytaniu kroju układ liczy się od nowa (szerokość węzła inna niż przy foncie zapasowym)', async ({
  page,
}) => {
  const text = 'Długi tekst węzła do pomiaru szerokości';
  const sys = (await loadMap(page, map('system', text)))[0].w;
  /** @type {(() => void) | null} */
  let release = null;
  const held = new Promise(r => (release = r));
  await page.route('**/fonts/*.woff2', async route => {
    await held;
    await route.continue();
  });
  /* od nowa, bo kroje mógł już pobrać ukryty panel wyglądu (przyciski z podglądem czcionek) */
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#info')).toContainText('round-trip OK');
  await loadMap(page, map('round', text));
  const nunito = () =>
    page.evaluate(() => [...document.fonts].filter(f => f.family.includes('Nunito') && f.status === 'loaded').length);
  /* plik jeszcze nie doszedł – mapa już narysowana, pomiar czcionką zapasową */
  expect(await nunito()).toBe(0);
  const fallback = await page.evaluate(() => root.children[0].w);
  release();
  await expect.poll(() => page.evaluate(() => root.children[0].w)).not.toBe(fallback);
  expect(await nunito()).toBe(2); // latin + latin-ext
  const after = await page.evaluate(() => root.children[0].w);
  expect(after).not.toBe(sys);
  /* pomiar od zera daje to samo – po wczytaniu nie zostało nic ze starego pomiaru */
  expect(await page.evaluate(() => ((stDirty = true), render(true), root.children[0].w))).toBe(after);
  const id = (await box(page, text)).id;
  expect(await page.$eval(`#g .n[data-id="${id}"] rect`, r => Number(r.getAttribute('width')))).toBe(after); // przerysowane
});

test('zmiana kroju na dołączony (jak w panelu) przelicza układ po wczytaniu', async ({ page }) => {
  await loadMap(page, map('system', 'Wąska nazwa'));
  const sys = await page.evaluate(() => root.children[0].w);
  await page.evaluate(() => {
    snap();
    ST.font = 'narrow';
    stDirty = true;
    changed(true);
  });
  await expect.poll(() => page.evaluate(() => document.fonts.check("16px 'Archivo Narrow'"))).toBe(true);
  await expect.poll(() => page.evaluate(() => root.children[0].w)).toBeLessThan(sys);
});

test('eksport SVG: dołączony krój osadzony (tylko potrzebne podzbiory), systemowy – bez', async ({ page }) => {
  const faces = s => (s.match(/@font-face/g) || []).length;
  await loadMap(page, map('round'));
  let s = await page.evaluate(async () => (await exportSvg()).s);
  expect(s).toContain('data:font/woff2;base64,');
  expect(s).toContain("font-family:'Nunito'");
  expect(faces(s)).toBe(2); // „Środek”: latin + latin-ext

  await loadMap(page, map('round', 'Ascii'));
  s = await page.evaluate(async () => (await exportSvg()).s);
  expect(faces(s)).toBe(1); // sam latin

  await loadMap(page, '<!--style:{"font":"hand","weight":"bold"}-->\n# Środek\n');
  s = await page.evaluate(async () => (await exportSvg()).s);
  expect(s).toMatch(/@font-face\{font-family:'Kalam';font-weight:700;src:url\(data:font\/woff2;base64,/);

  await loadMap(page, map('system'));
  s = await page.evaluate(async () => (await exportSvg()).s);
  expect(s).not.toContain('@font-face');
  expect(s).not.toContain('data:font');
});

test('eksport PNG: obraz SVG rysuje się osadzonym krojem', async ({ page }) => {
  await loadMap(page, map('hand', 'Środek mapy łąka'));
  const diff = await page.evaluate(async () => {
    const { s, w, h } = await exportSvg();
    /** piksele obrazu SVG narysowanego na canvas – tak jak w exportImg('png') @param {string} svg */
    const pixels = svg =>
      new Promise(res => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
          x.drawImage(im, 0, 0);
          res(x.getImageData(0, 0, w, h).data);
        };
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
    const a = await pixels(s),
      b = await pixels(s.replace(/@font-face\{[^}]*\}/g, ''));
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  });
  expect(diff).toBeGreaterThan(100); // z osadzonym krojem tekst wygląda inaczej niż czcionką zapasową
});
