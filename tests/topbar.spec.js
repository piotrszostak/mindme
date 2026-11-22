// Górny pasek: ikony, objaśnienia, kolejność, przełącznik Markdown/mapa, menu „…”.
const { test, expect } = require('@playwright/test');
const {
  open,
  loadMap,
  MD,
  LONG,
  box,
  texts,
  selText,
  menu,
  act,
  expectEditorOver,
  at,
  phParent,
} = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

test.describe('górny pasek', () => {
  test('tylko ikony z objaśnieniami; operacje na węzłach przeniesione do menu', async ({ page }) => {
    const btns = page.locator('#top button');
    await expect(btns).toHaveCount(7);
    for (const b of await btns.all()) {
      await expect(b.locator('svg.ic')).toHaveCount(1);
      expect((await b.innerText()).trim()).toBe('');
      expect(await b.getAttribute('data-tip')).toBeTruthy();
      expect(await b.getAttribute('aria-label')).toBe(await b.getAttribute('data-tip'));
    }
    for (const id of ['bn', 'bc', 'be', 'bd', 'bh']) await expect(page.locator('#' + id)).toHaveCount(0);
  });

  test('przełącznik Markdown/mapa jest widoczny i zmienia ikonę', async ({ page }) => {
    const bt = page.locator('#bt'),
      path = () => bt.locator('path').getAttribute('d');
    await expect(bt).toBeVisible();
    const mapIcon = await path();
    await expect(bt).toHaveAttribute('data-tip', /Markdown/);
    await bt.click();
    await expect(page.locator('#txt')).toBeVisible();
    expect(await path()).not.toBe(mapIcon);
    await expect(bt).toHaveClass(/on/);
    await expect(bt).toHaveAttribute('data-tip', /Wróć do mapy/);
    for (const id of ['bu', 'br', 'bl', 'bf']) await expect(page.locator('#' + id)).toBeDisabled();
    await bt.click();
    await expect(page.locator('#txt')).toBeHidden();
    expect(await path()).toBe(mapIcon);
    await expect(bt).not.toHaveClass(/on/);
    for (const id of ['bu', 'br', 'bl', 'bf']) await expect(page.locator('#' + id)).toBeEnabled();
  });

  test('zapis w widoku tekstowym zapisuje to, co jest w tekście', async ({ page }) => {
    await page.evaluate(() => {
      window.showSaveFilePicker = undefined;
    }); // bez systemowego okna → pobranie pliku
    await page.click('#bt');
    await page.fill('#txt', '# Z tekstu\n- a\n');
    const dl = page.waitForEvent('download');
    await page.click('#bm');
    await act(page, 'save').click();
    const f = await (await dl).path();
    expect(require('fs').readFileSync(f, 'utf8')).toBe('# Z tekstu\n\n- a\n');
  });

  test('objaśnienie pojawia się po najechaniu', async ({ page }) => {
    await page.hover('#bu');
    await page.waitForTimeout(600);
    const tip = await page.$eval('#bu', b => getComputedStyle(b, '::after').content);
    expect(tip).toContain('Cofnij');
  });

  test('przycisk układu pokazuje bieżący układ', async ({ page }) => {
    await page.click('#bl');
    await act(page, 'lay-both').click();
    await expect(page.locator('#bl')).toHaveAttribute('data-tip', /obie strony/);
    expect(await page.evaluate(() => dir)).toBe('both');
  });

  test('menu „więcej”: motyw, pomoc', async ({ page }) => {
    await page.click('#bm');
    await act(page, 'theme').click();
    const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('#bm');
    await act(page, 'theme').click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(t1);
    await page.click('#bm');
    await act(page, 'help').click();
    await expect(page.locator('#help')).toBeVisible();
    await page.click('#hx');
    await expect(page.locator('#help')).toBeHidden();
  });
});

test.describe('pasek: menu po lewej, panel wyglądu po prawej', () => {
  test('„…” jest pierwsze i zawiera „Otwórz”; po prawej przycisk wyglądu', async ({ page }) => {
    const ids = await page.$$eval('#top button', bs => bs.map(b => b.id));
    expect(ids[0]).toBe('bm');
    expect(ids[ids.length - 1]).toBe('bp');
    await expect(page.locator('#bo')).toHaveCount(0);
    await page.click('#bm');
    const m = await menu(page).boundingBox(),
      b = await page.locator('#bm').boundingBox();
    expect(Math.abs(m.x - b.x)).toBeLessThan(2); // rozwija się pod przyciskiem, przy lewej krawędzi
    await expect(page.locator('#menu button').first()).toHaveAttribute('data-act', 'open');
    await expect(act(page, 'open').locator('kbd')).toHaveText('Ctrl+O');
  });
});

test.describe('pasek: kolejność', () => {
  test('wszystko po lewej (menu, cofnij, ponów, układ, dopasuj, tekst/mapa); po prawej tylko wygląd', async ({
    page,
  }) => {
    const ids = await page.$$eval('#top button', bs => bs.map(b => b.id));
    expect(ids).toEqual(['bm', 'bu', 'br', 'bl', 'bf', 'bt', 'bp']);
    await expect(page.locator('#bs')).toHaveCount(0);
    const x = async id => (await page.locator('#' + id).boundingBox()).x;
    const w = page.viewportSize().width;
    expect(await x('bt')).toBeLessThan(w / 3); // ostatni z lewej grupy nadal przy lewej krawędzi
    expect(await x('bp')).toBeGreaterThan(w - 60); // panel wyglądu przy prawej krawędzi
    for (const id of ['bm', 'bu', 'br', 'bl', 'bf', 'bt']) await expect(page.locator('#' + id)).not.toHaveClass(/tr/);
    await expect(page.locator('#bp')).toHaveClass(/tr/);
  });

  test('„Zapisz” jest w menu „…” zaraz pod „Otwórz”, ze skrótem Ctrl+S', async ({ page }) => {
    await page.click('#bm');
    expect(await page.$$eval('#menu button', bs => bs.slice(0, 2).map(b => b.dataset.act))).toEqual(['open', 'save']);
    await expect(act(page, 'save').locator('kbd')).toHaveText('Ctrl+S');
    await page.evaluate(() => {
      window.showSaveFilePicker = undefined;
    });
    const dl = page.waitForEvent('download');
    await act(page, 'save').click();
    expect((await dl).suggestedFilename()).toBe('mapa.md');
  });
});
