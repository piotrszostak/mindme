const { test, expect } = require('@playwright/test');
const { open, loadMap } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const MD = '# Środek\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n';
const LONG = 'To jest bardzo długi tekst węzła, który zdecydowanie nie zmieści się w jednej linii';

/** Prostokąt węzła na ekranie (po transformacji pan/zoom). */
const box = (page, text) => page.evaluate(t => {
  const n = [...vis(), ...(dnd ? vis(dnd.node) : [])].find(n => n.text === t);   // także przeciągana gałąź
  const r = document.querySelector(`#g .n[data-id="${n.id}"] rect`).getBoundingClientRect();
  return { id: n.id, x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}, text);
const texts = page => page.evaluate(() => serialize(root));
const selText = page => page.evaluate(() => S().n.text);
const menu = page => page.locator('#menu');
const act = (page, a) => page.locator(`#menu [data-act="${a}"]`);

async function expectEditorOver(page, text) {
  const b = await box(page, text), e = await page.locator('#ed').boundingBox();
  expect(Math.abs(e.x - b.x)).toBeLessThan(2);
  expect(Math.abs(e.y - b.y)).toBeLessThan(2);
  expect(Math.abs(e.width - b.w)).toBeLessThan(2);
  expect(Math.abs(e.height - b.h)).toBeLessThan(2);
}

test.describe('górny pasek', () => {
  test('tylko ikony z objaśnieniami; operacje na węzłach przeniesione do menu', async ({ page }) => {
    const btns = page.locator('#top button');
    await expect(btns).toHaveCount(7);
    for (const b of await btns.all()) {
      await expect(b.locator('svg.ic')).toHaveCount(1);
      expect((await b.innerText()).trim()).toBe('');
      expect(await b.getAttribute('data-tip')).toBeTruthy();
      expect(await b.getAttribute('aria-label')).toBe(await b.getAttribute('data-tip'));
    }
    for (const id of ['bn', 'bc', 'be', 'bd', 'bh']) await expect(page.locator('#' + id)).toHaveCount(0);
  });

  test('przełącznik Markdown/mapa jest widoczny i zmienia ikonę', async ({ page }) => {
    const bt = page.locator('#bt'), path = () => bt.locator('path').getAttribute('d');
    await expect(bt).toBeVisible();
    const mapIcon = await path();
    await expect(bt).toHaveAttribute('data-tip', /Markdown/);
    await bt.click();
    await expect(page.locator('#txt')).toBeVisible();
    expect(await path()).not.toBe(mapIcon);
    await expect(bt).toHaveClass(/on/);
    await expect(bt).toHaveAttribute('data-tip', /Wróć do mapy/);
    for (const id of ['bu', 'br', 'bl', 'bf']) await expect(page.locator('#' + id)).toBeDisabled();
    await bt.click();
    await expect(page.locator('#txt')).toBeHidden();
    expect(await path()).toBe(mapIcon);
    await expect(bt).not.toHaveClass(/on/);
    for (const id of ['bu', 'br', 'bl', 'bf']) await expect(page.locator('#' + id)).toBeEnabled();
  });

  test('zapis w widoku tekstowym zapisuje to, co jest w tekście', async ({ page }) => {
    await page.evaluate(() => { window.showSaveFilePicker = undefined });   // bez systemowego okna → pobranie pliku
    await page.click('#bt');
    await page.fill('#txt', '# Z tekstu\n- a\n');
    const dl = page.waitForEvent('download');
    await page.click('#bm'); await act(page, 'save').click();
    const f = await (await dl).path();
    expect(require('fs').readFileSync(f, 'utf8')).toBe('# Z tekstu\n\n- a\n');
  });

  test('objaśnienie pojawia się po najechaniu', async ({ page }) => {
    await page.hover('#bu');
    await page.waitForTimeout(600);
    const tip = await page.$eval('#bu', b => getComputedStyle(b, '::after').content);
    expect(tip).toContain('Cofnij');
  });

  test('przycisk układu pokazuje bieżący układ', async ({ page }) => {
    await page.click('#bl');
    await act(page, 'lay-both').click();
    await expect(page.locator('#bl')).toHaveAttribute('data-tip', /obie strony/);
    expect(await page.evaluate(() => dir)).toBe('both');
  });

  test('menu „więcej”: motyw, pomoc', async ({ page }) => {
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

test.describe('menu podręczne węzła', () => {
  const items = page => page.$$eval('#menu button', bs => bs.map(b => [b.dataset.act, (b.querySelector('span,small') || b).textContent.trim(), (b.querySelector('kbd') || {}).textContent || '']));

  test('PPM: jedno menu (węzeł + mapa), przy kursorze, ze skrótami klawiszowymi', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await expect(menu(page)).toBeVisible();
    expect(await selText(page)).toBe('Dwa');
    await expect(page.locator('#menu .mh')).toHaveText('Węzeł: Dwa');
    const it = await items(page);
    expect(it.map(i => i[0])).toEqual(['sib', 'child', 'emoji', 'fold', 'copy', 'cut', 'paste', 'del', 'fit', 'unfoldall', 'foldall']);   // bez rzędu układów
    expect(it.slice(0, 11).map(i => i[2])).toEqual(['Enter', 'Tab', 'Ctrl+.', 'Spacja', 'Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Del', '=', 'zR', 'zM']);
    await expect(page.locator('#menu kbd').first()).toBeVisible();
    const m = await menu(page).boundingBox();
    expect(Math.abs(m.x - b.cx)).toBeLessThan(2);
    await expect(act(page, 'fold')).toBeDisabled();       // „Dwa” nie ma dzieci
    await expect(act(page, 'paste')).toBeDisabled();      // nic nie skopiowano
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
    expect(await selText(page)).toBe('Dwa');              // tło nie zmienia zaznaczenia
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
    await expect(act(page, 'del')).toBeEnabled();          // są dwa korzenie
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

  test('PPM na tle: zwiń wszystko; menu nie ma już przycisków układu', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + 15, { button: 'right' });
    await expect(page.locator('#menu [data-act^="lay-"]')).toHaveCount(0);
    await act(page, 'foldall').click();
    expect(await texts(page)).toContain('- Jeden <!--c-->');
  });

  test('klawiatura: Shift+F10 otwiera menu, strzałki + Enter wybierają', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');           // Jeden
    await page.keyboard.press('Shift+F10');
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

test.describe('edycja w węźle', () => {
  test('dwuklik → pole edycji leży dokładnie na węźle, kursor na końcu', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await expect(page.locator('#ed')).toBeVisible();
    await expectEditorOver(page, 'Dwa');
    await page.keyboard.type(' i pół');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa i pół\n');
  });

  test('węzeł rośnie na żywo podczas pisania, także przy zawijaniu', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+a');
    await page.keyboard.type(LONG);
    const now = await box(page, LONG);              // model już ma nowy tekst
    expect(now.w).toBeGreaterThan(b.w);
    expect(now.h).toBeGreaterThan(b.h);
    await expectEditorOver(page, LONG);
    const ov = await page.$eval('#ed', e => e.scrollHeight - e.clientHeight);
    expect(ov).toBeLessThanOrEqual(1);               // tekst mieści się bez przewijania
  });

  test('pole edycji podąża za zoomem i przesuwaniem', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.mouse.move(b.cx, b.cy + 80);
    await page.mouse.wheel(0, -300);
    await expectEditorOver(page, 'Dwa');
    const fs = await page.$eval('#ed', e => parseFloat(e.style.fontSize));
    expect(fs).toBeGreaterThan(14);
  });

  test('klik obok zatwierdza; zmiana jest cofalna', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Zmienione');
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 10, sv.y + sv.height - 10);
    await expect(page.locator('#ed')).toBeHidden();
    expect(await texts(page)).toContain('- Zmienione\n');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Dwa\n');
  });

  test('Enter w edycji tylko zatwierdza; kolejny Enter dodaje brata', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.type(' i pół');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ed')).toBeHidden();
    await expect(page.locator('#mode')).toHaveText('NORMAL');
    expect(await selText(page)).toBe('Dwa i pół');
    expect(await texts(page)).toContain('- Dwa i pół\n- Trzy\n');   // brat jeszcze nie powstał
    await page.keyboard.press('Enter');                               // teraz dopiero nowy brat
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type('Dwa i trzy czwarte');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- Dwa i pół\n- Dwa i trzy czwarte\n- Trzy\n');
    expect(await selText(page)).toBe('Dwa i trzy czwarte');
  });

  test('Tab w edycji → zatwierdza i dodaje dziecko; pusty nowy węzeł znika', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Tab');
    await page.keyboard.type('pod');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');               // pusty → usunięty
    expect(await texts(page)).toContain('- Dwa\n  - pod\n- Trzy\n');
    expect(await page.evaluate(() => vis().filter(n => !n.text).length)).toBe(0);
    expect(await selText(page)).toBe('pod');
  });

  test('wyczyszczenie istniejącego węzła przywraca stary tekst', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa\n');
  });

  test('znak nowej linii z klawiatury ekranowej działa jak Enter (zatwierdza)', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.$eval('#ed', e => { e.value += ' i pół\n'; e.dispatchEvent(new Event('input')); });
    await expect(page.locator('#ed')).toBeHidden();
    expect(await texts(page)).toMatch(/- Trzy i pół\n$/);
    expect(await selText(page)).toBe('Trzy i pół');
  });
});

test.describe('klawiatura', () => {
  test('strzałki zgodne z układem', async ({ page }) => {
    await loadMap(page, MD);                           // prawo, zaznaczony korzeń
    await page.keyboard.press('ArrowRight'); expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight'); expect(await selText(page)).toBe('1a');
    await page.keyboard.press('ArrowDown');  expect(await selText(page)).toBe('1b');
    await page.keyboard.press('ArrowLeft');  expect(await selText(page)).toBe('Jeden');
    await loadMap(page, MD.replace('\n', '\n<!--layout:left-->\n'));
    await page.keyboard.press('ArrowLeft');  expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight'); expect(await selText(page)).toBe('Środek');
    await loadMap(page, MD.replace('\n', '\n<!--layout:down-->\n'));
    await page.keyboard.press('ArrowDown');  expect(await selText(page)).toBe('Jeden');
    await page.keyboard.press('ArrowRight'); expect(await selText(page)).toBe('Dwa');
    await page.keyboard.press('ArrowUp');    expect(await selText(page)).toBe('Środek');
  });

  test('obie strony: strzałki wybierają dzieci po właściwej stronie', async ({ page }) => {
    await loadMap(page, '# R\n<!--layout:both-->\n- p1\n- p2\n- l1\n- l2\n');
    await page.keyboard.press('ArrowLeft');  expect(await selText(page)).toBe('l1');
    await page.keyboard.press('ArrowDown');  expect(await selText(page)).toBe('l2');
    await page.keyboard.press('ArrowDown');  expect(await selText(page)).toBe('l2');  // nie przeskakuje na prawą stronę
    await page.keyboard.press('ArrowRight'); expect(await selText(page)).toBe('R');
  });

  test('Del, Ctrl+Z/Y, Ctrl+C/V, Spacja, Tab, F2', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');           // Jeden
    await page.keyboard.press('Space');
    expect(await texts(page)).toContain('- Jeden <!--c-->');
    await page.keyboard.press('Space');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('ArrowDown');            // Dwa
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
    await page.keyboard.press('ArrowDown');            // Dwa
    await page.keyboard.press('Alt+ArrowRight');       // pod Jeden
    expect(await texts(page)).toContain('  - 1b\n  - Dwa\n');
    await page.keyboard.press('Alt+ArrowLeft');
    await page.keyboard.press('Alt+ArrowDown');
    expect(await texts(page)).toMatch(/- Trzy\n- Dwa\n$/);
  });
});

/** Punkt na węźle: fx = ułamek szerokości od lewej, fy = ułamek wysokości od góry. */
const at = (b, fx, fy) => [b.x + b.w * fx, b.y + b.h * fy];
const phParent = page => page.evaluate(() => { const f = find(-1); return f && f.p.text });

test.describe('mysz: przeciąganie (drag and drop)', () => {
  async function dragTo(page, from, [x, y], { drop = true } = {}) {
    await page.mouse.move(from.cx, from.cy);
    await page.mouse.down();
    await page.mouse.move(from.cx + 15, from.cy + 5, { steps: 3 });
    await page.mouse.move(x, y, { steps: 8 });
    if (drop) await page.mouse.up();
  }

  test('upuszczenie na prawej części węzła → dziecko; Ctrl+Z cofa', async ({ page }) => {
    await loadMap(page, MD);
    await dragTo(page, await box(page, 'Trzy'), at(await box(page, '1a'), .85, .5), { drop: false });
    expect(await phParent(page)).toBe('1a');              // podgląd: miejsce otwarte pod 1a
    await expect(page.locator('#g path.band')).toHaveCount(1);   // rozciągnięta gałąź do nowego rodzica
    await page.mouse.up();
    expect(await texts(page)).toContain('  - 1a\n    - Trzy\n');
    expect(await phParent(page)).toBeNull();
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
  });

  test('upuszczenie na lewej górnej / dolnej części → brat przed / za', async ({ page }) => {
    await loadMap(page, MD);
    await dragTo(page, await box(page, 'Trzy'), at(await box(page, 'Jeden'), .15, .2));
    expect(await texts(page)).toContain('# Środek\n\n- Trzy\n- Jeden\n');
    await dragTo(page, await box(page, 'Trzy'), at(await box(page, '1a'), .15, .8));
    expect(await texts(page)).toContain('  - 1a\n  - Trzy\n  - 1b\n');
  });

  test('cała gałąź jedzie razem z węzłem', async ({ page }) => {
    await loadMap(page, MD);
    const j = await box(page, 'Jeden'), a0 = await box(page, '1a');
    const t = await box(page, 'Trzy');
    await dragTo(page, j, [t.cx + 40, t.cy + 60], { drop: false });
    const a1 = await box(page, '1a'), j1 = await box(page, 'Jeden');
    expect(a1.x - j1.x).toBeCloseTo(a0.x - j.x, 0);       // potomek zachowuje położenie względem rodzica
    expect(a1.y - j1.y).toBeCloseTo(a0.y - j.y, 0);
    await page.mouse.move(...at(await box(page, 'Trzy'), .85, .5), { steps: 4 });
    await page.mouse.up();
    expect(await texts(page)).toContain('- Trzy\n  - Jeden\n    - 1a\n    - 1b\n');
  });

  test('sąsiedzi robią miejsce na żywo', async ({ page }) => {
    await loadMap(page, '# R\n- a\n- b\n- c\n- d\n');
    const y0 = (await box(page, 'b')).y, d = await box(page, 'd');
    await dragTo(page, d, at(await box(page, 'b'), .15, .25), { drop: false });
    expect(await phParent(page)).toBe('R');
    expect((await box(page, 'b')).y).toBeGreaterThan(y0 + 20);   // „b” zjechało, bo przed nim otwarło się miejsce
    await page.keyboard.press('Escape');                          // anulowanie przywraca układ
    expect(await texts(page)).toBe('# R\n\n- a\n- b\n- c\n- d\n');
    expect((await box(page, 'b')).y).toBeCloseTo(y0, 0);
    await page.mouse.up();
  });

  test('upuszczenie daleko od węzłów wraca na miejsce bez wpisu do historii', async ({ page }) => {
    await loadMap(page, MD);
    const before = await texts(page), u = await page.evaluate(() => undoS.length);
    const sv = await page.locator('#sv').boundingBox();
    await dragTo(page, await box(page, 'Dwa'), [sv.x + 15, sv.y + sv.height - 15]);
    expect(await texts(page)).toBe(before);
    expect(await page.evaluate(() => undoS.length)).toBe(u);
  });

  test('korzenia nie da się przeciągnąć – przesuwa widok', async ({ page }) => {
    await loadMap(page, MD);
    const r = await box(page, 'Środek');
    await dragTo(page, r, [r.cx + 60, r.cy + 30]);
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
    expect((await box(page, 'Środek')).x - r.x).toBeCloseTo(60, -1);
  });

  test('przeciąganie tła przesuwa widok', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox(), b0 = await box(page, 'Środek');
    await page.mouse.move(sv.x + 20, sv.y + 20); await page.mouse.down();
    await page.mouse.move(sv.x + 120, sv.y + 70, { steps: 5 }); await page.mouse.up();
    const b1 = await box(page, 'Środek');
    expect(b1.x - b0.x).toBeCloseTo(100, 0);
    expect(b1.y - b0.y).toBeCloseTo(50, 0);
  });
});

test.describe('dotyk', () => {
  const touch = (page, type, x, y, id = 7) => page.evaluate(([type, x, y, id]) => {
    const t = type === 'pointerdown' ? document.elementFromPoint(x, y) : document.getElementById('sv');
    t.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  }, [type, x, y, id]);
  const tap = async (page, x, y) => { await touch(page, 'pointerdown', x, y); await touch(page, 'pointerup', x, y) };
  async function swipe(page, [x0, y0], [x1, y1], { up = true } = {}) {
    await touch(page, 'pointerdown', x0, y0);
    for (let i = 1; i <= 8; i++) await touch(page, 'pointermove', x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8);
    if (up) await touch(page, 'pointerup', x1, y1);
  }

  test('przytrzymanie węzła → zaznacza i otwiera to samo menu co PPM', async ({ page }) => {
    await loadMap(page, MD);
    const r = await box(page, 'Dwa');
    await page.mouse.click(r.cx, r.cy, { button: 'right' });
    const desktop = await menu(page).innerText();
    await page.keyboard.press('Escape');
    const b = await box(page, 'Trzy');
    await touch(page, 'pointerdown', b.cx, b.cy);
    await page.waitForTimeout(650);
    await expect(menu(page)).toBeVisible();
    await expect(page.locator('#ed')).toBeHidden();
    expect(await selText(page)).toBe('Trzy');
    expect(await menu(page).innerText()).toBe(desktop.replace('Węzeł: Dwa', 'Węzeł: Trzy'));
    expect(await page.$eval('#menu', m => m.style.pointerEvents)).toBe('none');   // palec nie „kliknie” pozycji pod sobą
    await touch(page, 'pointerup', b.cx, b.cy);
    await expect(menu(page)).toBeVisible();                                          // puszczenie nie zamyka menu
    await page.waitForTimeout(400);
    await act(page, 'child').click();
    await expect(page.locator('#ed')).toBeFocused();
  });

  test('przytrzymanie tła → odznacza węzeł (bez menu)', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await tap(page, b.cx, b.cy);
    const sv = await page.locator('#sv').boundingBox();
    await page.waitForTimeout(450);
    await touch(page, 'pointerdown', sv.x + 15, sv.y + sv.height - 15);
    await page.waitForTimeout(650);
    await expect(menu(page)).toBeHidden();
    expect(await page.evaluate(() => sel)).toBe(0);
    await expect(page.locator('#g .n.sel')).toHaveCount(0);
    await touch(page, 'pointerup', sv.x + 15, sv.y + sv.height - 15);
  });

  test('podwójne stuknięcie tła bez zaznaczenia → menu całej mapy', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => deselect());
    const sv = await page.locator('#sv').boundingBox();
    await tap(page, sv.x + 15, sv.y + sv.height - 15); await tap(page, sv.x + 15, sv.y + sv.height - 15);
    await expect(page.locator('#menu .mh')).toHaveText('Brak zaznaczenia – cała mapa');
  });

  test('ruch palcem przed upływem przytrzymania nie otwiera menu', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox();
    await touch(page, 'pointerdown', sv.x + 20, sv.y + 20);
    await touch(page, 'pointermove', sv.x + 60, sv.y + 40);
    await page.waitForTimeout(650);
    await expect(menu(page)).toBeHidden();
    await touch(page, 'pointerup', sv.x + 60, sv.y + 40);
  });

  test('podwójne stuknięcie węzła → edycja w węźle', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await tap(page, b.cx, b.cy); await tap(page, b.cx, b.cy);
    await expect(page.locator('#ed')).toBeFocused();
    await expectEditorOver(page, 'Trzy');
    await expect(menu(page)).toBeHidden();
  });

  test('podwójne stuknięcie tła → to samo menu co PPM, dla zaznaczonego węzła', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    const desktop = await menu(page).innerText();
    await page.keyboard.press('Escape');
    const sv = await page.locator('#sv').boundingBox();
    await tap(page, sv.x + 15, sv.y + sv.height - 15); await tap(page, sv.x + 15, sv.y + sv.height - 15);
    await expect(menu(page)).toBeVisible();
    expect(await selText(page)).toBe('Dwa');
    expect(await menu(page).innerText()).toBe(desktop);
    expect(await page.$eval('#menu', m => m.style.pointerEvents)).toBe('none');  // chwila ochrony przed przypadkowym stuknięciem
    await page.waitForTimeout(400);
    await act(page, 'child').click();
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type('nowe');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- Dwa\n  - nowe\n');
  });

  test('pojedyncze stuknięcie tylko zaznacza', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await tap(page, b.cx, b.cy);
    await page.waitForTimeout(600);
    expect(await selText(page)).toBe('Trzy');
    await expect(menu(page)).toBeHidden();
    await expect(page.locator('#ed')).toBeHidden();
  });

  test('systemowe „przytrzymanie” (contextmenu z Androida) od razu otwiera nasze menu', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await touch(page, 'pointerdown', b.cx, b.cy);
    await page.waitForTimeout(300);                    // przed naszym licznikiem 500 ms
    await page.evaluate(([x, y]) => document.elementFromPoint(x, y).dispatchEvent(new PointerEvent('contextmenu', { pointerType: 'touch', bubbles: true, cancelable: true, clientX: x, clientY: y })), [b.cx, b.cy]);
    await expect(menu(page)).toBeVisible();
    expect(await selText(page)).toBe('Dwa');
    await page.waitForTimeout(400);                    // licznik nie otwiera menu drugi raz
    await expect(page.locator('#menu .mh')).toHaveCount(1);
    await touch(page, 'pointerup', b.cx, b.cy);
    await expect(menu(page)).toBeVisible();
  });

  test('przeciągnięcie węzła palcem przenosi go', async ({ page }) => {
    await loadMap(page, MD);
    await swipe(page, [(await box(page, 'Trzy')).cx, (await box(page, 'Trzy')).cy], at(await box(page, '1b'), .85, .5));
    expect(await texts(page)).toContain('  - 1b\n    - Trzy\n');
  });

  test('przeciągnięcie tła palcem przesuwa widok', async ({ page }) => {
    await loadMap(page, MD);
    const sv = await page.locator('#sv').boundingBox(), r0 = await box(page, 'Środek');
    await swipe(page, [sv.x + 20, sv.y + 20], [sv.x + 100, sv.y + 60]);
    const r1 = await box(page, 'Środek');
    expect(r1.x - r0.x).toBeCloseTo(80, 0);
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
  });

});

test.describe('animacja', () => {
  test.use({ reducedMotion: 'no-preference' });
  const offset = (page, text) => page.evaluate(t => {
    const n = vis().find(n => n.text === t), g = document.querySelector(`#g .n[data-id="${n.id}"]`);
    const m = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(g.getAttribute('transform') || 'translate(0 0)');
    return Math.hypot(+m[1], +m[2]);
  }, text);

  test('zmiany układu są płynne i kończą się dokładnie w docelowym miejscu', async ({ page }) => {
    await loadMap(page, MD);
    await page.waitForTimeout(1500);
    expect(await offset(page, 'Dwa')).toBe(0);
    await page.keyboard.press('ArrowRight');           // Jeden
    await page.keyboard.press('Space');                // zwiń → Dwa i Trzy podjeżdżają
    await page.waitForTimeout(30);
    expect(await offset(page, 'Dwa')).toBeGreaterThan(1);   // w ruchu
    await page.waitForTimeout(1500);
    expect(await offset(page, 'Dwa')).toBe(0);              // osiadł
    expect(await page.evaluate(() => raf)).toBe(0);         // pętla animacji zatrzymana
  });

  test('nowy węzeł wyrasta z rodzica', async ({ page }) => {
    await loadMap(page, MD);
    await page.waitForTimeout(1500);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'child').click();
    const d = await page.evaluate(() => { const n = S().n, p = pos.get(n.id), q = pos.get(find(n.id).p.id); return { start: Math.hypot(p.x - q.x, p.y - q.y), target: Math.hypot(n.x - q.x, n.y - q.y) } });
    expect(d.start).toBeLessThan(d.target);
  });

  test('potomkowie przeciąganego węzła podążają z opóźnieniem (sprężyście)', async ({ page }) => {
    await loadMap(page, MD);
    await page.waitForTimeout(1500);
    const j = await box(page, 'Jeden'), a0 = await box(page, '1a');
    const rel0 = a0.y - j.y;
    await page.mouse.move(j.cx, j.cy); await page.mouse.down();
    await page.mouse.move(j.cx + 10, j.cy + 5, { steps: 2 });
    await page.mouse.move(j.cx + 10, j.cy + 200, { steps: 2 });   // szybki ruch w dół
    const j1 = await box(page, 'Jeden'), a1 = await box(page, '1a');
    expect(Math.abs((a1.y - j1.y) - rel0)).toBeGreaterThan(5);    // dziecko jeszcze „dogania”
    await page.waitForTimeout(1200);
    const j2 = await box(page, 'Jeden'), a2 = await box(page, '1a');
    expect(a2.y - j2.y).toBeCloseTo(rel0, 0);                      // i dogoniło
    await page.keyboard.press('Escape'); await page.mouse.up();
  });
});

test('podpowiedź w pasku stanu po najechaniu na węzeł i tło', async ({ page }) => {
  await loadMap(page, MD);
  const b = await box(page, 'Dwa');
  await page.mouse.move(b.cx, b.cy);
  await expect(page.locator('#hint')).toContainText('dwuklik – edytuj');
  const sv = await page.locator('#sv').boundingBox();
  await page.mouse.move(sv.x + 10, sv.y + sv.height - 10);
  await expect(page.locator('#hint')).toContainText('kółko – zoom');
});

test('dwuklik na tle i „=” dopasowują widok do ekranu', async ({ page }) => {
  await loadMap(page, MD + '- ' + 'x '.repeat(5) + '\n'.repeat(1) + Array.from({ length: 30 }, (_, i) => `- węzeł ${i}`).join('\n'));
  await page.keyboard.press('=');
  const sv = await page.locator('#sv').boundingBox();
  const all = await page.$$eval('#g .n rect', rs => rs.map(r => r.getBoundingClientRect()).map(r => ({ t: r.top, b: r.bottom })));
  expect(Math.min(...all.map(r => r.t))).toBeGreaterThanOrEqual(sv.y);
  expect(Math.max(...all.map(r => r.b))).toBeLessThanOrEqual(sv.y + sv.height);
});

test('dwuklik na tle odznacza węzeł (widok się nie zmienia)', async ({ page }) => {
  await loadMap(page, MD);
  const k0 = await page.evaluate(() => k);
  const sv = await page.locator('#sv').boundingBox();
  await page.mouse.dblclick(sv.x + 15, sv.y + sv.height - 15);
  expect(await page.evaluate(() => sel)).toBe(0);
  await expect(page.locator('#g .n.sel')).toHaveCount(0);
  expect(await page.evaluate(() => k)).toBe(k0);
  await expect(page.locator('#ed')).toBeHidden()
});

test.describe('wąski ekran', () => {
  test.use({ viewport: { width: 412, height: 800 } });
  test('klik nie przesuwa widoku; dwuklik przy krawędzi edytuje, a tekst trafia do węzła', async ({ page }) => {
    await loadMap(page, '# Plan projektu\n- Badania\n  - Wywiady z użytkownikami i analiza konkurencji na rynku\n  - Ankieta\n- Projekt\n');
    const b = await box(page, 'Ankieta'), tx0 = await page.evaluate(() => tx);
    await page.mouse.click(b.cx, b.cy);
    expect(await page.evaluate(() => tx)).toBe(tx0);
    await page.waitForTimeout(500);                    // żeby to nie liczyło się jako dwuklik
    await page.mouse.dblclick(b.cx, b.cy);
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type(' online – pytania otwarte i zamknięte');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('  - Ankieta online – pytania otwarte i zamknięte\n- Projekt\n');
  });
});

test('przyszły rodzic jest podświetlony w trakcie przeciągania', async ({ page }) => {
  await loadMap(page, MD);
  const a = await box(page, 'Trzy'), t = await box(page, '1a');
  await page.mouse.move(a.cx, a.cy); await page.mouse.down();
  await page.mouse.move(a.cx + 15, a.cy, { steps: 3 });
  await page.mouse.move(t.x + t.w * .85, t.cy, { steps: 8 });
  await expect(page.locator(`#g .n.target[data-id="${t.id}"]`)).toHaveCount(1);
  await expect(page.locator('#g .n.target')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('#g .n.target')).toHaveCount(0);
});

test.describe('pomoc', () => {
  test('komputer: panel na dolnej połowie, w kolumnach, mapa nad nim widoczna', async ({ page }) => {
    await page.keyboard.press('?');
    const h = await page.locator('#help').boundingBox(), m = await page.locator('#main').boundingBox();
    expect(Math.abs(h.y - (m.y + m.height / 2))).toBeLessThan(2);
    expect(Math.abs(h.y + h.height - (m.y + m.height))).toBeLessThan(2);
    const cols = await page.$eval('#help .hb', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
    expect(cols).toBeGreaterThan(1);
    await expect(page.locator('#help h3')).toHaveCount(6);
    await expect(page.locator('#help kbd').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#help')).toBeHidden();
  });

  test('przycisk zamknięcia i klawisz ? przełączają pomoc; klik w treść jej nie zamyka', async ({ page }) => {
    await page.keyboard.press('?');
    await page.locator('#help h3').first().click();
    await expect(page.locator('#help')).toBeVisible();
    await page.keyboard.press('?');
    await expect(page.locator('#help')).toBeHidden();
    await page.click('#bm'); await act(page, 'help').click();
    await page.click('#hx');
    await expect(page.locator('#help')).toBeHidden();
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    test('pełny ekran, jedna kolumna, czytelna czcionka, najpierw dotyk', async ({ page }) => {
      await page.click('#bm'); await page.waitForTimeout(400); await act(page, 'help').click();
      const h = await page.locator('#help').boundingBox(), m = await page.locator('#main').boundingBox();
      expect(h.y).toBeCloseTo(m.y, 0);
      expect(h.height).toBeCloseTo(m.height, 0);
      expect(await page.$eval('#help .hb', e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(1);
      expect(await page.$eval('#help dd', e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
      await expect(page.locator('#help h3').first()).toHaveText('Dotyk');
      const over = await page.$eval('#help .hb', e => e.scrollWidth - e.clientWidth);
      expect(over).toBeLessThanOrEqual(0);   // nic nie wystaje w poziomie
      await page.click('#hx');
      await expect(page.locator('#help')).toBeHidden();
    });
  });
});

test('pomoc na komputerze przesuwa mapę nad panel i oddaje ją po zamknięciu', async ({ page }) => {
  const ty0 = await page.evaluate(() => ty);
  await page.keyboard.press('?');
  const h = await page.locator('#help').boundingBox();
  expect(await page.evaluate(() => ty)).toBeCloseTo(ty0 - h.height / 2, 0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => ty)).toBeCloseTo(ty0, 0);
});

test.describe('wiele korzeni', () => {
  const MULTI = '# A\n- a1\n  - a11\n- a2\n\n# B\n- b1\n- b2\n\n# C\n- c1\n';
  test('drzewa nie nachodzą na siebie w żadnym układzie', async ({ page }) => {
    for (const d of ['right', 'left', 'both', 'down']) {
      const list = await loadMap(page, MULTI.replace('\n', `\n<!--layout:${d}-->\n`));
      expect(list.map(b => b.text)).toEqual(['A', 'a1', 'a11', 'a2', 'B', 'b1', 'b2', 'C', 'c1']);
      require('./helpers').expectNoOverlaps(list);
    }
  });

  test('strzałki i Home poruszają się między korzeniami', async ({ page }) => {
    await loadMap(page, MULTI);                          // zaznaczony A
    await page.keyboard.press('ArrowDown'); expect(await selText(page)).toBe('B');
    await page.keyboard.press('ArrowRight'); expect(await selText(page)).toBe('b1');
    await page.keyboard.press('ArrowLeft'); expect(await selText(page)).toBe('B');
    await page.keyboard.press('ArrowLeft'); expect(await selText(page)).toBe('B');   // korzeń nie ma rodzica
    await page.keyboard.press('Home'); expect(await selText(page)).toBe('A');
  });

  test('przeciągnięcie korzenia pod węzeł innego drzewa i węzła obok korzenia', async ({ page }) => {
    await loadMap(page, MULTI);
    await page.mouse.move(...[(await box(page, 'C')).cx, (await box(page, 'C')).cy]); await page.mouse.down();
    await page.mouse.move((await box(page, 'C')).cx + 15, (await box(page, 'C')).cy, { steps: 3 });
    const t = await box(page, 'b2');
    await page.mouse.move(t.x + t.w * .85, t.cy, { steps: 8 }); await page.mouse.up();
    expect(await texts(page)).toBe('# A\n\n- a1\n  - a11\n- a2\n\n# B\n\n- b1\n- b2\n  - C\n    - c1\n');
    const a = await box(page, 'a2'), r = await box(page, 'B');
    await page.mouse.move(a.cx, a.cy); await page.mouse.down();
    await page.mouse.move(a.cx + 15, a.cy, { steps: 3 });
    await page.mouse.move(r.x + r.w * .15, r.y + r.h * .2, { steps: 8 }); await page.mouse.up();
    expect(await texts(page)).toContain('# A\n\n- a1\n  - a11\n\n# a2\n\n# B\n');   // a2 stał się korzeniem przed B
  });
});

test.describe('zwijanie z animacją', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('zwinięte dzieci chowają się do rodzica, rozwinięte z niego wyrastają', async ({ page }) => {
    await loadMap(page, '# R\n- a\n  - a1\n  - a2\n- b\n');
    await page.waitForTimeout(1200);
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    await act(page, 'foldall').click();
    await expect(page.locator('#g .n.leave')).toHaveCount(2);             // a1, a2 jadą do „a”
    await expect(page.locator('#g .n.leave')).toHaveCount(0, { timeout: 3000 });
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    await act(page, 'unfoldall').click();
    const d = await page.evaluate(() => { const a = vis().find(n => n.text === 'a'), c = a.children[0], p = pos.get(c.id), q = pos.get(a.id); return Math.hypot(p.x - q.x, p.y - q.y) / Math.hypot(c.x - a.x, c.y - a.y) });
    expect(d).toBeLessThan(.5);                                            // startuje blisko rodzica
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => raf)).toBe(0);
  });
});

test('kopiuj i wklej działają wewnątrz aplikacji (Ctrl+C → menu „Wklej jako dziecko”)', async ({ page }) => {
  await loadMap(page, MD);
  await page.keyboard.press('ArrowRight');           // Jeden
  await page.keyboard.press('Control+c');
  const b = await box(page, 'Trzy');
  await page.mouse.click(b.cx, b.cy, { button: 'right' });
  await expect(act(page, 'paste')).toBeEnabled();
  await act(page, 'paste').click();
  expect(await texts(page)).toContain('- Trzy\n  - Jeden\n    - 1a\n    - 1b\n');
});

test.describe('pasek: menu po lewej, panel wyglądu po prawej', () => {
  test('„…” jest pierwsze i zawiera „Otwórz”; po prawej przycisk wyglądu', async ({ page }) => {
    const ids = await page.$$eval('#top button', bs => bs.map(b => b.id));
    expect(ids[0]).toBe('bm');
    expect(ids[ids.length - 1]).toBe('bp');
    await expect(page.locator('#bo')).toHaveCount(0);
    await page.click('#bm');
    const m = await menu(page).boundingBox(), b = await page.locator('#bm').boundingBox();
    expect(Math.abs(m.x - b.x)).toBeLessThan(2);                       // rozwija się pod przyciskiem, przy lewej krawędzi
    await expect(page.locator('#menu button').first()).toHaveAttribute('data-act', 'open');
    await expect(act(page, 'open').locator('kbd')).toHaveText('Ctrl+O');
  });
});

test.describe('panel „Wygląd mapy”', () => {
  const path0 = page => page.$eval('#g path', p => p.getAttribute('stroke-width'));
  const open = async page => { await page.click('#bp'); await expect(page.locator('#side')).toBeVisible(); };

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

  test('suwaki zmieniają mapę na żywo: linie, obramowanie, rogi, tekst, odstępy', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const before = await box(page, 'Jeden'), r0 = await box(page, 'Środek');
    await page.locator('#st-edge').fill('5');
    expect(await path0(page)).toBe('5');
    await page.locator('#st-radius').fill('0');
    expect(await page.$eval('#g .n rect', r => r.getAttribute('rx'))).toBe('0');
    await page.locator('#st-nb').fill('4');
    expect(await page.$eval('#g .n:not(.sel) rect', r => getComputedStyle(r).strokeWidth)).toBe('4px');
    await page.locator('#st-gapX').fill('120');
    const after = await box(page, 'Jeden'), r1 = await box(page, 'Środek');
    expect((after.x - r1.x) - (before.x - r0.x)).toBeCloseTo(70, 0);   // 50 → 120 px między poziomami
    await page.locator('#st-fs').fill('20');
    expect((await box(page, 'Jeden')).h).toBeGreaterThan(before.h);
    await expect(page.locator('#so-fs')).toHaveText('20 px');
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
    await expect(page.locator('#side input[type=color]').first()).toBeHidden();      // próbniki schowane
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

  test('edycja presetu: zmienia paletę na urządzeniu i mapę; można przywrócić oryginał', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.click('#side [data-pal="Las"]');
    await page.click('#paledit');
    await expect(page.locator('#paledit')).toContainText('Las');
    await expect(page.locator('#palreset')).toBeHidden();
    await page.locator('#side input[data-ci="0"]').fill('#123456');
    const j = await box(page, 'Jeden');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#123456');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mm.pal')).Las[0])).toBe('#123456');
    await page.click('#side [data-pal="Ocean"]'); await page.click('#side [data-pal="Las"]');   // wybór presetu bierze wersję poprawioną
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#123456');
    await page.click('#palreset');
    expect(await page.$eval(`#g .n[data-id="${j.id}"] rect`, r => r.getAttribute('stroke'))).toBe('#2d6a4f');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mm.pal')).Las)).toBeUndefined();
  });

  test('czcionka i grubość tekstu: mapa, pomiar zawijania, pole edycji, plik', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const w0 = (await box(page, 'Jeden')).w;
    await page.click('#side .seg[data-k="font"] button[data-v="mono"]');
    expect(await page.$eval('#g .n text', t => getComputedStyle(t).fontFamily)).toMatch(/monospace/);
    expect((await box(page, 'Jeden')).w).not.toBe(w0);                                  // szerokość mierzona nową czcionką
    await page.click('#side .seg[data-k="weight"] button[data-v="bold"]');
    expect(await page.$eval('#g .n text', t => getComputedStyle(t).fontWeight)).toBe('700');
    expect(await texts(page)).toContain('"font":"mono","weight":"bold"');
    await page.click('#sx');
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    expect(await page.$eval('#ed', e => [getComputedStyle(e).fontFamily, getComputedStyle(e).fontWeight].join('|'))).toMatch(/monospace.*\|700/);
    await expectEditorOver(page, 'Dwa');
  });

  test('styl zapisuje się w pliku mapy i wraca po wczytaniu; „Przywróć domyślne”', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    await page.locator('#st-edge').fill('4');
    await page.click('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]');
    const md = await texts(page);
    expect(md).toBe('# Środek\n<!--style:{"edge":4,"edgeStyle":"elbow"}-->\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
    await page.click('#sreset');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n');
    expect(await path0(page)).toBe('2');
    await loadMap(page, md);                                      // wczytanie pliku ze stylem
    expect(await path0(page)).toBe('4');
    await expect(page.locator('#st-edge')).toHaveValue('4');
    await expect(page.locator('#side .seg[data-k="edgeStyle"] button[data-v="elbow"]')).toHaveClass(/on/);
    expect(await page.evaluate(() => selfTest())).toBe(true);
  });

  test('zmiana stylu jest cofalna (jedno przeciągnięcie suwaka = jeden krok)', async ({ page }) => {
    await loadMap(page, MD);
    await open(page);
    const s = page.locator('#st-edge');
    for (const v of ['3', '4', '6']) await s.evaluate((r, v) => { r.value = v; r.dispatchEvent(new Event('input')) }, v);
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

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    test('panel zajmuje całą szerokość', async ({ page }) => {
      await page.click('#bp');
      await page.waitForTimeout(400);
      const b = await page.locator('#side').boundingBox();
      expect(b.x).toBeCloseTo(0, 0);
      expect(b.width).toBeCloseTo(390, 0);
    });
  });
});

test.describe('pasek: kolejność', () => {
  test('wszystko po lewej (menu, cofnij, ponów, układ, dopasuj, tekst/mapa); po prawej tylko wygląd', async ({ page }) => {
    const ids = await page.$$eval('#top button', bs => bs.map(b => b.id));
    expect(ids).toEqual(['bm', 'bu', 'br', 'bl', 'bf', 'bt', 'bp']);
    await expect(page.locator('#bs')).toHaveCount(0);
    const x = async id => (await page.locator('#' + id).boundingBox()).x;
    const w = page.viewportSize().width;
    expect(await x('bt')).toBeLessThan(w / 3);                   // ostatni z lewej grupy nadal przy lewej krawędzi
    expect(await x('bp')).toBeGreaterThan(w - 60);               // panel wyglądu przy prawej krawędzi
    for (const id of ['bm', 'bu', 'br', 'bl', 'bf', 'bt']) await expect(page.locator('#' + id)).not.toHaveClass(/tr/);
    await expect(page.locator('#bp')).toHaveClass(/tr/);
  });

  test('„Zapisz” jest w menu „…” zaraz pod „Otwórz”, ze skrótem Ctrl+S', async ({ page }) => {
    await page.click('#bm');
    expect(await page.$$eval('#menu button', bs => bs.slice(0, 2).map(b => b.dataset.act))).toEqual(['open', 'save']);
    await expect(act(page, 'save').locator('kbd')).toHaveText('Ctrl+S');
    await page.evaluate(() => { window.showSaveFilePicker = undefined });
    const dl = page.waitForEvent('download');
    await act(page, 'save').click();
    expect((await dl).suggestedFilename()).toBe('mapa.md');
  });
});

test.describe('emoji', () => {
  const pick = async (page, e) => { await page.locator(`#emo [data-e="${e}"]`).click() };
  test('z menu podręcznego: emoji na końcu tekstu węzła, cofalne', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.click(b.cx, b.cy, { button: 'right' });
    await act(page, 'emoji').click();
    await expect(page.locator('#emo')).toBeVisible();
    await expect(page.locator('#emo .tabs button')).toHaveCount(6);       // bez „Ostatnich”, dopóki nic nie użyto
    await page.locator('#emo [data-tab="Symbole"]').click();
    await pick(page, '✅');
    await expect(page.locator('#emo')).toBeHidden();
    expect(await texts(page)).toContain('- Dwa ✅\n');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toContain('- Dwa\n');
  });

  test('w edycji: przycisk 😊 przy polu, wstawia w miejscu kursora, edycja trwa', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Trzy');
    await page.mouse.dblclick(b.cx, b.cy);
    const eb = page.locator('#edemo'), ed = await page.locator('#ed').boundingBox();
    await expect(eb).toBeVisible();
    expect((await eb.boundingBox()).x).toBeGreaterThanOrEqual(ed.x + ed.width);
    await page.keyboard.press('Home');
    await eb.click();
    await pick(page, '😀');
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.type(' x');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toContain('- 😀 xTrzy\n');
    await expect(eb).toBeHidden();
  });

  test('Ctrl+. w edycji i poza nią; Esc zamyka okienko, nie kończąc edycji; „Ostatnie”', async ({ page }) => {
    await loadMap(page, MD);
    const b = await box(page, 'Dwa');
    await page.mouse.dblclick(b.cx, b.cy);
    await page.keyboard.press('Control+.');
    await expect(page.locator('#emo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#emo')).toBeHidden();
    await expect(page.locator('#ed')).toBeFocused();
    await page.keyboard.press('Control+.');
    await page.locator('#emo [data-tab="Symbole"]').click();
    await expect(page.locator('#ed')).toBeFocused();                  // zmiana zakładki nie zabiera fokusu
    await pick(page, '🔥');
    await page.keyboard.press('Escape');
    expect(await texts(page)).toContain('- Dwa🔥\n');
    await page.keyboard.press('ArrowDown');                            // Trzy
    await page.keyboard.press('Control+.');
    await expect(page.locator('#emo .cap')).toHaveText('Ostatnio użyte');
    await pick(page, '🔥');
    expect(await texts(page)).toContain('- Trzy 🔥\n');
  });

  test('klik obok zamyka okienko', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+.');
    await expect(page.locator('#emo')).toBeVisible();
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 10, sv.y + sv.height - 10);
    await expect(page.locator('#emo')).toBeHidden();
  });
});

test('menu: kopiuj, wytnij i usuń to osobne polecenia; usuń nie nadpisuje schowka', async ({ page }) => {
  await loadMap(page, MD);
  const menuOn = async t => { const b = await box(page, t); await page.mouse.click(b.cx, b.cy, { button: 'right' }) };
  await menuOn('Dwa'); await act(page, 'copy').click();
  expect(await texts(page)).toContain('- Dwa\n');                           // kopiowanie nic nie usuwa
  await menuOn('Trzy'); await act(page, 'del').click();                     // usunięcie – schowek dalej ma „Dwa”
  await menuOn('Jeden'); await act(page, 'paste').click();
  expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n  - Dwa\n- Dwa\n');
  await menuOn('1a'); await act(page, 'cut').click();                       // wycięcie – usuwa i kopiuje
  expect(await texts(page)).not.toContain('1a');
  await menuOn('Dwa'); await act(page, 'paste').click();
  expect(await texts(page)).toContain('  - Dwa\n    - 1a\n');
});

test.describe('bez zaznaczenia', () => {
  test('Esc odznacza; strzałka / j zaczyna od pierwszego korzenia', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => sel)).toBe(0);
    await page.keyboard.press('ArrowDown'); expect(await selText(page)).toBe('Środek');
    await page.keyboard.press('Escape'); await page.keyboard.press('j'); expect(await selText(page)).toBe('Środek');
  });

  test('wklejanie bez zaznaczenia tworzy brata korzeni (nowy korzeń)', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight');           // Jeden
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+v');
    expect(await texts(page)).toBe('# Środek\n\n- Jeden\n  - 1a\n  - 1b\n- Dwa\n- Trzy\n\n# Jeden\n\n- 1a\n- 1b\n');
    expect(await selText(page)).toBe('Jeden');
  });

  test('Enter bez zaznaczenia dodaje nowy korzeń; operacje na węźle tylko informują', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Escape');
    const before = await texts(page);
    for (const k of ['Delete', 'Control+x', 'Space', 'Alt+ArrowDown', 'F2']) await page.keyboard.press(k);
    expect(await texts(page)).toBe(before);
    await expect(page.locator('#info')).toHaveText('najpierw zaznacz węzeł');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Nowy temat');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toBe(before + '\n# Nowy temat\n\n');
  });

  test('menu bez zaznaczenia: nowy korzeń, wklej jako nowy korzeń; operacje na węźle wyłączone', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Control+c'); await page.keyboard.press('Escape');
    const sv = await page.locator('#sv').boundingBox();
    await page.mouse.click(sv.x + 15, sv.y + sv.height - 15, { button: 'right' });
    await expect(act(page, 'sib').locator('span')).toHaveText('Nowy korzeń');
    await expect(act(page, 'paste').locator('span')).toHaveText('Wklej jako nowy korzeń');
    for (const a of ['child', 'emoji', 'fold', 'copy', 'cut', 'del']) await expect(act(page, a)).toBeDisabled();
    await act(page, 'paste').click();
    expect(await texts(page)).toContain('\n# Jeden\n');
  });
});

test.describe('auto-przewijanie przy przeciąganiu', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('przy krawędzi rusza dopiero po chwili i jest łagodne', async ({ page }) => {
    await loadMap(page, MD);
    await expect.poll(() => page.evaluate(() => raf)).toBe(0);              // animacja wczytania zakończona
    const a = await box(page, 'Dwa'), sv = await page.locator('#sv').boundingBox();
    await page.mouse.move(a.cx, a.cy); await page.mouse.down();
    await page.mouse.move(a.cx + 15, a.cy, { steps: 3 });
    const tx0 = await page.evaluate(() => tx);
    await page.mouse.move(sv.x + sv.width - 10, a.cy, { steps: 6 });       // przy prawej krawędzi
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => tx)).toBe(tx0);                         // jeszcze nic – zwłoka
    await page.waitForTimeout(1000);
    const moved = tx0 - await page.evaluate(() => tx);
    expect(moved).toBeGreaterThan(20);                                       // przewija…
    expect(moved).toBeLessThan(400);                                         // …ale spokojnie (dawniej ~700 px/s od razu)
    await page.keyboard.press('Escape'); await page.mouse.up();
  });
});
