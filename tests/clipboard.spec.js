// Schowek: kopiowanie gałęzi także do schowka systemowego, wklejanie tekstu z innych aplikacji (Ctrl+V),
// vimowe p / P zawsze z wewnętrznego schowka. Uruchamiane w Chromium i w Firefoksie.
// „Inną aplikację” udaje zwykłe pole tekstowe spoza mapy: prawdziwe Ctrl+C / Ctrl+V idą przez schowek systemowy.
const { test, expect } = require('@playwright/test');
const { open, loadMap } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));
const MD = '# R\n- a <!--c-->\n  - a1\n- b\n- c\n';
const md = page => page.evaluate(() => serialize(root));
const select = (page, t) =>
  page.evaluate(t => {
    sel = (function w(n) {
      return n.text === t ? n : n.children.reduce((r, c) => r || w(c), null);
    })(root).id;
    render();
  }, t);
async function keys(page, list) {
  for (const k of list) await page.keyboard.press(k);
}
/** pole tekstowe „innej aplikacji” (skróty mapy go nie dotyczą) */
async function outside(page, text) {
  await page.evaluate(t => {
    const a = document.createElement('textarea');
    a.id = 'obce';
    a.value = t;
    a.addEventListener('keydown', e => e.stopPropagation());
    document.body.append(a);
  }, text);
  await page.locator('#obce').focus();
}
const removeOutside = page =>
  page.evaluate(() => {
    document.getElementById('obce').remove();
    asEl(document.activeElement)?.closest('#obce') || /** @type {HTMLElement} */ (document.activeElement).blur();
  });
/** skopiuj tekst w „innej aplikacji” do schowka systemowego */
async function copyOutside(page, text) {
  await outside(page, text);
  await page.evaluate(() => document.getElementById('obce').select());
  await keys(page, ['Control+c']);
  await removeOutside(page);
}
/** skopiuj wyrenderowany fragment (jak widok czytania w Obsidianie albo strona WWW): w schowku tekst i HTML */
async function copyRendered(page, html) {
  await page.evaluate(h => {
    const d = document.createElement('div');
    d.id = 'obce';
    d.tabIndex = 0;
    d.innerHTML = h;
    d.addEventListener('keydown', e => e.stopPropagation());
    document.body.append(d);
  }, html);
  await page.locator('#obce').focus();
  await page.evaluate(() => {
    const r = document.createRange();
    r.selectNodeContents(document.getElementById('obce'));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  });
  await keys(page, ['Control+c']);
  await page.evaluate(() => getSelection().removeAllRanges());
  await removeOutside(page);
}
/** co jest w schowku systemowym: wklej do „innej aplikacji” */
async function readOutside(page) {
  await outside(page, '');
  await keys(page, ['Control+v']);
  const v = await page.inputValue('#obce');
  await removeOutside(page);
  return v;
}

test('Ctrl+C, potem Ctrl+V w aplikacji: kopia gałęzi razem ze zwinięciami; w schowku systemowym lista Markdown', async ({
  page,
}) => {
  await loadMap(page, MD);
  await select(page, 'a');
  await keys(page, ['Control+c']);
  await expect(page.locator('#info')).toHaveText('skopiowano gałąź');
  expect(await readOutside(page)).toBe('- a <!--c-->\n  - a1\n');
  await select(page, 'b');
  await keys(page, ['Control+v']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n  - a <!--c-->\n    - a1\n- c\n');
  await expect(page.locator('#info')).toHaveText('wklejono 2 węzły');
});

test('dd, potem p przy innym tekście w schowku systemowym: wkleja wycięty węzeł', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'a');
  await keys(page, ['d', 'd']);
  await copyOutside(page, 'obcy tekst');
  await select(page, 'b');
  await keys(page, ['p']);
  expect(await md(page)).toBe('# R\n\n- b\n  - a <!--c-->\n    - a1\n- c\n');
});

test('dd, potem Ctrl+V: wkleja wycięty węzeł, bo dd nadpisało schowek systemowy', async ({ page }) => {
  await loadMap(page, MD);
  await copyOutside(page, 'obcy tekst');
  await select(page, 'a');
  await keys(page, ['d', 'd']);
  await select(page, 'b');
  await keys(page, ['Control+v']);
  expect(await md(page)).toBe('# R\n\n- b\n  - a <!--c-->\n    - a1\n- c\n');
});

test('yy, potem tekst skopiowany spoza aplikacji: Ctrl+V wkleja ten tekst, a p nadal gałąź z yy', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await keys(page, ['y', 'y']);
  await copyOutside(page, 'Nowy');
  await select(page, 'c');
  await keys(page, ['Control+v']);
  await expect(page.locator('#info')).toHaveText('wklejono 1 węzeł');
  await select(page, 'c');
  await keys(page, ['p']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n  - Nowy\n  - b\n');
});

test('tekst z zewnątrz: lista z wcięciami → hierarchia, kolejne zwykłe linie → jeden węzeł, pusta linia rozdziela', async ({
  page,
}) => {
  const cases = [
    ['- x\n  - x1\n    - x2\n- y', '- c\n  - x\n    - x1\n      - x2\n  - y\n'],
    ['    - wcięta\n      - dalej', '- c\n  - wcięta\n    - dalej\n'], // wcięcie liczone od najmniej wciętej linii
    ['jeden\n\ndwa\n   \ntrzy', '- c\n  - jeden\n  - dwa\n  - trzy\n'], // pusta linia rozdziela węzły
    ['pierwsza linia\ndruga linia\n\nnowy akapit', '- c\n  - pierwsza linia druga linia\n  - nowy akapit\n'], // kolejne linie = jeden węzeł
    ['- punkt\n  dalszy ciąg punktu\n- drugi', '- c\n  - punkt dalszy ciąg punktu\n  - drugi\n'], // ciąg dalszy punktu listy
    ['Tylko jedna linia', '- c\n  - Tylko jedna linia\n'],
    ['# Tytuł\n- punkt', '- c\n  - Tytuł\n    - punkt\n'], // lista pod nagłówkiem to jego dzieci
    ['Zakupy\n  mleko\n  chleb', '- c\n  - Zakupy mleko chleb\n'], // zwykłe linie jedna pod drugą – jeden węzeł, także wcięte
    ['- a\n\t- a1\n\t\t- a2', '- c\n  - a\n    - a1\n      - a2\n'], // tabulatory (Obsidian)
  ];
  for (const [text, tail] of cases) {
    await loadMap(page, MD);
    await copyOutside(page, text);
    await select(page, 'c');
    await keys(page, ['Control+v']);
    expect(await md(page), text).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n' + tail);
  }
});

test('tekst Markdown z notatki: nagłówki tworzą poziomy, lista i zwykłe linie trafiają pod nagłówek', async ({
  page,
}) => {
  await loadMap(page, MD);
  await copyOutside(page, '# Projekt\n\n## Cele\n\n- a\n\t- a1\n\nzwykła linia\n\n## Ryzyka\n- r\n');
  await select(page, 'c');
  await keys(page, ['Control+v']);
  expect(await md(page)).toBe(
    '# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n  - Projekt\n    - Cele\n      - a\n        - a1\n      - zwykła linia\n    - Ryzyka\n      - r\n'
  );
});

test('wyrenderowana notatka (widok czytania w Obsidianie, strona WWW): struktura z wersji HTML schowka', async ({
  page,
}) => {
  const tail = '- c\n  - Nagłówek\n    - a\n      - a1\n    - b\n    - zwykła linia\n';
  for (const html of [
    '<h2>Nagłówek</h2><ul><li>a<ul><li>a1</li></ul></li><li>b</li></ul><p>zwykła<br>linia</p>', // <br> w akapicie – jeden węzeł
    /* jak w Obsidianie: bloki w <div>, znaczniki punktów bez tekstu, akapit w punkcie listy */
    '<div class="el-h2"><h2 dir="auto">Nagłówek</h2></div><div class="el-ul"><ul><li><span class="list-bullet"></span><p>a</p>' +
      '<ul><li><span class="list-bullet"></span>a1</li></ul></li><li>b</li></ul></div><div class="el-p"><p>zwykła linia</p></div>',
  ]) {
    await loadMap(page, MD);
    await copyRendered(page, html);
    await select(page, 'c');
    await keys(page, ['Control+v']);
    expect(await md(page), html).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n' + tail);
  }
});

test('tekst z zewnątrz z końcami linii \\r\\n (Windows)', async ({ page }) => {
  /* pole tekstowe zamienia \r\n na \n, a Firefox ignoruje sztucznie podany schowek – sprawdzamy samą funkcję */
  await loadMap(page, MD);
  await select(page, 'c');
  await page.evaluate(() => pasteText('- x\r\n  - x1\r\n- y\r\n', true));
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n  - x\n    - x1\n  - y\n');
});

test('Ctrl+Shift+V z zewnątrz wkleja jako braci; bez zaznaczenia powstaje nowa mapa', async ({ page }) => {
  await loadMap(page, MD);
  await copyOutside(page, '- p\n- q');
  await select(page, 'b');
  await keys(page, ['Control+Shift+V']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- p\n- q\n- c\n');

  await copyOutside(page, '- Nowa\n  - z');
  await page.evaluate(() => deselect());
  await keys(page, ['Control+v']);
  expect(await page.evaluate(() => root.children.map(r => r.text))).toEqual(['R', 'Nowa']);
  expect(await page.evaluate(() => S().n.text)).toBe('Nowa');
});

test('wklejanie w trakcie edycji: tylko tekst w polu, nowe linie jako spacje, bez nowych węzłów', async ({ page }) => {
  await loadMap(page, MD);
  await copyOutside(page, 'raz\ndwa');
  await select(page, 'b');
  await keys(page, ['i', 'End', 'Control+v']);
  await expect(page.locator('#ed')).toHaveValue('braz dwa');
  await keys(page, ['Enter']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- braz dwa\n- c\n');
});

test('jedno Ctrl+Z cofa całe wklejenie', async ({ page }) => {
  await loadMap(page, MD);
  await copyOutside(page, '- x\n  - y\n- z');
  await select(page, 'b');
  await keys(page, ['Control+v']);
  await expect(page.locator('#info')).toHaveText('wklejono 3 węzły');
  await keys(page, ['Control+z']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n');
});

test('nieudany zapis do schowka systemowego nie psuje kopiowania wewnętrznego', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await loadMap(page, MD);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new DOMException('brak zgody', 'NotAllowedError')) },
    })
  );
  await select(page, 'b');
  await keys(page, ['Control+c']);
  await expect(page.locator('#info')).toHaveText('skopiowano gałąź');
  await select(page, 'c');
  await keys(page, ['p']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n  - b\n');
  await page.waitForTimeout(50);
  expect(errors).toEqual([]);
});

test.describe('telefon bez dostępu do schowka (http, Firefox na Androidzie, WebView): okienko „wklej tutaj”', () => {
  const noClipboard = page => page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
  async function touchPaste(page) {
    await page.evaluate(() => ctxMenu(100, 100, true));
    await page.waitForTimeout(400); /* menu dotykowe przez 350 ms nie przyjmuje stuknięć */
    await expect(page.locator('#menu [data-act="paste"]')).toBeEnabled(); // także gdy w aplikacji nic nie skopiowano
    await page.click('#menu [data-act="paste"]');
    await expect(page.locator('#ask')).toBeVisible();
  }

  test('systemowe „Wklej” w polu okienka wstawia węzły ze strukturą i zamyka okienko', async ({ page }) => {
    await loadMap(page, MD);
    await copyOutside(page, '# Lista\n- x\n  - y');
    await noClipboard(page);
    await select(page, 'c');
    await touchPaste(page);
    await expect(page.locator('#ask')).toContainText('Przytrzymaj pole i wybierz „Wklej”');
    await expect(page.locator('#askf')).toBeVisible();
    await expect(page.locator('#askf')).not.toBeFocused(); // bez klawiatury ekranowej, póki nie dotkniesz pola
    await page.locator('#askf').focus();
    await keys(page, ['Control+v']);
    await expect(page.locator('#ask')).toBeHidden();
    expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n  - Lista\n    - x\n      - y\n');
  });

  test('„Wstaw” bierze tekst z pola; „Wklej skopiowaną gałąź”; „Anuluj” niczego nie zmienia', async ({ page }) => {
    await loadMap(page, MD);
    await noClipboard(page);
    await touchPaste(page);
    await expect(page.locator('#askb button')).toHaveText(['Wstaw', 'Anuluj']); // nic nie skopiowano w aplikacji
    await page.click('#askb >> text=Anuluj');
    await expect(page.locator('#ask')).toBeHidden();

    await select(page, 'b');
    await page.evaluate(() => copy());
    await select(page, 'c');
    await touchPaste(page);
    await expect(page.locator('#askb button')).toHaveText(['Wstaw', 'Wklej skopiowaną gałąź', 'Anuluj']);
    await page.fill('#askf', '- p\n  - q');
    await page.click('#askb >> text=Wstaw');
    await expect(page.locator('#ask')).toBeHidden();

    await select(page, 'c');
    await touchPaste(page);
    await expect(page.locator('#askf')).toHaveValue(''); // pole czyste przy każdym otwarciu
    await page.click('#askb >> text=Wklej skopiowaną gałąź');

    await select(page, 'c');
    await touchPaste(page);
    await page.click('#askb >> text=Anuluj');
    expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1\n- b\n- c\n  - p\n    - q\n  - b\n');
  });
});
