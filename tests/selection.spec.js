// Zaznaczanie i odznaczanie; praca bez zaznaczenia.
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

test('dwuklik na tle odznacza węzeł (widok się nie zmienia)', async ({ page }) => {
  await loadMap(page, MD);
  const k0 = await page.evaluate(() => k);
  const sv = await page.locator('#sv').boundingBox();
  await page.mouse.dblclick(sv.x + 15, sv.y + sv.height - 15);
  expect(await page.evaluate(() => sel)).toBe(0);
  await expect(page.locator('#g .n.sel')).toHaveCount(0);
  expect(await page.evaluate(() => k)).toBe(k0);
  await expect(page.locator('#ed')).toBeHidden();
});

test.describe('bez zaznaczenia', () => {
  test('Esc odznacza; strzałka / j zaczyna od pierwszego korzenia', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => sel)).toBe(0);
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('Środek');
    await page.keyboard.press('Escape');
    await page.keyboard.press('j');
    expect(await selText(page)).toBe('Środek');
  });

  test('wklejanie bez zaznaczenia tworzy brata korzeni (nowy korzeń)', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight'); // Jeden
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+v');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n\n# Jeden\n\n- 1a\n- 1b\n');
    expect(await selText(page)).toBe('Jeden');
  });

  test('Enter bez zaznaczenia dodaje nowy korzeń; operacje na węźle tylko informują', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Escape');
    const before = await texts(page);
    for (const k of ['Delete', 'Control+x', 'Space', 'Alt+ArrowDown', 'F2']) await page.keyboard.press(k);
    expect(await texts(page)).toBe(before);
    await expect(page.locator('#info')).toHaveText('najpierw zaznacz węzeł');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Nowy temat');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toBe(before + '\n# Nowy temat\n\n');
  });

  test('menu bez zaznaczenia: nowy korzeń, wklej jako nowy korzeń; operacje na węźle wyłączone', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Escape');
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    await expect(act(page, 'sib').locator('span')).toHaveText('Nowy korzeń');
    await expect(act(page, 'paste').locator('span')).toHaveText('Wklej jako nowy korzeń');
    for (const a of ['child', 'emoji', 'fold', 'copy', 'cut', 'del']) await expect(act(page, a)).toBeDisabled();
    await act(page, 'paste').click();
    expect(await texts(page)).toContain('\n# Jeden\n');
  });
});
