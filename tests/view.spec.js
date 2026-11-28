// Widok i pomoc: podpowiedzi, dopasowanie, panel pomocy.
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

test('podpowiedź w pasku stanu po najechaniu na węzeł i tło', async ({ page }) => {
  await loadMap(page, MD);
  const b = await box(page, 'Dwa');
  await page.mouse.move(b.cx, b.cy);
  await expect(page.locator('#hint')).toContainText('dwuklik – edytuj');
  const sv = await page.locator('#sv').boundingBox();
  await page.mouse.move(sv.x + 10, sv.y + sv.height - 10);
  await expect(page.locator('#hint')).toContainText('kółko – zoom');
});

test('dwuklik na tle i „=” dopasowują widok do ekranu', async ({ page }) => {
  await loadMap(
    page,
    MD + '- ' + 'x '.repeat(5) + '\n'.repeat(1) + Array.from({ length: 30 }, (_, i) => `- węzeł ${i}`).join('\n')
  );
  await page.keyboard.press('=');
  const sv = await page.locator('#sv').boundingBox();
  const all = await page.$$eval('#g .n rect', rs =>
    rs.map(r => r.getBoundingClientRect()).map(r => ({ t: r.top, b: r.bottom }))
  );
  expect(Math.min(...all.map(r => r.t))).toBeGreaterThanOrEqual(sv.y);
  expect(Math.max(...all.map(r => r.b))).toBeLessThanOrEqual(sv.y + sv.height);
});

test.describe('pomoc', () => {
  test('komputer: panel na dolnej połowie, w kolumnach, mapa nad nim widoczna', async ({ page }) => {
    await page.keyboard.press('?');
    const h = await page.locator('#help').boundingBox(),
      m = await page.locator('#main').boundingBox();
    expect(Math.abs(h.y - (m.y + m.height / 2))).toBeLessThan(2);
    expect(Math.abs(h.y + h.height - (m.y + m.height))).toBeLessThan(2);
    const cols = await page.$eval('#help .hb', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
    expect(cols).toBeGreaterThan(1);
    await expect(page.locator('#help h3')).toHaveCount(7); // także „Szukanie”
    await expect(page.locator('#help kbd').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#help')).toBeHidden();
  });

  test('przycisk zamknięcia i klawisz ? przełączają pomoc; klik w treść jej nie zamyka', async ({ page }) => {
    await page.keyboard.press('?');
    await page.locator('#help h3').first().click();
    await expect(page.locator('#help')).toBeVisible();
    await page.keyboard.press('?');
    await expect(page.locator('#help')).toBeHidden();
    await page.click('#bm');
    await act(page, 'help').click();
    await page.click('#hx');
    await expect(page.locator('#help')).toBeHidden();
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    test('pełny ekran, jedna kolumna, czytelna czcionka, najpierw dotyk', async ({ page }) => {
      await page.click('#bm');
      await page.waitForTimeout(400);
      await act(page, 'help').click();
      const h = await page.locator('#help').boundingBox(),
        m = await page.locator('#main').boundingBox();
      const tl = await page.locator('#tl').boundingBox();
      expect(h.y).toBeGreaterThanOrEqual(tl.y + tl.height); // pod wyspami górnego paska, nagłówek pomocy widoczny
      expect(h.y).toBeLessThan(tl.y + tl.height + 10);
      expect(h.y + h.height).toBeCloseTo(m.y + m.height, 0); // do dołu mapy
      expect(await page.$eval('#help .hb', e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(1);
      expect(await page.$eval('#help dd', e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
      await expect(page.locator('#help h3').first()).toHaveText('Dotyk');
      const over = await page.$eval('#help .hb', e => e.scrollWidth - e.clientWidth);
      expect(over).toBeLessThanOrEqual(0); // nic nie wystaje w poziomie
      await page.click('#hx');
      await expect(page.locator('#help')).toBeHidden();
    });
  });
});

test('pomoc na komputerze przesuwa mapę nad panel i oddaje ją po zamknięciu', async ({ page }) => {
  const ty0 = await page.evaluate(() => ty);
  await page.keyboard.press('?');
  const h = await page.locator('#help').boundingBox();
  expect(await page.evaluate(() => ty)).toBeCloseTo(ty0 - h.height / 2, 0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => ty)).toBeCloseTo(ty0, 0);
});

test('pasek przewijania: cienki w każdym przewijanym miejscu, kolor zgodny z trybem', async ({ page }) => {
  // każde pole tekstowe i każdy element z overflow auto/scroll (także ukryte panele)
  const bars = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter(e => {
          const s = getComputedStyle(e);
          return e.tagName === 'TEXTAREA' || /auto|scroll/.test(s.overflowX + s.overflowY);
        })
        .map(e => {
          const s = getComputedStyle(e);
          return { id: e.id || e.className, w: s.scrollbarWidth, c: s.scrollbarColor };
        })
    );
  const theme = t => page.evaluate(t => (document.documentElement.dataset.theme = t), t);
  await page.evaluate(() => drawEmoji()); // siatka emoji powstaje dopiero przy otwarciu okienka
  await theme('light');
  const light = await bars();
  const ids = light.map(b => b.id);
  for (const id of ['pall', 'sb', 'txt', 'hb', 'grid', 'askf']) expect(ids).toContain(id);
  for (const b of light) {
    expect(b, b.id).toMatchObject({ w: 'thin' });
    expect(b.c, b.id).not.toBe('auto');
  }
  await theme('dark');
  const dark = await bars();
  for (const [i, b] of dark.entries()) {
    expect(b, b.id).toMatchObject({ w: 'thin' });
    expect(b.c, b.id).not.toBe(light[i].c); // ciemny tryb = inny kolor paska
  }
});
