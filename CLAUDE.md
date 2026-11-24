# Mapa myśli – notatki dla agenta

PWA bez frameworka i bez budowania: `www/` to gotowe pliki statyczne. Interfejs po polsku. Docelowo także Android (Capacitor 6) i komputer (Tauri, jeszcze bez `src-tauri/`).

## Polecenia

- `npm run serve` – podgląd (http://localhost:3000); w aplikacji desktopowej panel podglądu, serwer `mapa` z `.claude/launch.json`
- `npx playwright test tests/menu.spec.js` – jeden obszar w trakcie pracy; `-g "nazwa"` – jeden test
- `npm run check` – TypeScript (JSDoc, tryb strict) – szybki, uruchamiaj po każdej zmianie
- `npm run format` – Prettier (po edycji robi to automat); `npm run verify` – typy + format + wszystkie testy, uruchamia je bramka `.githooks/pre-commit`
- `npx playwright install --only-shell chromium firefox` – przeglądarki do testów (po zmianie wersji Playwrighta)

## Typy

Pliki zostają `.js` (bez budowania); typy w JSDoc, wspólne interfejsy w `types/globals.d.ts` (`MapNode`, `Found`, `MapStyle`, `DragState`, `Elements`…).
`$('id')` zwraca typ z mapy `Elements` – nowy element z id dopisz tam. Nie wyciszaj błędów `any` bez potrzeby.

## Mapa plików `www/js/` (zwykłe skrypty, NIE moduły – wspólny zakres globalny, kolejność w index.html ma znaczenie)

| plik                          | zawartość                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| core.js                       | `DEF`/`ST` (styl mapy), `parse`/`serialize`, stan, `snap`/`undo`/`redo`, `find`, `vis`, `S()`, `need()`, `deselect()` |
| icons.js                      | `IC`, `icon()`, `LAY` (nazwy układów)                                                                                 |
| layout.js                     | `applyStyle`, pomiar `tw`, `wrap`, `fit(n)` (rozmiar węzła), `lay()` (wiele korzeni), `layD` (układ „dół”)            |
| render.js                     | `render(keepView)`, animacja (`pos`, `step`, `draw`, `kick`, duchy), `edgeD`, `nodeHTML`, `fitView`, `changed()`      |
| edit.js                       | edycja w węźle: `startEdit`, `endEdit`, `placeEd`, `addSib`, `addChild`                                               |
| ops.js                        | `del(cut)`, `cut`, `copy`, `paste`, `moveSib`, `indent`, `outdent`, `fold`, `foldAll`, `go`, `arrow`                  |
| emoji.js / menu.js            | okienko emoji / `openMenu`, `ctxMenu` (menu podręczne), `moreMenu`, `setLayout`                                       |
| keys.js                       | `normal(ev)` – wszystkie skróty; `exec` (komendy „:”), `search`                                                       |
| files.js / help.js / side.js  | pliki i autozapis, widok Markdown, motyw / `HELP` (treść pomocy) / panel „Wygląd mapy”, palety `PAL0`                 |
| dnd.js / pointer.js / main.js | przeciąganie / mysz i dotyk (własny dwuklik, przytrzymanie) / start aplikacji                                         |

## Słowniczek stanu (krótkie nazwy)

`root` – niewidoczny kontener `{id:0, top:true}`, jego dzieci to korzenie map · `sel` – id zaznaczonego (0 = brak) ·
`tx,ty,k` – przesunięcie i zoom · `dir` – układ · `n.x,n.y,n.w,n.h,n.lines,n.s` – wynik układu (y = środek) ·
`pos` – pozycje wyświetlane (animacja) · `dnd` – trwające przeciąganie (`ph` = miejsce, id −1) ·
`editing`/`edId` – edycja · `yank` – skopiowana gałąź · `ST` – styl mapy (zapisywany w pliku).

## Zasady

- Zmiana modelu → `snap()` przed, `changed()` po (cofanie + autozapis). Zaznaczenie bez zmian → `go(id)` / `render()`.
- Nowy plik w `www/` → dopisz do `index.html` (właściwa kolejność) i do listy w `www/sw.js` (pilnuje `pwa.spec.js`).
- Skróty: każda czynność = jeden zwykły (Ctrl/klawisz specjalny) + jeden vim; aktualizuj `HELP`, `ctxMenu` (pole `k`) i `keys.spec.js`.
- Format pliku: `# korzeń` (wiele = wiele korzeni), `<!--layout:…-->`, `<!--style:{tylko różnice od DEF}-->`, listy `- `, `<!--c-->` = zwinięty.
- Format pliku i klucze autozapisu (`mm.md`, `mm.theme`, `mm.pal`, `mm.emo`) zmieniasz tylko po karcie decyzji. Plik z wersji 0.3 musi się wczytać bez strat (testy „strażnik formatu” w `parser.spec.js`); nowy format = nowa stała obok, starych nie zmieniasz.
- Testy: Playwright z `reducedMotion: 'reduce'` (pozycje od razu końcowe; testy animacji ustawiają `no-preference`). Logikę testujesz przez `page.evaluate` jak w `tests/parser.spec.js`; obszary w `tests/README.md`, pomocniki w `tests/helpers.js`.
- Commity na `main`.
- Zmiany widoczne na ekranie oglądasz w panelu podglądu (serwer `mapa`), także w rozmiarze telefonu. Dotyk, przeciąganie i płynność: `/na-telefonie`.
- Prototypy (`/prototyp`): `www/_prototyp/<temat>/`, w podglądzie `/_prototyp/<temat>/`.
- Capacitor jest w wersji 6, a jego dokumentacja domyślnie pokazuje 8 – czytaj tę dla wersji 6.

## Pułapki (już raz nas ugryzły)

- Ukryty element z fokusem (`#ed`, `#cmd`, panel) połyka klawisze w Chromium → przy chowaniu `blur()`.
- `render()` przebudowuje DOM → przeglądarka nie wyśle `click`/`dblclick`; dwuklik wykrywamy sami (`pointer.js`).
- W trybie mapy każdy zwykły znak musi mieć `preventDefault()`, inaczej Firefox otwiera szybkie wyszukiwanie.
- Emoji: osobne `<tspan class="emo">` z kolorową czcionką + osobny pomiar (`cvE`), dzielenie słów po grafemach.
- Kontener bez roota: biblioteki z `.pw-libs/` dokładane tylko w kontenerze, poza nim psują `/bin/sh` (zob. `tests/README.md`); Firefox ma własne NSS.
