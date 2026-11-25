// Gesty dotykowe (symulowane zdarzenia pointer).
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

test.describe('dotyk', () => {
  const touch = (page, type, x, y, id = 7) =>
    page.evaluate(
      ([type, x, y, id]) => {
        const t = type === 'pointerdown' ? document.elementFromPoint(x, y) : document.getElementById('sv');
        t.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'touch',
            pointerId: id,
            isPrimary: true,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 0,
          })
        );
      },
      [type, x, y, id]
    );
  const tap = async (page, x, y) => {
    await touch(page, 'pointerdown', x, y);
    await touch(page, 'pointerup', x, y);
  };
  async function swipe(page, [x0, y0], [x1, y1], { up = true } = {}) {
    await touch(page, 'pointerdown', x0, y0);
    for (let i = 1; i <= 8; i++) await touch(page, 'pointermove', x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
    if (up) await touch(page, 'pointerup', x1, y1);
  }

  test('przytrzymanie węzła → zaznacza i otwiera to samo menu co PPM', async ({ page }) => {
    await loadMap(page, MD);
    const r = await box(page, 'Dwa');
    await page.mouse.click(r.cx, r.cy, { button: 'right' });
    const desktop = await menu(page).innerText();
    await page.keyboard.press('Escape');
    const b = await box(page, 'Trzy');
    await touch(page, 'pointerdown', b.cx, b.cy);
    await page.waitForTimeout(650);
    await expect(menu(page)).toBeVisible();
    await expect(page.locator('#ed')).toBeHidden();
    expect(await selText(page)).toBe('Trzy');
    expect(await menu(page).innerText()).toBe(desktop.replace('Węzeł: Dwa', 'Węzeł: Trzy'));
    expect(await page.$eval('#menu', m => m.style.pointerEvents)).toBe('none'); // palec nie „kliknie” pozycji pod sobą
    await touch(page, 'pointerup', b.cx, b.cy);
    await expect(menu(page)).toBeVisible(); // puszczenie nie zamyka menu
    await page.waitForTimeout(400);
    await act(page, 'child').click();
    await expect(page.locator('#ed')).toBeFocused();
  });

  test('przytrzymanie tła → odznacza węzeł (bez menu)', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await tap(page, b.cx, b.cy);
    const sv = await page.locator('#sv').boundingBox();
    await page.waitForTimeout(450);
    await touch(page, 'pointerdown', sv.x + 15, sv.y + sv.height - 15);
    await page.waitForTimeout(650);
    await expect(menu(page)).toBeHidden();
    expect(await page.evaluate(() => sel)).toBe(0);
    await expect(page.locator('#g .n.sel')).toHaveCount(0);
    await touch(page, 'pointerup', sv.x + 15, sv.y + sv.height - 15);
  });

  test('podwójne stuknięcie tła bez zaznaczenia → menu całej mapy', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => deselect());
    const sv = await page.locator('#sv').boundingBox();
    await tap(page, sv.x + 15, sv.y + sv.height - 15);
    await tap(page, sv.x + 15, sv.y + sv.height - 15);
    await expect(page.locator('#menu .mh')).toHaveText('Brak zaznaczenia – cała mapa');
  });

  test('ruch palcem przed upływem przytrzymania nie otwiera menu', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox();
    await touch(page, 'pointerdown', sv.x + 20, sv.y + 20);
    await touch(page, 'pointermove', sv.x + 60, sv.y + 40);
    await page.waitForTimeout(650);
    await expect(menu(page)).toBeHidden();
    await touch(page, 'pointerup', sv.x + 60, sv.y + 40);
  });

  test('podwójne stuknięcie węzła → edycja w węźle', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await tap(page, b.cx, b.cy);
    await tap(page, b.cx, b.cy);
    await expect(page.locator('#ed')).toBeFocused();
    await expectEditorOver(page, 'Trzy');
    await expect(menu(page)).toBeHidden();
  });

  test('podwójne stuknięcie tła → to samo menu co PPM, dla zaznaczonego węzła', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    const desktop = await menu(page).innerText();
    await page.keyboard.press('Escape');
    const sv = await page.locator('#sv').boundingBox();
    await tap(page, sv.x + 15, sv.y + sv.height - 15);
    await tap(page, sv.x + 15, sv.y + sv.height - 15);
    await expect(menu(page)).toBeVisible();
    expect(await selText(page)).toBe('Dwa');
    expect(await menu(page).innerText()).toBe(desktop);
    expect(await page.$eval('#menu', m => m.style.pointerEvents)).toBe('none'); // chwila ochrony przed przypadkowym stuknięciem
    await page.waitForTimeout(400);
    await act(page, 'child').click();
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type('nowe');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- Dwa\n  - nowe\n');
  });

  test('pojedyncze stuknięcie tylko zaznacza', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await tap(page, b.cx, b.cy);
    await page.waitForTimeout(600);
    expect(await selText(page)).toBe('Trzy');
    await expect(menu(page)).toBeHidden();
    await expect(page.locator('#ed')).toBeHidden();
  });

  test('systemowe „przytrzymanie” (contextmenu z Androida) od razu otwiera nasze menu', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await touch(page, 'pointerdown', b.cx, b.cy);
    await page.waitForTimeout(300); // przed naszym licznikiem 500 ms
    await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x, y).dispatchEvent(
          new PointerEvent('contextmenu', {
            pointerType: 'touch',
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          })
        ),
      [b.cx, b.cy]
    );
    await expect(menu(page)).toBeVisible();
    expect(await selText(page)).toBe('Dwa');
    await page.waitForTimeout(400); // licznik nie otwiera menu drugi raz
    await expect(page.locator('#menu .mh')).toHaveCount(1);
    await touch(page, 'pointerup', b.cx, b.cy);
    await expect(menu(page)).toBeVisible();
  });

  test('przeciągnięcie węzła palcem przenosi go', async ({ page }) => {
    await loadMap(page, MD);
    await swipe(
      page,
      [(await box(page, 'Trzy')).cx, (await box(page, 'Trzy')).cy],
      at(await box(page, '1b'), 0.85, 0.5)
    );
    expect(await texts(page)).toContain('  - 1b\n    - Trzy\n');
  });

  test('przeciągnięcie tła palcem przesuwa widok', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox(),
      r0 = await box(page, 'Środek');
    await swipe(page, [sv.x + 20, sv.y + 20], [sv.x + 100, sv.y + 60]);
    const r1 = await box(page, 'Środek');
    expect(r1.x - r0.x).toBeCloseTo(80, 0);
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
  });
});

test.describe('dotyk: „Wklej” w menu po przytrzymaniu bierze schowek systemowy', () => {
  const MD = '# R\n- a\n- b\n';
  const openTouchMenu = async page => {
    await page.evaluate(() => ctxMenu(100, 100, true));
    await page.waitForTimeout(400); /* menu dotykowe przez 350 ms nie przyjmuje stuknięć */
  };

  test('tekst z innej aplikacji wkleja się ze strukturą; bez schowka systemowego – gałąź z aplikacji', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadMap(page, MD);
    await page.evaluate(() => navigator.clipboard.writeText('# Lista\n- x\n  - y'));
    await page.evaluate(() => go(vis().find(n => n.text === 'b').id));
    await openTouchMenu(page);
    await expect(act(page, 'paste')).toBeEnabled(); // nic nie skopiowano w aplikacji, ale schowek systemowy ma tekst
    await act(page, 'paste').click();
    await expect(page.locator('#info')).toHaveText('wklejono 3 węzły');
    expect(await page.evaluate(() => serialize(root))).toBe('# R\n\n- a\n- b\n  - Lista\n    - x\n      - y\n');

    /* przeglądarka odmawia odczytu – wkleja się gałąź skopiowana w aplikacji */
    await page.evaluate(() => {
      const no = () => Promise.reject(new DOMException('', 'NotAllowedError'));
      Object.defineProperty(navigator, 'clipboard', { value: { read: no, readText: no, writeText: no } });
      go(vis().find(n => n.text === 'a').id);
      copy();
      go(vis().find(n => n.text === 'b').id);
    });
    await openTouchMenu(page);
    await act(page, 'paste').click();
    await expect(page.locator('#info')).toHaveText('wklejono 1 węzeł');
    expect(await page.evaluate(() => S().p.text)).toBe('b');
  });

  test('na komputerze (prawy przycisk) „Wklej” zostaje przy schowku aplikacji', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => ctxMenu(100, 100));
    await expect(act(page, 'paste')).toBeDisabled(); // nic nie skopiowano w aplikacji
  });
});
