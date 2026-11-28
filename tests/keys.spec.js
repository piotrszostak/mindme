// Skróty klawiszowe w trybie mapy – uruchamiane w Chromium i w Firefoksie (z „Szukaj tekstu podczas pisania”).
// Każda czynność ma skrót standardowy i vim (czasem też drugi zwykły albo ukryty alias); wszystkie muszą dawać ten sam wynik.
// Usunięte skróty nie mogą nic robić.
const { test, expect } = require('@playwright/test');
const { open, loadMap } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));
const MD = '# R\n- a\n  - a1\n  - a2\n  - a3\n- b\n- c\n- d\n';
const md = page => page.evaluate(() => serialize(root));
const selText = page => page.evaluate(() => S().n.text);
const select = (page, t) =>
  page.evaluate(t => {
    sel = vis().find(n => n.text === t).id;
    render();
  }, t);
async function keys(page, list) {
  for (const k of list) await page.keyboard.press(k);
}

/** [opis, zaznacz, skrót standardowy, skrót vim, sprawdzenie, inne skróty tej czynności (drugi zwykły albo ukryty alias)] */
const PAIRS = [
  ['dziecko w dół', 'a', ['ArrowRight'], ['l'], async p => expect(await selText(p)).toBe('a1')],
  ['brat niżej', 'a1', ['ArrowDown'], ['j'], async p => expect(await selText(p)).toBe('a2')],
  ['brat wyżej', 'a2', ['ArrowUp'], ['k'], async p => expect(await selText(p)).toBe('a1')],
  ['rodzic', 'a2', ['ArrowLeft'], ['h'], async p => expect(await selText(p)).toBe('a')],
  ['pierwszy węzeł', 'c', ['Home'], ['g', 'g'], async p => expect(await selText(p)).toBe('R')],
  ['ostatni węzeł', 'a', ['End'], ['G'], async p => expect(await selText(p)).toBe('d')],
  [
    'edytuj',
    'b',
    ['Space'],
    ['i'],
    async p => {
      await expect(p.locator('#ed')).toBeFocused();
      await expect(p.locator('#ed')).toHaveValue('b'); // spacja nie trafia do tekstu
      await p.keyboard.press('Escape');
    },
    [['e'], ['F2']], // F2 – ukryty alias
  ],
  [
    'brat poniżej',
    'b',
    ['Enter'],
    ['o'],
    async p => {
      await p.keyboard.type('NOWY');
      await p.keyboard.press('Escape');
      expect(await md(p)).toContain('- b\n- NOWY\n- c\n');
    },
    [['s']],
  ],
  [
    'brat powyżej',
    'b',
    ['Shift+Enter'],
    ['O'],
    async p => {
      await p.keyboard.type('NOWY');
      await p.keyboard.press('Escape');
      expect(await md(p)).toContain('- NOWY\n- b\n');
    },
    [['S']],
  ],
  [
    'dziecko',
    'b',
    ['Tab'],
    ['a'],
    async p => {
      await p.keyboard.type('NOWY');
      await p.keyboard.press('Escape');
      expect(await md(p)).toContain('- b\n  - NOWY\n');
    },
  ],
  [
    'kopiuj + wklej (dziecko)',
    'a2',
    ['Control+c', 'ArrowLeft', 'ArrowDown', 'Control+v'],
    ['y', 'y', 'h', 'j', 'p'],
    async p => expect(await md(p)).toContain('- b\n  - a2\n- c\n'),
  ],
  [
    'wklej jako brata',
    'c',
    ['Control+c', 'Control+Shift+V'],
    ['y', 'y', 'P'],
    async p => expect(await md(p)).toContain('- c\n- c\n- d\n'),
  ],
  [
    'wytnij + wklej',
    'a1',
    ['Control+x', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'Control+v'],
    ['d', 'd', 'h', 'j', 'j', 'p'],
    async p => expect(await md(p)).toBe('# R\n\n- a\n  - a2\n  - a3\n- b\n- c\n  - a1\n- d\n'),
  ],
  [
    'usuń (bez kopiowania)',
    'c',
    ['Control+c', 'ArrowDown', 'Delete', 'Control+v'],
    ['y', 'y', 'j', 'x', 'p'],
    async p => expect(await md(p)).toBe('# R\n\n- a\n  - a1\n  - a2\n  - a3\n- b\n- c\n  - c\n'),
    [['Control+c', 'ArrowDown', 'Backspace', 'Control+v']], // Mac nie ma klawisza Delete
  ], // „d” usunięte, w schowku dalej „c”
  ['zwiń / rozwiń', 'a', ['Shift+Space'], ['z', 'a'], async p => expect(await md(p)).toContain('- a <!--c-->')],
  ['przesuń w dół', 'a1', ['Alt+ArrowDown'], ['J'], async p => expect(await md(p)).toContain('  - a2\n  - a1\n')],
  ['przesuń w górę', 'a2', ['Alt+ArrowUp'], ['K'], async p => expect(await md(p)).toContain('  - a2\n  - a1\n')],
  ['wsuń', 'a2', ['Alt+ArrowRight'], ['L'], async p => expect(await md(p)).toContain('  - a1\n    - a2\n')],
  [
    'wysuń',
    'a2',
    ['Shift+Tab'],
    ['H'],
    async p => expect(await md(p)).toContain('  - a3\n- a2\n- b\n'),
    [['Alt+ArrowLeft']],
  ],
  [
    'przenieś do (2.7; Ctrl+M w Firefoksie to wyciszanie karty – przejmujemy je)',
    'a3',
    ['Control+m'],
    ['m'],
    async p => {
      await expect(p.locator('#srT')).toHaveText('Przenieś do…');
      await p.keyboard.type('c');
      await p.keyboard.press('Enter');
      expect(await md(p)).toBe('# R\n\n- a\n  - a1\n  - a2\n- b\n- c\n  - a3\n- d\n');
      expect(await selText(p)).toBe('a3');
    },
    [[':', 'm', 'Enter']], // komenda „:m”
  ],
  ['cofnij', 'b', ['Delete', 'Control+z'], ['x', 'u'], async p => expect(await md(p)).toBe(MD.replace('\n', '\n\n'))],
  [
    'ponów',
    'b',
    ['Delete', 'Control+z', 'Control+Shift+Z'],
    ['x', 'u', 'Control+r'],
    async p => expect(await md(p)).not.toContain('- b\n'),
    [['Delete', 'Control+z', 'Control+y']], // drugi zwykły skrót, widoczny w pomocy
  ],
  [
    'szukaj',
    'R',
    ['Control+f'],
    ['/'],
    async p => {
      await expect(p.locator('#sr')).toBeFocused();
      await expect(p.locator('#mode')).toHaveText('SEARCH'); // pole w górnym pasku tylko z węzłami
      await p.keyboard.press('Escape');
    },
  ],
  [
    'paleta komend',
    'R',
    ['Control+k'],
    [':'],
    async p => {
      await expect(p.locator('#srRes')).toBeVisible();
      await expect(p.locator('#sr')).toBeFocused();
      await p.keyboard.press('Escape');
      await expect(p.locator('#srRes')).toBeHidden();
    },
  ],
  [
    'pomoc',
    'R',
    ['Control+/'],
    ['?'],
    async p => {
      await expect(p.locator('#help')).toBeVisible();
      await p.keyboard.press('Escape');
    },
    [['F1']], // ukryty alias
  ],
];

for (const [name, start, std, vim, check, more = []] of PAIRS) {
  const also = more.length ? ` (też ${more.map(c => c.join(' ')).join(', ')})` : '';
  test(`skrót: ${name} — ${std.join(' ')} | ${vim.join(' ')}${also}`, async ({ page }) => {
    for (const combo of [std, vim, ...more]) {
      await loadMap(page, MD);
      await select(page, start);
      await keys(page, combo);
      await check(page);
    }
  });
}

// Testy szukania (/, Ctrl+F, n / N) są w search.spec.js.

// decyzja 2026-11-27: dymek po „g” nie może mówić „pierwszy / ostatni”, skoro gg to tylko pierwszy węzeł
test('pierwszy i ostatni węzeł to dwie czynności: Home | gg i End | G (pomoc)', async ({ page }) => {
  const rows = await page.evaluate(() => HELP['Klawiatura (zwykły | vim)']);
  expect(rows).toContainEqual(['Home|gg', 'pierwszy węzeł']);
  expect(rows).toContainEqual(['End|G', 'ostatni węzeł']);
  expect(rows.map(r => r[1])).not.toContain('pierwszy / ostatni węzeł');
});

test('edytuj od pustego tekstu: c (vim); pusty tekst przywraca poprzedni', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await keys(page, ['c']);
  await expect(page.locator('#ed')).toBeFocused();
  await expect(page.locator('#ed')).toHaveValue('');
  await page.keyboard.type('NOWY');
  await keys(page, ['Enter']);
  expect(await md(page)).toContain('- NOWY\n- c\n');
  await keys(page, ['c', 'Escape']);
  expect(await md(page)).toContain('- NOWY\n- c\n');
  await keys(page, ['Control+z']);
  expect(await md(page)).toContain('- b\n- c\n');
});

test('duplikuj gałąź: Ctrl+D wstawia kopię za oryginałem i ją zaznacza; Ctrl+Z cofa', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'a');
  await keys(page, ['Control+d']);
  expect(await md(page)).toBe('# R\n\n- a\n  - a1\n  - a2\n  - a3\n- a\n  - a1\n  - a2\n  - a3\n- b\n- c\n- d\n');
  await keys(page, ['j']); // zaznaczona jest kopia: następny brat to „b”
  expect(await selText(page)).toBe('b');
  await keys(page, ['Control+z']);
  expect(await md(page)).toBe(MD.replace('\n', '\n\n'));
  await select(page, 'R');
  await keys(page, ['Control+d']); // kopia korzenia = druga mapa
  expect(await md(page)).toBe(MD.replace('\n', '\n\n') + '\n' + MD.replace('\n', '\n\n'));
});

test('pokaż do poziomu N: z1–z9 (głębsze zwinięte, cyfra po z to nie licznik)', async ({ page }) => {
  await loadMap(page, '# R\n- a\n  - a1\n    - a11\n- b\n  - b1\n- c\n- d\n');
  await select(page, 'a11');
  await keys(page, ['z', '1']);
  expect(await md(page)).toBe('# R\n\n- a <!--c-->\n  - a1 <!--c-->\n    - a11\n- b <!--c-->\n  - b1\n- c\n- d\n');
  expect(await selText(page)).toBe('a'); // zaznaczenie przechodzi na widocznego przodka
  await keys(page, ['z', '2']);
  expect(await md(page)).toBe('# R\n\n- a\n  - a1 <!--c-->\n    - a11\n- b\n  - b1\n- c\n- d\n');
  await keys(page, ['j']); // bez licznika: o jeden w dół
  expect(await selText(page)).toBe('b');
  await keys(page, ['z', '9']);
  expect(await md(page)).toBe('# R\n\n- a\n  - a1\n    - a11\n- b\n  - b1\n- c\n- d\n');
  await keys(page, ['Control+z']);
  expect(await md(page)).toBe('# R\n\n- a\n  - a1 <!--c-->\n    - a11\n- b\n  - b1\n- c\n- d\n');
});

test('dopasuj całą mapę: Shift+1 | =', async ({ page }) => {
  const allInView = () =>
    page.evaluate(() => {
      const v = $('sv').getBoundingClientRect();
      return vis().every(n => {
        const r = document.querySelector(`#g .n[data-id="${n.id}"] rect`).getBoundingClientRect();
        return r.left >= v.left && r.right <= v.right && r.top >= v.top && r.bottom <= v.bottom;
      });
    });
  for (const combo of [['Shift+1'], ['=']]) {
    await loadMap(page, MD);
    await page.evaluate(() => {
      k = 3;
      tx = ty = -2000; // mapa poza ekranem
      apply();
    });
    expect(await allInView()).toBe(false);
    await keys(page, combo);
    expect(await allInView(), combo.join(' ')).toBe(true);
  }
});

test('pokaż zaznaczony węzeł: Shift+2 (środek i przybliżenie do 100%) | zz (tylko środek)', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'd');
  const view = z =>
    page.evaluate(z => {
      k = z;
      tx = ty = 0;
      apply();
    }, z);
  /** odległość środka węzła od środka widocznej części mapy (pod wyspami górnego paska) [px] i powiększenie */
  const where = () =>
    page.evaluate(() => {
      const r = document.querySelector(`#g .n[data-id="${sel}"] rect`).getBoundingClientRect(),
        v = $('sv').getBoundingClientRect();
      const top = $('tl').getBoundingClientRect().bottom - v.y;
      return { dx: r.x + r.width / 2 - v.x - v.width / 2, dy: r.y + r.height / 2 - v.y - (top + v.height) / 2, k };
    });
  for (const [z, combo, zoom] of [
    [0.5, ['z', 'z'], 0.5],
    [0.5, ['Shift+2'], 1],
    [1.4, ['Shift+2'], 1.4], // bardziej przybliżonego widoku nie oddala
  ]) {
    await view(z);
    await keys(page, combo);
    const w = await where();
    expect(Math.abs(w.dx), combo.join(' ')).toBeLessThan(1.5);
    expect(Math.abs(w.dy), combo.join(' ')).toBeLessThan(1.5);
    expect(w.k, combo.join(' ')).toBe(zoom);
  }
});

test('pozostałe: licznik 2j, 0 / $, zR / zM, Ctrl+. (emoji), klawisz Menu (też Shift+F10), :', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'a1');
  await keys(page, ['2', 'j']);
  expect(await selText(page)).toBe('a3');
  await keys(page, ['0']);
  expect(await selText(page)).toBe('a1');
  await keys(page, ['$']);
  expect(await selText(page)).toBe('a3');
  await keys(page, ['z', 'M']);
  expect(await md(page)).toContain('- a <!--c-->');
  await keys(page, ['z', 'R']);
  expect(await md(page)).not.toContain('<!--c-->');
  await keys(page, ['Control+.']);
  await expect(page.locator('#emo')).toBeVisible();
  await keys(page, ['Escape']);
  for (const k of ['ContextMenu', 'Shift+F10']) {
    await keys(page, [k]);
    await expect(page.locator('#menu'), k).toBeVisible();
    await keys(page, ['Escape']);
  }
  await keys(page, [':']); // paleta z wpisanym dwukropkiem
  await expect(page.locator('#sr')).toHaveValue(':');
  await keys(page, ['Escape']);
  await keys(page, ['Control+k']); // paleta od pustego pola
  await expect(page.locator('#sr')).toHaveValue('');
  await keys(page, ['Escape']);
});

test('Caps Lock: litery jak bez niego, o wielkości decyduje Shift (j porusza, J przesuwa)', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'a1');
  // Playwright nie włącza Caps Locka – zdarzenie z modifierCapsLock, takie jak wysyła przeglądarka
  const press = (key, shiftKey) =>
    page.evaluate(
      ([key, shiftKey]) => {
        const t = document.activeElement || document.body;
        for (const type of ['keydown', 'keyup'])
          t.dispatchEvent(
            new KeyboardEvent(type, { key, shiftKey, modifierCapsLock: true, bubbles: true, cancelable: true })
          );
      },
      [key, shiftKey]
    );
  await press('J', false); // Caps Lock bez Shift: przeglądarka podaje „J”
  expect(await selText(page)).toBe('a2');
  expect(await md(page)).toBe(MD.replace('\n', '\n\n')); // nic nie przesunięte
  await press('j', true); // Caps Lock + Shift: przeglądarka podaje „j”
  expect(await md(page)).toContain('  - a1\n  - a3\n  - a2\n');
});

test('Ctrl+Alt+litera (AltGr: ą ć ę ł ń ó ś ź ż) nic nie robi', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await page.evaluate(() => {
    window.__saved = 0;
    window.save = () => window.__saved++;
  });
  await keys(page, ['Delete']);
  const before = await md(page);
  await keys(page, ['Control+Alt+z', 'Control+Alt+s', 'Control+Alt+c', 'Control+Alt+v', 'Control+Alt+x']);
  expect(await md(page)).toBe(before);
  expect(await page.evaluate(() => window.__saved)).toBe(0);
});

test('ukryte aliasy (F1, F2, F3, F10) nie są pokazywane w pomocy, menu, palecie ani podpowiedziach; Ctrl+Y jest w pomocy', async ({
  page,
}) => {
  await loadMap(page, MD);
  await select(page, 'a');
  const shown = await page.evaluate(() => {
    const t = [JSON.stringify(HELP)];
    for (const e of document.querySelectorAll('[data-tip],[title]'))
      t.push((e.getAttribute('data-tip') || '') + ' ' + (e.getAttribute('title') || ''));
    for (const open of [() => ctxMenu(10, 10), () => moreMenu(10, 10)]) {
      open();
      t.push($('menu').textContent || '');
      for (const e of $('menu').querySelectorAll('[title]')) t.push(e.getAttribute('title') || '');
      closeMenu();
    }
    openPal();
    t.push($('srL').textContent || '');
    closePal();
    return t.join('\n');
  });
  expect(shown).not.toMatch(/\bF(1|2|3|10)\b/);
  expect(await page.evaluate(() => JSON.stringify(HELP))).toContain('Ctrl+Shift+Z|Ctrl+Y|Ctrl+R'); // drugi zwykły skrót „Ponów” (A.3)
});

test('usunięte skróty nic nie robią: Insert, zo, zc, Alt+h/j/k/l', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'a2');
  const before = await md(page);
  await keys(page, ['Insert', 'z', 'c', 'z', 'o', 'Alt+h', 'Alt+j', 'Alt+k', 'Alt+l']);
  expect(await md(page)).toBe(before);
  await expect(page.locator('#ed')).toBeHidden();
  expect(await selText(page)).toBe('a2');
});

test('klawisze w trybie mapy nie trafiają do przeglądarki (defaultPrevented)', async ({ page }) => {
  await loadMap(page, MD);
  await page.evaluate(() => {
    window.__leak = [];
    window.addEventListener('keydown', e => {
      if (!e.defaultPrevented && !['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) window.__leak.push(e.key);
    });
  });
  await keys(page, [
    'l',
    'g',
    'g',
    'j',
    'k',
    '3',
    'j',
    'z',
    'a',
    'z',
    'a',
    'y',
    'y',
    'q',
    'w',
    ';',
    "'",
    'z',
    'z',
    'z',
    '3',
    'Shift+1',
    'Shift+2',
    'Control+g',
    'Control+Shift+G',
    'Control+d',
    'Control+Alt+s',
    'Control+/',
    'F3',
    'F1',
    'Escape',
    'j',
    'Control+m', // Firefox: wycisz kartę („Przenieś do…” otwiera listę)
    'Escape',
    'Control+k', // przeglądarka: pole wyszukiwania
    'Escape',
    'Control+f',
    'Control+r',
  ]);
  expect(await page.evaluate(() => window.__leak)).toEqual([]);
});

test('paleta: pisanie zawęża listę, strzałki wybierają, Enter uruchamia; „:w” zapisuje', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await page.evaluate(() => {
    window.__saved = 0;
    window.save = () => window.__saved++;
  });
  await keys(page, ['Control+k']);
  await page.keyboard.type('przesuń');
  await expect(page.locator('#srL .pi.hi .pt')).toHaveText('Przesuń w górę');
  await keys(page, ['ArrowDown', 'Enter']);
  await expect(page.locator('#srRes')).toBeHidden();
  expect(await md(page)).toContain('- c\n- b\n- d\n');
  await keys(page, [':', 'w', 'Enter']);
  expect(await page.evaluate(() => window.__saved)).toBe(1);
  await keys(page, ['j']); // po zamknięciu palety skróty mapy znowu działają
  expect(await selText(page)).toBe('d');
});

test('w polu edycji skróty mapy nie działają (pisze się tekst)', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await keys(page, ['F2', 'End']);
  await page.keyboard.type(' ggddxyy/?');
  await keys(page, ['Shift+Tab', 'Enter']);
  expect(await md(page)).toContain('- b ggddxyy/?\n- c\n');
});

test.describe('dymek podpowiedzi klawiszy (2.6)', () => {
  const WAIT = 450; // dymek po ok. 400 ms bez kolejnego klawisza
  const wk = page => page.locator('#wk');
  /** wiersze dymka: [klawisze, nazwa] */
  const rows = page =>
    page.evaluate(() => {
      const n = [...$('wk').querySelectorAll('span')].map(e => e.textContent);
      return [...$('wk').querySelectorAll('kbd')].map((e, i) => [e.textContent, n[i]]);
    });
  const Z = [
    ['a', 'Zwiń / rozwiń'],
    ['z', 'Pokaż zaznaczony węzeł'],
    ['R', 'Rozwiń wszystko'],
    ['M', 'Zwiń wszystko'],
    ['1–9', 'Pokaż do poziomu N'],
  ];
  const COUNT = [
    ['h j k l', 'Poruszanie'],
    ['K', 'Przesuń w górę'],
    ['J', 'Przesuń w dół'],
    ['L', 'Wsuń poziom'],
    ['H', 'Wysuń poziom'],
    ['u', 'Cofnij'],
  ];

  test('po z i chwili: kontynuacje z ACT, w lewym dolnym rogu nad paskiem stanu, bez fokusu; klawisz zamyka i działa', async ({
    page,
  }) => {
    await loadMap(page, MD);
    await select(page, 'a');
    await keys(page, ['z']);
    await expect(wk(page)).toBeHidden(); // nie od razu
    await page.waitForTimeout(WAIT);
    await expect(wk(page)).toBeVisible();
    expect(await rows(page)).toEqual(Z);
    const b = await wk(page).boundingBox(),
      st = await page.locator('#st').boundingBox(),
      main = await page.locator('#main').boundingBox();
    expect(b.y + b.height).toBeLessThanOrEqual(st.y); // nie zasłania paska stanu
    expect(b.y).toBeGreaterThanOrEqual(main.y); // nad mapą
    expect(b.x).toBeLessThan(30); // lewy róg
    expect(await page.evaluate(() => !!document.activeElement?.closest('#wk'))).toBe(false);
    await keys(page, ['a']);
    await expect(wk(page)).toBeHidden();
    expect(await md(page)).toContain('- a <!--c-->');
  });

  test('g, y, d: po jednej pozycji (gg, yy, dd)', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'b');
    const before = await md(page);
    for (const [k, t] of [
      ['g', 'Pierwszy węzeł'],
      ['y', 'Kopiuj gałąź'],
      ['d', 'Wytnij gałąź'],
    ]) {
      await keys(page, [k]);
      await page.waitForTimeout(WAIT);
      await expect(wk(page), k).toBeVisible();
      expect(await rows(page), k).toEqual([[k, t]]);
      await keys(page, ['Escape']);
      await expect(wk(page), k).toBeHidden();
    }
    expect(await md(page)).toBe(before);
  });

  test('sekwencja wpisana szybko nie pokazuje dymka (za zwija)', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'a');
    await keys(page, ['z', 'a']);
    await page.waitForTimeout(WAIT + 100);
    await expect(wk(page)).toBeHidden();
    expect(await md(page)).toContain('- a <!--c-->');
    await keys(page, ['z', 'Shift+R']); // jak z klawiatury: najpierw sam Shift – prefiks czeka dalej
    expect(await md(page)).not.toContain('<!--c-->');
  });

  test('Esc zamyka dymek i nic nie robi (prefiks i licznik)', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'a');
    const before = await md(page);
    for (const k of ['z', '3']) {
      await keys(page, [k]);
      await page.waitForTimeout(WAIT);
      await expect(wk(page), k).toBeVisible();
      await keys(page, ['Escape']);
      await expect(wk(page), k).toBeHidden();
      expect(await md(page), k).toBe(before);
      expect(await selText(page), k).toBe('a'); // Esc nie odznaczył
    }
    await keys(page, ['a']); // prefiks skasowany: „a” dodaje dziecko, nie zwija
    await expect(page.locator('#ed')).toBeFocused();
    await keys(page, ['Escape']);
    await select(page, 'a');
    await keys(page, ['j']); // licznik skasowany: jeden krok
    expect(await selText(page)).toBe('b');
  });

  test('po liczniku: czynności, które go przyjmują; 3z działa jak z; Shift nie kasuje licznika', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'a');
    await keys(page, ['1', '2']);
    await page.waitForTimeout(WAIT);
    await expect(wk(page)).toBeVisible();
    expect(await rows(page)).toEqual(COUNT);
    await keys(page, ['Escape']);
    await keys(page, ['3']);
    await page.waitForTimeout(WAIT);
    await expect(wk(page)).toBeVisible();
    await keys(page, ['j']);
    await expect(wk(page)).toBeHidden();
    expect(await selText(page)).toBe('d');
    await keys(page, ['3', 'z']);
    await page.waitForTimeout(WAIT);
    await expect(wk(page)).toBeVisible();
    expect(await rows(page)).toEqual(Z);
    await keys(page, ['Escape']);
    await select(page, 'a');
    await keys(page, ['2']);
    await page.waitForTimeout(WAIT);
    await keys(page, ['Shift+J']); // Shift naciśnięty przed J nie kasuje licznika
    await expect(wk(page)).toBeHidden();
    expect(await md(page)).toContain('- b\n- c\n- a\n');
  });

  test('dymek i paleta nigdy naraz; z, potem : kasuje prefiks; klik w mapę zamyka', async ({ page }) => {
    await loadMap(page, MD);
    await select(page, 'a');
    await keys(page, ['z']);
    await page.waitForTimeout(WAIT);
    await expect(wk(page)).toBeVisible();
    await keys(page, ['Control+k']);
    await expect(page.locator('#srRes')).toBeVisible();
    await expect(wk(page)).toBeHidden();
    await keys(page, ['Escape', 'Escape']); // zamknij paletę; drugi Esc kasuje prefiks (jak dziś zostaje po Ctrl+K)
    await keys(page, ['z', 'Control+k']); // paleta przed upływem czasu – dymek nie wyskoczy nad nią
    await page.waitForTimeout(WAIT + 100);
    await expect(page.locator('#srRes')).toBeVisible();
    await expect(wk(page)).toBeHidden();
    await keys(page, ['Escape', 'Escape']);
    await keys(page, ['z', ':']); // jak dziś: kasuje prefiks, paleta się nie otwiera
    await page.waitForTimeout(WAIT + 100);
    await expect(page.locator('#srRes')).toBeHidden();
    await expect(wk(page)).toBeHidden();
    await keys(page, ['z']);
    await page.waitForTimeout(WAIT);
    await expect(wk(page)).toBeVisible();
    const m = await page.locator('#main').boundingBox();
    await page.mouse.click(m.x + m.width - 20, m.y + 20);
    await expect(wk(page)).toBeHidden();
  });
});
