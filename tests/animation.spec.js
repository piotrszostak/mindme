// Animacje: sprężyny, wyrastanie i chowanie węzłów.
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

test.describe('animacja', () => {
  test.use({ reducedMotion: 'no-preference' });
  const offset = (page, text) =>
    page.evaluate(t => {
      const n = vis().find(n => n.text === t),
        g = document.querySelector(`#g .n[data-id="${n.id}"]`);
      const m = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(g.getAttribute('transform') || 'translate(0 0)');
      return Math.hypot(+m[1], +m[2]);
    }, text);

  test('zmiany układu są płynne i kończą się dokładnie w docelowym miejscu', async ({ page }) => {
    await loadMap(page, MD);
    await page.waitForTimeout(1500);
    expect(await offset(page, 'Dwa')).toBe(0);
    await page.keyboard.press('ArrowRight'); // Jeden
    await page.keyboard.press('Shift+Space'); // zwiń → Dwa i Trzy podjeżdżają
    await page.waitForTimeout(30);
    expect(await offset(page, 'Dwa')).toBeGreaterThan(1); // w ruchu
    await page.waitForTimeout(1500);
    expect(await offset(page, 'Dwa')).toBe(0); // osiadł
    expect(await page.evaluate(() => raf)).toBe(0); // pętla animacji zatrzymana
  });

  test('nowy węzeł wyrasta z rodzica', async ({ page }) => {
    await loadMap(page, MD);
    await page.waitForTimeout(1500);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'child').click();
    const d = await page.evaluate(() => {
      const n = S().n,
        p = pos.get(n.id),
        q = pos.get(find(n.id).p.id);
      return { start: Math.hypot(p.x - q.x, p.y - q.y), target: Math.hypot(n.x - q.x, n.y - q.y) };
    });
    expect(d.start).toBeLessThan(d.target);
  });

  test('potomkowie przeciąganego węzła podążają z opóźnieniem (sprężyście)', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => deselect()); // pasek nad zaznaczonym korzeniem zasłania „Jeden”
    await page.waitForTimeout(1500);
    const j = await box(page, 'Jeden'),
      a0 = await box(page, '1a');
    const rel0 = a0.y - j.y;
    await page.mouse.move(j.cx, j.cy);
    await page.mouse.down();
    await page.mouse.move(j.cx + 10, j.cy + 5, { steps: 2 });
    await page.mouse.move(j.cx + 10, j.cy + 200, { steps: 2 }); // szybki ruch w dół
    const j1 = await box(page, 'Jeden'),
      a1 = await box(page, '1a');
    expect(Math.abs(a1.y - j1.y - rel0)).toBeGreaterThan(5); // dziecko jeszcze „dogania”
    await page.waitForTimeout(1200);
    const j2 = await box(page, 'Jeden'),
      a2 = await box(page, '1a');
    expect(a2.y - j2.y).toBeCloseTo(rel0, 0); // i dogoniło
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });
});

test.describe('zwijanie z animacją', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('zwinięte dzieci chowają się do rodzica, rozwinięte z niego wyrastają', async ({ page }) => {
    await loadMap(page, '# R\n- a\n  - a1\n  - a2\n- b\n');
    await page.waitForTimeout(1200);
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    await act(page, 'foldall').click();
    await expect(page.locator('#g .n.leave')).toHaveCount(2); // a1, a2 jadą do „a”
    await expect(page.locator('#g .n.leave')).toHaveCount(0, { timeout: 3000 });
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    await act(page, 'unfoldall').click();
    const d = await page.evaluate(() => {
      const a = vis().find(n => n.text === 'a'),
        c = a.children[0],
        p = pos.get(c.id),
        q = pos.get(a.id);
      return Math.hypot(p.x - q.x, p.y - q.y) / Math.hypot(c.x - a.x, c.y - a.y);
    });
    expect(d).toBeLessThan(0.5); // startuje blisko rodzica
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => raf)).toBe(0);
  });
});
