# mindme – notatki dla agenta

PWA bez frameworka i bez budowania: `www/` to gotowe pliki statyczne. Interfejs po polsku. Najpierw PWA; inne platformy (APK, Linux) dopiero po niej (`ROADMAP.md`, „Po PWA”).

## Polecenia

- `npm run serve` – podgląd (http://localhost:3000); w aplikacji desktopowej panel podglądu, serwer `mindme` z `.claude/launch.json`
- `npx playwright test tests/menu.spec.js` – jeden obszar w trakcie pracy; `-g "nazwa"` – jeden test
- `npm run check` – TypeScript (JSDoc, tryb strict) – szybki, uruchamiaj po każdej zmianie
- `npm run format` – Prettier (po edycji robi to automat); `npm run verify` – typy + format + wszystkie testy + pomiar wydajności, uruchamia je bramka `.githooks/pre-commit`
- `npm run perf` – sam pomiar wydajności (`tests/perf.spec.js`, progi w `docs/decyzje.md`); tylko sam, bez innych testów naraz
- `npx playwright install --only-shell chromium firefox` – przeglądarki do testów (po zmianie wersji Playwrighta)

## Typy

Pliki zostają `.js` (bez budowania); typy w JSDoc, wspólne interfejsy w `types/globals.d.ts` (`MapNode`, `Found`, `MapStyle`, `DragState`, `Elements`…).
`$('id')` zwraca typ z mapy `Elements` – nowy element z id dopisz tam. Nie wyciszaj błędów `any` bez potrzeby.

## Mapa plików `www/js/` (zwykłe skrypty, NIE moduły – wspólny zakres globalny, kolejność w index.html ma znaczenie)

| plik                          | zawartość                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core.js                       | `DEF`/`ST` (styl mapy), `parse`/`serialize`, stan, `snap`/`undo`/`redo`, `find`, `vis`, `S()`, `need()`, `deselect()`                                     |
| icons.js                      | `IC`, `icon()`, `LAY` (nazwy układów)                                                                                                                     |
| layout.js                     | `applyStyle`, pomiar `tw`, `wrap`, `fit(n)` (rozmiar węzła), `lay()` (wiele korzeni), `layD` (układ „dół”)                                                |
| render.js                     | `render(keepView)`, animacja (`pos`, `step`, `draw`, `kick`, duchy), `edgeD`, `nodeHTML`, `fitView`, `centerSel`, `changed()`                             |
| edit.js                       | edycja w węźle: `startEdit`, `endEdit`, `placeEd`, `addSib`, `addChild`                                                                                   |
| ops.js                        | `del(cut)`, `cut`, `copy`, `duplicate`, `paste`, `moveSib`, `indent`, `outdent`, `moveTo` („Przenieś do…”), `fold`, `foldAll`, `foldTo`, `go`, `arrow`                               |
| emoji.js / menu.js            | okienko emoji / `openMenu`, `ctxMenu` (menu podręczne), `moreMenu`, `setLayout`                                                                           |
| keys.js                       | `normal(ev)` – wszystkie skróty; `exec`/`cmdFind` (komendy „:”), `search`, `jump` (szukanie „/” jak vim, Ctrl+F jak przeglądarka)                         |
| files.js / help.js / side.js  | pliki i autozapis (`autosave`, `toStorage`, `diskAsk`, `reloadIfChanged`), widok Markdown, tryb jasny / ciemny / `HELP` / panel „Wygląd mapy”, `PAL0`, `cleanStyle` |
| actions.js / palette.js       | `ACT` – jedna tabela czynności (nazwa, skróty, komenda „:”, dostępność) dla pomocy, menu i palety / paleta komend (`openPal`), ostatnio użyte `mm.cmd`    |
| whichkey.js                   | dymek podpowiedzi (`#wk`): po prefiksie vim albo liczniku i 400 ms – dalsze klawisze z `ACT` (`v`, `cnt`); tylko patrzy na klawisze, obsługuje je `normal()` |
| dnd.js / pointer.js / main.js | przeciąganie / mysz i dotyk (własny dwuklik, przytrzymanie) / start aplikacji                                                                             |

## Słowniczek stanu (krótkie nazwy)

`root` – niewidoczny kontener `{id:0, top:true}`, jego dzieci to korzenie map · `sel` – id zaznaczonego (0 = brak) ·
`tx,ty,k` – przesunięcie i zoom · `dir` – układ · `n.x,n.y,n.w,n.h,n.lines,n.s` – wynik układu (y = środek) ·
`pos` – pozycje wyświetlane (animacja) · `dnd` – trwające przeciąganie (`ph` = miejsce, id −1) ·
`editing`/`edId` – edycja · `yank` – skopiowana gałąź · `ST` – styl mapy (zapisywany w pliku) ·
`fh` – otwarty plik · `fhSkip` – jego linie spoza mapy · `fhConflict` – plik zmieniony na dysku, zapis czeka na decyzję · `lastMod` – czas pliku przy ostatnim odczycie / zapisie · `lsLast` – ostatni autozapis tej karty · `dirty` – zmiany, których nie ma w pliku.

Nazwy pojęć w interfejsie, planie i rozmowie: `docs/slownik.md`. Nowe pojęcie dopisz tam, zanim trafi do interfejsu albo planu; nie twórz drugiej nazwy dla tego samego.

## Zasady

- Zmiana modelu → `snap()` przed, `changed()` po (cofanie + autozapis). Zaznaczenie bez zmian → `go(id)` / `render()`.
- Nowy plik w `www/` → dopisz do `index.html` (właściwa kolejność) i do listy w `www/sw.js` (pilnuje `pwa.spec.js`).
- Skróty: każda czynność = skrót zwykły (Ctrl/klawisz specjalny) + vim; ukryte aliasy to tylko dawne F1, F2, F3, Shift+F10 (działają, nie ma ich w `HELP`, menu ani README; nowych nie dodajemy); nazwę i skróty wpisz w `ACT` (actions.js – z niej biorą pomoc, menu, paleta i dymek podpowiedzi; skrót vim z licznikiem – `cnt: true`), naciśnięcie obsłuż w `normal()`, zaktualizuj `keys.spec.js` i tabelę w README.
- Format pliku: `# korzeń` (wiele = wiele korzeni), `<!--layout:…-->`, `<!--style:{tylko różnice od DEF}-->`, listy `- `, `<!--c-->` = zwinięty.
- Format pliku i klucze autozapisu (`mm.md`, `mm.theme`, `mm.pal`, `mm.emo`, `mm.cmd`) zmieniasz tylko po karcie decyzji. Plik z wersji 0.3 musi się wczytać bez strat (testy „strażnik formatu” w `parser.spec.js`); nowy format = nowa stała obok, starych nie zmieniasz.
- Testy: Playwright z `reducedMotion: 'reduce'` (pozycje od razu końcowe; testy animacji ustawiają `no-preference`). Logikę testujesz przez `page.evaluate` jak w `tests/parser.spec.js`; obszary w `tests/README.md`, pomocniki w `tests/helpers.js`.
- Commity na `main`.
- Otwarte błędy i rzeczy do sprawdzenia → `docs/znane-problemy.md` (w gicie); `HANDOVER.md` (lokalny) tylko na bieżącą pracę.
- Zmiany widoczne na ekranie oglądasz w panelu podglądu (serwer `mindme`), także w rozmiarze telefonu. Dotyk, przeciąganie i płynność: `/na-telefonie`.
- Prototypy (`/prototyp`): `www/_prototyp/<temat>/`, w podglądzie `/_prototyp/<temat>/`.

## Pułapki (już raz nas ugryzły)

- Nadpisanie pliku albo autozapisu bez sprawdzenia, czy ktoś go nie zmienił (Syncthing, druga karta) – gubi dane. Zapis do pliku najpierw `diskChange` (czas i treść), autozapis bez pliku – `toStorage` (porównanie z `lsLast`); widok Markdown – `textLossOk`. Nowe miejsca zapisu idą tą samą drogą (zasada 0.19 w ROADMAP).
- Ctrl+S w polu z `stopPropagation` (`#ed`, `#txt`) nie dociera do `normal()` – przeglądarka otworzy „Zapisz stronę”; takie pole obsługuje Ctrl+S samo.
- Ukryty element z fokusem (`#ed`, `#cmd`, panel) połyka klawisze w Chromium → przy chowaniu `blur()`.
- `render()` przebudowuje DOM → przeglądarka nie wyśle `click`/`dblclick`; dwuklik wykrywamy sami (`pointer.js`).
- W trybie mapy każdy zwykły znak musi mieć `preventDefault()`, inaczej Firefox otwiera szybkie wyszukiwanie.
- Emoji: osobne `<tspan class="emo">` z kolorową czcionką + osobny pomiar (`cvE`), dzielenie słów po grafemach.
- Okienko z pytaniem (`ask`, `<dialog>` w `files.js`): wynik oddawaj przy wyborze, nie w zdarzeniu `close` (przychodzi z opóźnieniem i trafia w następne pytanie); `returnValue` po Esc jest w Chromium pusty, a `Number('')` = 0 = przycisk domyślny; Enter, który okienko otworzył (np. `:w` z palety), nie może wybrać przycisku.
- Ctrl+V w trybie mapy: fokus na chwilę w niewidocznym `#clip` (Firefox poza polem tekstowym nie wysyła `paste` dla Ctrl+Shift+V); nie rób `preventDefault()` na Ctrl+V, bo `paste` nie nadejdzie.
- Schowek: pod `http://` innym niż localhost (telefon przez `10.0.0.x`) i w Firefoksie na Androidzie nie ma `navigator.clipboard` → wklejanie idzie przez okienko „wklej tutaj” (na https://piotrszostak.github.io/mindme/ schowek działa). Brak `sw.js` w dzienniku serwera = przeglądarka uznała adres za niebezpieczny.
- Globalna reguła `svg` w `app.css` (100% szerokości i wysokości) rozdmuchuje każdą wstawioną ikonę (prototypy, porównania) → rozmiar w `style`.
- Ukryty panel podglądu animuje wolno, zrzut łapie stan pośredni → nakładanie węzłów sprawdzaj liczbowo (pozycje docelowe), nie tylko na zrzucie.
- Sprawdzanie w podglądzie (`load()`, zmiany na mapie) nadpisuje autozapis użytkownika (`mm.md`) → najpierw kopia `localStorage.getItem('mm.md')`, na koniec przywrócenie i przeładowanie strony.
- Edycja skryptem (sed, python) omija automatyczny Prettier → przed commitem `npx prettier --write` na zmienionych plikach z `www/`, `tests/`, `types/` (dokumentacji nie – zob. niżej), inaczej bramka zatrzyma commit.
- Serwer podglądu (`npm run serve`) przekierowuje `…/x.html` na `…/x` i `…/index.html` na katalog bez ukośnika – gubi przy tym `?parametry`, a ścieżki względne trafiają piętro wyżej → w prototypach pełna ścieżka i adres bez `.html`.
- Serwer podglądu z poprzedniej sesji może dalej działać na :3000: `preview_start` z `name` się wtedy nie uruchomi – użyj `preview_start` z `url`; dziennik (`preview_logs`) ma tylko serwer uruchomiony w tej sesji.
- Podgląd bez `reducedMotion`: tuż po `load()` węzły jeszcze jadą – symulowany dotyk trafia w zły węzeł; odczekaj ok. 1 s.
- `ROADMAP.md` i `docs/*.md` nie przechodzą przez Prettiera (bramka sprawdza kod) – nie formatuj całych plików, diff zrobi się nieczytelny, a blokada gita nie pozwoli cofnąć tego przez `git checkout`.
- Bramka zawodzi na pomiarze wydajności (`npm run perf`), gdy komputer jest zajęty (np. gra) → najpierw `uptime` i `ps -eo pcpu,comm --sort=-pcpu | head`, potem pomiar poprzedniego commitu (`git stash`, `npm run perf`, `git stash pop`); bramki nie omijasz – commit po zwolnieniu komputera.
- Dwie sesje naraz w tym samym katalogu: bramka odrzuca commit, gdy w `www/` albo `tests/` są niezapisane zmiany drugiej sesji (testy sprawdzają dysk) → poczekaj na jej commit; nie rób `git stash` cudzej pracy (także przy pomiarze z linii wyżej) i nie omijaj bramki; `git add` tylko z listą własnych plików.
- Pomocnicy w osobnych kopiach repozytorium (worktree) startują z `origin/main`, nie z lokalnego `main` → najpierw `git merge --ff-only main`; testy z `PW_PORT=31xx` (inaczej trafią na serwer podglądu na :3000 z innym kodem); bez commitów – zmiany łączy i przepuszcza przez bramkę po kolei sesja główna.
- Kontener bez roota: biblioteki z `.pw-libs/` dokładane tylko w kontenerze, poza nim psują `/bin/sh` (zob. `tests/README.md`); Firefox ma własne NSS.
