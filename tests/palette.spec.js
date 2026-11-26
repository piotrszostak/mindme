// Paleta komend (Ctrl+K, „:”) i wspólna tabela czynności ACT: pomoc, menu podręczne, menu „…” i paleta biorą z niej
// nazwy i skróty. Skróty w Firefoksie: keys.spec.js.
const { test, expect } = require('@playwright/test');
const { open, loadMap, MD, texts, selText, act } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const pal = page => page.locator('#pal');
const palq = page => page.locator('#palq');
const rows = page => page.locator('#pall .pi');
const row = (page, id) => page.locator(`#pall .pi[data-act="${id}"]`);
const hi = page => page.locator('#pall .pi.hi');
const names = page => page.$$eval('#pall .pi .pt', s => s.map(x => x.textContent));
const select = (page, t) =>
  page.evaluate(t => {
    sel = vis().find(n => n.text === t).id;
    render();
  }, t);
/** otwórz paletę, wpisz tekst i uruchom podświetloną pozycję */
async function run(page, q) {
  await page.keyboard.press('Control+k');
  await palq(page).fill(q);
  await page.keyboard.press('Enter');
  await expect(pal(page)).toBeHidden();
}
/** komenda „:” wpisana w palecie */
async function command(page, c) {
  await page.keyboard.press(':');
  await page.keyboard.type(c);
  await page.keyboard.press('Enter');
}

test.describe('jedna tabela czynności (ACT)', () => {
  test('pomoc: jedna czynność = jeden wiersz, z nazwą jak w menu', async ({ page }) => {
    const rows = await page.evaluate(() => HELP['Klawiatura (zwykły | vim)']);
    expect(rows).toContainEqual(['Tab|a', 'dodaj dziecko']);
    expect(rows).toContainEqual(['Ctrl+D', 'duplikuj gałąź (kopia zaraz za oryginałem)']);
    expect(rows).toContainEqual(['Alt+↑|K', 'przesuń w górę']);
    expect(rows).toContainEqual(['Alt+↓|J', 'przesuń w dół']);
    expect(rows).toContainEqual(['Ctrl+O', 'otwórz plik…']);
    expect(rows).toContainEqual(['Ctrl+S', 'zapisz']);
    expect(rows).toContainEqual(['z1 … z9', 'pokaż do poziomu 1–9 (głębsze zwinięte)']);
    expect(rows).toContainEqual(['Ctrl+K|:', 'wszystkie polecenia… (paleta komend)']);
    expect(rows).toContainEqual(['↑ ↓ ← →|h j k l', 'poruszanie (zgodnie z układem; vim z licznikiem, np. 3j)']);
  });

  test('menu podręczne i paleta czytają nazwę i skrót z tabeli (zmiana w jednym miejscu)', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => {
      const a = ACT.find(a => a.id === 'dup');
      a.t = 'Klonuj gałąź';
      a.k = ['Ctrl+Q'];
      ctxMenu(10, 10);
    });
    await expect(act(page, 'dup').locator('span')).toHaveText('Klonuj gałąź');
    await expect(act(page, 'dup').locator('kbd')).toHaveText('Ctrl+Q');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await expect(row(page, 'dup').locator('.pt')).toHaveText('Klonuj gałąź');
    await expect(row(page, 'dup').locator('kbd')).toHaveText(['Ctrl+Q']);
  });

  test('każda pozycja menu pochodzi z tabeli; każda czynność ze skrótem ma wiersz w pomocy', async ({ page }) => {
    await loadMap(page, MD);
    const r = await page.evaluate(() => {
      const ids = new Set(ACT.map(a => a.id)),
        menus = [];
      for (const open of [() => ctxMenu(10, 10), () => moreMenu(10, 10), () => $('bl').click()]) {
        open();
        menus.push(...[...$('menu').querySelectorAll('button')].map(b => b.dataset.act));
        closeMenu();
      }
      const keys = HELP['Klawiatura (zwykły | vim)'].map(r => r[0].split('|'));
      return {
        notInAct: menus.filter(id => !ids.has(id)),
        noHelp: ACT.filter(a => a.help !== false && (a.k || a.v))
          .filter(a => !keys.some(k => k.includes(a.help ? a.help[0] : [...(a.k || []), ...(a.v || [])][0])))
          .map(a => a.id),
      };
    });
    expect(r.notInAct).toEqual([]);
    expect(r.noHelp).toEqual([]);
  });
});

test.describe('paleta komend', () => {
  test('Ctrl+K: okienko u góry na środku, widać 5 pozycji, każda z nazwą i skrótami', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    await expect(pal(page)).toBeVisible();
    await expect(palq(page)).toBeFocused();
    await expect(palq(page)).toHaveValue('');
    await expect(page.locator('#mode')).toHaveText('COMMAND');
    const b = await pal(page).boundingBox(),
      top = await page.locator('#top').boundingBox();
    expect(Math.abs(b.x + b.width / 2 - 1280 / 2)).toBeLessThan(2);
    expect(b.y).toBeGreaterThanOrEqual(top.y + top.height);
    expect(b.y).toBeLessThan(top.y + top.height + 40);
    const l = await page.$eval('#pall', e => ({
      ch: e.clientHeight,
      sh: e.scrollHeight,
      rh: /** @type {HTMLElement} */ (e.querySelector('.pi')).offsetHeight,
    }));
    expect(Math.round(l.ch / l.rh)).toBe(5);
    expect(l.sh).toBeGreaterThan(l.ch); // reszta się przewija
    // bez ostatnio użytych: stała kolejność – węzeł, widok, układy, plik, pomoc
    const n = await names(page);
    expect(n.slice(0, 5)).toEqual([
      'Edytuj',
      'Edytuj od pustego tekstu',
      'Dodaj brata',
      'Dodaj brata powyżej',
      'Dodaj dziecko',
    ]);
    const at = t => n.indexOf(t);
    expect(at('Cofnij')).toBeLessThan(at('Dopasuj całą mapę')); // „Ponów” jest teraz niedostępne – na końcu
    expect(at('Tryb jasny / ciemny')).toBeLessThan(at('Układ w prawo'));
    expect(at('Układ w dół')).toBeLessThan(at('Otwórz plik…'));
    expect(at('Eksportuj PNG')).toBeLessThan(at('Pomoc i skróty'));
    // bez samego poruszania się i bez samej palety
    for (const t of ['Poruszanie', 'Pierwszy / ostatni węzeł', 'Następne trafienie', 'Wszystkie polecenia…'])
      expect(n).not.toContain(t);
    // skróty: zwykły i vim; gdy vim nie ma – komenda „:”
    await expect(row(page, 'dup').locator('kbd')).toHaveText(['Ctrl+D']);
    await expect(row(page, 'copy').locator('kbd')).toHaveText(['Ctrl+C', 'yy']);
    await expect(row(page, 'lv2').locator('kbd')).toHaveText(['z2']);
    await expect(row(page, 'save').locator('kbd')).toHaveText(['Ctrl+S', ':w']);
    await expect(row(page, 'lay-down').locator('kbd')).toHaveText([':layout down']);
    await expect(rows(page).first()).toHaveClass(/\bhi\b/);
  });

  test('układy biorą się z listy układów aplikacji (LAY)', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await palq(page).fill('uklad');
    const lay = await page.evaluate(() => Object.values(LAY).map(l => 'Układ ' + l[1]));
    expect(lay.length).toBeGreaterThanOrEqual(4);
    expect(await names(page)).toEqual(lay);
  });

  test('filtrowanie: słowa w dowolnej kolejności, od początku słowa, bez polskich znaków i wielkości liter', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    await palq(page).fill('zw wsz');
    expect(await names(page)).toEqual(['Zwiń wszystko']);
    await palq(page).fill('DÓŁ układ');
    expect(await names(page)).toEqual(['Układ w dół']);
    await palq(page).fill('dol uklad');
    expect(await names(page)).toEqual(['Układ w dół']);
    await palq(page).fill('zwin');
    expect(await names(page)).toEqual(['Zwiń / rozwiń', 'Zwiń wszystko']);
    await palq(page).fill('poziomu 3');
    expect(await names(page)).toEqual(['Pokaż do poziomu 3']);
    await expect(hi(page).locator('.pt')).toHaveText('Pokaż do poziomu 3');
    // „ozwi” jest w środku słowa „rozwiń” – nie pasuje
    await palq(page).fill('ozwi');
    expect(await names(page)).toEqual([]);
    await expect(page.locator('#pall .none')).toHaveText('Brak pasujących poleceń');
    const before = await texts(page);
    await page.keyboard.press('Enter'); // nic nie pasuje: nic się nie dzieje
    await expect(pal(page)).toBeVisible();
    expect(await texts(page)).toBe(before);
  });

  test('klawiatura: ↓ ↑ wybierają (z zawijaniem), Enter uruchamia, Esc zamyka; potem skróty mapy działają', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await select(page, 'Dwa');
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Escape');
    await expect(pal(page)).toBeHidden();
    await expect(page.locator('#mode')).toHaveText('NORMAL');
    await page.keyboard.press('Control+k');
    await expect(palq(page)).toHaveValue(''); // każde otwarcie od pustego pola
    await palq(page).fill('przesun');
    await expect(hi(page).locator('.pt')).toHaveText('Przesuń w górę');
    await page.keyboard.press('ArrowDown');
    await expect(hi(page).locator('.pt')).toHaveText('Przesuń w dół');
    await page.keyboard.press('ArrowDown');
    await expect(hi(page).locator('.pt')).toHaveText('Przesuń w górę');
    await page.keyboard.press('ArrowUp');
    await expect(hi(page).locator('.pt')).toHaveText('Przesuń w dół');
    await page.keyboard.press('Enter');
    await expect(pal(page)).toBeHidden();
    expect(await texts(page)).toContain('- Trzy\n- Dwa\n');
    await page.keyboard.press('k'); // fokus nie został w schowanym polu
    expect(await selText(page)).toBe('Trzy');
  });

  test('niedostępne: szare, na końcu, z powodem; strzałki i Enter je pomijają', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Escape'); // odznacz
    await page.keyboard.press('Control+k');
    await expect(row(page, 'dup')).toHaveClass(/\boff\b/);
    await expect(row(page, 'dup').locator('.why')).toHaveText('najpierw zaznacz węzeł');
    await expect(row(page, 'dup').locator('kbd')).toHaveCount(0);
    await expect(row(page, 'paste').locator('.why')).toHaveText('schowek pusty');
    const off = await page.$$eval('#pall .pi', rs => rs.map(r => r.classList.contains('off')));
    const first = off.indexOf(true);
    expect(first).toBeGreaterThan(0);
    expect(off.slice(first).every(Boolean)).toBe(true); // po pierwszej szarej już tylko szare
    await page.keyboard.press('ArrowUp'); // z pierwszej na ostatnią dostępną, nie na szarą
    expect(await page.$eval('#pall .pi.hi', r => r.classList.contains('off'))).toBe(false);
    await palq(page).fill('dupl'); // jedyna pasująca jest niedostępna
    await expect(hi(page)).toHaveCount(0);
    const before = await texts(page);
    await page.keyboard.press('Enter');
    expect(await texts(page)).toBe(before);
    await expect(pal(page)).toBeVisible();
  });

  test('mysz: najechanie podświetla, kółko przewija, klik obok zamyka, klik uruchamia', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    const third = rows(page).nth(2);
    await third.hover();
    await expect(third).toHaveClass(/\bhi\b/);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.$eval('#pall', e => e.scrollTop)).toBeGreaterThan(0);
    await page.mouse.click(30, 700); // obok palety
    await expect(pal(page)).toBeHidden();
    await expect(page.locator('#mode')).toHaveText('NORMAL');
    await page.keyboard.press('Control+k');
    await palq(page).fill('uklad');
    await row(page, 'lay-down').click();
    await expect(pal(page)).toBeHidden();
    expect(await page.evaluate(() => dir)).toBe('down');
  });
});

test.describe('paleta: komendy „:”', () => {
  test('„:” otwiera paletę z dwukropkiem; pełna komenda jest pierwsza i podświetlona', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => {
      window.__saved = 0;
      window.save = () => window.__saved++;
    });
    await page.keyboard.press(':');
    await expect(pal(page)).toBeVisible();
    await expect(palq(page)).toHaveValue(':');
    await page.keyboard.type('w');
    await expect(rows(page).first()).toHaveClass(/\bhi\b/);
    await expect(rows(page).first().locator('.pt')).toHaveText('Zapisz');
    await expect(rows(page).first().locator('kbd')).toHaveText([':w']);
    await page.keyboard.press('Enter');
    await expect(pal(page)).toBeHidden();
    expect(await page.evaluate(() => window.__saved)).toBe(1);
    await page.keyboard.press(':');
    await page.keyboard.type('new Projekt');
    await expect(hi(page).locator('.pt')).toHaveText('Nowa mapa „Projekt”');
    await expect(hi(page).locator('kbd')).toHaveText([':new Projekt']);
    await page.keyboard.press('Enter');
    expect(await texts(page)).toMatch(/^# Projekt\n/);
    expect(await page.evaluate(() => root.children.length)).toBe(1);
  });

  test('dawne komendy działają: w, write, e, o, new, layout, export, theme, fit, test, text', async ({ page }) => {
    await loadMap(page, MD);
    await page.evaluate(() => {
      window.__log = [];
      window.save = () => __log.push('save');
      window.openFile = () => __log.push('open');
      window.exportImg = t => __log.push('export ' + t);
      window.fitView = () => __log.push('fit');
    });
    for (const c of ['w', 'write', 'e', 'o', 'export png', 'export svg', 'export', 'fit']) await command(page, c);
    expect(await page.evaluate(() => __log)).toEqual([
      'save',
      'save',
      'open',
      'open',
      'export png',
      'export svg',
      'export svg',
      'fit',
    ]);
    await command(page, 'layout down');
    expect(await page.evaluate(() => dir)).toBe('down');
    await command(page, 'theme dark');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await command(page, 'theme light');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    await command(page, 'theme');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await command(page, 'new');
    expect(await texts(page)).toMatch(/^# Nowa mapa\n/);
    await command(page, 'test');
    await expect(page.locator('#info')).toHaveText('round-trip OK');
    await command(page, 'text');
    await expect(page.locator('#txt')).toBeVisible();
  });

  test('nieznana komenda: „Brak pasujących poleceń”, Enter mówi „nieznana komenda” jak dawniej', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press(':');
    await page.keyboard.type('xyz');
    await expect(page.locator('#pall .none')).toHaveText('Brak pasujących poleceń');
    await page.keyboard.press('Enter');
    await expect(pal(page)).toBeHidden();
    await expect(page.locator('#info')).toHaveText('nieznana komenda: xyz');
    await command(page, 'layout xyz');
    await expect(page.locator('#info')).toHaveText('nieznana komenda: layout');
  });
});

test.describe('paleta: ostatnio użyte', () => {
  test('5 ostatnio użytych na górze, najnowsza pierwsza; zostają po ponownym otwarciu aplikacji', async ({ page }) => {
    await loadMap(page, MD);
    for (const q of ['uklad dol', 'uklad prawo', 'rozwin wsz', 'zwin wsz', 'poziomu 2', 'poziomu 3'])
      await run(page, q);
    const top5 = ['Pokaż do poziomu 3', 'Pokaż do poziomu 2', 'Zwiń wszystko', 'Rozwiń wszystko', 'Układ w prawo'];
    await page.keyboard.press('Control+k');
    expect((await names(page)).slice(0, 6)).toEqual([...top5, 'Edytuj']);
    expect(await page.evaluate(() => localStorage.getItem('mm.cmd'))).toBe(
      '["lv3","lv2","foldall","unfoldall","lay-right"]'
    );
    await page.reload();
    await expect(page.locator('#info')).toContainText('round-trip OK');
    await page.keyboard.press('Control+k');
    expect((await names(page)).slice(0, 5)).toEqual(top5);
  });

  test('komenda „:” zapisuje się jako jej czynność', async ({ page }) => {
    await loadMap(page, MD);
    await command(page, 'layout both');
    await page.keyboard.press('Control+k');
    expect((await names(page))[0]).toBe('Układ na obie strony');
  });

  test('strażnik formatu mm.cmd: stały przykład się wczytuje; nieznane i zepsute wpisy nie psują aplikacji', async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.setItem('mm.cmd', '["dup","lay-down","usunieta-czynnosc",7,"dup"]'));
    await page.reload();
    await expect(page.locator('#info')).toContainText('round-trip OK');
    await page.keyboard.press('Control+k');
    expect((await names(page)).slice(0, 3)).toEqual(['Duplikuj gałąź', 'Układ w dół', 'Edytuj']);
    for (const bad of ['{zepsute', '"dup"', 'null']) {
      await page.evaluate(b => localStorage.setItem('mm.cmd', b), bad);
      await page.reload();
      await expect(page.locator('#info'), bad).toContainText('round-trip OK');
      await page.keyboard.press('Control+k');
      expect((await names(page))[0], bad).toBe('Edytuj');
    }
  });
});

test.describe('paleta: menu „…” i telefon', () => {
  test('„…” ma pozycję „Wszystkie polecenia…” (Ctrl+K); w widoku Markdown jest niedostępna', async ({ page }) => {
    await page.click('#bm');
    await expect(act(page, 'pal').locator('span')).toHaveText('Wszystkie polecenia…');
    await expect(act(page, 'pal').locator('kbd')).toHaveText('Ctrl+K');
    await act(page, 'pal').click();
    await expect(pal(page)).toBeVisible();
    await expect(palq(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await page.click('#bt'); // widok Markdown
    await page.click('#bm');
    await expect(act(page, 'pal')).toBeDisabled();
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

    test('paleta mieści się na ekranie, widać 5 pozycji, stuknięcie uruchamia', async ({ page }) => {
      await loadMap(page, MD);
      await page.tap('#bm');
      await act(page, 'pal').tap();
      await expect(pal(page)).toBeVisible();
      const b = await pal(page).boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(390);
      const l = await page.$eval('#pall', e => ({
        ch: e.clientHeight,
        rh: /** @type {HTMLElement} */ (e.querySelector('.pi')).offsetHeight,
      }));
      expect(Math.round(l.ch / l.rh)).toBe(5);
      expect(l.rh).toBeGreaterThanOrEqual(40); // wygodne dla palca
      await palq(page).fill('zwin wsz');
      await row(page, 'foldall').tap();
      await expect(pal(page)).toBeHidden();
      expect(await texts(page)).toContain('- Jeden <!--c-->');
    });
  });
});
