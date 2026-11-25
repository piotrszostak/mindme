// Edycja tekstu w węźle (pole nałożone na węzeł).
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

test.describe('edycja w węźle', () => {
  test('dwuklik → pole edycji leży dokładnie na węźle, kursor na końcu', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await expect(page.locator('#ed')).toBeVisible();
    await expectEditorOver(page, 'Dwa');
    await page.keyboard.type(' i pół');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa i pół\n');
  });

  test('węzeł rośnie na żywo podczas pisania, także przy zawijaniu', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+a');
    await page.keyboard.type(LONG);
    const now = await box(page, LONG); // model już ma nowy tekst
    expect(now.w).toBeGreaterThan(b.w);
    expect(now.h).toBeGreaterThan(b.h);
    await expectEditorOver(page, LONG);
    const ov = await page.$eval('#ed', e => e.scrollHeight - e.clientHeight);
    expect(ov).toBeLessThanOrEqual(1); // tekst mieści się bez przewijania
  });

  test('pole edycji podąża za zoomem i przesuwaniem', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.mouse.move(b.cx, b.cy + 80);
    await page.mouse.wheel(0, -300);
    await expectEditorOver(page, 'Dwa');
    const fs = await page.$eval('#ed', e => parseFloat(e.style.fontSize));
    expect(fs).toBeGreaterThan(14);
  });

  test('klik obok zatwierdza; zmiana jest cofalna', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Zmienione');
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 10, sv.y + sv.height - 10);
    await expect(page.locator('#ed')).toBeHidden();
    expect(await texts(page)).toContain('- Zmienione\n');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Dwa\n');
  });

  test('Enter w edycji tylko zatwierdza; kolejny Enter dodaje brata', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.type(' i pół');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ed')).toBeHidden();
    await expect(page.locator('#mode')).toHaveText('NORMAL');
    expect(await selText(page)).toBe('Dwa i pół');
    expect(await texts(page)).toContain('- Dwa i pół\n- Trzy\n'); // brat jeszcze nie powstał
    await page.keyboard.press('Enter'); // teraz dopiero nowy brat
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type('Dwa i trzy czwarte');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- Dwa i pół\n- Dwa i trzy czwarte\n- Trzy\n');
    expect(await selText(page)).toBe('Dwa i trzy czwarte');
  });

  test('Tab w edycji → zatwierdza i dodaje dziecko; pusty nowy węzeł znika', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Tab');
    await page.keyboard.type('pod');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape'); // pusty → usunięty
    expect(await texts(page)).toContain('- Dwa\n  - pod\n- Trzy\n');
    expect(await page.evaluate(() => vis().filter(n => !n.text).length)).toBe(0);
    expect(await selText(page)).toBe('pod');
  });

  test('wyczyszczenie istniejącego węzła przywraca stary tekst', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa\n');
  });

  test('znak nowej linii z klawiatury ekranowej działa jak Enter (zatwierdza)', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.$eval('#ed', e => {
      e.value += ' i pół\n';
      e.dispatchEvent(new Event('input'));
    });
    await expect(page.locator('#ed')).toBeHidden();
    expect(await texts(page)).toMatch(/- Trzy i pół\n$/);
    expect(await selText(page)).toBe('Trzy i pół');
  });
});

test.describe('wąski ekran', () => {
  test.use({ viewport: { width: 412, height: 800 } });
  test('klik nie przesuwa widoku; dwuklik przy krawędzi edytuje, a tekst trafia do węzła', async ({ page }) => {
    await loadMap(
      page,
      '# Plan projektu\n- Badania\n  - Wywiady z użytkownikami i analiza konkurencji na rynku\n  - Ankieta\n- Projekt\n'
    );
    const b = await box(page, 'Ankieta'),
      tx0 = await page.evaluate(() => tx);
    await page.mouse.click(b.cx, b.cy);
    expect(await page.evaluate(() => tx)).toBe(tx0);
    await page.waitForTimeout(500); // żeby to nie liczyło się jako dwuklik
    await page.mouse.dblclick(b.cx, b.cy);
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type(' online – pytania otwarte i zamknięte');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('  - Ankieta online – pytania otwarte i zamknięte\n- Projekt\n');
  });
});

test.describe('wiele linii w węźle', () => {
  const md = page => page.evaluate(() => serialize(root));
  const edit = async (page, t) => {
    await page.evaluate(t => go(vis().find(n => n.text === t).id), t);
    await page.keyboard.press('i'); // edycja, kursor na końcu
    await expect(page.locator('#ed')).toBeFocused();
  };

  test('Ctrl+Enter wstawia nową linię, Enter zatwierdza; węzeł rysuje się w dwóch liniach', async ({ page }) => {
    await loadMap(page, '# R\n- a\n');
    await edit(page, 'a');
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('b');
    await expect(page.locator('#ed')).toHaveValue('a\nb');
    expect(await page.evaluate(() => S().n.lines)).toEqual(['a', 'b']);
    await page.keyboard.press('Enter');
    await expect(page.locator('#ed')).toBeHidden();
    expect(await md(page)).toBe('# R\n\n- a\n  b\n');
    await expect(page.locator('#g .n.sel text tspan')).toHaveCount(2);
  });

  test('puste linie znikają przy zatwierdzeniu; tytuł mapy zostaje jednoliniowy', async ({ page }) => {
    await loadMap(page, '# R\n- a\n');
    await edit(page, 'a');
    await page.keyboard.press('Control+Enter');
    await page.keyboard.press('Control+Enter');
    await page.keyboard.type('b');
    await page.keyboard.press('Enter');
    expect(await md(page)).toBe('# R\n\n- a\n  b\n');

    await edit(page, 'R');
    await page.keyboard.press('Control+Enter');
    await expect(page.locator('#ed')).toHaveValue('R');
    await page.keyboard.press('Escape');
  });

  test('Enter z klawiatury ekranowej w węźle z kilkoma liniami nadal zatwierdza, linie zostają', async ({ page }) => {
    await loadMap(page, '# R\n- a\n  b\n');
    await page.evaluate(() => startEdit(vis().find(n => n.text === 'a\nb').id));
    await page.$eval('#ed', e => {
      e.setRangeText('\n', e.value.length, e.value.length, 'end');
      e.dispatchEvent(new Event('input'));
    });
    await expect(page.locator('#ed')).toBeHidden();
    expect(await md(page)).toBe('# R\n\n- a\n  b\n');
  });
});
