// Klawiatura w interfejsie: strzałki zgodne z układem, Del, Ctrl+Z/Y/C/V, Alt+strzałki.
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

test.describe('klawiatura', () => {
  test('strzałki zgodne z układem', async ({ page }) => {
    await loadMap(page, MD); // prawo, zaznaczony korzeń
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('1a');
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('1b');
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('Jeden');
    await loadMap(page, MD.replace('\n', '\n<!--layout:left-->\n'));
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Środek');
    await loadMap(page, MD.replace('\n', '\n<!--layout:down-->\n'));
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Dwa');
    await page.keyboard.press('ArrowUp');
    expect(await selText(page)).toBe('Środek');
  });

  test('obie strony: strzałki wybierają dzieci po właściwej stronie', async ({ page }) => {
    await loadMap(page, '# R\n<!--layout:both-->\n- p1\n- p2\n- l1\n- l2\n');
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('l1');
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('l2');
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('l2'); // nie przeskakuje na prawą stronę
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('R');
  });

  test('Del, Ctrl+Z/Y, Ctrl+C/V, Shift+Spacja, Tab, F2', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight'); // Jeden
    await page.keyboard.press('Shift+Space');
    expect(await texts(page)).toContain('- Jeden <!--c-->');
    await page.keyboard.press('Shift+Space');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('ArrowDown'); // Dwa
    await page.keyboard.press('Control+v');
    expect(await texts(page)).toContain('- Dwa\n  - Jeden\n');
    await page.keyboard.press('Delete');
    expect(await texts(page)).not.toContain('- Dwa\n  - Jeden');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Dwa\n  - Jeden\n');
    await page.keyboard.press('Control+y');
    expect(await texts(page)).not.toContain('- Dwa\n  - Jeden');
    await page.keyboard.press('Tab');
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.keyboard.press('F2');
    await expect(page.locator('#ed')).toBeFocused();
  });

  test('Alt+strzałki przesuwają i zmieniają poziom', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown'); // Dwa
    await page.keyboard.press('Alt+ArrowRight'); // pod Jeden
    expect(await texts(page)).toContain('  - 1b\n  - Dwa\n');
    await page.keyboard.press('Alt+ArrowLeft');
    await page.keyboard.press('Alt+ArrowDown');
    expect(await texts(page)).toMatch(/- Trzy\n- Dwa\n$/);
  });
});
