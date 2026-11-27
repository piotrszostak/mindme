# Plan rozwoju mindme – instrukcje dla agenta

Przed pracą przeczytaj `CLAUDE.md`, `HANDOVER.md` (lokalny, poza gitem), `docs/decyzje.md` i `docs/znane-problemy.md`. Zadania rób **po kolei**; jedno zadanie = jeden commit. Decyzji, której tu nie ma, nie zgaduj – zapytaj użytkownika.

**Najpierw PWA.** Cały plan aż do części „Po PWA” dotyczy aplikacji w przeglądarce (https://piotrszostak.github.io/mindme/, instalowanej z przeglądarki na komputerze i telefonie). Inne platformy (APK na Androida, aplikacja na Linuksa) – dopiero potem, z nowym wyborem narzędzi (decyzja 2026-11-27).

**Kolejność:** 2 → 3 → R.2 → 4 → 5 → 6 → 8 → R → X → P → Po PWA. Etap 9 – tylko na wyraźną prośbę. Numery zadań się nie zmieniają (odsyła do nich `docs/decyzje.md`); etapy dodane później mają litery. Zrobione zadania są tu jednym zdaniem – szczegóły w `docs/decyzje.md` i w historii gita.

**Dlaczego tak:** najpierw rzeczy tanie, które dają najwięcej (szukanie, panel, treść węzła). Funkcje, które naraz dotykają przeciągania, nawigacji, układu i formatu pliku, są na końcu (etap X), a przed nimi etap R porządkuje kod, żeby każda z nich była osobnym plikiem, a nie łatkami w dziesięciu miejscach.

**Znaczniki:** 🗳 karta decyzji – zmienia format pliku albo dodaje klucz w pamięci przeglądarki: najpierw opcje, wybór zapisany w `docs/decyzje.md`, dopiero potem kod. ⏸ STOP – zadanie kończy się pokazaniem wyniku albo pytaniem; czekaj na zgodę.

## Zasada nadrzędna: prostota

mindme ma być **prosta, intuicyjna i przejrzysta**, a dopiero potem bogata w funkcje.

- Nowa widoczna opcja (przycisk, przełącznik, pozycja menu) musi coś zastąpić albo trafić do rozszerzeń (etap 8).
- Jedna oczywista droga do każdej czynności (skrót zwykły i vim to ta sama droga). Najpierw ulepszaj to, co jest.
- Ustawienia domyślne dają dzisiejszy wygląd. Zmiana wyglądu istniejących map – tylko po pokazaniu „przed i po” i zgodzie.
- **Podstawa** jest zawsze włączona. **Rozszerzenia** są domyślnie wyłączone; wyłączone nie pojawiają się w menu, palecie ani pomocy, a ich zapis w pliku zostaje bez zmian.
- Jeśli da się prościej, niż tu opisano – zaproponuj to przed kodowaniem.

## 0. Zasady w każdym zadaniu

1. **Bez frameworka, bez budowania, bez nowych zależności w `www/`.** Algorytmy pisz sam.
2. **Plik `.md` jest głównym źródłem danych.** Nowe dane – standardowy Markdown albo `<!--…-->`. Plik bez nowych funkcji zapisuje się **bajt w bajt jak dziś**, stare pliki otwierają się bez zmian. Rozszerzenie formatu: karta decyzji, round-trip w `tests/parser.spec.js`, `selfTest()` (`:test`), opis w README i `HELP` („Format pliku”).
3. **Model:** `snap()` przed zmianą, `changed()` po. Nowe pola węzła – do `MapNode` (`types/globals.d.ts`), nowe pola stylu – do `DEF`.
4. **Nowy plik w `www/`** – do `index.html` (właściwa kolejność), `www/sw.js` i mapy plików w `CLAUDE.md`.
5. **Skróty:** jedna czynność = jeden skrót zwykły + jeden vim, wpis w `ACT` (`actions.js`), obsługa w `normal()` (`keys.js`), testy w `keys.spec.js`, tabela w README. Bez nowych ukrytych aliasów (zostają F1, F2, F3, Shift+F10; Ctrl+Y jest widoczny). Sprawdzaj `ev.code`, gdy `ev.key` zależy od układu klawiatury; przy Caps Lock normalizuj literę według Shift. **Zakazane:** `Ctrl+Alt+litera` (AltGr – polskie znaki), `Alt+litera`, `Ctrl+W/T/N/Tab`, `Ctrl+Shift+N/T`, `Ctrl+Spacja`, `Ctrl+strzałki`, `Alt+1…8`. Skrót, którego przeglądarka może nie oddać (np. `Ctrl+H`), sprawdź najpierw w Chromium i Firefoksie.
6. **Animacje:** 150–300 ms, tylko jako sygnał zmiany; wszystko z jednej czynności rusza i kończy się razem, następna czynność przejmuje ruch bez kolejki; nic się nie zapętla; wszystkie respektują `prefers-reduced-motion` (`RM` w `render.js`).
7. **Czytelność przed efektem.** Kolor należy do gałęzi, nie do węzła. Subtelne animacje i wskazówki stanu (5.3–5.5) działają zawsze, bez przełącznika; efekty zmieniające wygląd mapy w spoczynku – tylko w motywie (5.7).
8. Po każdej zmianie `npm run check` i testy obszaru; przed commitem `npm run verify`. Na koniec etapu: `HANDOVER.md` i `docs/znane-problemy.md`.
9. Interfejs po polsku. Użytkownik nie jest frontendowcem – w podsumowaniach tłumacz krótko.
10. **Aplikacja dla jednej osoby** – bez funkcji pracy grupowej bez wyraźnej zgody.
11. **Błąd: najpierw test, który pada**, potem poprawka. Nie wiesz, jak odtworzyć – zapytaj o kroki.
12. **Bez mechanizmu wtyczek.** Rozszerzenie to wpis w tabeli (8.0) i sprawdzenie flagi; funkcja z własnym zapisem i rysowaniem – osobny plik. Bez punktów zaczepienia na zapas.
13. Filtry szukania (np. `has:note`) powstają dopiero w 8.2; pola w panelu właściwości – tylko jeśli panel powstanie (3.5).
14. Testy skrótów, szukania i schowka – także w Firefoksie (`testMatch` projektu `firefox` w `playwright.config.js`).
15. Dotyk, przeciąganie i płynność sprawdzaj też na telefonie (`/na-telefonie`).
16. **Nowe znaczniki `<!--…-->`** tylko wtedy, gdy nie da się zwykłym Markdownem, i dopiero po R.5.
17. **Wydajność:** pomiar z A.2 jest stałym testem; zadanie, po którym próg nie przechodzi, nie jest skończone.
18. **Tekst, który już jest w mapach.** Karta decyzji każdego rozszerzenia formatu mówi, co z węzłami, które już dziś wyglądają jak nowy zapis (np. „[ ] x”, `#słowo`, tekst kończący się `^abc`), i jak zapisać taki tekst dosłownie (np. `\` na początku, jak w dalszych liniach węzła). Test: stary plik z takim tekstem zapisuje się bez zmian.
19. **Dane nie znikają po cichu.** Każde miejsce, które nadpisuje plik, autozapis albo tekst widoku Markdown, najpierw sprawdza, czy nie straci cudzej albo nowszej treści (wzór: `diskAsk`, `toStorage`, `textLossOk` w `files.js`).

---

## Zrobione

- **Etapy 0, 1 i A:** sprawdzanie stylu i układu z pliku (A.1), pomiar wydajności z progami (A.2; cel: płynnie do 500 węzłów, także na telefonie), aliasy klawiszy (A.3), usunięcie Tauri (A.5), porządki (A.6).
- **A.7 Ochrona danych (2026-11-27):** autozapis nie nadpisuje pliku zmienionego na dysku (np. przez Syncthing) ani mapy z innej karty – pyta; ostrzeżenie przy pełnej pamięci przeglądarki; widok Markdown nie gubi po cichu linii, których mapa nie pokaże; Ctrl+S w edycji i w widoku Markdown; hjkl idą tam, gdzie strzałki, a Alt+strzałki i H J K L przesuwają w stronę strzałki – w każdym układzie; nazwa „mindme” wszędzie; `#` i `-` bez spacji; `<!--layout/style-->` pod drugą mapą liczone jako pominięte; Service Worker nie czeka na wolną sieć dłużej niż 3 s; Capacitor usunięty do czasu portu (decyzje 2026-11-27).
- **T.1:** adres https na GitHub Pages, publikacja po zielonych testach.
- **Etap 2 (2.1–2.7, 2026-11-27):** szukanie Ctrl+F i „/” (bez polskich znaków i wielkości liter), wklejanie ze schowka systemowego, wyszukiwanie przybliżone w palecie, cienki pasek przewijania, lista wszystkich trafień w palecie (Alt+Enter albo „wszystkie”; tryb listy `openList` także dla 4.8), dymek podpowiedzi klawiszy po prefiksie i liczniku, „Przenieś do…” (Ctrl+M, `m`, `:m`, menu podręczne).

## Odłożone

- **A.4 Edycja palet bez pamięci przeglądarki 🗳** – odłożone na prośbę użytkownika, wróć najpóźniej przy 3.2. Dziś „Edytuj paletę” zmienia paletę na tym urządzeniu (`mm.pal`), więc wygląda różnie na komputerze i telefonie. Karta gotowa: (a) edycja zmienia tylko kolory tej mapy (zapis w pliku) – polecana; (b) usunąć edycję. W obu: co z poprawkami już zapisanymi w `mm.pal`.
- **A.8 Safari (WebKit) ⏸** – najpierw zapytaj, czy użytkownik używa iPhone’a albo Safari. Jeśli tak: projekt `webkit` w `playwright.config.js` (najpierw skróty, szukanie, schowek, dotyk), `npx playwright install webkit` w CI, poprawki różnic. Jeśli nie – zapisz w `docs/decyzje.md`, że Safari nie jest celem.

---

# PODSTAWA (etapy 2–6)

## Etap 3 – Panel boczny i menu

### 3.2 Projekt panelu i menu ⏸ STOP

Tylko wywiad i makiety, **bez zmian w kodzie aplikacji**. Cel: **na wierzchu mniej niż dziś** (wzór: Excalidraw).

1. **Spis** tego, co jest w panelu „Wygląd mapy”, menu podręcznym, „…” i menu układu, oraz co dojdzie: motywy (5.7) w miejsce przełączników (co zostaje pod „Więcej”, co znika z panelu – pola nadal czytają się i zapisują w pliku); lista układów; przyciski „+” (3.4); przełącznik widoków Mapa / .md / Drzewko (3.6, jeden z wariantów – kolumny jak w Gingko Writer); miejsca dla minimapy, relacji, „Podsumuj”, „Nowa kartka” (etap X) – bez kodu; lista „Rozszerzenia” (8.0); pytanie: czy potrzebny panel właściwości węzła.
2. **Wywiad** (`/wypytaj`): co przeszkadza, czego używasz najrzadziej; komputer czy telefon; panel z boku czy od dołu; zawsze czy na żądanie; podział „Mapa / Węzeł / Ustawienia aplikacji”; ikony czy podpisy.
3. **Makiety** (`/prototyp`, `www/_prototyp/panel/`): 2–3 warianty, komputer i telefon, jasny i ciemny, zmienne kolorów z `app.css`; każda wypisuje, **co znika z wierzchu**. Pokaż w podglądzie i na telefonie.
4. **Czekaj na wybór**; zapisz w `docs/decyzje.md` wariant, powody i odrzucone opcje.

### 3.3 Nowy panel i menu

Według makiety. Najpierw przenieś to, co jest, bez zmiany działania; potem nowe miejsca. Menu budowane z `ACT`. Testy: `style.spec.js`, `menu.spec.js`, `topbar.spec.js`, `touch.spec.js`. Prototyp usuń po wdrożeniu (za zgodą).

### 3.4 Przyciski „+” przy zaznaczonym węźle

Decyzja 2026-11-26 (wzór: SimpleMind, wariant 1): tylko przy zaznaczonym węźle, na komputerze i dotyku. „+” dziecko – po stronie dzieci, na środku wysokości (korzeń w „na obie strony” – z obu stron); „+” brat poniżej – w dolnym rogu od strony rodzica; na dotyku ok. 28 px. Klik dodaje węzeł i od razu otwiera edycję. Założenia: korzeń bez „+” brata; w „w dół” przyciski obrócone; schowane w trakcie edycji i przeciągania; poza eksportem SVG/PNG. Pasek narzędzi przy węźle – tylko jeśli przewiduje go 3.2. Testy: `touch.spec.js`, `menu.spec.js`.

### 3.5 Panel właściwości węzła – tylko jeśli jest w projekcie

**Pominięte** (decyzja 2026-11-27, `docs/decyzje.md`): projekt 3.2 nie przewiduje panelu; notatka, link i zadanie z „⋯” na pasku nad węzłem.

Jeden opis pól (nazwa, rodzaj, odczyt i zapis do węzła) buduje panel; każda zmiana to `snap()` / `changed()`. Jeśli projekt go nie przewiduje – pomiń i zapisz w `docs/decyzje.md`.

### 3.6 Widok drzewa

Trzeci widok obok „Mapa” i „.md”, **na cały ekran** (decyzja 2026-11-26; odrzucone: panel obok mapy). Co da się w nim robić – z wywiadu 3.2, bez drugiej drogi do tego, co już jest. Testy w `view.spec.js`.

## R.2 Testy utrwalające dzisiejsze zachowanie (przed etapem 4)

Przeniesione z etapu R (2026-11-27): etapy 4 i 5 zmieniają `parse`, `fit` i `nodeHTML`, więc testy przydają się wcześniej. Tylko testy, bez zmian w `www/`: przeciąganie w każdym układzie i przy wielu korzeniach, nawigacja strzałkami i `hjkl` na granicach map, zapis wszystkich znaczników, cofanie po każdej operacji z `ops.js`. Zakres pokaż użytkownikowi przed pisaniem.

## Etap 4 – Treść węzła

`parse()` (`core.js`) rozpoznaje tytuł, elementy listy, wcięte linie pod punktem (dalsze linie węzła), `<!--layout…-->` / `<!--style…-->` pod pierwszym tytułem i frontmatter; **inne linie pomija i liczy**. Rozszerzenie nie może pomylić swojego zapisu z dalszą linią węzła. Tekst w modelu zostaje surowym Markdownem; edycja pokazuje źródło, mapa – wersję wyrenderowaną. `tw`, `wrap`, `fit` mierzą **tekst wyświetlany** (np. bez `](url)`); każdy wyróżniony fragment to osobny `<tspan>`, jak emoji. Przy każdym zadaniu – zasada 0.18.

### 4.1 Notatki do węzła 🗳

Format (decyzja 2026-11-25): cytat `>` pod węzłem, w kolumnie treści (głębokość·2 + 2 spacje); kolejne linie `>` to ta sama notatka; wcięta linia bez `>` to dalszy ciąg tekstu węzła.

```markdown
- Węzeł
  druga linia węzła
  > Pierwsza linia notatki
  > druga linia notatki
  - Dziecko
```

Model `n.note?: string`. Na mapie ikona 📝; edycja według projektu 3.2; komenda `:note`. Notatka w eksporcie Markdown i w drzewku (3.6); w SVG/PNG tylko ikona.

### 4.2 Linki i obrazki 🗳

- `[tekst](url)` – „tekst” w kolorze gałęzi, podkreślony. Klik zaznacza jak dotąd; Ctrl/Cmd+klik albo ikona ↗ otwiera w nowej karcie (`noopener`); na dotyku – z menu.
- `![opis](url)` – miniatura nad tekstem, szerokość najwyżej `ST.maxw`, wliczona do `fit()`; do wczytania obrazka miejsce zarezerwowane.
- Eksport PNG z obrazkiem z innej domeny może się nie udać – wtedy `info()` z wyjaśnieniem, nigdy cicha awaria.

### 4.3 Zadania 🗳

Format `- [ ] tekst` / `- [x] tekst`, model `n.task?: 0 | 1`. Pole wyboru przed tekstem; przełączanie klikiem albo vim `t` (skrót zwykły ustal – Ctrl+Enter to „nowa linia” w edycji). Wykonane – przygaszone i przekreślone. Rodzic z zadaniami w dzieciach pokazuje „3/5”. Przełączenie da się cofnąć. Terminy – rozszerzenie 8.3.

### 4.4 Tagi i filtrowanie

Tag: `(^|\s)#[\p{L}\d_-]+` (flaga `u`), nie wewnątrz URL; wyświetlany jako pigułka w kolorze gałęzi. Klik w tag albo `:tag nazwa` włącza filtr: węzeł z tagiem **i jego potomkowie** pełnym kolorem, reszta przygaszona (ok. 0,25), układ bez zmian (decyzja 2026-11-26). `:tag` bez argumentu albo Esc wyłącza.

### 4.5 Tryb skupienia

`f` i `:focus` włączają i wyłączają, Esc wyłącza. Widać tylko ścieżkę od korzenia i poddrzewo zaznaczonego węzła; reszta ukryta i nie zajmuje miejsca (stan widoku, nie zapisuje się do pliku). Wejście i wyjście – istniejące sprężyny i „duchy”. Na pasku górnym klikalna ścieżka „Projekt › Marketing › Strona www” (decyzja 2026-11-26): klik przenosi skupienie.

### 4.6 Widok Markdown na żywo

Dziś widok Markdown (`:text`) zmienia mapę dopiero przy zamknięciu, a linie, których mapa nie pokaże, wywołują pytanie (A.7). Zadanie: mapa dogania tekst w trakcie pisania (ok. 300 ms po ostatnim klawiszu, przez `snap()` – da się cofnąć), zaznaczenie zostaje na węźle o tej samej ścieżce. Dopóki są linie, których mapa nie pokaże, model się nie zmienia, a `info()` raz podaje numer pierwszej takiej linii. Testy: akapit nie zmienia mapy; po poprawce mapa się aktualizuje.

### 4.7 Szablony przy nowej mapie

„Nowa mapa” i `:new` proponują pustą mapę albo 2–3 wbudowane szablony (SWOT, 5× Dlaczego, retrospektywa – zestaw potwierdź). Szablon trafia do bieżącego pliku jako nowa mapa. Własne szablony – etap 9.

### 4.8 `:lint` – sprawdzanie mapy

Lista problemów w trybie listy z 2.5, bez automatycznych poprawek: pusty węzeł, ten sam tekst u rodzeństwa, niepoprawny URL (tylko format), gałąź głębsza niż 7. Rozszerzenia dopisują reguły; pojedyncze reguły bez przełączników.

**Akceptacja etapu 4:** round-trip każdego rozszerzenia w `parser.spec.js`, testy interakcji, aktualne README i `HELP`.

## Etap 5 – Wygląd i animacje

5.1–5.6 bez przełączników (wyłącza je tylko `RM`); 5.7 zbiera zmiany wyglądu w motywy.

1. **Wyrastanie gałęzi:** krawędź `pathLength="1"` i `stroke-dashoffset` 1 → 0 przez ok. 200 ms; węzeł krycie 0 → 1 i skala 0,9 → 1 od ok. 60% czasu krawędzi; zwijanie – istniejące „duchy”. Test w `animation.spec.js` (`no-preference` i `reduce`).
2. **Lot kamery:** `go()`, skok do trafienia, `zz`, Shift+2 poza ekran – płynna zmiana `tx`, `ty` (i `k`) przez ok. 250 ms; ruch użytkownika przerywa lot.
3. **Ścieżka do korzenia:** krawędzie do zaznaczonego węzła z klasą `path` (odrobinę grubsze). Bez przyciemniania reszty.
4. **Licznik ukrytych:** zwinięty węzeł pokazuje „+N”.
5. **Poświata zaznaczenia:** `drop-shadow` w kolorze gałęzi zamiast ramki; poza eksportem. Pokaż „przed i po”.
6. **Ruch kreskami** tylko na krawędzi do miejsca upuszczenia przy przeciąganiu.
7. **Motywy mapy** (decyzja 2026-11-26, opcja C; prototyp `www/_prototyp/motywy/`). Wygląd zależy od **poziomu** (korzeń, poziom 1, głębsze), nigdy od węzła:
   - **Klasyczny** – dzisiejszy, domyślny;
   - **Minimalistyczny** – bez ramek i tła; duży pogrubiony korzeń; poziom 1 na grubej linii w kolorze gałęzi, głębsze mniejsze na cienkiej; linia gałęzi przechodzi w podkreślenie;
   - **Czytelny** – korzeń: ciemna pigułka; poziom 1: pigułka w kolorze gałęzi, tekst według luminancji; głębsze: jasne tło w kolorze gałęzi; większy tekst; kolanka z zaokrągleniem.

   Motyw to zestaw pól stylu: plik zapisuje tylko różnice od `DEF`, **bez klucza „motyw”**; panel rozpoznaje motyw po wartościach („Własny” po zmianie szczegółów); motyw nie zmienia palety. Nowe pola w `DEF` z wartościami dającymi dzisiejszy wygląd (np. `edgeStyle: 'round'`, grubość malejąca z poziomem, kształt węzła według poziomu). Testy w `style.spec.js`: każdy motyw ustawia swoje pola; „Klasyczny” zapisuje się bajt w bajt jak dziś; round-trip nowych pól. Organiczny i Odręczny – 7.5.

## Etap 6 – Poprawki układów (`layout.js`)

Bez elkjs; zmiany wyglądu istniejących map – „przed i po” i pytanie.

1. **Upakowanie wielu map** w siatkę metodą „półek”, w kolejności z pliku, w proporcjach okna.
2. **Zwarty układ „w dół”:** gdy wszystkie dzieci są liśćmi – pionowo pod rodzicem. Bez nowej pozycji w menu.
3. _(opcjonalnie, zapytaj)_ **Kompaktowe drzewo** (Reingold–Tilford).

---

# ROZSZERZENIA (etap 8, domyślnie wyłączone)

**Przed startem zapytaj, które i w jakiej kolejności.** 8.1, 8.4, 8.5, 8.6 – odrzucone.

### 8.0 Lista rozszerzeń 🗳

Tabela `EXT` (id, nazwa, opis); czynności w `ACT` dostają pole `ext`, więc wyłączone rozszerzenie znika z menu, palety i pomocy bez osobnego kodu. Lista z przełącznikami w miejscu z 3.2. **Karta:** gdzie pamiętać włączone (pamięć przeglądarki czy plik). Wyłączone nie zmienia zapisu pliku. Testy: menu, paleta i pomoc w obu stanach; plik bez zmian.

### 8.2 Szukanie zaawansowane (wzór: KFind)

Wielkość liter (Aa) i wyrażenie regularne (.*); filtry `depth:2`, `in:folded`, `is:task`, `is:done`, `has:note`, `has:link`, `#tag`, `due:`; znajdź i zamień `:s/stare/nowe/` (poddrzewo) i `:%s/stare/nowe/g` (plik) – jeden krok cofania, `info('zamieniono N')`. Testy w `search.spec.js`.

### 8.3 Terminy zadań 🗳

Format Obsidian Tasks: `- [ ] tekst 📅 2026-12-01`; data jako pigułka, po terminie wyróżniona; wybór daty w menu. Zapytaj o `✅ data` przy odhaczaniu. Filtr `due:` i reguła `:lint`. Wyłączone – data widoczna jako zwykły tekst.

### 8.7 Tryb prezentacji (wzór: Xmind)

`:present`: slajd = węzeł w kolejności z pliku do wybranej głębokości (domyślnie 2); lot kamery (5.2), reszta przygaszona; układ bez zmian. → / Spacja / PageDown, ← / PageUp, Esc; na telefonie przesunięcie palcem; pełny ekran, jeśli dostępny. Stan widoku, nie zapisuje się.

---

# NA KONIEC (nadal PWA)

## Etap R – Przygotowanie kodu przed trudnymi funkcjami

Działanie i wygląd bez zmian: istniejące testy przechodzą bez zmian (wolno dopisywać), plik bajt w bajt, pomiar z A.2 przed i po; jedna zmiana = jeden commit.

- **R.1 Przegląd i plan ⏸** – miejsca, których dotknie etap X: `sel` (`ops.js`, `keys.js`, `menu.js`, `dnd.js`), kod zależny od `dir` (`lay`, `layD`, `edgeD`, `arrow`, upuszczanie w `dnd.js`, `LAY`), znaczniki w `serialize()`, przebudowa DOM w `render()`. Pokaż R.3–R.8 z oceną kosztu i potrzeby; niepotrzebne pomiń (zapis w `docs/decyzje.md`).
- **R.3 Stan w nazwanych obiektach** – zmienne globalne (`sel`, `tx`, `ty`, `k`, `dir`, `editing`, `dnd`…) w kilku obiektach (np. `view`, `doc`, `ui`); nazwy pokaż przed zmianą; jeden obiekt na commit; dalej zwykłe skrypty.
- **R.4 Zaznaczenie jako lista** (przygotowanie 7.1) – operacje z `ops.js` i przeciąganie przyjmują listę węzłów (na razie zawsze jeden). Zasady: węzeł i jego potomek naraz → tylko przodek; kolejność według pliku; jedna operacja = jeden krok cofania.
- **R.5 Znaczniki na końcu linii i identyfikator węzła 🗳** (przygotowanie 7.2, 7.3, 7.6) – jedna funkcja odczytu (dowolna kolejność) i zapisu (stała kolejność) znaczników; trwały identyfikator węzła, w pliku tylko tam, gdzie potrzebny. **Karta:** zapis identyfikatora (`^abc123` jak w Obsidianie albo `<!--id:abc123-->`; zasada 0.18) i relacji z kierunkiem strzałek. Testy: identyfikator przeżywa przeniesienie, cofanie, ponowienie, wycięcie i wklejenie; kopia dostaje nowy.
- **R.6 Układ jako jeden opis** (przygotowanie 6.4, 7.3, 7.5) – np. `LAYOUTS.right = { lay, edge, nav, drop, name, icon }`; najpierw 4 istniejące układy bez zmian działania.
- **R.7 Warstwy rysowania** (przygotowanie 7.2–7.6) – pod krawędziami, krawędzie, węzły, nad węzłami; każda warstwa mówi, czy trafia do eksportu.
- **R.8 Rysowanie bez przebudowy całej mapy** – tylko jeśli pomiar pokaże potrzebę; aktualizacja według `data-id`; nie ruszaj własnego wykrywania dwukliku (`CLAUDE.md`).

## Etap X – Trudne funkcje (od najmniej ryzykownej)

Każde zadanie zaczyna się od sprawdzenia, czy przygotowanie z R jest gotowe; zamiast obejścia – wróć do R.

- **7.4 Minimapa** (R.7) – podgląd pliku z prostokątem widoku, klik i przeciąganie przesuwa widok; pojawia się sama, gdy mapa się nie mieści; nie na telefonie, nie w pliku, nie w eksporcie.
- **7.1 Zaznaczanie wielu węzłów** (R.4) – Shift+klik, vim `v` + ruch, lasso Shift+przeciąganie tła; gest na dotyku ustal. Operacje: usuń, kopiuj / wytnij, przeciągnij, zwiń / rozwiń, wsuń / wysuń, przełącz zadanie. `sel` zostaje głównym węzłem, lista (np. `msel`) – do słowniczka w `CLAUDE.md`. Testy: `multiselect.spec.js`, `dnd.spec.js`.
- **7.5 Motywy Organiczny i Odręczny** (R.6, R.7) – Organiczny: koła malejące od korzenia, grube gałęzie zwężające się, krzywe od środka do środka. Odręczny: drżące podwójne linie (stałe dla węzła, także w eksporcie), kreskowanie, owal / prostokąt / kreska według poziomu. **Karta (czcionka):** darmowa czcionka odręczna (np. Excalifont, OFL) – rozmiar, licencja, plik w `www/` i `sw.js`.
- **6.4 Układ radialny** (R.6) – osobny plik i wpis; `:layout radial`, `<!--layout:radial-->`; korzeń w środku, poziomy na okręgach, kąt poddrzewa proporcjonalny do liczby liści (Eades), promień rośnie do braku nakładania; tekst poziomo; nawigacja → na zewnątrz, ← do środka, ↑ / ↓ po kącie; przeciąganie i wiele korzeni. Testy: `layout.spec.js`, `navigation.spec.js`.
- **7.2 Relacje** (R.5, R.7) – zakrzywiona przerywana linia ze strzałką i etykietą, neutralny kolor, Bézier bez omijania przeszkód, **bez uchwytów**; domyślnie w jedną stronę, w menu „W obie strony” i „Odwróć kierunek”. „Połącz z…” w menu i palecie, potem wybór celu (`info('wybierz węzeł docelowy, Esc anuluje')`). Zawsze widoczne; w skupieniu tylko między widocznymi. Przeniesienie nie zrywa, usunięcie celu usuwa (cofnięcie przywraca). W eksporcie.
- **7.3 Klamra podsumowania 🗳** (7.1, R.5–R.7) – klamra przy kilku sąsiednich braciach z krótkim tekstem, bez dzieci; „Podsumuj” z zaznaczenia; zajmuje miejsce w układzie; co przy przeniesieniu lub usunięciu brata – ustal. **Karta:** zapis w pliku. W eksporcie.
- **7.6 Kartka 🗳** (R.5, R.7) – swobodna ramka z tekstem (legenda, tl;dr), dowolnie wiele, miejsce liczone od korzenia jej mapy; pasek edycji wstawia znaczniki Markdown. „Nowa kartka” w menu mapy i palecie. **Karta:** zapis czytelny w innym edytorze, niemylący się z węzłami ani z pominiętymi liniami. W eksporcie.

## Etap P – Poprawki wydajności

Tylko to, co przekracza progi z A.2, od najwolniejszego miejsca; osobny commit z pomiarem „przed i po”; działanie i wygląd bez zmian. Cel: 500 węzłów płynnie, także na telefonie (1000 nie jest celem).

---

# PO PWA – inne platformy

Zaczynamy dopiero, gdy użytkownik uzna PWA za gotową. **Pierwsza karta decyzji:** narzędzie i jego najnowsza wersja (np. Capacitor), wymagania Google Play co do wersji Androida (API), rozmiar narzędzi. Ustalone wcześniej: `appId` `io.github.piotrszostak.mindme`, nazwa pod ikoną „mindme” (decyzja 2026-11-26). Capacitor 6 usunięto z projektu 2026-11-27 (przy nim `npm audit` zgłaszał 5 ostrzeżeń, a szablon budował pod API 34, którego Google Play już nie przyjmuje). Czytaj dokumentację dla wybranej wersji.

- **T.2 Pierwszy APK 🗳** – biblioteka i `npx cap add android`; co z `android/` trafia do gita – według dokumentacji, klucze podpisu tylko w plikach z `.gitignore`. Narzędzia to 2–4 GB – zapytaj przed instalacją (A – sama linia poleceń i Java 17, polecana; B – Android Studio; C – APK w CI, inny klucz przy każdym budowaniu). W WebView sprawdź `/na-telefonie`: wklejanie, przytrzymanie, przeciąganie, klawiaturę ekranową.
- **T.3 Pliki na Androidzie** – systemowe okienka „Otwórz” i „Zapisz”, aplikacja pamięta plik i sama do niego zapisuje (wzór: Markor; bez przeglądarki plików). Biblioteka – karta (opcje, rozmiar, licencja, data wydania); bez budowania – wtyczka przez `Capacitor.Plugins`. Ochrona przed nadpisaniem jak w A.7.
- **T.4 „Udostępnij” do mindme** – udostępniony tekst to nowa mapa na końcu otwartego pliku, zaznaczona, ze strukturą jak przy wklejaniu (2.2); da się cofnąć. W PWA `share_target` w manifeście (Firefox na Androidzie go nie obsługuje – sprawdź inne przeglądarki), w APK wtyczka – karta biblioteki.
- **Aplikacja na Linuksa (Tauri)** – usunięta w A.5; wraca razem z `src-tauri/`, jeśli użytkownik poprosi.

---

## Etap 9 – Później (tylko na prośbę użytkownika)

- Import notatki Markdown (np. z Obsidiana) jako nowa mapa – nagłówki i listy to węzły, akapity, tabele i kod to notatki (wymaga 4.1); oryginał nietknięty.
- Eksport mapy jako dokument (nagłówki i akapity; wzór: Gingko Writer).
- Szybkie wpisywanie pomysłów; eksport i import PDF / OPML / FreeMind / Xmind; AI; historia wersji; współpraca na żywo (zob. 0.10).
- Układ dla jednej gałęzi (`<!--layout:nazwa-->` na końcu linii węzła); układy oś czasu i ość ryby; granice (obrys gałęzi).
- Eksport do Mermaid `mindmap` i do jednego pliku HTML ze zwijaniem (jak Markmap).
- Z Workflowy: stała ścieżka nad mapą, ukrywanie wykonanych zadań, węzły lustrzane. Z Freeplane i Logseq: style warunkowe, pola `klucz:: wartość`.
- Własne szablony z wybranego folderu.

## Odrzucone (nie proponuj ponownie)

- Burza mózgów z licznikiem i głosowaniem (aplikacja dla jednej osoby).
- Pełna zgodność z notatkami Obsidiana z przełącznikiem (zastąpiona ochroną: frontmatter zostaje, pominięte linie są liczone; import w etapie 9).
- Kalkulator w palecie; ranking palety według częstości (zostaje „5 ostatnio użytych”); paleta dla zaawansowanych (prefiksy `@`, `#`, własne komendy); osobne szukanie węzłów w palecie (jest 2.5).
- Zoom kontekstowy (węzły znikające przy oddalaniu); układ „konspekt drzewiasty” (dubluje 4.6); układ grawitacyjny z `<!--pin-->`.
- Osobne przełączniki wyglądu (są motywy 5.7); wygląd pojedynczego węzła; tło z kropek; zdjęcie w tle mapy; uchwyty do wyginania relacji; „+” po najechaniu myszą.
- Mechanizm wtyczek (wystarczy lista z flagami 8.0); grupowanie według tagu; folder jako vault, `[[wikilinki]]` i linki zwrotne (do tego jest Obsidian); ukryte aliasy klawiszy na przyszłość.
- Przeglądarka plików na Androidzie (wystarczą systemowe okienka); drzewko obok mapy (drzewko to osobny widok 3.6).

## Rozszerzenia formatu pliku

Każde wymaga karty decyzji (🗳) i zasady 0.18. Kolejność znaczników na końcu linii ustala R.5 (dziś tylko `<!--c-->`); parser przyjmuje je w dowolnej kolejności, zapis zawsze w tej samej.

| Zapis                                                             | Znaczenie                                     | Zadanie       |
| ----------------------------------------------------------------- | --------------------------------------------- | ------------- |
| frontmatter `---` … `---` na początku pliku                       | zachowany bez zmian, niewidoczny na mapie     | ✅ 2026-11-25 |
| wcięta linia tuż pod `- węzeł`                                    | dalszy ciąg tekstu węzła (Ctrl+Enter)         | ✅ 2026-11-25 |
| cytat `>` pod `- węzeł`                                           | notatka                                       | 4.1           |
| `[tekst](url)`, `![opis](url)`                                    | link, obrazek                                 | 4.2           |
| `- [ ] …` / `- [x] …`                                             | zadanie                                       | 4.3           |
| `#tag` w tekście                                                  | tag                                           | 4.4           |
| nowe pola w `<!--style:{…}-->`                                    | motywy mapy                                   | 5.7, 7.5      |
| `<!--layout:radial-->`                                            | układ radialny                                | 6.4           |
| identyfikator węzła i relacja (do ustalenia)                      | relacje                                       | R.5, 7.2      |
| klamra przy kilku braciach (do ustalenia)                         | podsumowanie                                  | 7.3           |
| kartka z miejscem liczonym od korzenia (do ustalenia)             | kartka                                        | 7.6           |
| `📅 RRRR-MM-DD` (może też `✅ RRRR-MM-DD`)                        | termin zadania (rozszerzenie)                 | 8.3           |
