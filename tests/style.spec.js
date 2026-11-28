// Panel „Wygląd mapy”: suwaki, czcionki, palety, zapis stylu.
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

test.describe('panel „Wygląd mapy”', () => {
  const path0 = page => page.$eval('#g path', p => p.getAttribute('stroke-width'));
  const open = async page => {
    await page.click('#bp');
    await expect(page.locator('#side')).toBeVisible();
  };

  test('otwieranie i zamykanie: przycisk, ×, Esc', async ({ page }) => {
    await open(page);
    await expect(page.locator('#bp')).toHaveClass(/on/);
    await page.click('#sx');
    await expect(page.locator('#side')).toBeHidden();
    await open(page);
    await page.locator('#st-edge').focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('#side')).toBeHidden();
    await expect(page.locator('#bp')).not.toHaveClass(/on/);
  });

  test('fokus w wysuwającym się panelu nie przesuwa mapy', async ({ page }) => {
    // kliknięcie i fokus w jednym kroku: panel jest jeszcze za prawą krawędzią (animacja wysuwania)
    const r = await page.evaluate(() => {
      const x0 = $('sv').getBoundingClientRect().x;
      $('bp').click();
      document.querySelector('#st-edge').focus();
      return { scroll: $('main').scrollLeft, moved: $('sv').getBoundingClientRect().x - x0 };
    });
    expect(r).toEqual({ scroll: 0, moved: 0 });
  });

  test('suwaki zmieniają mapę na żywo: linie, obramowanie, rogi, tekst, odstępy', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const before = await box(page, 'Jeden'),
      r0 = await box(page, 'Środek');
    await page.locator('#st-edge').fill('5');
    expect(await path0(page)).toBe('5');
    await page.locator('#st-radius').fill('0');
    expect(await page.$eval('#g .n rect', r => r.getAttribute('rx'))).toBe('0');
    await page.locator('#st-nb').fill('4');
    expect(await page.$eval('#g .n:not(.sel) rect', r => getComputedStyle(r).strokeWidth)).toBe('4px');
    await page.locator('#st-gapX').fill('120');
    const after = await box(page, 'Jeden'),
      r1 = await box(page, 'Środek');
    expect(after.x - r1.x - (before.x - r0.x)).toBeCloseTo(70, 0); // 50 → 120 px między poziomami
    await page.locator('#st-fs').fill('20');
    expect((await box(page, 'Jeden')).h).toBeGreaterThan(before.h);
    await expect(page.locator('#sn-fs')).toHaveValue('20'); // pole liczbowe obok suwaka
  });

  test('kształt linii i wypełnienie', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="straight"]');
    expect(await page.$eval('#g path', p => p.getAttribute('d'))).toMatch(/^M[-\d. ]+L/);
    await expect(page.locator('#side .seg[data-k="edgeStyle"] button[data-v="straight"]')).toHaveClass(/on/);
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]');
    expect(await page.$eval('#g path', p => p.getAttribute('d'))).toMatch(/H[-\d.]+V[-\d.]+H/);
    await page.click('#side .seg[data-k="fill"] button[data-v="solid"]');
    const j = await box(page, 'Jeden');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.style.fill)).not.toBe('');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] text`, t => t.style.fill)).toMatch(/255, 255, 255|#fff/);
  });

  test('kolory gałęzi tylko z presetów (min. 6), wybór zmienia mapę', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const names = await page.$$eval('#side [data-pal]', bs => bs.map(b => b.dataset.pal));
    expect(names.length).toBeGreaterThanOrEqual(6);
    await expect(page.locator('#side input[type=color]').first()).toBeHidden(); // próbniki schowane
    await expect(page.locator('#side [data-pal="Domyślna"]')).toHaveClass(/on/);
    await page.click('#side [data-pal="Monochromatyczna"]');
    const strokes = await page.$$eval('#g path', ps => [...new Set(ps.map(p => p.getAttribute('stroke')))]);
    expect(strokes).toEqual(['#2f6fed']);
    await expect(page.locator('#side [data-pal="Monochromatyczna"]')).toHaveClass(/on/);
    expect(await texts(page)).toContain('"palette":"Monochromatyczna"');
    await page.click('#side [data-pal="Ocean"]');
    const j = await box(page, 'Jeden');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#0077b6');
  });

  // Edycja palet (decyzja A.4, 2026-11-28): poprawki tylko w kolorach otwartej mapy (plik), palety wszędzie te same.
  test('edycja palety: zmienia tylko kolory tej mapy (plik), nie pamięć przeglądarki; można przywrócić oryginał', async ({
    page,
  }) => {
    await page.evaluate(() =>
      localStorage.setItem('mm.pal', '{"Las":["#000000","#000000","#000000","#000000","#000000","#000000"]}')
    );
    await loadMap(page, MD);
    await open(page);
    await page.click('#side [data-pal="Las"]'); // dawne poprawki z `mm.pal` nie są już czytane
    const stroke = async () => {
      const j = await box(page, 'Jeden');
      return page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'));
    };
    expect(await stroke()).toBe('#2d6a4f');
    await page.click('#paledit');
    await expect(page.locator('#paledit')).toContainText('Las');
    await expect(page.locator('#palreset')).toBeHidden();
    await page.locator('#side input[data-ci="0"]').fill('#123456');
    expect(await stroke()).toBe('#123456');
    expect(await page.evaluate(() => localStorage.getItem('mm.pal'))).toBe(
      '{"Las":["#000000","#000000","#000000","#000000","#000000","#000000"]}'
    ); // klucz zostaje nieużywany
    const md = await texts(page);
    expect(md).toContain('"palette":"Las","colors":["#123456",');
    await expect(page.locator('#palreset')).toBeVisible();
    await page.click('#palreset'); // kolory z oryginalnej palety, jeden krok cofania
    expect(await stroke()).toBe('#2d6a4f');
    await expect(page.locator('#palreset')).toBeHidden();
    await page.evaluate(() => undo());
    expect(await stroke()).toBe('#123456');
    await page.click('#side [data-pal="Ocean"]');
    await page.click('#side [data-pal="Las"]'); // powrót do palety = kolory z PAL0, bez poprawek
    expect(await stroke()).toBe('#2d6a4f');
    await loadMap(page, md); // plik z poprawionymi kolorami wczytuje się z nimi
    expect(await stroke()).toBe('#123456');
    await expect(page.locator('#side [data-pal="Las"]')).toHaveClass(/on/);
  });

  test('czcionka i grubość tekstu: mapa, pomiar zawijania, pole edycji, plik', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const w0 = (await box(page, 'Jeden')).w;
    await page.selectOption('#st-font', 'mono'); // lista rozwijana
    expect(await page.$eval('#g .n text', t => getComputedStyle(t).fontFamily)).toMatch(/monospace/);
    expect((await box(page, 'Jeden')).w).not.toBe(w0); // szerokość mierzona nową czcionką
    await page.click('#side .seg[data-k="weight"] button[data-v="bold"]');
    expect(await page.$eval('#g .n text', t => getComputedStyle(t).fontWeight)).toBe('700');
    expect(await texts(page)).toContain('"font":"mono","weight":"bold"');
    await page.click('#sx');
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    expect(
      await page.$eval('#ed', e => [getComputedStyle(e).fontFamily, getComputedStyle(e).fontWeight].join('|'))
    ).toMatch(/monospace.*\|700/);
    await expectEditorOver(page, 'Dwa');
  });

  test('styl zapisuje się w pliku mapy i wraca po wczytaniu; „Przywróć domyślny wygląd” = wygląd nowych map', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await open(page);
    await page.locator('#st-edge').fill('4');
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]');
    const md = await texts(page);
    expect(md).toBe(
      '# Środek\n<!--style:{"edge":4,"edgeStyle":"elbow"}-->\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n'
    );
    await page.click('#sreset');
    expect(await texts(page)).toBe(
      '# Środek\n<!--style:{"gapX":100,"gapY":20,"gapTree":100}-->\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n'
    );
    expect(await path0(page)).toBe('2');
    await loadMap(page, md); // wczytanie pliku ze stylem
    expect(await path0(page)).toBe('4');
    await expect(page.locator('#st-edge')).toHaveValue('4');
    await expect(page.locator('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]')).toHaveClass(/on/);
    expect(await page.evaluate(() => selfTest())).toBe(true);
  });

  test('zmiana stylu jest cofalna (jedno przeciągnięcie suwaka = jeden krok)', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const s = page.locator('#st-edge');
    for (const v of ['3', '4', '6'])
      await s.evaluate((r, v) => {
        r.value = v;
        r.dispatchEvent(new Event('input'));
      }, v);
    await s.evaluate(r => r.dispatchEvent(new Event('change')));
    expect(await path0(page)).toBe('6');
    await page.locator('#sx').click();
    await page.keyboard.press('Control+z');
    expect(await path0(page)).toBe('2');
    await page.keyboard.press('Control+y');
    expect(await path0(page)).toBe('6');
  });

  test('strzałki na suwaku nie przesuwają zaznaczenia na mapie', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.locator('#st-gapY').focus();
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Środek');
    await expect(page.locator('#st-gapY')).toHaveValue('11');
  });

  test('kolejność: układ, kolory, czcionka, potem szczegóły i przyciski wyglądu', async ({ page }) => {
    await open(page);
    const order = await page.$$eval('#side .lays, #side .pals, #st-font, #st-fs, #st-gapX, #sdef, #sreset', els =>
      els.map(e => e.id || e.className.replace('seg ', ''))
    );
    expect(order).toEqual(['lays', 'pals', 'st-font', 'st-fs', 'st-gapX', 'sdef', 'sreset']);
  });

  test('pole liczbowe obok suwaka; min i max wypisane; wartość spoza zakresu przycięta', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const row = page.locator('#side .row', { has: page.locator('#st-edge') });
    await expect(row).toContainText('0,5–8 px');
    await page.locator('#sn-edge').fill('5');
    expect(await path0(page)).toBe('5');
    await page.locator('#sn-edge').blur(); // koniec wpisywania w pole = jeden krok cofania
    await expect(page.locator('#st-edge')).toHaveValue('5');
    await page.locator('#sn-edge').fill('20');
    await page.locator('#sn-edge').blur();
    expect(await path0(page)).toBe('8');
    await expect(page.locator('#sn-edge')).toHaveValue('8');
    await page.locator('#sn-edge').fill('');
    await page.locator('#sn-edge').blur(); // puste pole wraca do wartości mapy
    await expect(page.locator('#sn-edge')).toHaveValue('8');
    await page.evaluate(() => undo());
    expect(await path0(page)).toBe('5');
  });

  test('trzy odstępy na wspólnej skali 0–240 px; poza dozwolonym zakresem suwak staje na granicy', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    for (const k of ['gapX', 'gapY', 'gapTree']) {
      await expect(page.locator('#st-' + k)).toHaveAttribute('min', '0');
      await expect(page.locator('#st-' + k)).toHaveAttribute('max', '240');
    }
    await page.locator('#side').evaluate(e => Promise.all(e.getAnimations().map(a => a.finished))); // panel wysunięty
    const x = await page.locator('#st-gapX').boundingBox(),
      y = await page.locator('#st-gapTree').boundingBox();
    expect([x.x, x.width]).toEqual([y.x, y.width]); // ta sama wartość stoi w tym samym miejscu
    await expect(page.locator('#side .row', { has: page.locator('#st-gapY') })).toContainText('0–60 px');
    await page.locator('#st-gapY').fill('200');
    expect(await page.evaluate(() => ST.gapY)).toBe(60);
    await expect(page.locator('#st-gapY')).toHaveValue('60');
    await page.locator('#st-gapX').fill('0');
    expect(await page.evaluate(() => ST.gapX)).toBe(16);
    await expect(page.locator('#sn-gapX')).toHaveValue('16');
  });

  test('panel obok mapy: od wysp do paska stanu, mapa nie jest zasłaniana', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.locator('#side').evaluate(e => Promise.all(e.getAnimations().map(a => a.finished))); // panel wysunięty
    const s = await page.locator('#side').boundingBox(),
      tl = await page.locator('#tl').boundingBox(),
      st = await page.locator('#st').boundingBox();
    expect(s.y).toBeGreaterThanOrEqual(tl.y + tl.height);
    expect(s.y + s.height).toBeCloseTo(st.y, 0);
    expect(s.x + s.width).toBeCloseTo(1280, 0);
    await page.evaluate(() => fitView());
    for (const t of ['Środek', 'Jeden', '1a', 'Trzy'])
      expect((await box(page, t)).x + (await box(page, t)).w).toBeLessThan(s.x);
    /* zaznaczony węzeł na środku widocznej części */
    await page.evaluate(() => centerSel());
    expect((await box(page, 'Środek')).cx).toBeCloseTo(s.x / 2, 0);
    /* zaznaczenie przy prawej krawędzi przewija mapę spod panelu */
    await page.evaluate(() => {
      tx = innerWidth - 120;
      apply();
      go(root.children[0].children[1].id);
    });
    const d = await box(page, 'Dwa');
    expect(d.x + d.w).toBeLessThan(s.x);
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    test('panel zajmuje cały ekran pod wyspami', async ({ page }) => {
      await page.click('#bp');
      await page.waitForTimeout(400);
      const b = await page.locator('#side').boundingBox(),
        tl = await page.locator('#tl').boundingBox();
      expect(b.x).toBeCloseTo(0, 0);
      expect(b.width).toBeCloseTo(390, 0);
      expect(b.y).toBeGreaterThanOrEqual(tl.y + tl.height);
      await expect(page.locator('#bp')).toBeVisible(); // „Aa” zamyka panel
      const sb = await page.locator('#side .sb').evaluate(e => e.scrollWidth <= e.clientWidth);
      expect(sb).toBe(true); // nic nie wystaje w bok
    });
  });
});

// Wygląd nowych map (decyzja 2026-11-28, „3.3: ustalenia przed pracą”): odstępy 100 / 20 / 100 tylko dla nowych map,
// własny domyślny wygląd w `mm.def`; stare mapy (styl = różnice od DEF) bez zmian.
test.describe('wygląd nowych map', () => {
  const NEW = '<!--style:{"gapX":100,"gapY":20,"gapTree":100}-->';
  const gaps = page => page.evaluate(() => [ST.gapX, ST.gapY, ST.gapTree, dir]);

  test('nowa mapa: odstępy 100 / 20 / 100, układ w prawo – niezależnie od otwartej mapy', async ({ page }) => {
    await loadMap(page, '# Stara\n<!--layout:down-->\n<!--style:{"fs":20}-->\n\n- a\n');
    await page.evaluate(() => newMap('Nowa'));
    expect(await texts(page)).toBe('# Nowa\n' + NEW + '\n\n');
    expect(await gaps(page)).toEqual([100, 20, 100, 'right']);
    expect(await page.evaluate(() => ST.fs)).toBe(14);
  });

  test('stara mapa bez zapisanych odstępów zostaje przy 50 / 10 / 60', async ({ page }) => {
    await loadMap(page, '# Stara\n\n- a\n');
    expect(await gaps(page)).toEqual([50, 10, 60, 'right']);
    expect(await texts(page)).toBe('# Stara\n\n- a\n');
  });

  test('pierwszy start (bez autozapisu): mapa startowa ma wygląd nowych map', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await open(page);
    expect(await gaps(page)).toEqual([100, 20, 100, 'right']);
  });

  test('„Ustaw jako domyślny wygląd nowych map” zapisuje wygląd i układ; nowa mapa i „Przywróć” go biorą', async ({
    page,
  }) => {
    await loadMap(page, '# Moja\n<!--layout:down-->\n<!--style:{"fs":20}-->\n\n- a\n');
    await page.click('#bp');
    await page.click('#sdef');
    expect(await page.evaluate(() => localStorage.getItem('mm.def'))).toBe('{"style":{"fs":20},"layout":"down"}');
    await page.evaluate(() => newMap('Nowa'));
    expect(await texts(page)).toBe('# Nowa\n<!--layout:down-->\n<!--style:{"fs":20}-->\n\n');
    await loadMap(page, '# Inna\n\n- a\n');
    await page.click('#sreset');
    expect(await texts(page)).toBe('# Inna\n<!--layout:down-->\n<!--style:{"fs":20}-->\n\n- a\n');
    await page.evaluate(() => undo()); // „Przywróć” to jeden krok cofania (także układ)
    expect(await texts(page)).toBe('# Inna\n\n- a\n');
  });

  test('strażnik formatu mm.def: zapis z 2026-11-28 wczytuje się bez strat; zepsuty = wygląd wbudowany', async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.setItem('mm.def', '{"style":{"fs":18,"gapX":120},"layout":"left"}'));
    await page.evaluate(() => newMap('A'));
    expect(await gaps(page)).toEqual([120, 10, 60, 'left']);
    expect(await page.evaluate(() => ST.fs)).toBe(18);
    for (const bad of ['nie json', '{"style":{"fs":"duży"},"layout":"spirala"}', '[]']) {
      await page.evaluate(b => localStorage.setItem('mm.def', b), bad);
      await page.evaluate(() => newMap('B'));
      expect(await gaps(page)).toEqual(
        bad === 'nie json' || bad === '[]' ? [100, 20, 100, 'right'] : [50, 10, 60, 'right']
      );
      expect(await page.evaluate(() => ST.fs)).toBe(14);
    }
  });
});
