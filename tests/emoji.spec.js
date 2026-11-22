// Okienko emoji i wstawianie emoji.
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

test.describe('emoji', () => {
  const pick = async (page, e) => {
    await page.locator(`#emo [data-e="${e}"]`).click();
  };
  test('z menu podręcznego: emoji na końcu tekstu węzła, cofalne', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'emoji').click();
    await expect(page.locator('#emo')).toBeVisible();
    await expect(page.locator('#emo .tabs button')).toHaveCount(6); // bez „Ostatnich”, dopóki nic nie użyto
    await page.locator('#emo [data-tab="Symbole"]').click();
    await pick(page, '✅');
    await expect(page.locator('#emo')).toBeHidden();
    expect(await texts(page)).toContain('- Dwa ✅\n');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Dwa\n');
  });

  test('w edycji: przycisk 😊 przy polu, wstawia w miejscu kursora, edycja trwa', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await page.mouse.dblclick(b.cx, b.cy);
    const eb = page.locator('#edemo'),
      ed = await page.locator('#ed').boundingBox();
    await expect(eb).toBeVisible();
    expect((await eb.boundingBox()).x).toBeGreaterThanOrEqual(ed.x + ed.width);
    await page.keyboard.press('Home');
    await eb.click();
    await pick(page, '😀');
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type(' x');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- 😀 xTrzy\n');
    await expect(eb).toBeHidden();
  });

  test('Ctrl+. w edycji i poza nią; Esc zamyka okienko, nie kończąc edycji; „Ostatnie”', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+.');
    await expect(page.locator('#emo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#emo')).toBeHidden();
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.press('Control+.');
    await page.locator('#emo [data-tab="Symbole"]').click();
    await expect(page.locator('#ed')).toBeFocused(); // zmiana zakładki nie zabiera fokusu
    await pick(page, '🔥');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa🔥\n');
    await page.keyboard.press('ArrowDown'); // Trzy
    await page.keyboard.press('Control+.');
    await expect(page.locator('#emo .cap')).toHaveText('Ostatnio użyte');
    await pick(page, '🔥');
    expect(await texts(page)).toContain('- Trzy 🔥\n');
  });

  test('klik obok zamyka okienko', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+.');
    await expect(page.locator('#emo')).toBeVisible();
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 10, sv.y + sv.height - 10);
    await expect(page.locator('#emo')).toBeHidden();
  });
});
