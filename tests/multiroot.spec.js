// Wiele korzeni w jednej mapie.
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

test.describe('wiele korzeni', () => {
  const MULTI = '# A\n- a1\n  - a11\n- a2\n\n# B\n- b1\n- b2\n\n# C\n- c1\n';
  test('drzewa nie nachodzą na siebie w żadnym układzie', async ({ page }) => {
    for (const d of ['right', 'left', 'both', 'down']) {
      const list = await loadMap(page, MULTI.replace('\n', `\n<!--layout:${d}-->\n`));
      expect(list.map(b => b.text)).toEqual(['A', 'a1', 'a11', 'a2', 'B', 'b1', 'b2', 'C', 'c1']);
      require('./helpers').expectNoOverlaps(list);
    }
  });

  test('strzałki i Home poruszają się między korzeniami', async ({ page }) => {
    await loadMap(page, MULTI); // zaznaczony A
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('B');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('b1');
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('B');
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('B'); // korzeń nie ma rodzica
    await page.keyboard.press('Home');
    expect(await selText(page)).toBe('A');
  });

  test('przeciągnięcie korzenia pod węzeł innego drzewa i węzła obok korzenia', async ({ page }) => {
    await loadMap(page, MULTI);
    await page.mouse.move(...[(await box(page, 'C')).cx, (await box(page, 'C')).cy]);
    await page.mouse.down();
    await page.mouse.move((await box(page, 'C')).cx + 15, (await box(page, 'C')).cy, { steps: 3 });
    const t = await box(page, 'b2');
    await page.mouse.move(t.x + t.w * 0.85, t.cy, { steps: 8 });
    await page.mouse.up();
    expect(await texts(page)).toBe('# A\n\n- a1\n  - a11\n- a2\n\n# B\n\n- b1\n- b2\n  - C\n    - c1\n');
    const a = await box(page, 'a2'),
      r = await box(page, 'B');
    await page.mouse.move(a.cx, a.cy);
    await page.mouse.down();
    await page.mouse.move(a.cx + 15, a.cy, { steps: 3 });
    await page.mouse.move(r.x + r.w * 0.15, r.y + r.h * 0.2, { steps: 8 });
    await page.mouse.up();
    expect(await texts(page)).toContain('# A\n\n- a1\n  - a11\n\n# a2\n\n# B\n'); // a2 stał się korzeniem przed B
  });
});
