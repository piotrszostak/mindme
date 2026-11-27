// Menu podręczne: zawartość, skróty, dodawanie, kopiuj/wytnij/wklej/usuń.
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

test.describe('menu podręczne węzła', () => {
  const items = page =>
    page.$$eval('#menu button', bs =>
      bs.map(b => [
        b.dataset.act,
        (b.querySelector('span,small') || b).textContent.trim(),
        (b.querySelector('kbd') || {}).textContent || '',
      ])
    );

  test('PPM: jedno menu (węzeł + mapa), przy kursorze, ze skrótami klawiszowymi', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await expect(menu(page)).toBeVisible();
    expect(await selText(page)).toBe('Dwa');
    await expect(page.locator('#menu .mh')).toHaveText('Węzeł: Dwa');
    const it = await items(page);
    expect(it.map(i => i[0])).toEqual([
      'sib',
      'child',
      'emoji',
      'fold',
      'copy',
      'dup',
      'cut',
      'paste',
      'moveto',
      'del',
      'fit',
      'unfoldall',
      'foldall',
    ]); // bez rzędu układów
    expect(it.map(i => i[2])).toEqual([
      'Enter',
      'Tab',
      'Ctrl+.',
      'Shift+Spacja',
      'Ctrl+C',
      'Ctrl+D',
      'Ctrl+X',
      'Ctrl+V',
      'Ctrl+M',
      'Del',
      'Shift+1',
      'zR',
      'zM',
    ]);
    await expect(page.locator('#menu kbd').first()).toBeVisible();
    const m = await menu(page).boundingBox();
    expect(Math.abs(m.x - b.cx)).toBeLessThan(2);
    await expect(act(page, 'fold')).toBeDisabled(); // „Dwa” nie ma dzieci
    await expect(act(page, 'paste')).toBeEnabled(); // jak Ctrl+V: schowek systemowy może mieć tekst z innej aplikacji
    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();
  });

  test('PPM na tle otwiera to samo menu dla zaznaczonego węzła', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    const onNode = await menu(page).innerText();
    await page.keyboard.press('Escape');
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    expect(await selText(page)).toBe('Dwa'); // tło nie zmienia zaznaczenia
    expect(await menu(page).innerText()).toBe(onNode);
    await act(page, 'del').click();
    expect(await texts(page)).not.toContain('Dwa');
  });

  test('korzeń: brat tworzy nowy korzeń; jedynego korzenia nie da się usunąć', async ({ page }) => {
    await loadMap(page, MD);
    let b = await box(page, 'Środek');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await expect(act(page, 'del')).toBeDisabled();
    await expect(act(page, 'sib')).toBeEnabled();
    await expect(act(page, 'sib')).toContainText('nowy korzeń');
    await act(page, 'sib').click();
    await page.keyboard.type('Drugi temat');
    await page.keyboard.press('Tab');
    await page.keyboard.type('punkt');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n\n# Drugi temat\n\n- punkt\n');
    b = await box(page, 'Środek');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await expect(act(page, 'del')).toBeEnabled(); // są dwa korzenie
    await act(page, 'del').click();
    expect(await texts(page)).toBe('# Drugi temat\n\n- punkt\n');
  });

  test('dodaj brata / dziecko → edycja w nowym węźle', async ({ page }) => {
    await loadMap(page, MD);
    let b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'child').click();
    await expect(menu(page)).toBeHidden();
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type('nowe dziecko');
    await page.keyboard.press('Escape');
    b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'sib').click();
    await page.keyboard.type('nowy brat');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa\n  - nowe dziecko\n- nowy brat\n- Trzy\n');
  });

  test('zwiń / rozwiń zmienia etykietę; usuń kasuje gałąź (cofalne)', async ({ page }) => {
    await loadMap(page, MD);
    let b = await box(page, 'Jeden');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'fold').click();
    expect(await texts(page)).toContain('- Jeden <!--c-->');
    b = await box(page, 'Jeden');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await expect(act(page, 'fold').locator('span')).toHaveText('Rozwiń');
    await act(page, 'fold').click();
    b = await box(page, 'Jeden');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'del').click();
    expect(await texts(page)).not.toContain('Jeden');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Jeden\n  - 1a\n');
  });

  test('duplikuj gałąź: kopia zaraz za oryginałem (cofalne)', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Jeden');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'dup').click();
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
  });

  test('PPM na tle: zwiń wszystko; menu nie ma już przycisków układu', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + 15, { button: 'right' });
    await expect(page.locator('#menu [data-act^="lay-"]')).toHaveCount(0);
    await act(page, 'foldall').click();
    expect(await texts(page)).toContain('- Jeden <!--c-->');
  });

  test('klawiatura: klawisz Menu otwiera menu, strzałki + Enter wybierają', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight'); // Jeden
    await page.keyboard.press('ContextMenu');
    await expect(menu(page)).toBeVisible();
    await expect(act(page, 'sib')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(act(page, 'child')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type('1c');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('  - 1b\n  - 1c\n');
  });
});

test('kopiuj i wklej działają wewnątrz aplikacji (Ctrl+C → menu „Wklej jako dziecko”)', async ({ page }) => {
  await loadMap(page, MD);
  await page.keyboard.press('ArrowRight'); // Jeden
  await page.keyboard.press('Control+c');
  const b = await box(page, 'Trzy');
  await page.mouse.click(b.cx, b.cy, { button: 'right' });
  await expect(act(page, 'paste')).toBeEnabled();
  await act(page, 'paste').click();
  /* „Wklej” czeka na odpowiedź schowka systemowego (bez zgody – odmowa, więc gałąź z aplikacji) */
  await expect.poll(() => texts(page)).toContain('- Trzy\n  - Jeden\n    - 1a\n    - 1b\n');
});

test('menu: kopiuj, wytnij i usuń to osobne polecenia; usuń nie nadpisuje schowka', async ({ page }) => {
  await loadMap(page, MD);
  const menuOn = async t => {
    const b = await box(page, t);
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
  };
  await menuOn('Dwa');
  await act(page, 'copy').click();
  expect(await texts(page)).toContain('- Dwa\n'); // kopiowanie nic nie usuwa
  await menuOn('Trzy');
  await act(page, 'del').click(); // usunięcie – schowek dalej ma „Dwa”
  await menuOn('Jeden');
  await act(page, 'paste').click(); // czeka na odpowiedź schowka systemowego
  await expect.poll(() => texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n  - Dwa\n- Dwa\n');
  await menuOn('1a');
  await act(page, 'cut').click(); // wycięcie – usuwa i kopiuje
  expect(await texts(page)).not.toContain('1a');
  await menuOn('Dwa');
  await act(page, 'paste').click();
  await expect.poll(() => texts(page)).toContain('  - Dwa\n    - 1a\n');
});
