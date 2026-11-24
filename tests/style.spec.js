// Panel „Wygląd mapy”: suwaki, czcionki, palety, zapis stylu.
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

test.describe('panel „Wygląd mapy”', () => {
  const path0 = page => page.$eval('#g path', p => p.getAttribute('stroke-width'));
  const open = async page => {
    await page.click('#bp');
    await expect(page.locator('#side')).toBeVisible();
  };

  test('otwieranie i zamykanie: przycisk, ×, Esc', async ({ page }) => {
    await open(page);
    await expect(page.locator('#bp')).toHaveClass(/on/);
    await page.click('#sx');
    await expect(page.locator('#side')).toBeHidden();
    await open(page);
    await page.locator('#st-edge').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#side')).toBeHidden();
    await expect(page.locator('#bp')).not.toHaveClass(/on/);
  });

  test('fokus w wysuwającym się panelu nie przesuwa mapy', async ({ page }) => {
    // kliknięcie i fokus w jednym kroku: panel jest jeszcze za prawą krawędzią (animacja wysuwania)
    const r = await page.evaluate(() => {
      const x0 = $('sv').getBoundingClientRect().x;
      $('bp').click();
      document.querySelector('#st-edge').focus();
      return { scroll: $('main').scrollLeft, moved: $('sv').getBoundingClientRect().x - x0 };
    });
    expect(r).toEqual({ scroll: 0, moved: 0 });
  });

  test('suwaki zmieniają mapę na żywo: linie, obramowanie, rogi, tekst, odstępy', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const before = await box(page, 'Jeden'),
      r0 = await box(page, 'Środek');
    await page.locator('#st-edge').fill('5');
    expect(await path0(page)).toBe('5');
    await page.locator('#st-radius').fill('0');
    expect(await page.$eval('#g .n rect', r => r.getAttribute('rx'))).toBe('0');
    await page.locator('#st-nb').fill('4');
    expect(await page.$eval('#g .n:not(.sel) rect', r => getComputedStyle(r).strokeWidth)).toBe('4px');
    await page.locator('#st-gapX').fill('120');
    const after = await box(page, 'Jeden'),
      r1 = await box(page, 'Środek');
    expect(after.x - r1.x - (before.x - r0.x)).toBeCloseTo(70, 0); // 50 → 120 px między poziomami
    await page.locator('#st-fs').fill('20');
    expect((await box(page, 'Jeden')).h).toBeGreaterThan(before.h);
    await expect(page.locator('#so-fs')).toHaveText('20 px');
  });

  test('kształt linii i wypełnienie', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="straight"]');
    expect(await page.$eval('#g path', p => p.getAttribute('d'))).toMatch(/^M[-\d. ]+L/);
    await expect(page.locator('#side .seg[data-k="edgeStyle"] button[data-v="straight"]')).toHaveClass(/on/);
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]');
    expect(await page.$eval('#g path', p => p.getAttribute('d'))).toMatch(/H[-\d.]+V[-\d.]+H/);
    await page.click('#side .seg[data-k="fill"] button[data-v="solid"]');
    const j = await box(page, 'Jeden');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.style.fill)).not.toBe('');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] text`, t => t.style.fill)).toMatch(/255, 255, 255|#fff/);
  });

  test('kolory gałęzi tylko z presetów (min. 6), wybór zmienia mapę', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const names = await page.$$eval('#side [data-pal]', bs => bs.map(b => b.dataset.pal));
    expect(names.length).toBeGreaterThanOrEqual(6);
    await expect(page.locator('#side input[type=color]').first()).toBeHidden(); // próbniki schowane
    await expect(page.locator('#side [data-pal="Domyślna"]')).toHaveClass(/on/);
    await page.click('#side [data-pal="Monochromatyczna"]');
    const strokes = await page.$$eval('#g path', ps => [...new Set(ps.map(p => p.getAttribute('stroke')))]);
    expect(strokes).toEqual(['#2f6fed']);
    await expect(page.locator('#side [data-pal="Monochromatyczna"]')).toHaveClass(/on/);
    expect(await texts(page)).toContain('"palette":"Monochromatyczna"');
    await page.click('#side [data-pal="Ocean"]');
    const j = await box(page, 'Jeden');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#0077b6');
  });

  test('edycja presetu: zmienia paletę na urządzeniu i mapę; można przywrócić oryginał', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.click('#side [data-pal="Las"]');
    await page.click('#paledit');
    await expect(page.locator('#paledit')).toContainText('Las');
    await expect(page.locator('#palreset')).toBeHidden();
    await page.locator('#side input[data-ci="0"]').fill('#123456');
    const j = await box(page, 'Jeden');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#123456');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mm.pal')).Las[0])).toBe('#123456');
    await page.click('#side [data-pal="Ocean"]');
    await page.click('#side [data-pal="Las"]'); // wybór presetu bierze wersję poprawioną
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#123456');
    await page.click('#palreset');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#2d6a4f');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mm.pal')).Las)).toBeUndefined();
  });

  test('czcionka i grubość tekstu: mapa, pomiar zawijania, pole edycji, plik', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const w0 = (await box(page, 'Jeden')).w;
    await page.click('#side .seg[data-k="font"] button[data-v="mono"]');
    expect(await page.$eval('#g .n text', t => getComputedStyle(t).fontFamily)).toMatch(/monospace/);
    expect((await box(page, 'Jeden')).w).not.toBe(w0); // szerokość mierzona nową czcionką
    await page.click('#side .seg[data-k="weight"] button[data-v="bold"]');
    expect(await page.$eval('#g .n text', t => getComputedStyle(t).fontWeight)).toBe('700');
    expect(await texts(page)).toContain('"font":"mono","weight":"bold"');
    await page.click('#sx');
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    expect(
      await page.$eval('#ed', e => [getComputedStyle(e).fontFamily, getComputedStyle(e).fontWeight].join('|'))
    ).toMatch(/monospace.*\|700/);
    await expectEditorOver(page, 'Dwa');
  });

  test('styl zapisuje się w pliku mapy i wraca po wczytaniu; „Przywróć domyślne”', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.locator('#st-edge').fill('4');
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]');
    const md = await texts(page);
    expect(md).toBe(
      '# Środek\n<!--style:{"edge":4,"edgeStyle":"elbow"}-->\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n'
    );
    await page.click('#sreset');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
    expect(await path0(page)).toBe('2');
    await loadMap(page, md); // wczytanie pliku ze stylem
    expect(await path0(page)).toBe('4');
    await expect(page.locator('#st-edge')).toHaveValue('4');
    await expect(page.locator('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]')).toHaveClass(/on/);
    expect(await page.evaluate(() => selfTest())).toBe(true);
  });

  test('zmiana stylu jest cofalna (jedno przeciągnięcie suwaka = jeden krok)', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const s = page.locator('#st-edge');
    for (const v of ['3', '4', '6'])
      await s.evaluate((r, v) => {
        r.value = v;
        r.dispatchEvent(new Event('input'));
      }, v);
    await s.evaluate(r => r.dispatchEvent(new Event('change')));
    expect(await path0(page)).toBe('6');
    await page.locator('#sx').click();
    await page.keyboard.press('Control+z');
    expect(await path0(page)).toBe('2');
    await page.keyboard.press('Control+y');
    expect(await path0(page)).toBe('6');
  });

  test('strzałki na suwaku nie przesuwają zaznaczenia na mapie', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.locator('#st-gapY').focus();
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Środek');
    await expect(page.locator('#st-gapY')).toHaveValue('11');
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    test('panel zajmuje całą szerokość', async ({ page }) => {
      await page.click('#bp');
      await page.waitForTimeout(400);
      const b = await page.locator('#side').boundingBox();
      expect(b.x).toBeCloseTo(0, 0);
      expect(b.width).toBeCloseTo(390, 0);
    });
  });
});
