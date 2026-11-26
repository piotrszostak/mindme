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
      await expect(p.locator('#cmd')).toBeFocused();
      await expect(p.locator('#cmd')).toHaveValue('/');
      await p.keyboard.press('Escape');
    },
  ],
  [
    'paleta komend',
    'R',
    ['Control+k'],
    [':'],
    async p => {
      await expect(p.locator('#pal')).toBeVisible();
      await expect(p.locator('#palq')).toBeFocused();
      await p.keyboard.press('Escape');
      await expect(p.locator('#pal')).toBeHidden();
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
  /** odległość środka węzła od środka widoku [px] i powiększenie */
  const where = () =>
    page.evaluate(() => {
      const r = document.querySelector(`#g .n[data-id="${sel}"] rect`).getBoundingClientRect(),
        v = $('sv').getBoundingClientRect();
      return { dx: r.x + r.width / 2 - v.x - v.width / 2, dy: r.y + r.height / 2 - v.y - v.height / 2, k };
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
  await expect(page.locator('#palq')).toHaveValue(':');
  await keys(page, ['Escape']);
  await keys(page, ['Control+k']); // paleta od pustego pola
  await expect(page.locator('#palq')).toHaveValue('');
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
    t.push($('pall').textContent || '');
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
  await expect(page.locator('#pall .pi.hi .pt')).toHaveText('Przesuń w górę');
  await keys(page, ['ArrowDown', 'Enter']);
  await expect(page.locator('#pal')).toBeHidden();
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
