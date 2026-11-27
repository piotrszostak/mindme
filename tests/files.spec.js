const { test, expect } = require('@playwright/test');
const { open, selText } = require('./helpers');

test.beforeEach(async ({ page }) => open(page));

/* Plik z treścią, której mapa nie pokazuje (akapit i nagłówek ##): nie może zniknąć z dysku bez zgody użytkownika. */
const MIXED = '# Plan\n\nAkapit, którego mapa nie pokazuje.\n\n## Nagłówek\n\n- a\n  - b\n';

/**
 * Podstawia okna wyboru pliku (File System Access API, Chrome/Edge). Plik „org” ma treść `md`;
 * zapisy trafiają do `window.__w.org` / `window.__w.nowy`. `window.__disk(tekst)` zmienia plik na dysku.
 */
const stubFiles = (page, md) =>
  page.evaluate(m => {
    window.__w = { org: [], nowy: [] };
    const disk = { org: { text: m, t: 1 }, nowy: { text: '', t: 1 } };
    window.__disk = text => (disk.org = { text, t: disk.org.t + 1 });
    const handle = name => ({
      name,
      getFile: async () => ({ text: async () => disk[name].text, lastModified: disk[name].t }),
      createWritable: async () => ({
        write: async d => {
          window.__w[name].push(d);
          disk[name].text = d;
        },
        close: async () => {},
      }),
    });
    window.showOpenFilePicker = async () => [handle('org')];
    window.showSaveFilePicker = async () => handle('nowy');
  }, md);

const writes = page => page.evaluate(() => window.__w);
/** otwórz plik przez (podstawione) okno wyboru i wymuś autozapis, który dziś rusza 0,5 s po otwarciu */
const openAndAutosave = page =>
  page.evaluate(async () => {
    await openFile();
    await autosave();
  });
const ask = page => page.locator('#ask');

test('plik z treścią spoza mapy: otwarcie niczego w nim nie zapisuje, autozapis tylko w przeglądarce', async ({
  page,
}) => {
  await stubFiles(page, MIXED);
  await openAndAutosave(page);
  expect(await writes(page)).toEqual({ org: [], nowy: [] });
  await expect(page.locator('#info')).toHaveText('Pominięto 2 linie spoza mapy – plik na dysku bez zmian');
  await expect(page.locator('#save')).toHaveText('✓ zapisano lokalnie');
  expect(await page.evaluate(() => localStorage.getItem('mm.md'))).toBe('# Plan\n\n- a\n  - b\n');
  await expect(ask(page)).toBeHidden();
});

test('plik bez takich linii (także z frontmatterem) zapisuje się sam, jak dotąd', async ({ page }) => {
  const md = '---\ntags: [a]\n---\n# Plan\n\n- a\n';
  await stubFiles(page, md);
  await openAndAutosave(page);
  expect((await writes(page)).org).toEqual([md]);
  await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
  await expect(page.locator('#info')).not.toContainText('Pominięto');
});

test('licznik pominiętych linii: tylko niepuste linie spoza mapy, bez frontmattera; odmiana słowa „linia”', async ({
  page,
}) => {
  const skip = md => page.evaluate(m => parse(m).skip, md);
  expect(await skip('# T\n\n- a\n<!--layout:down-->\n   \n')).toBe(0);
  expect(await skip('---\ntags:\n  - x\n---\n# T\n- a\n')).toBe(0);
  expect(await skip(MIXED)).toBe(2);
  expect(await skip('---\nbez zamknięcia\n# T\n|a|b|\n')).toBe(3);
  expect(await page.evaluate(() => [1, 2, 5, 12, 22].map(skipInfo))).toEqual([
    'Pominięto 1 linię spoza mapy – plik na dysku bez zmian',
    'Pominięto 2 linie spoza mapy – plik na dysku bez zmian',
    'Pominięto 5 linii spoza mapy – plik na dysku bez zmian',
    'Pominięto 12 linii spoza mapy – plik na dysku bez zmian',
    'Pominięto 22 linie spoza mapy – plik na dysku bez zmian',
  ]);
});

test('Ctrl+S i :w przy takim pliku pytają: Zapisz jako nowy plik (domyślny) / Nadpisz / Anuluj', async ({ page }) => {
  await stubFiles(page, MIXED);
  await openAndAutosave(page);
  await page.keyboard.press('Control+s');
  await expect(ask(page)).toBeVisible();
  await expect(ask(page)).toContainText('Ten plik ma treść, której mapa nie pokazuje (2 linie). Zapis ją usunie.');
  await expect(ask(page).locator('button')).toHaveText(['Zapisz jako nowy plik', 'Nadpisz', 'Anuluj']);
  await expect(ask(page).locator('button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(ask(page)).toBeHidden();

  await page.keyboard.press(':');
  await page.keyboard.type('w');
  await page.keyboard.press('Enter');
  await expect(ask(page)).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await writes(page)).toEqual({ org: [], nowy: [] });
});

test('Nadpisz: plik dostaje mapę, a dalej zapisuje się sam bez pytania', async ({ page }) => {
  await stubFiles(page, MIXED);
  await openAndAutosave(page);
  await page.keyboard.press('Control+s');
  await ask(page).getByRole('button', { name: 'Nadpisz' }).click();
  await expect(ask(page)).toBeHidden();
  await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
  expect((await writes(page)).org).toEqual(['# Plan\n\n- a\n  - b\n']);

  await page.keyboard.press('Control+s');
  await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
  await expect(ask(page)).toBeHidden();
  expect((await writes(page)).org).toHaveLength(2);
});

test('Zapisz jako nowy plik (Enter): zapis trafia do nowego pliku, oryginał zostaje nietknięty', async ({ page }) => {
  await stubFiles(page, MIXED);
  await openAndAutosave(page);
  await page.keyboard.press('Control+s');
  await expect(ask(page).locator('button').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(ask(page)).toBeHidden();
  await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
  expect(await writes(page)).toEqual({ org: [], nowy: ['# Plan\n\n- a\n  - b\n'] });
  await page.evaluate(() => autosave());
  expect((await writes(page)).org).toEqual([]);
});

test('Zapisz jako nowy plik, ale okno zapisu anulowane: plik dalej czeka na decyzję', async ({ page }) => {
  await stubFiles(page, MIXED);
  await openAndAutosave(page);
  await page.evaluate(
    () => (window.showSaveFilePicker = async () => Promise.reject(new DOMException('', 'AbortError')))
  );
  await page.keyboard.press('Control+s');
  await expect(ask(page).locator('button').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(ask(page)).toBeHidden();
  await page.evaluate(() => autosave());
  expect(await writes(page)).toEqual({ org: [], nowy: [] });
  await page.keyboard.press('Control+s');
  await expect(ask(page)).toBeVisible();
});

test('Anuluj i Esc: nic się nie zapisuje, a klawisze znowu sterują mapą', async ({ page }) => {
  await stubFiles(page, MIXED);
  await openAndAutosave(page);
  await page.keyboard.press('Control+s');
  await ask(page).getByRole('button', { name: 'Anuluj' }).click();
  await expect(ask(page)).toBeHidden();
  await page.keyboard.press('Control+s');
  await expect(ask(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ask(page)).toBeHidden();
  expect(await writes(page)).toEqual({ org: [], nowy: [] });
  await page.evaluate(() => go(first().children[0].id));
  await page.keyboard.press('l'); // vim: do dziecka
  expect(await selText(page)).toBe('b');
});

test('plik zmieniony na dysku: przeładowanie z nowymi liniami spoza mapy znowu wstrzymuje zapis do pliku', async ({
  page,
}) => {
  await stubFiles(page, '# Plan\n\n- a\n');
  await openAndAutosave(page);
  expect((await writes(page)).org).toHaveLength(1);
  await page.evaluate(() => window.__disk('# Plan\n\nDopisane w innym programie.\n\n- a\n- c\n'));
  await page.evaluate(async () => {
    await reloadIfChanged();
    await autosave();
  });
  expect(await page.evaluate(() => vis().map(n => n.text))).toEqual(['Plan', 'a', 'c']);
  expect((await writes(page)).org).toHaveLength(1);
  await expect(page.locator('#info')).toHaveText('Pominięto 1 linię spoza mapy – plik na dysku bez zmian');
});

/* Plik zmieniony na dysku (np. przez Syncthing), a mapa ma niezapisane zmiany: zapis nie może go nadpisać po cichu. */
const DISK_Q = 'Plik zmieniono na dysku (np. Syncthing albo inny program), a mapa ma niezapisane zmiany.';
/** zmiana tekstu pierwszego węzła, jak edycja (autozapis rusza po 0,5 s) */
const editFirst = (page, t) =>
  page.evaluate(x => {
    snap();
    first().children[0].text = x;
    changed();
  }, t);
const mapTexts = page => page.evaluate(() => vis().map(n => n.text));
/** otwarty plik „# Plan / a”, potem zmiana na dysku (dopisane „z”) i zmiana na mapie („a” → „b”) */
const conflict = async page => {
  await stubFiles(page, '# Plan\n\n- a\n');
  await openAndAutosave(page);
  await page.evaluate(() => window.__disk('# Plan\n\n- a\n- z\n'));
  await editFirst(page, 'b');
  await expect(ask(page)).toContainText(DISK_Q);
};

test.describe('plik zmieniony na dysku przy niezapisanych zmianach', () => {
  test('autozapis pyta zamiast nadpisywać: Zapisz jako nowy plik (domyślny) / Wczytaj z dysku / Nadpisz plik', async ({
    page,
  }) => {
    await conflict(page);
    await expect(ask(page).locator('button')).toHaveText(['Zapisz jako nowy plik', 'Wczytaj z dysku', 'Nadpisz plik']);
    expect((await writes(page)).org).toHaveLength(1);
  });

  test('Wczytaj z dysku: mapa z pliku, a Ctrl+Z przywraca własne zmiany', async ({ page }) => {
    await conflict(page);
    await ask(page).getByRole('button', { name: 'Wczytaj z dysku' }).click();
    expect(await mapTexts(page)).toEqual(['Plan', 'a', 'z']);
    expect((await writes(page)).org.every(w => !w.includes('- b'))).toBe(true);
    await page.keyboard.press('Control+z');
    expect(await mapTexts(page)).toEqual(['Plan', 'b']);
  });

  test('Nadpisz plik: plik dostaje mapę i dalej zapisuje się sam', async ({ page }) => {
    await conflict(page);
    await ask(page).getByRole('button', { name: 'Nadpisz plik' }).click();
    await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
    expect((await writes(page)).org.at(-1)).toBe('# Plan\n\n- b\n');
    await editFirst(page, 'c');
    await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
    expect((await writes(page)).org.at(-1)).toBe('# Plan\n\n- c\n');
  });

  test('Zapisz jako nowy plik: oba pliki zostają', async ({ page }) => {
    await conflict(page);
    await ask(page).locator('button').first().click();
    await expect(page.locator('#save')).toHaveText('✓ zapisano w pliku');
    expect((await writes(page)).nowy).toEqual(['# Plan\n\n- b\n']);
    expect((await writes(page)).org).toHaveLength(1);
  });

  test('Esc: plik bez zmian, kolejne zmiany bez pytania tylko w przeglądarce, Ctrl+S pyta znowu', async ({ page }) => {
    await conflict(page);
    await page.keyboard.press('Escape');
    await expect(ask(page)).toBeHidden();
    await editFirst(page, 'c');
    await expect(page.locator('#save')).toHaveText('⚠ plik zmieniony na dysku – Ctrl+S');
    await expect(ask(page)).toBeHidden();
    expect((await writes(page)).org).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('mm.md'))).toBe('# Plan\n\n- c\n');
    await page.keyboard.press('Control+s');
    await expect(ask(page)).toContainText(DISK_Q);
  });

  test('przeładowanie co 2 s przy niezapisanych zmianach też pyta (bez okienka przeglądarki)', async ({ page }) => {
    await stubFiles(page, '# Plan\n\n- a\n');
    await openAndAutosave(page);
    await page.evaluate(() => {
      window.__disk('# Plan\n\n- a\n- z\n');
      dirty = true;
      window.confirm = () => {
        throw new Error('confirm');
      };
      reloadIfChanged();
    });
    await expect(ask(page)).toContainText(DISK_Q);
  });
});

/* Dwie karty (albo karta i aplikacja zainstalowana z przeglądarki) mają wspólny autozapis `mm.md`. */
const OTHER = '# Z innej karty\n\n- x\n';
test.describe('autozapis zmieniony w innej karcie', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => load('# Plan\n\n- a\n'));
    await expect(page.locator('#save')).toHaveText('✓ zapisano lokalnie');
  });

  test('karta bez niezapisanych zmian wczytuje mapę z innej karty sama', async ({ page }) => {
    await page.evaluate(v => {
      localStorage.setItem('mm.md', v);
      window.dispatchEvent(new StorageEvent('storage', { key: 'mm.md', newValue: v }));
    }, OTHER);
    expect(await mapTexts(page)).toEqual(['Z innej karty', 'x']);
    await expect(ask(page)).toBeHidden();
  });

  test('karta ze zmianami nie nadpisuje innej: pytanie; „Wczytaj tamtą wersję” i Ctrl+Z wraca do swojej', async ({
    page,
  }) => {
    await editFirst(page, 'moja');
    await page.evaluate(v => {
      localStorage.setItem('mm.md', v);
      window.dispatchEvent(new StorageEvent('storage', { key: 'mm.md', newValue: v }));
    }, OTHER);
    await expect(ask(page)).toContainText('Mapę zmieniono w innej karcie albo oknie aplikacji.');
    await expect(ask(page).locator('button')).toHaveText(['Wczytaj tamtą wersję', 'Zostaw moją']);
    expect(await page.evaluate(() => localStorage.getItem('mm.md'))).toBe(OTHER);
    await ask(page).locator('button').first().click();
    expect(await mapTexts(page)).toEqual(['Z innej karty', 'x']);
    await page.keyboard.press('Control+z');
    expect(await mapTexts(page)).toEqual(['Plan', 'moja']);
  });

  test('„Zostaw moją”: autozapis dostaje mapę tej karty', async ({ page }) => {
    await editFirst(page, 'moja');
    await page.evaluate(v => localStorage.setItem('mm.md', v), OTHER);
    await ask(page).getByRole('button', { name: 'Zostaw moją' }).click();
    await expect(page.locator('#save')).toHaveText('✓ zapisano lokalnie');
    expect(await page.evaluate(() => localStorage.getItem('mm.md'))).toBe('# Plan\n\n- moja\n');
  });
});

test('pamięć przeglądarki pełna: ostrzeżenie zamiast „zapisano lokalnie”', async ({ page }) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('', 'QuotaExceededError');
    };
  });
  await editFirst(page, 'b');
  await expect(page.locator('#save')).toHaveText('⚠ nie zapisano w przeglądarce – zapisz plik (Ctrl+S)');
});
