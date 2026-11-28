// Paleta komend (Ctrl+K, „:”) i wspólna tabela czynności ACT: pomoc, menu podręczne, menu „…” i paleta biorą z niej
// nazwy i skróty. Skróty w Firefoksie: keys.spec.js.
const { test, expect } = require('@playwright/test');
const { open, loadMap, MD, texts, selText, act } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

const pal = page => page.locator('#srRes');
const palq = page => page.locator('#sr');
const rows = page => page.locator('#srL .pi');
const row = (page, id) => page.locator(`#srL .pi[data-act="${id}"]`);
const hi = page => page.locator('#srL .pi.hi');
const names = page => page.$$eval('#srL .pi .pt', s => s.map(x => x.textContent));
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
      menus.push(...[...document.querySelectorAll('#side [data-act]')].map(b => b.getAttribute('data-act'))); // układ w panelu
      for (const open of [() => ctxMenu(10, 10), () => moreMenu(10, 10)]) {
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
  test('Ctrl+K: lista pod polem na środku górnego paska, widać co najmniej 5 pozycji, każda z nazwą i skrótami', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    await expect(pal(page)).toBeVisible();
    await expect(palq(page)).toBeFocused();
    await expect(palq(page)).toHaveValue('');
    await expect(page.locator('#mode')).toHaveText('COMMAND');
    const b = await pal(page).boundingBox(),
      box = await page.locator('#srBox').boundingBox();
    expect(Math.abs(b.x + b.width / 2 - 1280 / 2)).toBeLessThan(2);
    expect(Math.abs(b.y - (box.y + box.height))).toBeLessThan(2); // doklejona pod polem
    expect(b.y + b.height).toBeLessThanOrEqual(800); // mieści się na ekranie
    const l = await page.$eval('#srL', e => ({
      ch: e.clientHeight,
      sh: e.scrollHeight,
      rh: /** @type {HTMLElement} */ (e.querySelector('.pi')).offsetHeight,
    }));
    expect(l.ch / l.rh).toBeGreaterThanOrEqual(5);
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
    for (const t of ['Poruszanie', 'Pierwszy węzeł', 'Ostatni węzeł', 'Następne trafienie', 'Wszystkie polecenia…'])
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

  test('filtrowanie: słowa w dowolnej kolejności, od początku słowa na górze, bez polskich znaków i wielkości liter', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    // od 2.3 pasują też litery ze środka słowa („ro-zw-iń”), ale niżej (decyzja 2026-11-26)
    await palq(page).fill('zw wsz');
    expect(await names(page)).toEqual(['Zwiń wszystko', 'Rozwiń wszystko']);
    await palq(page).fill('DÓŁ układ');
    expect(await names(page)).toEqual(['Układ w dół']);
    await palq(page).fill('dol uklad');
    expect(await names(page)).toEqual(['Układ w dół']);
    await palq(page).fill('zwin');
    expect(await names(page)).toEqual(['Zwiń / rozwiń', 'Zwiń wszystko', 'Rozwiń wszystko']);
    await palq(page).fill('poziomu 3');
    expect(await names(page)).toEqual(['Pokaż do poziomu 3']);
    await expect(hi(page).locator('.pt')).toHaveText('Pokaż do poziomu 3');
    // „ozwi” jest w środku słowa „rozwiń” – od 2.3 pasuje
    await palq(page).fill('ozwi');
    expect((await names(page)).sort()).toEqual(['Rozwiń wszystko', 'Zwiń / rozwiń']);
    await palq(page).fill('xyz');
    expect(await names(page)).toEqual([]);
    await expect(page.locator('#srL .none')).toHaveText('Brak pasujących węzłów i poleceń');
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
    const off = await page.$$eval('#srL .pi', rs => rs.map(r => r.classList.contains('off')));
    const first = off.indexOf(true);
    expect(first).toBeGreaterThan(0);
    expect(off.slice(first).every(Boolean)).toBe(true); // po pierwszej szarej już tylko szare
    await page.keyboard.press('ArrowUp'); // z pierwszej na ostatnią dostępną, nie na szarą
    expect(await page.$eval('#srL .pi.hi', r => r.classList.contains('off'))).toBe(false);
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
    await expect.poll(() => page.$eval('#srL', e => e.scrollTop)).toBeGreaterThan(0);
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

test.describe('paleta: dopasowanie przybliżone (2.3)', () => {
  test('litery po kolei, nie muszą stać obok siebie; bez polskich znaków i wielkości liter', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    await palq(page).fill('zwwsz');
    expect(await names(page)).toEqual(['Zwiń wszystko', 'Rozwiń wszystko']);
    await palq(page).fill('ZWWSZ');
    expect(await names(page)).toEqual(['Zwiń wszystko', 'Rozwiń wszystko']);
    await palq(page).fill('dpcm');
    expect(await names(page)).toEqual(['Dopasuj całą mapę']);
    await expect(hi(page).locator('.pt')).toHaveText('Dopasuj całą mapę');
  });

  test('kolejność: początek słowa i litery obok siebie wyżej niż litery rozrzucone', async ({ page }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    await palq(page).fill('dod');
    expect(await names(page)).toEqual([
      'Dodaj brata', // d-o-d od początku nazwy, obok siebie (trzy równe – stała kolejność)
      'Dodaj brata powyżej',
      'Dodaj dziecko',
      'Edytuj od pustego tekstu', // „od” od początku słowa
      'Widok Markdown', // „do” w środku słowa, potem daleko „d”
    ]);
  });

  test('przy równej ocenie wygrywa ostatnio użyta; lepsze dopasowanie wygrywa z ostatnio użytą', async ({ page }) => {
    await loadMap(page, MD);
    await run(page, 'zwin wsz'); // „Zwiń wszystko” – ostatnio użyta
    await page.keyboard.press('Control+k');
    await palq(page).fill('zwin');
    expect(await names(page)).toEqual(['Zwiń wszystko', 'Zwiń / rozwiń', 'Rozwiń wszystko']);
    await page.keyboard.press('Escape');
    await run(page, 'rozwin wsz'); // „Rozwiń wszystko” – najnowsza, ale do „zwin” pasuje gorzej
    await page.keyboard.press('Control+k');
    await palq(page).fill('zwin');
    expect(await names(page)).toEqual(['Zwiń wszystko', 'Zwiń / rozwiń', 'Rozwiń wszystko']);
    await palq(page).fill(''); // puste pole: ostatnio użyte na górze jak dawniej
    expect((await names(page)).slice(0, 2)).toEqual(['Rozwiń wszystko', 'Zwiń wszystko']);
  });

  test('dopasowane litery w kolorze akcentu; wybrana pozycja: tło w kolorze akcentu, litery pogrubione', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await page.keyboard.press('Control+k');
    await palq(page).fill('zwwsz');
    const first = rows(page).nth(0),
      second = rows(page).nth(1);
    await expect(first).toHaveClass(/\bhi\b/);
    await expect(first.locator('.pt')).toHaveText('Zwiń wszystko');
    await expect(first.locator('.pt .m')).toHaveText(['Zw', 'wsz']);
    await expect(second.locator('.pt')).toHaveText('Rozwiń wszystko');
    await expect(second.locator('.pt .m')).toHaveText(['zw', 'wsz']);
    /* kolory z motywu aplikacji, zamienione na postać rgb(…) jak w getComputedStyle */
    const c = await page.evaluate(() => {
      const p = document.createElement('i');
      document.body.append(p);
      const col = v => ((p.style.color = `var(${v})`), getComputedStyle(p).color);
      const r = { acc: col('--acc'), card: col('--card') };
      p.remove();
      return r;
    });
    /** @param {import('@playwright/test').Locator} l */
    const st = l =>
      l.evaluate(e => {
        const s = getComputedStyle(e);
        return { color: s.color, bg: s.backgroundColor, w: s.fontWeight };
      });
    expect(await st(second.locator('.m').first())).toMatchObject({ color: c.acc, w: '400' });
    expect(await st(first)).toMatchObject({ bg: c.acc, color: c.card });
    expect(await st(first.locator('.m').first())).toMatchObject({ color: c.card, w: '700' });
    // tekst użytkownika (komenda „:new”) zawsze jako tekst, nigdy jako HTML
    await palq(page).fill(':new <b>x</b>');
    await expect(hi(page).locator('.pt')).toHaveText('Nowa mapa „<b>x</b>”');
    await expect(hi(page).locator('.pt b')).toHaveCount(0);
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
    await expect(page.locator('#srL .none')).toHaveText('Brak pasujących poleceń');
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

test.describe('paleta: menu ☰ i telefon', () => {
  test('menu ☰ bez „Wszystkie polecenia…” (pole jest w pasku, Ctrl+K zostaje); w widoku Markdown pole się nie otwiera', async ({
    page,
  }) => {
    await page.click('#bm');
    await expect(act(page, 'pal')).toHaveCount(0);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => actOf('pal').k)).toEqual(['Ctrl+K']);
    await page.click('#sr');
    await expect(pal(page)).toBeVisible();
    await expect(palq(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await page.click('#bt'); // widok Markdown
    await page.keyboard.press('Control+k');
    await expect(pal(page)).toBeHidden();
    expect(await page.evaluate(() => actOf('pal').off())).toBe('najpierw wróć do mapy');
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

    test('lupa: pole na cały ekran, widać co najmniej 5 pozycji wygodnych dla palca, stuknięcie uruchamia', async ({
      page,
    }) => {
      await loadMap(page, MD);
      await page.tap('#srBtn');
      await expect(pal(page)).toBeVisible();
      const b = await pal(page).boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(390);
      expect(b.y + b.height).toBeLessThanOrEqual(780);
      const l = await page.$eval('#srL', e => ({
        ch: e.clientHeight,
        rh: /** @type {HTMLElement} */ (e.querySelector('.pi')).offsetHeight,
      }));
      expect(l.ch / l.rh).toBeGreaterThanOrEqual(5);
      expect(l.rh).toBeGreaterThanOrEqual(44); // wygodne dla palca
      await palq(page).fill('zwin wsz');
      await row(page, 'foldall').tap();
      await expect(pal(page)).toBeHidden();
      expect(await texts(page)).toContain('- Jeden <!--c-->');
    });

    test('trafienia od razu pod polem: wiersze z tekstem i ścieżką, stuknięcie idzie do węzła, dalej n', async ({
      page,
    }) => {
      await loadMap(page, '# R\n' + [...Array(8)].map((_, i) => `- grupa ${i}\n  - x${i}\n`).join(''));
      await page.evaluate(() => openFind(true)); // jak Ctrl+F; na telefonie lupa
      await palq(page).fill('x');
      await expect(page.locator('#srL .sh')).toHaveText(['W mapie (8)']);
      await expect(rows(page)).toHaveCount(8);
      await expect(rows(page).nth(2).locator('.ps')).toHaveText('R › grupa 2');
      const b = await pal(page).boundingBox();
      expect(b.x + b.width).toBeLessThanOrEqual(390);
      const l = await page.$eval('#srL', e => ({
        ch: e.clientHeight,
        rh: /** @type {HTMLElement} */ (e.querySelector('.pi')).offsetHeight,
      }));
      expect(l.ch / l.rh).toBeGreaterThanOrEqual(5);
      expect(l.rh).toBeGreaterThanOrEqual(44);
      await rows(page).nth(2).tap();
      await expect(pal(page)).toBeHidden();
      expect(await selText(page)).toBe('x2');
      await expect(page.locator('#info')).toHaveText('trafienie 3 z 8');
      await page.keyboard.press('n');
      expect(await selText(page)).toBe('x3');
    });
  });
});

test.describe('paleta: tryb listy (lista trafień 2.5, „Przenieś do…” 2.7, :lint 4.8)', () => {
  const ITEMS = [
    { id: 11, t: 'Badania · ankiety', sub: 'Projekt' },
    { id: 12, t: 'Strona www', sub: 'Projekt › Marketing' },
    { id: 13, t: 'Budżet', sub: '' },
  ];
  test('ogólne wejście: tytuł, pozycje ze ścieżką, wpisywane litery zawężają listę, Enter wybiera pozycję', async ({
    page,
  }) => {
    await page.evaluate(
      items => openList({ title: 'Przenieś do…', items, pick: it => (window.__pick = it.id), filter: true }),
      ITEMS
    );
    await expect(pal(page)).toBeVisible();
    await expect(page.locator('#srT')).toHaveText('Przenieś do…');
    await expect(palq(page)).toBeFocused();
    await expect(palq(page)).toBeEditable();
    expect(await names(page)).toEqual(['Badania · ankiety', 'Strona www', 'Budżet']);
    await expect(rows(page).nth(1).locator('.ps')).toHaveText('Projekt › Marketing');
    await expect(rows(page).nth(2).locator('.ps')).toHaveCount(0); // bez ścieżki – jedna linia
    await page.keyboard.type('bud');
    expect(await names(page)).toEqual(['Budżet']);
    await expect(rows(page).first().locator('.m')).toHaveText('Bud');
    await palq(page).fill('zzz');
    await expect(page.locator('#srL .none')).toHaveText('Nic nie pasuje');
    await palq(page).fill('ba');
    expect((await names(page))[0]).toBe('Badania · ankiety');
    await page.keyboard.press('Enter');
    await expect(pal(page)).toBeHidden();
    expect(await page.evaluate(() => window.__pick)).toBe(11);
    expect(await page.evaluate(() => localStorage.getItem('mm.cmd'))).toBeNull();
    // potem zwykła paleta poleceń: bez tytułu, z poleceniami
    await page.keyboard.press('Control+k');
    await expect(page.locator('#srT')).toBeHidden();
    await expect(palq(page)).toHaveAttribute('placeholder', 'Szukaj w mapie lub wpisz polecenie…');
    await expect(palq(page)).toBeEditable();
    expect(await names(page)).toContain('Edytuj');
    await page.keyboard.press('Escape');
  });

  test('path: litery pasują także do ścieżki, wyróżnione tylko w tekście', async ({ page }) => {
    await page.evaluate(items => openList({ title: 'Lista', items, pick: () => {}, filter: true, path: true }), ITEMS);
    await page.keyboard.type('mark www');
    expect(await names(page)).toEqual(['Strona www']);
    await expect(rows(page).first().locator('.m')).toHaveText('www');
    await page.keyboard.press('Escape');
  });

  test('bez zawężania: pole tylko do odczytu, litery nie zmieniają listy; Esc zamyka bez wyboru', async ({ page }) => {
    await page.evaluate(
      items => openList({ title: 'Problemy (3)', items, pick: it => (window.__pick = it.id) }),
      ITEMS
    );
    await expect(page.locator('#srT')).toHaveText('Problemy (3)');
    await expect(palq(page)).toBeFocused();
    await page.keyboard.type('bud');
    await expect(rows(page)).toHaveCount(3);
    await page.keyboard.press('ArrowDown');
    await expect(hi(page)).toHaveText(/Strona www/);
    await page.keyboard.press('Escape');
    await expect(pal(page)).toBeHidden();
    expect(await page.evaluate(() => window.__pick)).toBeUndefined();
    expect(await page.evaluate(() => mode)).toBe('NORMAL');
  });
});

test.describe('„Przenieś do…” (2.7)', () => {
  const MAPS =
    '# Praca\n- Projekt\n  - Badania\n    - ankiety\n  - Strona\n- Zakupy <!--c-->\n  - mleko\n# Dom\n- Kuchnia\n';
  const undos = page => page.evaluate(() => undoS.length);
  /** otwórz „Przenieś do…” na węźle `t` wybranym sposobem */
  async function moveList(page, t, how = ['Control+m']) {
    await select(page, t);
    for (const k of how) await page.keyboard.press(k);
    await expect(pal(page)).toBeVisible();
    await expect(page.locator('#srT')).toHaveText('Przenieś do…');
  }

  test('Ctrl+M, m, :m i :move otwierają listę węzłów wszystkich map bez samej gałęzi i jej potomków', async ({
    page,
  }) => {
    await loadMap(page, MAPS);
    for (const how of [['Control+m'], ['m'], [':', 'm', 'Enter'], [':', 'm', 'o', 'v', 'e', 'Enter']]) {
      await moveList(page, 'Projekt', how);
      await expect(palq(page)).toBeFocused();
      await expect(palq(page)).toBeEditable();
      await expect(palq(page)).toHaveValue('');
      expect(await names(page)).toEqual(['Praca', 'Zakupy', 'mleko', 'Dom', 'Kuchnia']);
      await expect(rows(page).nth(2).locator('.ps')).toHaveText('Praca › Zakupy');
      await page.keyboard.press('Escape');
      await expect(pal(page)).toBeHidden();
    }
  });

  test('litery pasują do tekstu węzła i do ścieżki; trafienia w samym tekście są na górze', async ({ page }) => {
    await loadMap(page, MAPS);
    await moveList(page, 'Strona');
    await page.keyboard.type('kuch');
    expect(await names(page)).toEqual(['Kuchnia']);
    await expect(rows(page).first().locator('.m')).toHaveText('Kuch');
    await palq(page).fill('praca'); // „Praca” w tekście na górze, potem węzły z „Praca” w ścieżce
    const n = await names(page);
    expect(n[0]).toBe('Praca');
    expect(n.slice(1).sort()).toEqual(['Badania', 'Projekt', 'Zakupy', 'ankiety', 'mleko']);
    await palq(page).fill('bad'); // „Badania” w tekście przed „ankiety” (Badania tylko w ścieżce)
    expect(await names(page)).toEqual(['Badania', 'ankiety']);
    await palq(page).fill('proj ank'); // słowa z tekstu i ze ścieżki razem
    expect((await names(page))[0]).toBe('ankiety');
    await palq(page).fill('zzz');
    await expect(page.locator('#srL .none')).toHaveText('Nic nie pasuje');
    await page.keyboard.press('Escape');
  });

  test('Enter przenosi jako ostatnie dziecko; zaznaczenie zostaje; zwinięty cel się rozwija; jedno Ctrl+Z cofa', async ({
    page,
  }) => {
    await loadMap(page, MAPS);
    const before = await texts(page),
      u = await undos(page);
    await moveList(page, 'Badania');
    await page.keyboard.type('zakupy');
    await page.keyboard.press('Enter');
    await expect(pal(page)).toBeHidden();
    expect(await texts(page)).toBe(
      '# Praca\n\n- Projekt\n  - Strona\n- Zakupy\n  - mleko\n  - Badania\n    - ankiety\n\n# Dom\n\n- Kuchnia\n'
    );
    expect(await selText(page)).toBe('Badania');
    expect(await page.evaluate(() => vis().some(n => n.text === 'Badania'))).toBe(true);
    await expect(page.locator('#info')).toContainText('przeniesiono do „Zakupy”');
    expect(await undos(page)).toBe(u + 1);
    expect(await page.evaluate(() => mode)).toBe('NORMAL');
    await page.keyboard.press('Control+z');
    expect(await texts(page)).toBe(before);
    expect(await selText(page)).toBe('Badania');
  });

  test('cel w zwiniętej gałęzi: przodkowie rozwijają się, gałąź widać; klik przenosi między mapami', async ({
    page,
  }) => {
    await loadMap(page, MAPS);
    await moveList(page, 'Kuchnia', ['m']);
    await page.keyboard.type('mleko');
    await rows(page).first().click();
    await expect(pal(page)).toBeHidden();
    expect(await texts(page)).toBe(
      '# Praca\n\n- Projekt\n  - Badania\n    - ankiety\n  - Strona\n- Zakupy\n  - mleko\n    - Kuchnia\n\n# Dom\n\n' // pusta mapa zostaje
    );
    expect(await selText(page)).toBe('Kuchnia');
    expect(await page.evaluate(() => vis().some(n => n.text === 'Kuchnia'))).toBe(true);
  });

  test('cała mapa (korzeń) przenosi się do innej mapy; jedynej mapy nie ma dokąd przenieść', async ({ page }) => {
    await loadMap(page, MAPS);
    await moveList(page, 'Dom');
    expect(await names(page)).toEqual(['Praca', 'Projekt', 'Badania', 'ankiety', 'Strona', 'Zakupy', 'mleko']);
    await palq(page).fill('strona');
    await page.keyboard.press('Enter');
    expect(await texts(page)).toBe(
      '# Praca\n\n- Projekt\n  - Badania\n    - ankiety\n  - Strona\n    - Dom\n      - Kuchnia\n- Zakupy <!--c-->\n  - mleko\n'
    );
    expect(await selText(page)).toBe('Dom');
    // została jedna mapa: jej korzenia nie ma dokąd przenieść
    await select(page, 'Praca');
    const before = await texts(page);
    await page.keyboard.press('Control+m');
    await expect(pal(page)).toBeHidden();
    await expect(page.locator('#info')).toHaveText('nie ma dokąd przenieść');
    expect(await texts(page)).toBe(before);
  });

  test('Esc nic nie zmienia', async ({ page }) => {
    await loadMap(page, MAPS);
    const before = await texts(page),
      u = await undos(page);
    await moveList(page, 'Badania');
    await page.keyboard.type('dom');
    await page.keyboard.press('Escape');
    await expect(pal(page)).toBeHidden();
    expect(await texts(page)).toBe(before);
    expect(await undos(page)).toBe(u);
    expect(await selText(page)).toBe('Badania');
    expect(await page.evaluate(() => mode)).toBe('NORMAL');
  });

  test('bez zaznaczenia niedostępne: skrót nic nie otwiera, w palecie i menu szara z powodem', async ({ page }) => {
    await loadMap(page, MAPS);
    await page.evaluate(() => deselect());
    await page.keyboard.press('Control+m');
    await expect(pal(page)).toBeHidden();
    await expect(page.locator('#info')).toHaveText('najpierw zaznacz węzeł');
    await page.keyboard.press('m');
    await expect(pal(page)).toBeHidden();
    await page.keyboard.press('Control+k');
    await expect(row(page, 'moveto')).toHaveClass(/off/);
    await expect(row(page, 'moveto').locator('.why')).toHaveText('najpierw zaznacz węzeł');
    await page.keyboard.press('Escape');
    await page.evaluate(() => ctxMenu(10, 10));
    await expect(act(page, 'moveto')).toBeDisabled();
  });

  test('menu podręczne: „Przenieś do…” ze skrótem Ctrl+M otwiera listę, klik przenosi', async ({ page }) => {
    await loadMap(page, MAPS);
    await select(page, 'ankiety');
    await page.evaluate(() => ctxMenu(10, 10));
    await expect(act(page, 'moveto').locator('span')).toHaveText('Przenieś do…');
    await expect(act(page, 'moveto').locator('kbd')).toHaveText('Ctrl+M');
    await act(page, 'moveto').click();
    await expect(page.locator('#srT')).toHaveText('Przenieś do…');
    await palq(page).fill('dom');
    await rows(page).first().click();
    expect(await texts(page)).toContain('# Dom\n\n- Kuchnia\n- ankiety\n');
    expect(await selText(page)).toBe('ankiety');
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });

    test('menu po przytrzymaniu: „Przenieś do…”, stuknięcie w węzeł na liście przenosi', async ({ page }) => {
      await loadMap(page, MAPS);
      await select(page, 'Strona');
      await page.evaluate(() => ctxMenu(100, 100, true)); // jak po przytrzymaniu węzła (touch.spec.js)
      await page.waitForTimeout(400); // menu dotykowe przez 350 ms nie przyjmuje stuknięć
      await act(page, 'moveto').tap();
      await expect(pal(page)).toBeVisible();
      await palq(page).fill('kuch');
      await rows(page).first().tap();
      await expect(pal(page)).toBeHidden();
      expect(await texts(page)).toContain('# Dom\n\n- Kuchnia\n  - Strona\n');
      expect(await selText(page)).toBe('Strona');
    });
  });
});

test.describe('pole „Szukaj w mapie lub wpisz polecenie…” (3.3 krok 3)', () => {
  const sr = page => page.locator('#sr');
  const res = page => page.locator('#srRes');
  const heads = page => page.$$eval('#srL .sh', s => s.map(x => x.textContent));
  const MAP = '# Mapa\n- Projekt\n  - Zakupy\n    mleko\n- Żółw\n- Układ domu\n';

  test('zamknięte pole na środku górnego paska; pasek stanu nie przyjmuje tekstu; w menu ☰ bez „Wszystkie polecenia…”', async ({
    page,
  }) => {
    await expect(sr(page)).toBeVisible();
    await expect(sr(page)).toHaveAttribute('placeholder', 'Szukaj w mapie lub wpisz polecenie…');
    await expect(sr(page)).toHaveValue('');
    await expect(res(page)).toBeHidden();
    const b = await page.locator('#srBox').boundingBox(),
      l = await page.locator('#tl').boundingBox(),
      r = await page.locator('#tr').boundingBox();
    expect(Math.abs(b.x + b.width / 2 - 640)).toBeLessThan(2);
    expect(b.x).toBeGreaterThan(l.x + l.width);
    expect(b.x + b.width).toBeLessThan(r.x);
    expect(Math.abs(b.y + b.height / 2 - (l.y + l.height / 2))).toBeLessThan(2); // w jednej linii z wyspami
    await expect(page.locator('#st input, #st textarea, #st button')).toHaveCount(0);
    await page.click('#bm');
    await expect(act(page, 'pal')).toHaveCount(0);
    await expect(act(page, 'help')).toBeVisible();
  });

  test('Ctrl+K i klik w pole: puste – „Ostatnio użyte”, po wpisaniu „W mapie (N)” i „Czynności (N)”', async ({
    page,
  }) => {
    await loadMap(page, MAP);
    await run(page, 'zwin wsz');
    await run(page, 'rozwin wsz');
    for (const how of ['Ctrl+K', 'klik']) {
      if (how === 'klik') await sr(page).click();
      else await page.keyboard.press('Control+k');
      await expect(res(page), how).toBeVisible();
      await expect(sr(page)).toBeFocused();
      await expect(page.locator('#mode')).toHaveText('COMMAND');
      const h = await heads(page);
      expect(h[0], how).toBe('Ostatnio użyte');
      expect(h[1]).toMatch(/^Czynności \(\d+\)$/);
      expect((await names(page)).slice(0, 2)).toEqual(['Rozwiń wszystko', 'Zwiń wszystko']);
      // ostatnio użyte nie powtarzają się w czynnościach
      expect((await names(page)).filter(t => t === 'Zwiń wszystko')).toHaveLength(1);
      await page.keyboard.type('uklad');
      expect(await heads(page)).toEqual(['W mapie (1)', 'Czynności (4)']);
      // węzły jak na liście trafień: bez polskich znaków, ze ścieżką; potem czynności ze skrótami
      await expect(rows(page).first().locator('.pt')).toHaveText('Układ domu');
      await expect(rows(page).first().locator('.pt .m')).toHaveText('Układ');
      await expect(rows(page).first().locator('.ps')).toHaveText('Mapa');
      await expect(rows(page).first()).toHaveClass(/\bhi\b/);
      await expect(row(page, 'lay-down').locator('kbd')).toHaveText([':layout down']);
      await page.keyboard.press('Escape'); // Esc zamyka wszystko
      await expect(res(page)).toBeHidden();
      await expect(sr(page)).toHaveValue('');
      await expect(sr(page)).not.toBeFocused();
      await expect(page.locator('#mode')).toHaveText('NORMAL');
    }
  });

  test('Ctrl+K: Enter na węźle idzie do niego (dalej n / N), na czynności ją uruchamia', async ({ page }) => {
    await loadMap(page, MAP);
    await page.keyboard.press('Control+k');
    await page.keyboard.type('zo');
    expect((await heads(page))[0]).toBe('W mapie (1)');
    await page.keyboard.press('Enter');
    await expect(res(page)).toBeHidden();
    expect(await selText(page)).toBe('Żółw');
    await expect(page.locator('#info')).toHaveText('trafienie 1 z 1');
    expect(await page.evaluate(() => localStorage.getItem('mm.cmd'))).toBeNull(); // węzeł nie trafia do ostatnio użytych
    await page.keyboard.press('Control+k');
    await page.keyboard.type('mleko');
    expect((await heads(page))[0]).toBe('W mapie (1)');
    await expect(rows(page).first().locator('.pt')).toHaveText('Zakupy · mleko');
    await expect(rows(page).first().locator('.ps')).toHaveText('Mapa › Projekt');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await page.keyboard.type('zwin wsz');
    expect(await heads(page)).toEqual(['Czynności (2)']);
    await page.keyboard.press('Enter');
    await expect(res(page)).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('mm.cmd'))).toBe('["foldall"]');
  });

  test('„/” i Ctrl+F: to samo pole tylko z węzłami; „:” – tylko polecenia', async ({ page }) => {
    await loadMap(page, MAP);
    for (const k of ['/', 'Control+f']) {
      await page.keyboard.press(k);
      await expect(res(page), k).toBeVisible();
      await expect(sr(page)).toBeFocused();
      await expect(sr(page)).toHaveValue('');
      await expect(sr(page)).toHaveAttribute('placeholder', 'Szukaj w mapie…');
      await expect(page.locator('#mode')).toHaveText('SEARCH');
      await page.keyboard.type('uklad');
      expect(await heads(page), k).toEqual(['W mapie (1)']);
      expect(await names(page)).toEqual(['Układ domu']);
      await page.keyboard.press('Escape');
      await expect(res(page)).toBeHidden();
    }
    await page.keyboard.press(':');
    await expect(sr(page)).toHaveValue(':');
    await page.keyboard.type('uklad');
    expect(await heads(page)).toEqual([]);
    expect(await names(page)).not.toContain('Układ domu');
    expect(await names(page)).toContain('Układ w dół');
    await page.keyboard.press('Escape');
  });

  test('srAvail(false) chowa pole (miejsce na pasek widoku .md, krok 5) i zamyka otwarte; srAvail(true) przywraca', async ({
    page,
  }) => {
    await page.keyboard.press('Control+k');
    await page.evaluate(() => srAvail(false));
    await expect(sr(page)).toBeHidden();
    await expect(res(page)).toBeHidden();
    await expect(page.locator('#mode')).toHaveText('NORMAL');
    await page.evaluate(() => srAvail(true));
    await expect(sr(page)).toBeVisible();
  });

  test('Ctrl+S w polu zapisuje i nie trafia do przeglądarki', async ({ page }) => {
    await page.evaluate(() => {
      window.__saved = 0;
      window.save = () => window.__saved++;
      window.__prev = [];
      document.addEventListener(
        'keydown',
        e => setTimeout(() => window.__prev.push(`${e.ctrlKey ? 'Ctrl+' : ''}${e.key}:${e.defaultPrevented}`)),
        true
      );
    });
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(50);
    expect(await page.evaluate(() => window.__saved)).toBe(1);
    expect(await page.evaluate(() => window.__prev.filter(s => s.startsWith('Ctrl+s')))).toEqual(['Ctrl+s:true']);
  });

  test('średnie okno (760–1180 px): pole od lewej za lewą wyspą, nie nachodzi na przełącznik widoków (same ikony)', async ({
    page,
  }) => {
    await expect(page.locator('#views .vl').first()).toBeVisible(); // 1280 px: z podpisami
    for (const w of [760, 1000, 1180]) {
      await page.setViewportSize({ width: w, height: 700 });
      const b = await page.locator('#srBox').boundingBox(),
        l = await page.locator('#tl').boundingBox(),
        r = await page.locator('#tr').boundingBox();
      expect(b.x, `${w}`).toBeGreaterThan(l.x + l.width);
      expect(b.x - (l.x + l.width), `${w}`).toBeLessThan(16);
      expect(b.x + b.width, `${w}`).toBeLessThan(r.x);
      expect(b.width, `${w}`).toBeGreaterThan(250);
      await expect(page.locator('#views .vl').first()).toBeHidden();
      await page.keyboard.press('Control+k');
      const o = await res(page).boundingBox();
      expect(o.x + o.width, `${w}`).toBeLessThanOrEqual(w);
      await page.keyboard.press('Escape');
    }
  });

  test.describe('telefon', () => {
    test.use({ viewport: { width: 375, height: 760 }, hasTouch: true, isMobile: true });

    test('lupa w prawej wyspie przed „Aa”; pole na cały ekran, „Wróć” zamyka', async ({ page }) => {
      await loadMap(page, MAP);
      await expect(sr(page)).toBeHidden();
      const btn = page.locator('#srBtn');
      await expect(btn).toBeVisible();
      expect(await page.$eval('#srBtn', b => b.nextElementSibling && b.nextElementSibling.id)).toBe('bp');
      const l = await page.locator('#tl').boundingBox(),
        r = await page.locator('#tr').boundingBox();
      expect(l.x + l.width).toBeLessThan(r.x);
      expect(r.x + r.width).toBeLessThanOrEqual(375);
      await btn.tap();
      await expect(sr(page)).toBeVisible();
      await expect(sr(page)).toBeFocused();
      const w = await page.locator('#srW').boundingBox();
      expect(w).toEqual({ x: 0, y: 0, width: 375, height: 760 });
      await sr(page).fill('mleko');
      await expect(rows(page)).toHaveCount(1);
      expect(await page.$eval('#srL .pi', e => e.offsetHeight)).toBeGreaterThanOrEqual(44);
      await page.locator('#srBack').tap();
      await expect(sr(page)).toBeHidden();
      await expect(page.locator('#mode')).toHaveText('NORMAL');
      await btn.tap();
      await sr(page).fill('mleko');
      await rows(page).first().tap();
      await expect(sr(page)).toBeHidden();
      expect(await selText(page)).toBe('Zakupy\nmleko');
    });
  });
});
