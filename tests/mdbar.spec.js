// Widok .md (3.3 krok 5): pasek edycji linii – usuń, przenieś, wcięcie, wysunięcie, wklej, nowy punkt, szukaj.
// Stan pola zapisujemy w tekście: `|` – kursor, `«…»` – zaznaczenie.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

const T = '# R\n\n- a\n  - b\n- c\n';

test.beforeEach(async ({ page }) => {
  await open(page);
  await page.click('#bt');
  await expect(page.locator('#txt')).toBeVisible();
});

/** wpisuje tekst do widoku .md i ustawia kursor / zaznaczenie z znaczników */
async function setMd(page, marked) {
  const text = marked.replace(/[|«»]/g, '');
  await page.fill('#txt', text);
  await page.evaluate(m => {
    const s = m.search(/[|«]/),
      e = m.includes('»') ? m.indexOf('»') - 1 : s;
    $('txt').setSelectionRange(s, e);
  }, marked);
}
/** tekst pola ze znacznikami kursora / zaznaczenia */
const state = page =>
  page.evaluate(() => {
    const t = $('txt'),
      v = t.value,
      s = t.selectionStart,
      e = t.selectionEnd;
    return s === e ? v.slice(0, s) + '|' + v.slice(s) : v.slice(0, s) + '«' + v.slice(s, e) + '»' + v.slice(e);
  });
const btn = (page, id) => page.locator(`#mdBar [data-md="${id}"]`);
/** czynność z klawiatury i z przycisku daje to samo */
async function both(page, from, key, id, to) {
  await setMd(page, from);
  await page.keyboard.press(key);
  expect(await state(page), `${key}: ${JSON.stringify(from)}`).toBe(to);
  await setMd(page, from);
  await btn(page, id).click();
  expect(await state(page), `przycisk ${id}: ${JSON.stringify(from)}`).toBe(to);
}

test.describe('widok .md: pasek edycji', () => {
  test('pasek tylko w widoku .md; przyciski z jednej tabeli, z objaśnieniem i skrótem', async ({ page }) => {
    const bar = page.locator('#mdBar');
    await expect(bar).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/\bv-md\b/);
    const names = [
      'Usuń całą linię',
      'Przenieś linię w górę',
      'Przenieś linię w dół',
      'Wcięcie',
      'Wysunięcie',
      'Wklej',
      'Nowy punkt listy',
      'Szukaj w tekście',
    ];
    await expect(bar.locator('button')).toHaveCount(names.length);
    for (const [i, b] of (await bar.locator('button').all()).entries()) {
      await expect(b).toHaveAttribute('aria-label', names[i]);
      expect(await b.getAttribute('data-tip')).toMatch(new RegExp(`^${names[i]} \\(.+\\)$`));
      await expect(b.locator('svg.ic')).toHaveCount(1);
    }
    expect(await page.evaluate(() => MDA.map(a => a.t))).toEqual(names);
    await page.keyboard.press('Escape');
    await expect(page.locator('#txt')).toBeHidden();
    await expect(bar).toBeHidden();
    await expect(page.locator('#mdFind')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/\bv-md\b/);
  });

  test('przyciski nie zabierają fokusu z tekstu', async ({ page }) => {
    await setMd(page, '# R\n\n- a|\n');
    await btn(page, 'indent').click();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('txt');
  });

  test('usuń całą linię (Ctrl+Shift+K): jedna, kilka, ostatnia, jedyna', async ({ page }) => {
    await both(page, '# R\n\n- a\n  - |b\n- c\n', 'Control+Shift+K', 'del', '# R\n\n- a\n|- c\n');
    await both(page, '# R\n\n- «a\n  - b»\n- c\n', 'Control+Shift+K', 'del', '# R\n\n|- c\n');
    // zaznaczenie kończące się na początku linii jej nie obejmuje
    await both(page, '# R\n\n«- a\n»  - b\n- c\n', 'Control+Shift+K', 'del', '# R\n\n|  - b\n- c\n');
    await both(page, '# R\n- a\n- |c', 'Control+Shift+K', 'del', '# R\n|- a');
    await both(page, '# |R', 'Control+Shift+K', 'del', '|');
  });

  test('przenieś linię w górę / w dół (Alt+↑ / Alt+↓): zaznaczenie jedzie z linią', async ({ page }) => {
    await both(page, '# R\n\n- a\n  - b\n- |c\n', 'Alt+ArrowUp', 'up', '# R\n\n- a\n- |c\n  - b\n');
    await both(page, '# R\n\n- a\n  - b\n- «c»\n', 'Alt+ArrowUp', 'up', '# R\n\n- a\n- «c»\n  - b\n');
    await both(page, '# R\n\n- a\n  - «b\n- c»\n', 'Alt+ArrowUp', 'up', '# R\n\n  - «b\n- c»\n- a\n');
    await both(page, '# R\n\n- |a\n  - b\n- c\n', 'Alt+ArrowDown', 'down', '# R\n\n  - b\n- |a\n- c\n');
    await both(page, '# R\n\n«- a\n  - b\n»- c\n', 'Alt+ArrowDown', 'down', '# R\n\n- c\n«- a\n  - b\n»');
  });

  test('pierwsza linia w górę i ostatnia w dół – bez zmian i bez kroku cofania', async ({ page }) => {
    await both(page, '# |R\n- a', 'Alt+ArrowUp', 'up', '# |R\n- a');
    await both(page, '# R\n- |a', 'Alt+ArrowDown', 'down', '# R\n- |a');
    await both(page, '«# R\n- a»', 'Alt+ArrowDown', 'down', '«# R\n- a»');
    await page.evaluate(() => {
      window.__inputs = 0;
      $('txt').addEventListener('input', () => window.__inputs++);
    });
    await setMd(page, '# R\n- |a');
    await page.evaluate(() => (window.__inputs = 0));
    await page.keyboard.press('Alt+ArrowDown');
    await btn(page, 'down').click();
    await page.evaluate(() => $('txt').setSelectionRange(0, 0));
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => window.__inputs)).toBe(0); // nic nie trafiło do historii cofania
  });

  test('wcięcie i wysunięcie (Tab / Shift+Tab) o 2 spacje', async ({ page }) => {
    await both(page, '# R\n\n- a\n  - b\n- |c\n', 'Tab', 'indent', '# R\n\n- a\n  - b\n  - |c\n');
    await both(page, '# R\n\n- a\n  - |b\n- c\n', 'Shift+Tab', 'outdent', '# R\n\n- a\n- |b\n- c\n');
    // kilka linii; pusta linia w zaznaczeniu bez wcięcia; zaznaczenie od początku linii obejmuje całe linie
    await both(page, '# R\n«\n- a\n  - b»\n- c\n', 'Tab', 'indent', '# R\n«\n  - a\n    - b»\n- c\n');
    await both(page, '# R\n\n«- a\n  - b\n- c»\n', 'Shift+Tab', 'outdent', '# R\n\n«- a\n- b\n- c»\n');
    await both(page, '# R\n\n- a\n    - «b»\n', 'Shift+Tab', 'outdent', '# R\n\n- a\n  - «b»\n');
    // kursor przed wcięciem zostaje na początku linii
    await both(page, '# R\n\n- a\n | - b\n', 'Shift+Tab', 'outdent', '# R\n\n- a\n|- b\n');
    // bez wcięcia – bez zmiany
    await both(page, '# R\n\n- |a\n', 'Shift+Tab', 'outdent', '# R\n\n- |a\n');
  });

  test('nowy punkt listy: przycisk – pod bieżącą linią z jej wcięciem', async ({ page }) => {
    await setMd(page, '# R\n\n- a\n  - |b\n- c\n');
    await btn(page, 'item').click();
    expect(await state(page)).toBe('# R\n\n- a\n  - b\n  - |\n- c\n');
    await setMd(page, '# |R\n');
    await btn(page, 'item').click();
    expect(await state(page)).toBe('# R\n- |\n');
  });

  test('Enter na linii listy: nowy punkt (dzieli linię); na pustym punkcie kończy listę; poza listą zwykła linia', async ({
    page,
  }) => {
    await setMd(page, '# R\n\n- a|\n  - b\n');
    await page.keyboard.press('Enter');
    expect(await state(page)).toBe('# R\n\n- a\n- |\n  - b\n');
    await page.keyboard.press('Enter');
    expect(await state(page)).toBe('# R\n\n- a\n|\n  - b\n');
    await setMd(page, '# R\n\n  - ab|cd\n');
    await page.keyboard.press('Enter');
    expect(await state(page)).toBe('# R\n\n  - ab\n  - |cd\n');
    await setMd(page, '# R|\n');
    await page.keyboard.press('Enter');
    expect(await state(page)).toBe('# R\n|\n');
    await setMd(page, '|- a\n');
    await page.keyboard.press('Enter'); // kursor przed znakiem listy – zwykła nowa linia
    expect(await state(page)).toBe('\n|- a\n');
  });

  test('Ctrl+Z w polu cofa każdą czynność, Ctrl+Shift+Z ponawia', async ({ page }) => {
    await setMd(page, '# R\n\n- a\n  - |b\n- c\n');
    for (const k of ['Shift+Tab', 'Alt+ArrowUp', 'Tab', 'Control+Shift+K']) await page.keyboard.press(k);
    await btn(page, 'item').click();
    expect(await page.inputValue('#txt')).toBe('# R\n\n- a\n- \n- c\n');
    const steps = [
      '# R\n\n- a\n- c\n',
      '# R\n\n  - b\n- a\n- c\n',
      '# R\n\n- b\n- a\n- c\n',
      '# R\n\n- a\n- b\n- c\n',
      T,
    ];
    for (const s of steps) {
      await page.keyboard.press('Control+z');
      expect(await page.inputValue('#txt')).toBe(s);
    }
    await page.keyboard.press('Control+Shift+z');
    expect(await page.inputValue('#txt')).toBe('# R\n\n- a\n- b\n- c\n');
  });

  test('wklej: tekst ze schowka systemowego w miejscu kursora; bez dostępu – komunikat', async ({ page }) => {
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { readText: () => Promise.resolve('x\n  - y') },
      })
    );
    await setMd(page, '# R\n\n- a«b»c\n');
    await btn(page, 'paste').click();
    await expect.poll(() => state(page)).toBe('# R\n\n- ax\n  - y|c\n');
    await page.keyboard.press('Control+z');
    expect(await page.inputValue('#txt')).toBe('# R\n\n- abc\n');
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: () => Promise.reject(new DOMException('brak zgody', 'NotAllowedError')) },
      })
    );
    await setMd(page, '# R\n\n- a|\n');
    await btn(page, 'paste').click();
    await expect(page.locator('#info')).toContainText('schowka');
    expect(await state(page)).toBe('# R\n\n- a|\n');
  });

  test('szukaj (Ctrl+F): licznik, Enter – następne, Shift+Enter – poprzednie, bez polskich znaków, Esc zamyka pole', async ({
    page,
  }) => {
    await setMd(page, '# Żółw\n\n- zolw\n  - b\n- ZÓŁW|\n');
    await page.keyboard.press('Control+f');
    const q = page.locator('#mdQ'),
      n = page.locator('#mdQn');
    await expect(page.locator('#mdFind')).toBeVisible();
    await expect(q).toBeFocused();
    await q.fill('zolw');
    await expect(n).toHaveText('1 z 3'); // od kursora w dół, potem od początku: tu kursor na końcu → pierwsze
    expect(await state(page)).toBe('# «Żółw»\n\n- zolw\n  - b\n- ZÓŁW\n');
    await q.press('Enter');
    await expect(n).toHaveText('2 z 3');
    // trafienie widać, choć fokus jest w polu szukania: wyróżnienie pod tekstem, w tym samym miejscu co tekst
    await expect(page.locator('#mdHl mark')).toHaveText('zolw');
    await expect(page.locator('#mdHl mark')).toBeVisible();
    const m = await page.locator('#mdHl mark').boundingBox(),
      lh = await page.evaluate(() => parseFloat(getComputedStyle($('txt')).lineHeight) || 17),
      top = await page.evaluate(
        () => $('txt').getBoundingClientRect().top + parseFloat(getComputedStyle($('txt')).paddingTop)
      );
    expect(Math.abs(m.y - (top + 2 * lh))).toBeLessThan(lh / 2); // trzecia linia tekstu
    expect(await state(page)).toBe('# Żółw\n\n- «zolw»\n  - b\n- ZÓŁW\n');
    await q.press('Enter');
    await q.press('Enter'); // za ostatnim – znów pierwsze
    await expect(n).toHaveText('1 z 3');
    await q.press('Shift+Enter');
    await expect(n).toHaveText('3 z 3');
    expect(await state(page)).toBe('# Żółw\n\n- zolw\n  - b\n- «ZÓŁW»\n');
    await q.fill('xyz');
    await expect(n).toHaveText('0 trafień');
    await q.fill('b');
    await expect(n).toHaveText('1 z 1');
    await q.press('Escape');
    await expect(page.locator('#mdFind')).toBeHidden();
    await expect(page.locator('#mdHl mark')).toHaveCount(0);
    await expect(page.locator('#txt')).toBeVisible(); // Esc w polu szukania nie wraca do mapy
    await expect(page.locator('#txt')).toBeFocused();
    expect(await state(page)).toBe('# Żółw\n\n- zolw\n  - «b»\n- ZÓŁW\n');
  });

  test('szukaj: zaznaczony tekst trafia do pola; przycisk otwiera pole; trafienie daleko w tekście jest widoczne', async ({
    page,
  }) => {
    const long = '# R\n' + Array.from({ length: 200 }, (_, i) => `- w${i}`).join('\n') + '\n- cel\n';
    await setMd(page, long.replace('cel', '«cel»'));
    await page.evaluate(() => ($('txt').scrollTop = 0));
    await page.keyboard.press('Control+f');
    await expect(page.locator('#mdQ')).toHaveValue('cel');
    await page.locator('#mdQx').click();
    await expect(page.locator('#mdFind')).toBeHidden();
    await setMd(page, long.replace('# R', '# |R'));
    await btn(page, 'find').click();
    await expect(page.locator('#mdQ')).toBeFocused();
    await page.locator('#mdQ').fill('cel');
    await expect(page.locator('#mdQn')).toHaveText('1 z 1');
    expect(await page.evaluate(() => $('txt').scrollTop)).toBeGreaterThan(1000);
  });

  test('Esc wraca do mapy, Ctrl+S zapisuje – w tekście i w polu szukania', async ({ page }) => {
    await page.evaluate(() => {
      window.__saved = 0;
      window.save = async () => {
        window.__saved++;
      };
    });
    await setMd(page, '# R\n\n- a|\n');
    await page.keyboard.press('Control+s');
    await page.keyboard.press('Control+f');
    await page.locator('#mdQ').press('Control+s');
    expect(await page.evaluate(() => window.__saved)).toBe(2);
    await expect(page.locator('#txt')).toBeVisible();
    await page.locator('#mdQ').press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.locator('#txt')).toBeHidden();
    await expect(page.locator('#mdBar')).toBeHidden();
    expect(await page.evaluate(() => vis().map(n => n.text))).toEqual(['R', 'a']);
  });

  test('pole szukania znika razem z widokiem .md i nie wraca samo', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await expect(page.locator('#mdFind')).toBeVisible();
    await page.click('#bv');
    await expect(page.locator('#mdFind')).toBeHidden();
    await page.click('#bt');
    await expect(page.locator('#mdBar')).toBeVisible();
    await expect(page.locator('#mdFind')).toBeHidden();
  });
});

test.describe('widok .md: miejsce paska', () => {
  const rect = (page, sel) => page.locator(sel).boundingBox();
  const apart = (a, b) =>
    a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

  for (const w of [1280, 760]) {
    test(`komputer ${w} px: pasek u góry między wyspami, bez nachodzenia; pole szukania pod nim`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      const bar = await rect(page, '#mdBar'),
        l = await rect(page, '#tl'),
        r = await rect(page, '#tr');
      expect(bar.y).toBeLessThan(20);
      expect(bar.x).toBeGreaterThanOrEqual(l.x + l.width);
      expect(bar.x + bar.width).toBeLessThanOrEqual(r.x);
      // wszystkie przyciski widać bez przewijania
      expect(await page.evaluate(() => $('mdBar').scrollWidth <= $('mdBar').clientWidth)).toBe(true);
      await page.keyboard.press('Control+f');
      const f = await rect(page, '#mdFind');
      for (const o of [bar, l, r]) expect(apart(f, o)).toBe(true);
      // pierwsza linia tekstu nie chowa się pod polem szukania
      const pad = await page.evaluate(() => parseFloat(getComputedStyle($('txt')).paddingTop));
      expect(pad).toBeGreaterThanOrEqual(f.y + f.height - (await rect(page, '#txt')).y);
    });
  }

  test('telefon 375 px: pasek na dole, przewijany w bok, tekst i pasek stanu nad nim', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    const bar = await rect(page, '#mdBar'),
      txt = await rect(page, '#txt'),
      st = await rect(page, '#st');
    expect(bar.y + bar.height).toBeGreaterThan(735);
    expect(bar.x).toBe(0);
    expect(bar.width).toBe(375);
    expect(txt.y + txt.height).toBeLessThanOrEqual(bar.y + 1);
    expect(st.y + st.height).toBeLessThanOrEqual(bar.y + 1);
    expect(await page.evaluate(() => $('mdBar').scrollWidth > $('mdBar').clientWidth)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle($('mdBar')).overflowX)).toBe('auto');
    // podpisy pod ikonami
    await expect(btn(page, 'del')).toContainText('Usuń');
    await page.keyboard.press('Control+f');
    const f = await rect(page, '#mdFind'),
      tr = await rect(page, '#tr');
    expect(f.y).toBeGreaterThanOrEqual(tr.y + tr.height);
    expect(f.x + f.width).toBeLessThanOrEqual(375);
  });
});
