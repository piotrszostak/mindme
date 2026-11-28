// Górny pasek: ikony, objaśnienia, kolejność, przełącznik Markdown/mapa, menu „…”.
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

test.describe('górny pasek', () => {
  test('ikony z objaśnieniami („Aa” i podpisy widoków to napisy); operacje na węzłach w menu', async ({ page }) => {
    const btns = page.locator('#top button');
    await expect(btns).toHaveCount(7);
    const text = { bv: 'Mapa', bt: '.md', bp: 'Aa' };
    for (const b of await btns.all()) {
      const id = await b.getAttribute('id');
      await expect(b.locator('svg.ic')).toHaveCount(id === 'bp' ? 0 : 1);
      expect((await b.innerText()).trim()).toBe(text[id] || '');
      expect(await b.getAttribute('data-tip')).toBeTruthy();
      expect(await b.getAttribute('aria-label')).toBe(await b.getAttribute('data-tip'));
    }
    for (const id of ['bn', 'bc', 'be', 'bd', 'bh']) await expect(page.locator('#' + id)).toHaveCount(0);
  });

  test('przełącznik Mapa / .md: wciśnięty bieżący widok; w .md historia, układ, dopasuj i „Aa” wyszarzone', async ({
    page,
  }) => {
    const bv = page.locator('#bv'),
      bt = page.locator('#bt'),
      off = ['bu', 'br', 'bf', 'bp'];
    await expect(bv).toHaveAttribute('aria-pressed', 'true');
    await expect(bt).toHaveAttribute('aria-pressed', 'false');
    await bt.click();
    await expect(page.locator('#txt')).toBeVisible();
    await expect(bt).toHaveAttribute('aria-pressed', 'true');
    await expect(bv).toHaveAttribute('aria-pressed', 'false');
    for (const id of off) await expect(page.locator('#' + id)).toBeDisabled();
    await bt.click(); // wciśnięty widok – bez zmiany
    await expect(page.locator('#txt')).toBeVisible();
    await bv.click();
    await expect(page.locator('#txt')).toBeHidden();
    await expect(bv).toHaveAttribute('aria-pressed', 'true');
    await expect(bt).toHaveAttribute('aria-pressed', 'false');
    for (const id of off) await expect(page.locator('#' + id)).toBeEnabled();
  });

  test('panel wyglądu chowa się na czas widoku .md i wraca razem z mapą', async ({ page }) => {
    await page.click('#bp');
    await expect(page.locator('#side')).toHaveClass(/open/);
    await page.click('#bt');
    await expect(page.locator('#side')).not.toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#txt')).toBeHidden();
    await expect(page.locator('#side')).toHaveClass(/open/);
    await expect(page.locator('#bp')).toHaveClass(/on/);
  });

  test('wyspy nad mapą: mapa od górnej krawędzi, „Dopasuj” nie chowa węzłów pod przyciskami', async ({ page }) => {
    await loadMap(page, LONG);
    expect((await page.locator('#sv').boundingBox()).y).toBeLessThanOrEqual(1);
    await page.click('#bf');
    const under = (await page.locator('#tl').boundingBox()).y + (await page.locator('#tl').boundingBox()).height;
    const tops = await page.$$eval('#g .n', ns => ns.map(n => n.getBoundingClientRect().top));
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(under);
  });

  test('zapis w widoku tekstowym zapisuje to, co jest w tekście', async ({ page }) => {
    await page.evaluate(() => {
      window.showSaveFilePicker = undefined;
    }); // bez systemowego okna → pobranie pliku
    await page.click('#bt');
    await page.fill('#txt', '# Z tekstu\n- a\n');
    const dl = page.waitForEvent('download');
    await page.click('#bm');
    await act(page, 'save').click();
    const f = await (await dl).path();
    expect(require('fs').readFileSync(f, 'utf8')).toBe('# Z tekstu\n\n- a\n');
  });

  test('objaśnienie pojawia się po najechaniu', async ({ page }) => {
    await page.hover('#bu');
    await page.waitForTimeout(600);
    const tip = await page.$eval('#bu', b => getComputedStyle(b, '::after').content);
    expect(tip).toContain('Cofnij');
  });

  test('układ wybiera się w panelu „Aa” – bieżący wciśnięty; na pasku nie ma przycisku układu', async ({ page }) => {
    await expect(page.locator('#bl')).toHaveCount(0);
    await page.click('#bp');
    const lays = page.locator('#side .lays button');
    await expect(lays).toHaveCount(4);
    await expect(page.locator('#side .lays [data-act="lay-right"]')).toHaveClass(/on/);
    await page.click('#side .lays [data-act="lay-both"]');
    expect(await page.evaluate(() => dir)).toBe('both');
    await expect(page.locator('#side .lays .on')).toHaveAttribute('data-act', 'lay-both');
    await expect(page.locator('#side')).toHaveClass(/open/); // panel zostaje otwarty
  });

  test('menu „więcej”: tryb jasny / ciemny, pomoc', async ({ page }) => {
    await page.click('#bm');
    await act(page, 'theme').click();
    const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('#bm');
    await act(page, 'theme').click();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(t1);
    await page.click('#bm');
    await act(page, 'help').click();
    await expect(page.locator('#help')).toBeVisible();
    await page.click('#hx');
    await expect(page.locator('#help')).toBeHidden();
  });
});

test.describe('pasek: ☰ po lewej, widoki i panel wyglądu po prawej', () => {
  test('☰ jest pierwsze, zaczyna się od „Plik” i „Otwórz”; ostatnie „Aa”', async ({ page }) => {
    const ids = await page.$$eval('#top button', bs => bs.map(b => b.id));
    expect(ids[0]).toBe('bm');
    expect(ids[ids.length - 1]).toBe('bp');
    await expect(page.locator('#bo')).toHaveCount(0);
    await page.click('#bm');
    const m = await menu(page).boundingBox(),
      b = await page.locator('#bm').boundingBox();
    expect(Math.abs(m.x - b.x)).toBeLessThan(2); // rozwija się pod przyciskiem, przy lewej krawędzi
    await expect(page.locator('#menu .mh').first()).toHaveText('Plik');
    await expect(page.locator('#menu .mh').nth(1)).toHaveText('Eksport');
    await expect(page.locator('#menu button').first()).toHaveAttribute('data-act', 'open');
    await expect(act(page, 'open').locator('kbd')).toHaveText('Ctrl+O');
  });
});

test.describe('pasek: kolejność', () => {
  test('z lewej ☰, cofnij, ponów, dopasuj; z prawej Mapa / .md i „Aa”', async ({ page }) => {
    const ids = await page.$$eval('#top button', bs => bs.map(b => b.id));
    expect(ids).toEqual(['bm', 'bu', 'br', 'bf', 'bv', 'bt', 'bp']);
    await expect(page.locator('#bs')).toHaveCount(0);
    const x = async id => (await page.locator('#' + id).boundingBox()).x;
    const w = page.viewportSize().width;
    expect(await x('bf')).toBeLessThan(w / 3); // ostatni z lewej grupy nadal przy lewej krawędzi
    expect(await x('bv')).toBeGreaterThan(w / 2);
    expect(await x('bp')).toBeGreaterThan(w - 60); // panel wyglądu przy prawej krawędzi
    for (const id of ['bm', 'bu', 'br', 'bf']) await expect(page.locator('#' + id)).not.toHaveClass(/tr/);
    for (const id of ['bv', 'bt', 'bp']) await expect(page.locator('#' + id)).toHaveClass(/tr/); // objaśnienie w lewo
  });

  test('telefon 360 px: wyspy się nie nakładają', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const l = await page.locator('#tl').boundingBox(),
      r = await page.locator('#tr').boundingBox();
    expect(l.x).toBeGreaterThanOrEqual(0);
    expect(l.x + l.width).toBeLessThan(r.x);
    expect(r.x + r.width).toBeLessThanOrEqual(360);
  });

  test('„Zapisz” jest w menu „…” zaraz pod „Otwórz”, ze skrótem Ctrl+S', async ({ page }) => {
    await page.click('#bm');
    expect(await page.$$eval('#menu button', bs => bs.slice(0, 2).map(b => b.dataset.act))).toEqual(['open', 'save']);
    await expect(act(page, 'save').locator('kbd')).toHaveText('Ctrl+S');
    await page.evaluate(() => {
      window.showSaveFilePicker = undefined;
    });
    const dl = page.waitForEvent('download');
    await act(page, 'save').click();
    expect((await dl).suggestedFilename()).toBe('mapa.md');
  });
});

test.describe('pasek stanu', () => {
  const HINT = 'przytrzymaj – menu (na tle też odznacza) · stuknij 2× – edytuj';
  const MSG = 'Pominięto 2 linie spoza mapy – plik na dysku bez zmian';
  const show = page =>
    page.evaluate(
      ([h, m]) => {
        hint(h);
        $('save').textContent = '✓ zapisano lokalnie';
        info(m);
      },
      [HINT, MSG]
    );

  test('komputer: komunikat ma pierwszeństwo przed podpowiedzią i pełny tekst w objaśnieniu', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await show(page);
    /* szerokość tekstu z Range (nie scrollWidth – zaokrągla i nie widzi ucięcia o ułamek piksela) */
    const [w, tw] = await page.$eval('#info', e => {
      const r = document.createRange();
      r.selectNodeContents(e);
      return [e.getBoundingClientRect().width, r.getBoundingClientRect().width];
    });
    expect(w).toBeGreaterThanOrEqual(tw);
    await expect(page.locator('#info')).toHaveAttribute('title', MSG);
  });

  test('telefon: komunikat cały widoczny (osobny wiersz), a bez komunikatu wiersza nie ma', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => info(''));
    const h0 = await page.$eval('#st', e => e.offsetHeight);
    await show(page);
    const [w, sw, sh, ch] = await page.$eval('#info', e => [
      e.clientWidth,
      e.scrollWidth,
      e.scrollHeight,
      e.clientHeight,
    ]);
    expect(w).toBeGreaterThan(300);
    expect(w).toBeGreaterThanOrEqual(sw);
    expect(ch).toBeGreaterThanOrEqual(sh);
    const mid = id => page.$eval(id, e => (r => r.top + r.height / 2)(e.getBoundingClientRect()));
    /* tryb, podpowiedź i stan zapisu w jednym wierszu (środki wyrównane), komunikat pod nimi */
    expect(Math.abs((await mid('#hint')) - (await mid('#mode')))).toBeLessThan(2);
    expect(Math.abs((await mid('#save')) - (await mid('#mode')))).toBeLessThan(2);
    expect(await mid('#info')).toBeGreaterThan((await mid('#mode')) + 10);
    await page.evaluate(() => info(''));
    expect(await page.$eval('#st', e => e.offsetHeight)).toBe(h0);
  });
});

/* Widok Markdown: tekst, którego mapa nie pokaże, nie może zniknąć po cichu. */
test.describe('widok Markdown: linie, których mapa nie pokaże', () => {
  const ask = page => page.locator('#ask');
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => load('# T\n\n- a\n- b\n'));
  });

  test('zamknięcie bez zmian w tekście nie zmienia mapy, zaznaczenia ani historii', async ({ page }) => {
    await page.evaluate(() => go(first().children[1].id));
    const before = await page.evaluate(() => ({ sel, u: undoS.length }));
    await page.click('#bt');
    await page.keyboard.press('Escape');
    await expect(page.locator('#txt')).toBeHidden();
    expect(await page.evaluate(() => ({ sel, u: undoS.length }))).toEqual(before);
  });

  test('akapit w tekście: pytanie przed zamknięciem; Wróć do tekstu (domyślny) / Zamknij mimo to', async ({ page }) => {
    await page.click('#bt');
    const md = '# T\n\nAkapit.\n\n- a\n';
    await page.fill('#txt', md);
    await page.keyboard.press('Escape');
    await expect(ask(page)).toContainText('Linie, których mapa nie pokaże (1), znikną.');
    await expect(ask(page).locator('button')).toHaveText(['Wróć do tekstu', 'Zamknij mimo to']);
    await page.keyboard.press('Enter');
    await expect(ask(page)).toBeHidden();
    await expect(page.locator('#txt')).toBeVisible();
    expect(await page.inputValue('#txt')).toBe(md);
    await page.keyboard.press('Escape');
    await ask(page).getByRole('button', { name: 'Zamknij mimo to' }).click();
    await expect(page.locator('#txt')).toBeHidden();
    expect(await page.evaluate(() => vis().map(n => n.text))).toEqual(['T', 'a']);
  });

  test('zapis w widoku tekstowym z akapitem też pyta', async ({ page }) => {
    await page.click('#bt');
    await page.fill('#txt', '# T\n\nAkapit.\n\n- a\n');
    await page.keyboard.press('Control+s');
    await expect(ask(page).locator('button')).toHaveText(['Wróć do tekstu', 'Zapisz mimo to']);
  });
});
