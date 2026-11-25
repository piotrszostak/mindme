// Szukanie węzłów: „/” jak w vim i Ctrl+F jak w przeglądarce – uruchamiane w Chromium i w Firefoksie.
const { test, expect } = require('@playwright/test');
const { open, loadMap } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));
const MD = '# R\n- a\n  - a1\n  - a2\n  - a3\n- b\n- c\n- d\n';
const selText = page => page.evaluate(() => (S() ? S().n.text : null));
const select = (page, t) =>
  page.evaluate(t => {
    sel = vis().find(n => n.text === t).id;
    render();
  }, t);
async function keys(page, list) {
  for (const k of list) await page.keyboard.press(k);
}
/** Ctrl+F, zapytanie, Enter – pole zostaje otwarte */
async function findBar(page, q) {
  await keys(page, ['Control+f']);
  await expect(page.locator('#cmd')).toBeFocused();
  await page.keyboard.type(q);
  await keys(page, ['Enter']);
}
/** „/”, zapytanie, Enter – pole się zamyka */
async function findVim(page, q) {
  await keys(page, ['/']);
  await expect(page.locator('#cmd')).toBeFocused();
  await page.keyboard.type(q);
  await keys(page, ['Enter']);
  await expect(page.locator('#cmd')).toBeHidden();
}

test('szukanie „/” jak w vim: Enter zamyka pole; dalej Ctrl+G, Ctrl+Shift+G | n, N (też F3, Shift+F3)', async ({
  page,
}) => {
  await loadMap(page, MD);
  await keys(page, ['/']);
  await page.keyboard.type('a');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cmd')).toBeHidden();
  expect(await selText(page)).toBe('a');
  await expect(page.locator('#info')).toHaveText('trafienie 1 z 4');
  for (const [k, t] of [
    ['Control+g', 'a1'],
    ['n', 'a2'],
    ['Control+Shift+G', 'a1'],
    ['N', 'a'],
    ['F3', 'a1'],
    ['Shift+F3', 'a'],
    ['N', 'a3'], // z pierwszego na ostatnie
  ]) {
    await keys(page, [k]);
    expect(await selText(page), k).toBe(t);
  }
});

test('szukanie „/”: Shift+Enter zamyka pole i skacze do ostatniego trafienia', async ({ page }) => {
  await loadMap(page, MD);
  await keys(page, ['/']);
  await page.keyboard.type('a');
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('#cmd')).toBeHidden();
  expect(await selText(page)).toBe('a3');
});

test('szukanie Ctrl+F jak w przeglądarce: pole zostaje, Enter / Shift+Enter i Ctrl+G przechodzą, Esc zamyka', async ({
  page,
}) => {
  await loadMap(page, MD);
  await keys(page, ['Control+f']);
  await page.keyboard.type('a');
  const cmd = page.locator('#cmd');
  for (const [k, t] of [
    ['Enter', 'a'],
    ['Enter', 'a1'],
    ['Shift+Enter', 'a'],
    ['Control+g', 'a1'],
    ['Control+Shift+G', 'a'],
    ['F3', 'a1'],
  ]) {
    await keys(page, [k]);
    expect(await selText(page), k).toBe(t);
    await expect(cmd).toBeFocused();
  }
  await expect(page.locator('#info')).toHaveText('trafienie 2 z 4');
  await keys(page, ['Backspace']);
  await page.keyboard.type('b');
  await keys(page, ['Enter']); // nowe zapytanie – od pierwszego trafienia
  expect(await selText(page)).toBe('b');
  await keys(page, ['Escape']);
  await expect(cmd).toBeHidden();
  expect(await selText(page)).toBe('b'); // zaznaczenie zostaje na trafieniu
  await keys(page, ['j']); // klawisze znów sterują mapą
  expect(await selText(page)).toBe('c');
});

test('szukanie z palety (Ctrl+K → „szukaj”) i z menu „…” → Wszystkie polecenia', async ({ page }) => {
  await loadMap(page, MD);
  await keys(page, ['Control+k']);
  await page.keyboard.type('szukaj');
  await keys(page, ['Enter']);
  await expect(page.locator('#pal')).toBeHidden();
  await expect(page.locator('#cmd')).toBeFocused();
  await page.keyboard.type('c');
  await keys(page, ['Enter']);
  expect(await selText(page)).toBe('c');
  await keys(page, ['Escape']);

  await page.click('#bm');
  await page.click('#menu [data-act="pal"]');
  await page.keyboard.type('szukaj');
  await keys(page, ['Enter']);
  await expect(page.locator('#cmd')).toBeFocused();
  await page.keyboard.type('d');
  await keys(page, ['Enter']);
  expect(await selText(page)).toBe('d');
});

test('Ctrl+F i „/” działają po palecie (Esc), edycji węzła, okienku emoji i kliknięciu przycisku na pasku', async ({
  page,
}) => {
  const before = {
    'paleta zamknięta Esc': async () => keys(page, ['Control+k', 'Escape']),
    'edycja zatwierdzona Enter': async () => {
      await select(page, 'b');
      await keys(page, ['i']);
      await page.keyboard.type('x');
      await keys(page, ['Enter']);
    },
    'okienko emoji zamknięte Esc': async () => {
      await keys(page, ['Control+.']);
      await expect(page.locator('#emo')).toBeVisible();
      await keys(page, ['Escape']);
      await expect(page.locator('#emo')).toBeHidden();
    },
    'kliknięty przycisk „Dopasuj”': async () => page.click('#bf'),
  };
  for (const [name, prep] of Object.entries(before)) {
    for (const how of ['bar', 'vim']) {
      await loadMap(page, MD);
      await prep();
      if (how === 'bar') {
        await findBar(page, 'c');
        await keys(page, ['Escape']);
      } else await findVim(page, 'c');
      expect(await selText(page), `${name}, ${how}`).toBe('c');
    }
  }
});

test('szukanie bez zaznaczonego węzła', async ({ page }) => {
  await loadMap(page, MD);
  await page.evaluate(() => deselect());
  expect(await selText(page)).toBeNull();
  await findVim(page, 'a2');
  expect(await selText(page)).toBe('a2');
});

test('trafienie w zwiniętej gałęzi: gałąź się rozwija, węzeł jest zaznaczony i widoczny na ekranie', async ({
  page,
}) => {
  await loadMap(page, '# R\n- a <!--c-->\n  - a1\n  - ukryty\n- b\n');
  expect(await page.evaluate(() => vis().map(n => n.text))).toEqual(['R', 'a', 'b']);
  await page.evaluate(() => {
    tx = -5000; /* mapa daleko poza ekranem */
    render(true);
  });
  await findVim(page, 'ukryty');
  expect(await selText(page)).toBe('ukryty');
  expect(await page.evaluate(() => vis().map(n => n.text))).toContain('ukryty');
  const node = await page.locator('#g .n', { hasText: 'ukryty' }).boundingBox();
  const view = await page.locator('#sv').boundingBox();
  expect(node.x).toBeGreaterThanOrEqual(view.x);
  expect(node.x + node.width).toBeLessThanOrEqual(view.x + view.width);
  expect(node.y).toBeGreaterThanOrEqual(view.y);
  expect(node.y + node.height).toBeLessThanOrEqual(view.y + view.height);
});

test('Ctrl+F i „/” nie trafiają do przeglądarki – także drugi Ctrl+F w otwartym polu', async ({ page }) => {
  await loadMap(page, MD);
  /* ostateczny stan zdarzenia po wszystkich obsługach (setTimeout) */
  await page.evaluate(() => {
    window.__prev = [];
    document.addEventListener(
      'keydown',
      e => setTimeout(() => window.__prev.push(`${e.ctrlKey ? 'Ctrl+' : ''}${e.key}:${e.defaultPrevented}`)),
      true
    );
  });
  await keys(page, ['/']); // Firefox: bez tego otwiera szybkie wyszukiwanie
  await keys(page, ['Escape']);
  await keys(page, ['Control+f']); // przeglądarka: szukanie na stronie
  await keys(page, ['Control+f']); // drugi raz – w otwartym polu
  await page.waitForTimeout(50);
  const prev = await page.evaluate(() => window.__prev.filter(s => s.startsWith('/') || s.startsWith('Ctrl+f')));
  expect(prev).toEqual(['/:true', 'Ctrl+f:true', 'Ctrl+f:true']);
  await expect(page.locator('#cmd')).toBeFocused();
});

test('kliknięcie mapy przy otwartym polu Ctrl+F zamyka pole; klawisze znowu sterują mapą', async ({ page }) => {
  await loadMap(page, MD);
  await findBar(page, 'a');
  expect(await selText(page)).toBe('a');
  await page.mouse.click(5, (await page.locator('#sv').boundingBox()).y + 5); // puste tło mapy
  await expect(page.locator('#cmd')).toBeHidden();
  expect(await page.evaluate(() => mode)).toBe('NORMAL');
  await select(page, 'b');
  await keys(page, ['j']);
  expect(await selText(page)).toBe('c');
  await keys(page, ['n']); // trafienia zostają: n przechodzi dalej
  expect(await selText(page)).toBe('a1');
  await findBar(page, 'd'); // Ctrl+F znowu otwiera pole
  expect(await selText(page)).toBe('d');
});

test('puste zapytanie i brak trafień: komunikat, a n / N niczego nie psują', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await findVim(page, '');
  expect(await selText(page)).toBe('b');
  await findVim(page, 'zzz');
  await expect(page.locator('#info')).toHaveText('0 trafień');
  await keys(page, ['n', 'N']);
  expect(await selText(page)).toBe('b');
  await keys(page, ['j']);
  expect(await selText(page)).toBe('c');
});

test('polskie znaki i wielkość liter: „żółw” znajduje „Żółw”', async ({ page }) => {
  await loadMap(page, '# R\n- Żółw\n- kot\n');
  await findVim(page, 'żółw');
  expect(await selText(page)).toBe('Żółw');
});
