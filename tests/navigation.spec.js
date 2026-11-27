// Klawiatura w interfejsie: strzałki zgodne z układem, Del, Ctrl+Z/Y/C/V, Alt+strzałki.
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

test.describe('klawiatura', () => {
  test('strzałki zgodne z układem', async ({ page }) => {
    await loadMap(page, MD); // prawo, zaznaczony korzeń
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('1a');
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('1b');
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('Jeden');
    await loadMap(page, MD.replace('\n', '\n<!--layout:left-->\n'));
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Środek');
    await loadMap(page, MD.replace('\n', '\n<!--layout:down-->\n'));
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('Dwa');
    await page.keyboard.press('ArrowUp');
    expect(await selText(page)).toBe('Środek');
  });

  test('obie strony: strzałki wybierają dzieci po właściwej stronie', async ({ page }) => {
    await loadMap(page, '# R\n<!--layout:both-->\n- p1\n- p2\n- l1\n- l2\n');
    await page.keyboard.press('ArrowLeft');
    expect(await selText(page)).toBe('l1');
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('l2');
    await page.keyboard.press('ArrowDown');
    expect(await selText(page)).toBe('l2'); // nie przeskakuje na prawą stronę
    await page.keyboard.press('ArrowRight');
    expect(await selText(page)).toBe('R');
  });

  test('Del, Ctrl+Z/Y, Ctrl+C/V, Shift+Spacja, Tab, F2', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight'); // Jeden
    await page.keyboard.press('Shift+Space');
    expect(await texts(page)).toContain('- Jeden <!--c-->');
    await page.keyboard.press('Shift+Space');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('ArrowDown'); // Dwa
    await page.keyboard.press('Control+v');
    expect(await texts(page)).toContain('- Dwa\n  - Jeden\n');
    await page.keyboard.press('Delete');
    expect(await texts(page)).not.toContain('- Dwa\n  - Jeden');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Dwa\n  - Jeden\n');
    await page.keyboard.press('Control+y');
    expect(await texts(page)).not.toContain('- Dwa\n  - Jeden');
    await page.keyboard.press('Tab');
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.keyboard.press('F2');
    await expect(page.locator('#ed')).toBeFocused();
  });

  test('Alt+strzałki przesuwają i zmieniają poziom', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown'); // Dwa
    await page.keyboard.press('Alt+ArrowRight'); // pod Jeden
    expect(await texts(page)).toContain('  - 1b\n  - Dwa\n');
    await page.keyboard.press('Alt+ArrowLeft');
    await page.keyboard.press('Alt+ArrowDown');
    expect(await texts(page)).toMatch(/- Trzy\n- Dwa\n$/);
  });
});

// hjkl to te same kierunki co strzałki (h ←, j ↓, k ↑, l →) w każdym układzie; wcześniej znaczyły rodzic / brat / dziecko,
// więc w układach „w lewo” i „w dół” szły w inną stronę niż strzałki.
const VIM = { ArrowLeft: 'h', ArrowDown: 'j', ArrowUp: 'k', ArrowRight: 'l' };
const ROUTE = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowLeft'];
const BIG = '# Środek\n- Jeden\n  - 1a\n  - 1b\n  - 1c\n- Dwa\n  - 2a\n- Trzy\n- Cztery\n';
for (const d of ['right', 'left', 'both', 'down'])
  test(`hjkl idą tam, gdzie strzałki – układ ${d}, także z licznikiem`, async ({ page }) => {
    const md = BIG.replace('\n', `\n<!--layout:${d}-->\n`);
    const walk = async keys => {
      await loadMap(page, md);
      const out = [];
      for (const k of keys) {
        await page.keyboard.press(k);
        out.push(await selText(page));
      }
      return out;
    };
    const all = [
      ...ROUTE,
      ...ROUTE.map(k => (k === 'ArrowLeft' ? 'ArrowRight' : k === 'ArrowRight' ? 'ArrowLeft' : k)),
    ];
    expect(await walk(all.map(k => VIM[k]))).toEqual(await walk(all));
    /* licznik: 2 + kierunek = dwa naciśnięcia strzałki */
    for (const k of Object.keys(VIM)) {
      const two = (await walk(['ArrowRight', 'ArrowDown', k, k])).at(-1);
      expect((await walk(['ArrowRight', 'ArrowDown', '2', VIM[k]])).at(-1), `2${VIM[k]}`).toBe(two);
    }
  });

// Przesuwanie (Alt+strzałki, H J K L) też zgodne z tym, co widać: węzeł jedzie w stronę strzałki w każdym układzie.
const ALTMAP = '# R\n- a\n  - a1\n  - a2\n  - a3\n- b\n- c\n  - c1\n  - c2\n  - c3\n- d\n';
const DIRS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
const SHIFT = { ArrowLeft: 'H', ArrowDown: 'J', ArrowUp: 'K', ArrowRight: 'L' };
for (const d of ['right', 'left', 'both', 'down'])
  test(`Alt+strzałki i H J K L przesuwają węzeł w stronę strzałki – układ ${d}`, async ({ page }) => {
    const md = ALTMAP.replace('\n', `\n<!--layout:${d}-->\n`);
    /** środek węzła o tekście t (współrzędne układu) */
    const at = t =>
      page.evaluate(x => {
        const n = vis().find(v => v.text === x);
        return [n.x + n.w / 2, n.y];
      }, t);
    const start = async t => {
      await loadMap(page, md);
      await page.evaluate(x => go(vis().find(v => v.text === x).id), t);
    };
    for (const t of d === 'both' ? ['a2', 'c2'] : ['a2'])
      for (const [k, [sx, sy]] of Object.entries(DIRS)) {
        await start(t);
        const [x0, y0] = await at(t);
        await page.keyboard.press('Alt+' + k);
        const [x1, y1] = await at(t);
        const moved = sx ? Math.sign(x1 - x0) === sx : Math.sign(y1 - y0) === sy;
        expect(moved, `${t}: Alt+${k} przesuwa (${x0},${y0}) → (${x1},${y1})`).toBe(true);
        const alt = await texts(page);
        await start(t);
        await page.keyboard.press(SHIFT[k]);
        expect(await texts(page), `${SHIFT[k]} = Alt+${k}`).toBe(alt);
      }
  });

test('na obie strony: przesuwanie w pionie nie przenosi gałęzi głównej na drugą stronę', async ({ page }) => {
  await loadMap(page, ALTMAP.replace('\n', '\n<!--layout:both-->\n'));
  const before = await texts(page);
  await page.evaluate(() => go(vis().find(v => v.text === 'b').id)); // ostatnia po prawej
  await page.keyboard.press('Alt+ArrowDown');
  await page.evaluate(() => go(vis().find(v => v.text === 'c').id)); // pierwsza po lewej
  await page.keyboard.press('Alt+ArrowUp');
  expect(await texts(page)).toBe(before);
});

test('licznik przy J / K: 2J = dwa razy Alt+↓', async ({ page }) => {
  await loadMap(page, ALTMAP);
  await page.evaluate(() => go(vis().find(v => v.text === 'a1').id));
  await page.keyboard.press('2');
  await page.keyboard.press('J');
  expect(await texts(page)).toContain('  - a2\n  - a3\n  - a1\n');
});
