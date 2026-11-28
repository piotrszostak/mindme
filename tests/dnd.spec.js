// Przeciąganie węzłów myszą: miejsce upuszczenia, gałąź, sąsiedzi, auto-przewijanie.
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

test.describe('mysz: przeciąganie (drag and drop)', () => {
  async function dragTo(page, from, [x, y], { drop = true } = {}) {
    await page.mouse.move(from.cx, from.cy);
    await page.mouse.down();
    await page.mouse.move(from.cx + 15, from.cy + 5, { steps: 3 });
    await page.mouse.move(x, y, { steps: 8 });
    if (drop) await page.mouse.up();
  }

  test('upuszczenie na prawej części węzła → dziecko; Ctrl+Z cofa', async ({ page }) => {
    await loadMap(page, MD);
    await dragTo(page, await box(page, 'Trzy'), at(await box(page, '1a'), 0.85, 0.5), { drop: false });
    expect(await phParent(page)).toBe('1a'); // podgląd: miejsce otwarte pod 1a
    await expect(page.locator('#g path.band')).toHaveCount(1); // rozciągnięta gałąź do nowego rodzica
    await page.mouse.up();
    expect(await texts(page)).toContain('  - 1a\n    - Trzy\n');
    expect(await phParent(page)).toBeNull();
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
  });

  test('upuszczenie na lewej górnej / dolnej części → brat przed / za', async ({ page }) => {
    await loadMap(page, MD);
    await dragTo(page, await box(page, 'Trzy'), at(await box(page, 'Jeden'), 0.15, 0.2));
    expect(await texts(page)).toContain('# Środek\n\n- Trzy\n- Jeden\n');
    await dragTo(page, await box(page, 'Trzy'), at(await box(page, '1a'), 0.15, 0.8));
    expect(await texts(page)).toContain('  - 1a\n  - Trzy\n  - 1b\n');
  });

  test('cała gałąź jedzie razem z węzłem', async ({ page }) => {
    await loadMap(page, MD);
    const j = await box(page, 'Jeden'),
      a0 = await box(page, '1a');
    const t = await box(page, 'Trzy');
    await dragTo(page, j, [t.cx + 40, t.cy + 60], { drop: false });
    const a1 = await box(page, '1a'),
      j1 = await box(page, 'Jeden');
    expect(a1.x - j1.x).toBeCloseTo(a0.x - j.x, 0); // potomek zachowuje położenie względem rodzica
    expect(a1.y - j1.y).toBeCloseTo(a0.y - j.y, 0);
    await page.mouse.move(...at(await box(page, 'Trzy'), 0.85, 0.5), { steps: 4 });
    await page.mouse.up();
    expect(await texts(page)).toContain('- Trzy\n  - Jeden\n    - 1a\n    - 1b\n');
  });

  test('sąsiedzi robią miejsce na żywo', async ({ page }) => {
    await loadMap(page, '# R\n- a\n- b\n- c\n- d\n');
    const y0 = (await box(page, 'b')).y,
      d = await box(page, 'd');
    await dragTo(page, d, at(await box(page, 'b'), 0.15, 0.25), { drop: false });
    expect(await phParent(page)).toBe('R');
    expect((await box(page, 'b')).y).toBeGreaterThan(y0 + 20); // „b” zjechało, bo przed nim otwarło się miejsce
    await page.keyboard.press('Escape'); // anulowanie przywraca układ
    expect(await texts(page)).toBe('# R\n\n- a\n- b\n- c\n- d\n');
    expect((await box(page, 'b')).y).toBeCloseTo(y0, 0);
    await page.mouse.up();
  });

  test('upuszczenie daleko od węzłów wraca na miejsce bez wpisu do historii', async ({ page }) => {
    await loadMap(page, MD);
    const before = await texts(page),
      u = await page.evaluate(() => undoS.length);
    const sv = await page.locator('#sv').boundingBox();
    await dragTo(page, await box(page, 'Dwa'), [sv.x + 15, sv.y + sv.height - 15]);
    expect(await texts(page)).toBe(before);
    expect(await page.evaluate(() => undoS.length)).toBe(u);
  });

  test('korzenia nie da się przeciągnąć – przesuwa widok', async ({ page }) => {
    await loadMap(page, MD);
    const r = await box(page, 'Środek');
    await dragTo(page, r, [r.cx + 60, r.cy + 30]);
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
    expect((await box(page, 'Środek')).x - r.x).toBeCloseTo(60, -1);
  });

  test('przeciąganie tła przesuwa widok', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox(),
      b0 = await box(page, 'Środek');
    await page.mouse.move(sv.x + 20, sv.y + 80); // tło pod wyspami górnego paska
    await page.mouse.down();
    await page.mouse.move(sv.x + 120, sv.y + 130, { steps: 5 });
    await page.mouse.up();
    const b1 = await box(page, 'Środek');
    expect(b1.x - b0.x).toBeCloseTo(100, 0);
    expect(b1.y - b0.y).toBeCloseTo(50, 0);
  });
});

test('przyszły rodzic jest podświetlony w trakcie przeciągania', async ({ page }) => {
  await loadMap(page, MD);
  const a = await box(page, 'Trzy'),
    t = await box(page, '1a');
  await page.mouse.move(a.cx, a.cy);
  await page.mouse.down();
  await page.mouse.move(a.cx + 15, a.cy, { steps: 3 });
  await page.mouse.move(t.x + t.w * 0.85, t.cy, { steps: 8 });
  await expect(page.locator(`#g .n.target[data-id="${t.id}"]`)).toHaveCount(1);
  await expect(page.locator('#g .n.target')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('#g .n.target')).toHaveCount(0);
});

test.describe('auto-przewijanie przy przeciąganiu', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('przy krawędzi rusza dopiero po chwili i jest łagodne', async ({ page }) => {
    await loadMap(page, MD);
    await expect.poll(() => page.evaluate(() => raf)).toBe(0); // animacja wczytania zakończona
    const a = await box(page, 'Dwa'),
      sv = await page.locator('#sv').boundingBox();
    await page.mouse.move(a.cx, a.cy);
    await page.mouse.down();
    await page.mouse.move(a.cx + 15, a.cy, { steps: 3 });
    const tx0 = await page.evaluate(() => tx);
    await page.mouse.move(sv.x + sv.width - 10, a.cy, { steps: 6 }); // przy prawej krawędzi
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => tx)).toBe(tx0); // jeszcze nic – zwłoka
    await page.waitForTimeout(1000);
    const moved = tx0 - (await page.evaluate(() => tx));
    expect(moved).toBeGreaterThan(20); // przewija…
    expect(moved).toBeLessThan(400); // …ale spokojnie (dawniej ~700 px/s od razu)
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });
});
