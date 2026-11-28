// Pasek nad zaznaczonym węzłem (3.3 krok 4) i przyciski „+” przy węźle (3.4), także w Firefoksie.
const { test, expect } = require('@playwright/test');
const { open, loadMap, MD, box, texts, menu } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const bar = page => page.locator('#nbar');
const nb = (page, id) => page.locator(`#nbar [data-act="${id}"]`);
const plus = (page, k) => page.locator(`.plus[data-k="${k}"]:visible`);
/** prostokąty widocznych „+” danego rodzaju @returns {Promise<{x:number,y:number,width:number,height:number,cx:number,cy:number}[]>} */
const plusBoxes = (page, k) =>
  page.$$eval(`.plus[data-k="${k}"]`, bs =>
    bs
      .filter(b => !b.hidden && getComputedStyle(b).visibility !== 'hidden' && getComputedStyle(b).display !== 'none')
      .map(b => {
        const r = b.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
      })
  );
const select = (page, t) => page.evaluate(t => go(vis().find(n => n.text === t).id), t);
/** odstępy jak dla nowych map (Z1) – obok węzłów jest miejsce na pasek */
const AIRY = MD.replace('\n', '\n<!--style:{"gapX":100,"gapY":20}-->\n');
/**
 * Pasek przy węźle, strzałka nad środkiem węzła (pasek bywa przesunięty w bok – od krawędzi okna albo od sąsiadów).
 * `above` – tylko nad węzłem; inaczej także pod nim (pod „+”), gdy nad węzłem zasłaniałby sąsiadów.
 */
async function expectBarAt(page, t, above = false) {
  const b = await box(page, t),
    r = await bar(page).boundingBox(),
    W = await page.evaluate(() => innerWidth),
    ax = await bar(page).evaluate(e => parseFloat(getComputedStyle(e).getPropertyValue('--ax')));
  if (above || r.y < b.y) {
    expect(r.y + r.height).toBeLessThanOrEqual(b.y);
    expect(b.y - (r.y + r.height)).toBeLessThan(20);
  } else {
    expect(r.y).toBeGreaterThanOrEqual(b.y + b.h);
    expect(r.y - (b.y + b.h)).toBeLessThan(50); // pod „+” brat
  }
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(W);
  expect(Math.abs(r.x + ax - b.cx)).toBeLessThan(2);
}

test.describe('pasek nad węzłem', () => {
  test('po zaznaczeniu widoczny nad węzłem; czynności, ikony i skróty z ACT', async ({ page }) => {
    await loadMap(page, AIRY);
    await select(page, 'Dwa');
    await expect(bar(page)).toBeVisible();
    await expectBarAt(page, 'Dwa', true);
    expect(await page.$$eval('#nbar button', bs => bs.map(b => b.dataset.act))).toEqual([
      'child',
      'sib',
      'emoji',
      'fold',
      'moveto',
      'menu',
    ]);
    const tips = await page.$$eval('#nbar button', bs =>
      bs.map(b => [b.getAttribute('aria-label'), b.dataset.tip, !!b.querySelector('svg.ic')])
    );
    expect(tips).toEqual([
      ['Dodaj dziecko', 'Dodaj dziecko (Tab, a)', true],
      ['Dodaj brata', 'Dodaj brata (Enter, o)', true],
      ['Wstaw emoji', 'Wstaw emoji (Ctrl+.)', true],
      ['Zwiń / rozwiń', 'Zwiń / rozwiń (Shift+Spacja, za)', true],
      ['Przenieś do…', 'Przenieś do… (Ctrl+M, m)', true],
      ['Więcej', 'Więcej: menu podręczne (Menu)', true],
    ]);
    await expect(nb(page, 'fold')).toBeDisabled(); // „Dwa” nie ma dzieci
    await select(page, 'Jeden');
    await expect(nb(page, 'fold')).toBeEnabled();
  });

  test('jedzie za zaznaczeniem (strzałki, hjkl), przesuwaniem i zoomem mapy', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'Jeden');
    await page.keyboard.press('ArrowDown');
    await expectBarAt(page, 'Dwa');
    await page.keyboard.press('j');
    await expectBarAt(page, 'Trzy');
    await page.keyboard.press('h');
    await expectBarAt(page, 'Środek');
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.move(sv.x + 60, sv.y + sv.height - 60);
    await page.mouse.down();
    await page.mouse.move(sv.x + 140, sv.y + sv.height - 90, { steps: 5 });
    await page.mouse.up();
    await expectBarAt(page, 'Środek');
    await page.mouse.move(sv.x + sv.width / 2, sv.y + sv.height / 2);
    await page.mouse.wheel(0, -200);
    await expect.poll(() => page.evaluate(() => k)).toBeGreaterThan(1);
    await expectBarAt(page, 'Środek');
  });

  test('chowa się bez zaznaczenia, przy edycji, przeciąganiu i w widoku .md', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'Dwa');
    await expect(bar(page)).toBeVisible();
    await page.evaluate(() => deselect());
    await expect(bar(page)).toBeHidden();
    await select(page, 'Dwa');
    await page.keyboard.press('Space');
    await expect(page.locator('#ed')).toBeVisible();
    await expect(bar(page)).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(bar(page)).toBeVisible();
    const b = await box(page, 'Dwa');
    await page.mouse.move(b.cx, b.cy);
    await page.mouse.down();
    await page.mouse.move(b.cx + 30, b.cy + 40, { steps: 5 });
    expect(await page.evaluate(() => !!dnd)).toBe(true);
    await expect(bar(page)).toBeHidden();
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(bar(page)).toBeVisible();
    await page.click('#bt');
    await expect(page.locator('#txt')).toBeVisible();
    await expect(bar(page)).toBeHidden();
    await page.click('#bv');
    await expect(bar(page)).toBeVisible();
  });

  test('węzeł przy krawędzi: pasek nie wchodzi pod wyspy ani poza okno; brak miejsca nad węzłem – pod węzłem', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await select(page, 'Jeden');
    const W = await page.evaluate(() => innerWidth),
      tl = await page.locator('#tl').boundingBox();
    /* węzeł tuż pod wyspami */
    await page.evaluate(() => {
      const n = S().n;
      ty = $('tl').getBoundingClientRect().bottom - $('sv').getBoundingClientRect().top + 6 - (n.y - n.h / 2) * k;
      apply();
    });
    let b = await box(page, 'Jeden'),
      r = await bar(page).boundingBox();
    expect(r.y).toBeGreaterThanOrEqual(b.y + b.h); // pod węzłem
    expect(r.y).toBeGreaterThanOrEqual(tl.y + tl.height);
    await expect(bar(page)).toHaveClass(/below/);
    /* „+” brat też jest pod węzłem – pasek pod nim, nie na nim */
    const [s] = await plusBoxes(page, 'sib');
    expect(r.y).toBeGreaterThanOrEqual(s.y + s.height);
    /* lewa i prawa krawędź okna */
    for (const side of ['left', 'right']) {
      await page.evaluate(side => {
        const n = S().n;
        ty = $('sv').getBoundingClientRect().height / 2 - n.y * k;
        tx = side === 'left' ? 2 - n.x * k : innerWidth - 2 - (n.x + n.w) * k;
        apply();
      }, side);
      r = await bar(page).boundingBox();
      b = await box(page, 'Jeden');
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(W);
      expect(r.y + r.height).toBeLessThanOrEqual(b.y); // znów nad węzłem
      await expect(bar(page)).not.toHaveClass(/below/);
    }
    /* węzeł poza ekranem – pasek znika, nie wisi przy krawędzi */
    await page.evaluate(() => {
      tx = -5000;
      apply();
    });
    await expect(bar(page)).toBeHidden();
  });

  test('przyciski: dziecko i brat z edycją, zwiń, emoji, „Przenieś do…”, „Więcej” = menu podręczne węzła', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await select(page, 'Dwa');
    await nb(page, 'child').click();
    await expect(page.locator('#ed')).toBeVisible();
    await page.keyboard.type('nowe');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- Dwa\n  - nowe\n');
    await select(page, 'Dwa');
    await nb(page, 'sib').click();
    await page.keyboard.type('brat');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('  - nowe\n- brat\n- Trzy\n');
    await select(page, 'Jeden');
    await nb(page, 'fold').click();
    expect(await page.evaluate(() => S().n.collapsed)).toBe(true);
    await nb(page, 'fold').click();
    expect(await page.evaluate(() => S().n.collapsed)).toBe(false);
    await nb(page, 'emoji').click();
    await expect(page.locator('#emo')).toBeVisible();
    await page.keyboard.press('Escape');
    await nb(page, 'moveto').click();
    await expect(page.locator('#srRes')).toBeVisible(); // lista w polu szukania (3.3 krok 3)
    await expect(page.locator('#srT')).toHaveText('Przenieś do…');
    await page.keyboard.press('Escape');
    await nb(page, 'menu').click();
    await expect(menu(page)).toBeVisible();
    await expect(page.locator('#menu .mh')).toHaveText('Węzeł: Jeden');
    const m = await menu(page).boundingBox(),
      mb = await nb(page, 'menu').boundingBox();
    expect(Math.abs(m.x - mb.x)).toBeLessThan(2); // przy przycisku (w pionie menu może się dobić do dołu okna)
  });

  test('klik w przycisk nie zabiera klawiatury mapie', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'Jeden');
    await nb(page, 'fold').click();
    await page.keyboard.press('Enter'); // Enter = dodaj brata, nie drugi klik w „Zwiń”
    expect(await page.evaluate(() => !!editing)).toBe(true);
    expect(await page.evaluate(() => find(vis().find(n => n.text === 'Jeden').id).n.collapsed)).toBe(true);
  });

  test('nie zasłania środka sąsiednich węzłów, gdy jest obok miejsce – klik w sąsiada trafia w węzeł', async ({
    page,
  }) => {
    /* w gęstej mapie (np. korzeń przy krawędzi okna) miejsca bywa brak – wtedy pasek zasłania najmniej, jak się da */
    await loadMap(page, AIRY);
    await page.evaluate(() => centerSel());
    for (const t of ['Środek', 'Jeden', 'Dwa', '1a', 'Trzy']) {
      await select(page, t);
      const hidden = await page.evaluate(
        t =>
          vis()
            .filter(n => n.text !== t)
            .filter(n => {
              const r = document.querySelector(`#g .n[data-id="${n.id}"] rect`).getBoundingClientRect(),
                el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return !el || !el.closest('#g .n');
            })
            .map(n => n.text),
        t
      );
      expect(hidden, `zaznaczony „${t}”`).toEqual([]);
    }
    await select(page, 'Środek');
    const j = await box(page, 'Jeden');
    await page.mouse.click(j.cx, j.cy);
    expect(await page.evaluate(() => S().n.text)).toBe('Jeden');
  });

  test('na telefonie (≤ 600 px) paska nie ma', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await loadMap(page, MD);
    await select(page, 'Dwa');
    await expect(bar(page)).toBeHidden();
    await expect(plus(page, 'child')).toHaveCount(1); // „+” zostają
  });
});

test.describe('przyciski „+” przy węźle', () => {
  const MAP = '# R\n- a\n  - a1\n- b\n- c\n';
  /** @param {string} d */
  const withLayout = d => MAP.replace('\n', `\n<!--layout:${d}-->\n`);

  test('tylko przy zaznaczonym węźle; korzeń bez „+” brata', async ({ page }) => {
    await loadMap(page, MAP);
    await page.evaluate(() => deselect());
    await expect(page.locator('.plus:visible')).toHaveCount(0);
    await select(page, 'R');
    await expect(plus(page, 'child')).toHaveCount(1);
    await expect(plus(page, 'sib')).toHaveCount(0);
    await select(page, 'b');
    await expect(plus(page, 'child')).toHaveCount(1);
    await expect(plus(page, 'sib')).toHaveCount(1);
    for (const p of await page.locator('.plus:visible').all()) {
      expect(await p.getAttribute('aria-label')).toBeTruthy();
      expect(await p.getAttribute('data-tip')).toMatch(/^Dodaj (dziecko \(Tab, a\)|brata \(Enter, o\))$/);
    }
  });

  for (const d of ['right', 'left', 'both', 'down'])
    test(`układ ${d}: „+” dziecko po stronie dzieci, „+” brat w dolnym rogu od strony rodzica`, async ({ page }) => {
      await loadMap(page, d === 'right' ? MAP : withLayout(d));
      /* węzeł „a” – po stronie dzieci ma „a1” */
      await select(page, 'a');
      const n = await box(page, 'a'),
        kid = await box(page, 'a1'),
        [c] = await plusBoxes(page, 'child'),
        [s] = await plusBoxes(page, 'sib');
      if (d === 'down') {
        expect(c.cy).toBeGreaterThan(n.y + n.h); // pod węzłem, w stronę dzieci
        expect(c.cy).toBeLessThan(kid.y);
        expect(Math.abs(c.cx - n.cx)).toBeLessThan(2);
        expect(s.cx).toBeGreaterThan(n.x + n.w); // brat „poniżej” = po prawej
        expect(s.cy).toBeLessThan(n.cy); // w rogu od strony rodzica (u góry)
      } else {
        const right = kid.cx > n.cx;
        expect(Math.abs(c.cy - n.cy)).toBeLessThan(2); // na środku wysokości
        if (right) expect(c.cx).toBeGreaterThan(n.x + n.w);
        else expect(c.cx).toBeLessThan(n.x);
        expect(s.cy).toBeGreaterThan(n.y + n.h); // poniżej węzła
        if (right)
          expect(s.cx).toBeLessThan(n.cx); // róg od strony rodzica (lewy)
        else expect(s.cx).toBeGreaterThan(n.cx);
      }
      /* korzeń: bez „+” brata; w „na obie strony” – „+” dziecko z obu stron */
      await select(page, 'R');
      const r = await box(page, 'R'),
        cs = await plusBoxes(page, 'child');
      expect(await plusBoxes(page, 'sib')).toHaveLength(0);
      expect(cs).toHaveLength(d === 'both' ? 2 : 1);
      if (d === 'both') {
        expect(cs.some(p => p.cx > r.x + r.w)).toBe(true);
        expect(cs.some(p => p.cx < r.x)).toBe(true);
      } else if (d === 'left') expect(cs[0].cx).toBeLessThan(r.x);
      else if (d === 'right') expect(cs[0].cx).toBeGreaterThan(r.x + r.w);
    });

  test('klik dodaje dziecko i od razu edytuje; cofanie usuwa', async ({ page }) => {
    await loadMap(page, MAP);
    await select(page, 'b');
    const before = await texts(page);
    await plus(page, 'child').click();
    await expect(page.locator('#ed')).toBeVisible();
    await expect(page.locator('.plus:visible')).toHaveCount(0); // schowane w trakcie edycji
    await expect(bar(page)).toBeHidden();
    await page.keyboard.type('b1');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- b\n  - b1\n');
    expect(await page.evaluate(() => S().n.text)).toBe('b1');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toBe(before);
  });

  test('klik dodaje brata poniżej i od razu edytuje; cofanie usuwa', async ({ page }) => {
    await loadMap(page, MAP);
    await select(page, 'a');
    const before = await texts(page);
    await plus(page, 'sib').click();
    await expect(page.locator('#ed')).toBeVisible();
    await page.keyboard.type('a+');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('  - a1\n- a+\n- b\n');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toBe(before);
  });

  test('„na obie strony”: „+” z lewej dodaje dziecko po lewej, z prawej – po prawej', async ({ page }) => {
    await loadMap(page, withLayout('both'));
    for (const [side, t] of [
      ['left', 'L'],
      ['right', 'P'],
    ]) {
      await select(page, 'R');
      const r = await box(page, 'R'),
        cs = await plusBoxes(page, 'child'),
        p = cs.find(p => (side === 'left' ? p.cx < r.x : p.cx > r.x + r.w));
      await page.mouse.click(p.cx, p.cy);
      await page.keyboard.type(t);
      await page.keyboard.press('Enter');
      const n = await box(page, t),
        r1 = await box(page, 'R');
      if (side === 'left') expect(n.cx).toBeLessThan(r1.x);
      else expect(n.cx).toBeGreaterThan(r1.x + r1.w);
    }
  });

  test('schowane w trakcie przeciągania', async ({ page }) => {
    await loadMap(page, MAP);
    await select(page, 'b');
    const b = await box(page, 'b');
    await page.mouse.move(b.cx, b.cy);
    await page.mouse.down();
    await page.mouse.move(b.cx + 30, b.cy + 40, { steps: 5 });
    await expect(page.locator('.plus:visible')).toHaveCount(0);
    await page.mouse.up();
    await expect(page.locator('.plus:visible').first()).toBeVisible();
  });

  test('eksport SVG bez paska i bez „+”', async ({ page }) => {
    await loadMap(page, MAP);
    await select(page, 'a');
    await expect(bar(page)).toBeVisible();
    const dl = page.waitForEvent('download');
    await page.evaluate(() => exportImg('svg'));
    const s = require('fs').readFileSync(await (await dl).path(), 'utf8');
    expect(s).toContain('>a1<');
    expect(s).not.toMatch(/nbar|plus|data-act|data-k/);
  });
});

test.describe('„+” na dotyku', () => {
  test.use({ hasTouch: true });
  test('ok. 28 px; stuknięcie dodaje dziecko i edytuje', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox: Playwright nie emuluje dotyku (hasTouch)');
    await loadMap(page, '# R\n- a\n');
    await select(page, 'a');
    const p = plus(page, 'child');
    await p.dispatchEvent('pointerdown', { pointerType: 'touch' }); // ostatni wskaźnik – palec (laptop z ekranem dotykowym też)
    const b = await p.boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(26);
    expect(b.width).toBeLessThanOrEqual(30);
    await p.tap();
    await expect(page.locator('#ed')).toBeVisible();
    expect(await texts(page)).toBe('# R\n\n- a\n  - \n');
  });
});
