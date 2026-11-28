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
  await expect(page.locator('#sr')).toBeFocused();
  await page.keyboard.type(q);
  await keys(page, ['Enter']);
}
/** „/”, zapytanie, Enter – pole się zamyka */
async function findVim(page, q) {
  await keys(page, ['/']);
  await expect(page.locator('#sr')).toBeFocused();
  await page.keyboard.type(q);
  await keys(page, ['Enter']);
  await expect(page.locator('#srRes')).toBeHidden();
}

test('szukanie „/” jak w vim: Enter zamyka pole; dalej Ctrl+G, Ctrl+Shift+G | n, N (też F3, Shift+F3)', async ({
  page,
}) => {
  await loadMap(page, MD);
  await keys(page, ['/']);
  await page.keyboard.type('a');
  await page.keyboard.press('Enter');
  await expect(page.locator('#srRes')).toBeHidden();
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
  await expect(page.locator('#srRes')).toBeHidden();
  expect(await selText(page)).toBe('a3');
});

test('szukanie Ctrl+F jak w przeglądarce: pole zostaje, Enter / Shift+Enter i Ctrl+G przechodzą, Esc zamyka', async ({
  page,
}) => {
  await loadMap(page, MD);
  await keys(page, ['Control+f']);
  await page.keyboard.type('a');
  const cmd = page.locator('#sr');
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
  await expect(page.locator('#srRes')).toBeHidden();
  await expect(cmd).not.toBeFocused();
  expect(await selText(page)).toBe('b'); // zaznaczenie zostaje na trafieniu
  await keys(page, ['j']); // klawisze znów sterują mapą
  expect(await selText(page)).toBe('c');
});

test('szukanie z pola (Ctrl+K → „szukaj”) i po kliknięciu w pole', async ({ page }) => {
  await loadMap(page, MD);
  await keys(page, ['Control+k']);
  await page.keyboard.type('szukaj');
  await keys(page, ['Enter']);
  await expect(page.locator('#mode')).toHaveText('SEARCH'); // to samo pole, teraz tylko z węzłami
  await expect(page.locator('#sr')).toBeFocused();
  await page.keyboard.type('c');
  await keys(page, ['Enter']);
  expect(await selText(page)).toBe('c');
  await keys(page, ['Escape']);

  await page.click('#sr');
  await page.keyboard.type('szukaj');
  await keys(page, ['Enter']);
  await expect(page.locator('#sr')).toBeFocused();
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
  await expect(page.locator('#sr')).toBeFocused();
});

test('kliknięcie mapy przy otwartym polu Ctrl+F zamyka pole; klawisze znowu sterują mapą', async ({ page }) => {
  await loadMap(page, MD);
  await findBar(page, 'a');
  expect(await selText(page)).toBe('a');
  await page.mouse.click(5, (await page.locator('#sv').boundingBox()).y + 5); // puste tło mapy
  await expect(page.locator('#srRes')).toBeHidden();
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

// --- 2.5: szukanie bez polskich znaków i lista wszystkich trafień ---
const PL = '# Mapa\n- Żółw\n  - zolw mały\n- łąka\n- ZÓŁWIE jajo\n- kot\n';
/** lista trafień otwarta: pole z tytułem trybu listy */
const list = page => page.locator('#srRes:has(#srT:not([hidden]))');
const listRows = page => page.locator('#srL .pi');
/** wiersze listy: tekst, wyróżnione litery i ścieżka */
const listed = page =>
  page.$$eval('#srL .pi', r =>
    r.map(x => ({
      t: x.querySelector('.pt').textContent,
      m: [...x.querySelectorAll('.pt .m')].map(m => m.textContent),
      path: x.querySelector('.ps')?.textContent ?? '',
    }))
  );
/** Alt+Enter w polu szukania otwartym przez Ctrl+F („bar”) albo „/” („vim”) */
async function allHits(page, how, q) {
  await keys(page, [how === 'bar' ? 'Control+f' : '/']);
  await expect(page.locator('#sr')).toBeFocused();
  await page.keyboard.type(q);
  await keys(page, ['Alt+Enter']);
}

test('bez polskich znaków i wielkości liter: ta sama liczba trafień w Ctrl+F, „/”, n / N i na liście', async ({
  page,
}) => {
  for (const [q, n] of [
    ['zolw', 3],
    ['żół', 3],
    ['ŻÓŁW', 3],
    ['laka', 1],
    ['ŁĄKA', 1],
    ['kot', 1],
  ]) {
    await loadMap(page, PL);
    await findVim(page, q);
    await expect(page.locator('#info'), `„/” ${q}`).toHaveText(`trafienie 1 z ${n}`);
    const seen = [];
    for (let i = 0; i < n; i++) {
      seen.push(await selText(page));
      await keys(page, ['n']);
    }
    expect(new Set(seen).size, `n: ${q}`).toBe(n);
    expect(await selText(page), `n wraca do pierwszego: ${q}`).toBe(seen[0]);
    await keys(page, ['N']);
    expect(await selText(page), `N: ${q}`).toBe(seen[n - 1]);

    await findBar(page, q);
    await expect(page.locator('#info'), `Ctrl+F ${q}`).toHaveText(`trafienie 1 z ${n}`);
    await keys(page, ['Alt+Enter']);
    await expect(page.locator('#srT'), `lista ${q}`).toHaveText(`Trafienia (${n})`);
    await expect(listRows(page)).toHaveCount(n);
    await keys(page, ['Escape']);
  }
  await loadMap(page, PL);
  await allHits(page, 'vim', 'zolw');
  expect((await listed(page)).map(r => r.t)).toEqual(['Żółw', 'zolw mały', 'ZÓŁWIE jajo']);
  expect((await listed(page)).map(r => r.m)).toEqual([['Żółw'], ['zolw'], ['ZÓŁW']]);
});

test('lista trafień: Alt+Enter w obu trybach pola otwiera w tym samym polu listę „Trafienia (N)”', async ({ page }) => {
  await loadMap(page, MD);
  for (const how of ['bar', 'vim']) {
    await allHits(page, how, 'a');
    await expect(list(page), how).toBeVisible();
    await expect(page.locator('#srT')).toHaveText('Trafienia (4)');
    await expect(listRows(page)).toHaveCount(4);
    await expect(page.locator('#sr')).toBeFocused(); // to samo pole: zapytanie widać, ale się w nim nie pisze
    await expect(page.locator('#sr')).toHaveValue('a');
    await expect(page.locator('#sr')).not.toBeEditable();
    await keys(page, ['Escape']);
    await expect(list(page)).toBeHidden();
    await expect(page.locator('#srRes')).toBeHidden();
  }
  // bez Alt+Enter (np. na telefonie) wszystkie trafienia widać od razu pod polem: „W mapie (N)”
  for (const how of ['bar', 'vim']) {
    await keys(page, [how === 'bar' ? 'Control+f' : '/']);
    await page.keyboard.type('a');
    await expect(page.locator('#srL .sh'), how).toHaveText(['W mapie (4)']);
    await expect(listRows(page)).toHaveCount(4);
    await keys(page, ['Escape']);
  }
  // na liście trafień się nie pisze: litery nie zmieniają listy
  await allHits(page, 'bar', 'a');
  await page.keyboard.type('zzz');
  await expect(listRows(page)).toHaveCount(4);
});

test('lista trafień: węzeł z kilkoma liniami w jednym wierszu („ · ”), ścieżka od korzenia, litery wyróżnione', async ({
  page,
}) => {
  await loadMap(page, '# Mapa\n- Projekt\n  - Zakupy\n    mleko i chleb\n- Mleko\n');
  await allHits(page, 'vim', 'mleko');
  expect(await listed(page)).toEqual([
    { t: 'Zakupy · mleko i chleb', m: ['mleko'], path: 'Mapa › Projekt' },
    { t: 'Mleko', m: ['Mleko'], path: 'Mapa' },
  ]);
  // korzeń bez ścieżki; za długi tekst ucięty „…” (CSS), nie zawija się w drugą linię
  await keys(page, ['Escape']);
  await loadMap(page, `# Mapa długa\n- ${'bardzo długi tekst '.repeat(12)}\n`);
  await allHits(page, 'vim', 'dług');
  const rows = await listed(page);
  expect(rows[0]).toEqual({ t: 'Mapa długa', m: ['dług'], path: '' });
  const pt = await page
    .locator('#srL .pi .pt')
    .nth(1)
    .evaluate(e => {
      const s = getComputedStyle(e);
      return { over: e.scrollWidth > e.clientWidth, ell: s.textOverflow, ws: s.whiteSpace };
    });
  expect(pt).toEqual({ over: true, ell: 'ellipsis', ws: 'nowrap' });
});

test('lista trafień: Enter i klik idą do węzła i rozwijają zwiniętego przodka; dalej n / N; cofanie bez zmian', async ({
  page,
}) => {
  await loadMap(page, '# R\n- a <!--c-->\n  - a1\n  - ukryty x\n- b x\n- c x\n');
  const undo = () => page.evaluate(() => undoS.length);
  const u0 = await undo();
  await allHits(page, 'bar', 'x');
  expect((await listed(page)).map(r => r.t)).toEqual(['ukryty x', 'b x', 'c x']);
  expect((await listed(page))[0].path).toBe('R › a');
  await expect(page.locator('#srL .pi.hi')).toHaveText(/ukryty x/); // pierwsza podświetlona
  await keys(page, ['ArrowDown', 'ArrowUp', 'Tab', 'Shift+Tab']); // strzałki i Tab jak w palecie
  await expect(page.locator('#srL .pi.hi')).toHaveText(/ukryty x/);
  await keys(page, ['Enter']);
  await expect(list(page)).toBeHidden();
  expect(await selText(page)).toBe('ukryty x');
  expect(await page.evaluate(() => vis().map(n => n.text))).toContain('ukryty x');
  await expect(page.locator('#info')).toHaveText('trafienie 1 z 3');
  expect(await page.evaluate(() => mode)).toBe('NORMAL');
  await keys(page, ['n']);
  expect(await selText(page)).toBe('b x');

  await allHits(page, 'vim', 'x');
  await listRows(page).nth(2).click();
  await expect(list(page)).toBeHidden();
  expect(await selText(page)).toBe('c x');
  await expect(page.locator('#info')).toHaveText('trafienie 3 z 3');
  await keys(page, ['N']);
  expect(await selText(page)).toBe('b x');
  expect(await undo(), 'szukanie nie dodaje kroków cofania').toBe(u0);
  expect(await page.evaluate(() => localStorage.getItem('mm.cmd'))).toBeNull(); // nie trafia do ostatnio użytych
});

test('lista trafień: Esc zamyka bez zmiany zaznaczenia; brak trafień – komunikat, bez palety', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await allHits(page, 'bar', 'a');
  await keys(page, ['Escape']);
  await expect(list(page)).toBeHidden();
  expect(await selText(page)).toBe('b');
  expect(await page.evaluate(() => mode)).toBe('NORMAL');
  await keys(page, ['j']); // klawisze znów sterują mapą
  expect(await selText(page)).toBe('c');
  await keys(page, ['n']); // trafienia z listy zostają dla n
  expect(await selText(page)).toBe('a');

  for (const how of ['bar', 'vim']) {
    await allHits(page, how, 'zzz');
    await expect(page.locator('#info')).toHaveText('0 trafień');
    await expect(list(page)).toBeHidden();
    await expect(page.locator('#sr'), 'pole zostaje do poprawienia zapytania').toBeFocused();
    await expect(page.locator('#srL .none')).toHaveText('Brak trafień');
    await keys(page, ['Escape']);
  }
  expect(await selText(page)).toBe('a');
});

test('Alt+Enter w polu szukania nie trafia do przeglądarki', async ({ page }) => {
  await loadMap(page, MD);
  await page.evaluate(() => {
    window.__prev = [];
    document.addEventListener(
      'keydown',
      e => setTimeout(() => window.__prev.push(`${e.altKey ? 'Alt+' : ''}${e.key}:${e.defaultPrevented}`)),
      true
    );
  });
  await allHits(page, 'bar', 'a');
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.__prev.filter(s => s.startsWith('Alt+Enter')))).toEqual(['Alt+Enter:true']);
});
