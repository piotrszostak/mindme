// Wydajność na dużej mapie (zadanie A.2, zasada 0.17): progi w docs/decyzje.md (2026-11-26, „Progi wydajności”).
// `npm run perf` (osobny krok `npm run verify`): sam, bez innych testów – równolegle z nimi klatki gubią się przez zajęty procesor.
const { test, expect } = require('@playwright/test');
const { open, bigMap } = require('./helpers');

/* w CI (GitHub) pomijany: progi ustalono dla komputera użytkownika, na innej maszynie test byłby chwiejny */
test.skip(!process.env.PERF || !!process.env.CI, 'tylko w `npm run perf`, nie w CI');
test.use({ reducedMotion: 'no-preference' }); /* jak u użytkownika: z animacją */

/** progi z zapasem (dziś ok. 3× lepiej) */
const LIMIT = { render: 16, fold: 50, longDrag: 0.05, scale: 3 };
const LAYOUTS = ['right', 'left', 'both', 'down'];
/** @param {number} n @param {string} d */
const mapMd = (n, d) => bigMap(n).replace('\n', d === 'right' ? '\n' : `\n<!--layout:${d}-->\n`);

/** mediana czasu `render()` (ms) z 31 powtórzeń, po rozgrzewce (krótkie czasy mocno się wahają) */
const renderMed = page =>
  page.evaluate(() => {
    for (let i = 0; i < 3; i++) render(true);
    const a = [];
    for (let i = 0; i < 31; i++) {
      const t = performance.now();
      render(true);
      a.push(performance.now() - t);
    }
    return a.sort((x, y) => x - y)[15];
  });

/** przeciąganie myszą węzła najbliżej środka ekranu (ok. 1 s w górę i w dół) → odstępy między klatkami (ms) */
async function dragFrames(page) {
  const p = await page.evaluate(() => {
    const r = $('sv').getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    let best = null;
    for (const el of document.querySelectorAll('#g g.n')) {
      const f = find(Number(/** @type {HTMLElement} */ (el).dataset.id));
      if (!f || f.p === root) continue;
      const b = /** @type {Element} */ (el.querySelector('rect')).getBoundingClientRect(),
        x = b.x + b.width / 2,
        y = b.y + b.height / 2,
        dist = Math.hypot(x - cx, y - cy);
      if (!best || dist < best.dist) best = { x, y, dist };
    }
    return best;
  });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 15, p.y + 5, { steps: 3 });
  await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.__fr = [];
    w.__on = true;
    let last = performance.now();
    const f = t => {
      w.__fr.push(t - last);
      last = t;
      if (w.__on) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    await page.mouse.move(p.x + 15 + Math.sin(a) * 60, p.y + 5 + Math.sin(a) * 220);
    await page.waitForTimeout(16);
  }
  const fr = await page.evaluate(() => {
    const w = /** @type {any} */ (window);
    w.__on = false;
    return w.__fr.slice(1);
  });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  return fr;
}

for (const d of LAYOUTS)
  test(`wydajność: 500 węzłów, układ ${d}`, async ({ page }) => {
    await open(page);
    await page.evaluate(m => load(m), mapMd(500, d));
    await page.waitForTimeout(1000); /* węzły dojeżdżają na miejsca */
    const render = await renderMed(page);
    const fr = await dragFrames(page),
      long = fr.filter(x => x > 20).length;
    await page.waitForTimeout(800);
    /* rozwinięcie największej zwiniętej gałęzi (3. gałąź główna) */
    const fold = await page.evaluate(() => {
      sel = root.children[0].children[2].id;
      const t = performance.now();
      window.fold(false);
      return performance.now() - t;
    });
    console.log(
      `PERF 500 ${d}: render ${render.toFixed(1)} ms, rozwinięcie ${fold.toFixed(1)} ms, przeciąganie ${long}/${fr.length} klatek > 20 ms`
    );
    expect.soft(render, 'przerysowanie całej mapy [ms]').toBeLessThanOrEqual(LIMIT.render);
    expect.soft(fold, 'rozwinięcie gałęzi [ms]').toBeLessThanOrEqual(LIMIT.fold);
    expect.soft(long / fr.length, 'część klatek > 20 ms przy przeciąganiu').toBeLessThanOrEqual(LIMIT.longDrag);
  });

test('wydajność: 1000 węzłów najwyżej 3 razy wolniej niż 500', async ({ page }) => {
  await open(page);
  for (const d of LAYOUTS) {
    const t = {};
    for (const n of [500, 1000]) {
      await page.evaluate(m => load(m), mapMd(n, d));
      t[n] = await renderMed(page);
    }
    console.log(`PERF skala ${d}: 500 → ${t[500].toFixed(1)} ms, 1000 → ${t[1000].toFixed(1)} ms`);
    expect.soft(t[1000] / t[500], `układ ${d}: 1000 / 500 węzłów`).toBeLessThanOrEqual(LIMIT.scale);
  }
});
