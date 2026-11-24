// Skróty klawiszowe w trybie mapy – uruchamiane w Chromium i w Firefoksie (z „Szukaj tekstu podczas pisania”).
// Każda czynność ma skrót standardowy i vim; oba muszą dawać ten sam wynik. Usunięte skróty nie mogą nic robić.
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
    ['F2'],
    ['i'],
    async p => {
      await expect(p.locator('#ed')).toBeFocused();
      await p.keyboard.press('Escape');
    },
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
  ['zwiń / rozwiń', 'a', ['Space'], ['z', 'a'], async p => expect(await md(p)).toContain('- a <!--c-->')],
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
    [['Delete', 'Control+z', 'Control+y']], // ukryty alias
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
    'pomoc',
    'R',
    ['F1'],
    ['?'],
    async p => {
      await expect(p.locator('#help')).toBeVisible();
      await p.keyboard.press('Escape');
    },
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

test('następne / poprzednie trafienie: F3, Shift+F3 | n, N (od razu po wyszukaniu)', async ({ page }) => {
  await loadMap(page, MD);
  await keys(page, ['/']);
  await page.keyboard.type('a');
  await page.keyboard.press('Enter');
  expect(await selText(page)).toBe('a');
  await keys(page, ['F3']);
  expect(await selText(page)).toBe('a1');
  await keys(page, ['n']);
  expect(await selText(page)).toBe('a2');
  await keys(page, ['Shift+F3']);
  expect(await selText(page)).toBe('a1');
  await keys(page, ['N']);
  expect(await selText(page)).toBe('a');
});

test('pozostałe: licznik 2j, 0 / $, zR / zM, =, Ctrl+. (emoji), Shift+F10, :', async ({ page }) => {
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
  await page.evaluate(() => {
    k = 2;
    apply();
  });
  await keys(page, ['=']);
  expect(await page.evaluate(() => k)).not.toBe(2);
  await keys(page, ['Control+.']);
  await expect(page.locator('#emo')).toBeVisible();
  await keys(page, ['Escape']);
  await keys(page, ['Shift+F10']);
  await expect(page.locator('#menu')).toBeVisible();
  await keys(page, ['Escape']);
  await keys(page, [':']);
  await expect(page.locator('#cmd')).toHaveValue(':');
  await keys(page, ['Escape']);
});

test('usunięte skróty nic nie robią: Insert, cc, zo, zc, Alt+h/j/k/l', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'a2');
  const before = await md(page);
  await keys(page, ['Insert', 'c', 'c', 'z', 'c', 'z', 'o', 'Alt+h', 'Alt+j', 'Alt+k', 'Alt+l']);
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
    'F3',
    'F1',
    'Escape',
    'Control+f',
    'Control+r',
  ]);
  expect(await page.evaluate(() => window.__leak)).toEqual([]);
});

test('w polu edycji skróty mapy nie działają (pisze się tekst)', async ({ page }) => {
  await loadMap(page, MD);
  await select(page, 'b');
  await keys(page, ['F2', 'End']);
  await page.keyboard.type(' ggddxyy/?');
  await keys(page, ['Shift+Tab', 'Enter']);
  expect(await md(page)).toContain('- b ggddxyy/?\n- c\n');
});
