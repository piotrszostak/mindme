# Plan rozwoju mindme – instrukcje dla agenta

Przed pracą przeczytaj `CLAUDE.md`, `HANDOVER.md` (lokalny, poza gitem) i `docs/decyzje.md`. Realizuj zadania **po kolei, etapami**. Jedno zadanie to jeden commit.
Jeśli zadanie wymaga decyzji, której tu nie ma, zapytaj użytkownika. Nie zgaduj.

Plan przebudowany 2026-11-25: przegląd inspiracji (Vicinae, KFind, Obsidian i wtyczki, Miro, Workflow Builder, Xmind, MindNode), a potem podział na **podstawę** i **rozszerzenia**. Zrobione: etapy 0 i 1 oraz zadania 2.1 i 2.2.

**Znaczniki:**
- **🗳 karta decyzji** – zadanie zmienia format pliku albo dodaje klucz w pamięci przeglądarki. Najpierw przedstaw opcje, zapisz wybór w `docs/decyzje.md`, dopiero potem koduj.
- **⏸ STOP** – zadanie kończy się pokazaniem wyniku albo pytaniem. Czekaj na zgodę użytkownika.

## Zasada nadrzędna: prostota

mindme ma być przede wszystkim **prosta, intuicyjna i przejrzysta**, a dopiero potem bogata w funkcje.
- **Nowa widoczna opcja** (przycisk, przełącznik, pozycja menu) musi coś zastąpić albo trafić do rozszerzeń (etap 8).
- **Jedna oczywista droga** do każdej czynności. Skrót zwykły i skrót vim to ta sama droga, nie dwie.
- **Najpierw ulepszaj to, co jest**, a dopiero potem dodawaj nowe.
- **Ustawienia domyślne są najprostsze** i dają dzisiejszy wygląd. Zmiana wyglądu istniejących map wymaga pokazania użytkownikowi „przed i po” oraz jego zgody.
- **Podstawa** jest zawsze włączona i nie ma przełączników „włącz / wyłącz funkcję”. **Rozszerzenia** są domyślnie wyłączone; wyłączone nie pojawiają się w menu, palecie ani pomocy, a ich zapis w pliku zostaje bez zmian (widać go jako zwykły tekst).
- Jeśli zadanie da się zrobić prościej, niż tu opisano, zaproponuj to przed kodowaniem.

## 0. Zasady obowiązujące w każdym zadaniu

1. **Bez frameworka, bez budowania, bez nowych zależności w `www/`.** Algorytmy (układy, symulacja, dopasowanie fuzzy) pisz sam, w zwykłych skryptach.
2. **Plik `.md` pozostaje głównym źródłem danych.**
   - Nowe dane zapisuj jako standardowy Markdown albo komentarz `<!--…-->`.
   - Plik bez nowych funkcji musi się zapisywać **bajt w bajt tak samo jak dziś**.
   - Stare pliki muszą się otwierać bez zmian.
   - Każde rozszerzenie formatu wymaga: karty decyzji, testu round-trip w `tests/parser.spec.js`, rozszerzenia `selfTest()` (`:test`) oraz opisu w README („Format pliku”) i w `HELP` („Format pliku”).
3. **Model:** przed zmianą `snap()`, po zmianie `changed()`. Nowe pola węzła dopisz do `MapNode` w `types/globals.d.ts`. Nowe pola stylu dopisz do `DEF` (zapisują się tylko różnice od domyślnych).
4. **Nowy plik w `www/`:** dopisz go do `index.html` (we właściwej kolejności), do listy w `www/sw.js` i do mapy plików w `CLAUDE.md`.
5. **Skróty:** każda czynność ma jeden skrót zwykły i jeden vim. Nazwę i skróty wpisz w tabeli `ACT` (`actions.js`), z której biorą pomoc, menu i paleta komend. Naciśnięcie obsłuż w `normal()` (`keys.js`). Zaktualizuj `keys.spec.js` i tabelę w README.
   - Dawne klawisze mogą zostać jako ukryte aliasy: działają, ale nie ma ich w `HELP`, menu ani README.
   - Sprawdzaj `ev.code` tam, gdzie `ev.key` zależy od układu klawiatury (np. `Digit1`). Przy Caps Lock normalizuj literę według Shift.
   - **Kombinacje zakazane** (nie przypisuj im niczego):
     - `Ctrl+Alt+litera`: na Windowsie z polskim układem to AltGr (ą ć ę ł ń ó ś ź ż);
     - `Alt+litera`: menu Firefoksa, a na macOS znaki specjalne;
     - `Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `Ctrl+Tab`, `Ctrl+Shift+N`, `Ctrl+Shift+T`: przeglądarka ich nie oddaje;
     - `Ctrl+Spacja`: zmiana źródła wprowadzania na macOS;
     - `Ctrl+strzałki`: przełączanie pulpitów na macOS;
     - `Alt+1…8`: przełączanie kart w Chrome na Linuksie.
   - Skrót, którego przeglądarka może nie oddać (np. `Ctrl+H` – historia), najpierw sprawdź w Chromium i Firefoksie.
6. **Animacje:**
   - trwają 150–300 ms i sygnalizują wyłącznie zmianę;
   - wszystko, co wynika z jednej czynności (rozwinięcie, przesunięcie węzłów, lot kamery), dzieje się równocześnie i kończy w tym samym czasie; następna czynność w trakcie animacji przejmuje ruch od bieżącego miejsca, bez kolejki;
   - nic nie zapętla się bez końca;
   - wszystkie respektują `prefers-reduced-motion` (`RM` w `render.js`).
7. **Czytelność przed efektem.** Kolor przypisujemy do gałęzi, nie do pojedynczego węzła. Subtelne animacje nie mają przełącznika (wyłącza je tylko `RM`). Efekty ozdobne, które zmieniają wygląd mapy w spoczynku (np. tło z kropek, styl odręczny), wchodzą tylko w skład motywu (5.7). Wskazówki stanu (ścieżka do korzenia, licznik ukrytych, poświata zaznaczenia z 5.3–5.5) nie są efektami ozdobnymi: działają zawsze, bez przełącznika.
8. **Po każdej zmianie** uruchom `npm run check` i testy danego obszaru. **Przed commitem** uruchom `npm run verify`. Na koniec każdego etapu zaktualizuj `HANDOVER.md`.
9. Interfejs jest po polsku. Użytkownik nie jest frontendowcem, więc w podsumowaniach tłumacz krótko.
10. **Aplikacja dla jednej osoby.** Nie dodawaj funkcji pracy grupowej (głosowanie, liczniki warsztatowe, współpraca na żywo) bez wyraźnej zgody.
11. **Błąd: najpierw test, który pada.** Przy naprawie najpierw napisz test odtwarzający błąd (musi nie przejść), potem poprawka. Gdy nie wiesz, jak odtworzyć błąd, zapytaj użytkownika o kroki.
12. **Wtyczki.** Od zadania 3.1 każda nowa funkcja (podstawy i rozszerzeń) to osobny plik zgłoszony przez mechanizm wtyczek: treść węzła (etap 4), nowe układy (6.4–6.7), relacje, granice i podsumowania, minimapa (7.2–7.4) oraz wszystkie rozszerzenia (etap 8). W głównych plikach zostają zmiany tego, co już jest: edytowalny konspekt (4.6), animacje i wskazówki (5.1–5.6), motywy (5.7), poprawki układów (6.1–6.3) i zaznaczanie wielu węzłów (7.1 – zmienia model zaznaczenia, z którego korzystają wszystkie operacje).
13. **Nowa cecha węzła** (notatka, link, zadanie, tag) może zgłosić filtr dla rozszerzenia „Szukanie zaawansowane” (8.2) i pole w panelu właściwości, jeśli panel powstanie (3.5).
14. **Testy w obu przeglądarkach:** testy skrótów, szukania i schowka działają też w Firefoksie. Nowy plik z takimi testami dopisz do `testMatch` projektu `firefox` w `playwright.config.js`.
15. Zmiany dotyku, przeciągania i płynności sprawdź też na telefonie (`/na-telefonie`).

---

## Etap 0 – Porządki i bezpieczeństwo danych

### 0.1 Dziennik decyzji ✅ zrobione

- Decyzje z 2026-11-25 przeniesione do `docs/decyzje.md`. Nowe decyzje trafiają od razu tam.

### 0.2 Ochrona przed utratą danych ✅ zrobione

Frontmatter zostaje w pliku bez zmian; linie, których mapa nie pokazuje, są liczone przy otwarciu, a taki plik nie zapisuje się sam (przy zapisie okienko: Zapisz jako nowy plik / Nadpisz / Anuluj). Szczegóły w `docs/decyzje.md` i w historii gita.

## Etap 1 – Skróty klawiszowe ✅ zrobione

Poprawki (Backspace, Ctrl+Shift+Z, Shift+Tab), nowe skróty i paleta komend (Ctrl+K, „:”). Szczegóły w historii gita i w `docs/decyzje.md`. Zasady skrótów przeniesiono do punktu 0.5.

---

# PODSTAWA (etapy 2–7)

## Etap 2 – Szukanie, schowek i paleta komend

### 2.1 Szukanie Ctrl+F i „/” ✅ zrobione

Testy obu trybów w `search.spec.js` (Chromium i Firefox). Naprawione: drugi Ctrl+F w otwartym polu otwierał szukanie przeglądarki, a kliknięcie mapy przy otwartym polu zostawiało martwe klawisze.

### 2.2 Wklejanie ze schowka systemowego ✅ zrobione

`p` / `P` zawsze wklejają z wewnętrznego schowka. Ctrl+V / Ctrl+Shift+V wklejają tekst z innych aplikacji: lista z wcięciami daje hierarchię, kolejne zwykłe linie – jeden węzeł z kilkoma liniami, HTML z nagłówkami i listami – strukturę. Na dotyku „Wklej” w menu czyta schowek systemowy, a bez dostępu (http, Firefox na Androidzie) otwiera okienko „wklej tutaj”. Testy w `clipboard.spec.js`, decyzje w `docs/decyzje.md`.

### 2.3 Wyszukiwanie przybliżone (fuzzy) w palecie

- Litery zapytania mają wystąpić w nazwie w tej kolejności, ale niekoniecznie obok siebie („zwwsz” → „Zwiń wszystko”). Słowa rozdzielone spacją dalej działają w dowolnej kolejności, każde dopasowane osobno. Bez polskich znaków i wielkości liter (`plain()`).
- Ocena: premia za początek słowa, za litery leżące obok siebie i za dopasowanie od początku nazwy, kara za przerwy. Lista według oceny, a przy równej ocenie – 5 ostatnio użytych (jak dziś), potem stała kolejność.
- Dopasowane litery są wyróżnione. Tekst wstawiaj przez `textContent` i osobne elementy, nigdy przez `innerHTML` z tekstu użytkownika.
- **Karta decyzji przed kodem:** jak wyglądają wyróżnione litery (np. pogrubienie, kolor akcentu, podkreślenie) – pokaż w obu motywach.
- Dotychczasowe testy palety (np. „zw wsz”) zostają. Dopisz testy dopasowania przybliżonego i kolejności.

### 2.4 Wygląd paska przewijania

- Cienki pasek w kolorach motywu (jasnego i ciemnego): `scrollbar-width: thin` i `scrollbar-color` (Firefox) oraz `::-webkit-scrollbar` (Chromium, Android WebView).
- Jedna wspólna reguła w `app.css` dla wszystkich przewijanych miejsc: paleta, panel „Wygląd mapy”, widok Markdown, pomoc, okienko emoji.
- Sprawdź w podglądzie w obu motywach i w rozmiarze telefonu. Przed commitem pokaż użytkownikowi zrzut ekranu.

### 2.5 Lista wszystkich trafień

Jedna droga do szukania węzłów: Ctrl+F i „/” skaczą po trafieniach, a gdy chcesz zobaczyć wszystkie naraz, otwiera się lista w palecie. Paleta nie dostaje osobnego, drugiego szukania węzłów.
- W polu szukania **Alt+Enter** (sprawdź według punktu 0.5) albo przycisk „wszystkie” otwiera paletę w trybie „Trafienia (N)”: każde trafienie z tekstem i ścieżką od korzenia, napisaną drobnym, wyszarzonym tekstem.
- Enter albo klik przechodzi do węzła (`go`, z rozwinięciem zwiniętych przodków). Esc zamyka listę. Tab i strzałki działają jak w palecie.
- Węzeł z kilkoma liniami zajmuje na liście jedną linię – jak ją pokazać (np. linie złączone „ · ”), ustal z użytkownikiem.
- Tego samego trybu listy użyje `:lint` (4.8).
- Szukanie bez polskich znaków i wielkości liter, jak w palecie („zolw” znajduje „Żółw”). Dotyczy całego szukania: Ctrl+F, „/”, n / N i listy trafień, żeby liczba trafień wszędzie była ta sama. To założenie zmienia dzisiejsze zachowanie, więc potwierdź je z użytkownikiem.
- Testy w `search.spec.js` i `palette.spec.js`.

### 2.6 Podpowiedzi klawiszy (which-key)

- Po naciśnięciu w trybie mapy prefiksu vim (`z`, `g`, `y`, `d`, także po liczniku) i odczekaniu ok. 400 ms pojawia się dymek z możliwymi kontynuacjami i ich nazwami, np. `za` zwiń / rozwiń, `zM`, `zR`, `z1…z9`, `zz`.
- Źródło treści: tabela `ACT` (pola `v`), bez kopiowania.
- Kolejny klawisz albo Esc zamyka dymek. Szybko wpisana cała sekwencja nie pokazuje go wcale, więc dymek nie przeszkadza i **nie ma przełącznika**. Animacja zgodnie z punktem 0.6.
- Testy w `keys.spec.js`, także w Firefoksie.

**Akceptacja etapu 2:** testy w `search.spec.js`, `clipboard.spec.js`, `palette.spec.js` i `keys.spec.js` przechodzą w Chromium i Firefoksie; README i `HELP` są aktualne.

---

## Etap 3 – Fundament: wtyczki, panel boczny i menu

### 3.1 Mechanizm wtyczek i rozszerzeń (wzór: Workflow Builder)

Cel: każda nowa funkcja to jeden plik, który sam się zgłasza (zob. 0.12). Rozszerzenia (etap 8) da się włączać i wyłączać bez psucia reszty.
- Globalny rejestr (np. `FEAT` w nowym `www/js/feat.js`, wczytywanym przed plikami funkcji), bo pliki nie są modułami.
- **Punkty zaczepienia**, czyli miejsca, w których wtyczka podłącza się do aplikacji. Funkcja zgłasza:
  - czynności (`ACT`);
  - rozszerzenia parsera i zapisu: znaczniki na końcu linii, linie pod węzłem, początek elementu listy (np. `[ ]` zadania);
  - rysowanie węzła: ikony i znaczniki przy węźle, wyróżnione fragmenty tekstu (linki, tagi) liczone przy pomiarze w `fit()`, obrazek nad tekstem, klik w taki element;
  - widoczność węzłów: ukrycie (tryb skupienia) i przyciemnienie (filtr tagów);
  - **układy**: wpis w `LAY` (nazwa, ikona), obliczenie pozycji, kształt krawędzi (`edgeD`), nawigacja strzałkami (`arrow`) i zachowanie przy przeciąganiu (miejsca upuszczenia, przypinanie);
  - **warstwy**: rysunek pod węzłami albo nad nimi (np. granice, relacje, minimapa), z obsługą kliknięcia i informacją, czy trafia do eksportu SVG/PNG;
  - miejsce w układzie obok węzłów (np. klamra i węzeł podsumowania z 7.3);
  - reguły `:lint` (4.8), tryby palety (8.1), filtry szukania (8.2) i – opcjonalnie – pola panelu właściwości (3.5).
- Wpis funkcji mówi, czy to **podstawa** (zawsze włączona), czy **rozszerzenie** (domyślnie wyłączone). Stan rozszerzeń w pamięci przeglądarki (🗳 nowy klucz). Wyłączone rozszerzenie znika z `ACT`, menu, palety i pomocy, a jego zapis w pliku zostaje bez zmian.
- Na razie **bez przenoszenia istniejących funkcji i układów** – tylko punkty zaczepienia. Pierwsze prawdziwe układy i warstwy powstaną dopiero w etapach 6–7, więc każdy punkt zaczepienia ma test z małą wtyczką testową (`page.evaluate`). Całość sprawdzi się na notatkach (4.1).
- Gdy późniejsze zadanie potrzebuje punktu zaczepienia, którego tu nie ma, dopisz go w tym zadaniu.
- To duże zadanie: rób je w kilku commitach, po jednym na grupę punktów zaczepienia.
- Plik bez nowych funkcji zapisuje się bajt w bajt jak dziś. Wszystkie testy przechodzą bez zmian.
- Opisz mechanizm w `CLAUDE.md`: wpis w mapie plików i krótka instrukcja „jak dodać funkcję”.

### 3.2 Projekt panelu bocznego i menu ⏸ STOP

Panel „Wygląd mapy”, menu podręczne, menu „…” i menu układu trzeba przebudować, zanim dojdą nowe funkcje. **Cel: na wierzchu ma być mniej niż dziś.** W tym zadaniu robisz tylko wywiad i makiety, **bez zmian w kodzie aplikacji**.
1. **Spis.** Co jest dziś w panelu i menu, a co dojdzie:
   - motywy mapy (5.7) w miejsce wielu przełączników wyglądu;
   - lista układów (w tym radialny, oś czasu, grawitacyjny, ość ryby);
   - przyciski „+” na dotyku; pasek narzędzi przy węźle na komputerze – tylko jeśli wywiad pokaże potrzebę;
   - minimapa, relacje, granice i podsumowania;
   - lista „Rozszerzenia” (etap 8) z krótkim opisem każdego;
   - pytanie otwarte: czy potrzebny jest panel właściwości węzła, czy wystarczy edycja na mapie i menu.
2. **Wywiad** (`/wypytaj`), np.:
   - co dziś przeszkadza i czego używasz najrzadziej;
   - co jest ważniejsze: komputer czy telefon;
   - czy panel ma być z boku, czy na telefonie wysuwany od dołu;
   - czy ma być zawsze widoczny, czy na żądanie;
   - podział na „Mapa”, „Węzeł” i „Ustawienia aplikacji”;
   - ikony czy podpisy.
3. **Makiety** (`/prototyp`, `www/_prototyp/panel/`): 2–3 warianty, każdy w rozmiarze komputera i telefonu, w obu motywach, ze zmiennymi kolorów z `app.css`. Każda makieta wypisuje, **co znika z wierzchu** w porównaniu z dziś. Pokaż je w panelu podglądu i na telefonie (`/na-telefonie`).
4. **Czekaj na wybór użytkownika.** Zapisz decyzję w `docs/decyzje.md`: wariant, powody, odrzucone opcje.

### 3.3 Nowy panel boczny i menu

- Według zatwierdzonej makiety. Najpierw przenieś to, co już istnieje („Wygląd mapy”, menu), bez zmiany działania; dopiero potem dodaj nowe miejsca (w tym listę „Rozszerzenia”).
- Menu budowane z `ACT` (grupy czynności), bez kopiowania treści.
- Zaktualizuj `style.spec.js`, `menu.spec.js`, `topbar.spec.js` i `touch.spec.js`. Prototyp usuń po wdrożeniu, jeśli użytkownik się zgodzi.

### 3.4 Przyciski „+” na dotyku (i pasek przy węźle, jeśli jest w projekcie)

- Na dotyku przyciski „+” przy zaznaczonym węźle: dziecko po stronie dzieci (zależnie od układu), brat obok, zgodnie z kierunkiem układu.
- Pasek narzędzi nad zaznaczonym węzłem na komputerze – tylko jeśli przewiduje go zatwierdzony projekt; zestaw akcji z wywiadu.
- Nie trafiają do eksportu SVG/PNG.
- Testy w `touch.spec.js` i `menu.spec.js`.

### 3.5 Panel właściwości węzła – tylko jeśli jest w projekcie

- Jeśli zatwierdzony projekt (3.2) przewiduje panel właściwości: jeden opis pól (nazwa, rodzaj: tekst / wybór / data / przełącznik / lista tagów, odczyt i zapis do węzła) buduje panel (wzór: panele ze schematu w Workflow Builderze). Funkcje dopisują swoje pola przez mechanizm z 3.1.
- Każda zmiana w panelu to `snap()` i `changed()`, więc da się ją cofnąć.
- Jeśli projekt panelu nie przewiduje, pomiń to zadanie i zapisz to w `docs/decyzje.md`.

---

## Etap 4 – Treść węzła

Każda funkcja z tego etapu to wtyczka podstawy (3.1), poza 4.6, które zmienia istniejący widok Markdown.

Uwaga do parsera: `parse()` w `core.js` rozpoznaje tytuł mapy, elementy listy, wcięte linie tuż pod punktem (dalsze linie tekstu węzła), znaczniki `<!--layout…-->` / `<!--style…-->` i frontmatter; **inne linie pomija i liczy** (licznik z 0.2). Każde rozszerzenie musi to uwzględnić i nie może pomylić swojego zapisu z dalszą linią tekstu węzła.
Tekst węzła w modelu pozostaje surowym Markdownem: edycja w węźle pokazuje źródło, a widok mapy pokazuje wersję wyrenderowaną.
Przy pomiarze i zawijaniu (`tw`, `wrap`, `fit` w `layout.js`) mierz **tekst wyświetlany**, np. bez `](url)`. Każdy wyróżniony fragment rysuj osobnym `<tspan>`, tak jak emoji.

### 4.1 Notatki do węzła 🗳

- **Format** (decyzja 2026-11-25): cytat `>` pod węzłem, w kolumnie treści elementu listy (głębokość·2 + 2 spacje). Kolejne linie `>` należą do tej samej notatki. Wcięta linia bez `>` to dalszy ciąg tekstu węzła (wiele linii w węźle), nie notatka.
  ```markdown
  - Węzeł
    druga linia węzła
    > Pierwsza linia notatki
    > druga linia notatki
    - Dziecko
  ```
- Model: `n.note?: string`.
- Mapa: ikona 📝 przy węźle. Edycja notatki zgodnie z projektem z 3.2 (panel właściwości albo okienko pod węzłem). Komenda: `:note`. Filtr dla 8.2: `has:note`.
- Notatka trafia do eksportu Markdown i do widoku konspektu (4.6). Do eksportu SVG/PNG trafia tylko ikona.
- To pierwsza funkcja zbudowana jako wtyczka – sprawdza mechanizm z 3.1.

### 4.2 Linki i obrazki 🗳

- `[tekst](url)` wyświetla się jako „tekst” w kolorze gałęzi, z podkreśleniem.
  - Zwykły klik **zaznacza** węzeł, jak dotąd.
  - Ctrl/Cmd+klik albo mała ikona ↗ otwiera link w nowej karcie (`noopener`).
  - Na dotyku link otwiera się z menu podręcznego.
- `![opis](url)` wyświetla się jako miniatura nad tekstem, o szerokości najwyżej `ST.maxw`. Rozmiar wliczaj do `fit()`, a do czasu wczytania obrazka trzymaj miejsce.
- Eksport PNG: obrazki z innej domeny „brudzą” canvas. Jeśli eksport się nie uda, pokaż `info()` z wyjaśnieniem; nie może się wywrócić po cichu.
- Filtr dla 8.2: `has:link`.

### 4.3 Zadania 🗳

- **Format:** `- [ ] tekst` / `- [x] tekst`. Model: `n.task?: 0 | 1` (brak pola = to nie jest zadanie).
- Mapa: pole wyboru przed tekstem. Przełączanie: klik w pole albo vim **`t`**. Skrót zwykły ustal z użytkownikiem: Ctrl+Enter to dziś „nowa linia” w edycji węzła, więc w trybie mapy nie powinien znaczyć czegoś innego. Wykonane zadanie ma tekst przygaszony i przekreślony.
- Postęp: rodzic, który ma dzieci będące zadaniami, pokazuje mały znacznik „3/5”.
- Przełączenie stanu jest zmianą modelu (`snap` / `changed`), więc da się je cofnąć.
- Filtry dla 8.2: `is:task`, `is:done`. Terminy to rozszerzenie 8.3.

### 4.4 Tagi i filtrowanie

- Tag to `#słowo` poprzedzone początkiem tekstu lub spacją. Wzorzec: `(^|\s)#[\p{L}\d_-]+` z flagą `u`. Nie traktuj jako tagów `#` wewnątrz adresu URL.
- Tag wyświetla się jako „pigułka” w kolorze gałęzi.
- Filtrowanie włącza klik w tag albo `:tag nazwa`. Węzły bez tagu są przyciemnione (krycie ok. 0,25), a układ się nie zmienia. `:tag` bez argumentu albo Esc wyłącza filtr.
- Filtr dla 8.2: `#tag`. Tryb `#` w palecie i grupowanie według tagu to rozszerzenia (8.1, 8.4).

### 4.5 Tryb skupienia

- **`f`** i komenda `:focus` włączają i wyłączają tryb. Esc też go wyłącza.
- Widoczne są tylko: ścieżka od korzenia do zaznaczonego węzła oraz całe poddrzewo zaznaczonego węzła. Reszta jest ukryta i nie zajmuje miejsca – mapa układa się od nowa (stan widoku, **nie zapisuje się do pliku**). Przygaszanie zostaje dla filtra tagów (4.4), więc oba tryby wyglądają różnie.
- Wejście i wyjście animują istniejące sprężyny i „duchy”. Na pasku górnym widać wskaźnik „Skupienie: tekst węzła”.

### 4.6 Edytowalny widok konspektu

- Istniejący widok Markdown (`:text`, `toggleText` w `files.js`) staje się edytowalny.
- Zmiany w polu tekstowym (z opóźnieniem ok. 300 ms) są parsowane i zastępują model z `snap()`, więc można je cofnąć. Zaznaczenie zostaje na węźle o tej samej ścieżce, jeśli taki istnieje.
- **Tekst nie może zniknąć po cichu.** „Niepoprawny tekst” to taki, w którym parser pominąłby jakąś linię (licznik z 0.2 jest większy od zera), np. zwykły akapit albo „-” bez spacji w trakcie pisania. Wtedy model się nie zmienia, a `info()` raz podaje numer pierwszej takiej linii. Mapa dogania tekst, gdy wszystkie linie znów da się pokazać.
- Zamknięcie widoku, gdy takie linie zostały: okienko „Linie, których mapa nie pokaże (2), znikną.” z przyciskami **Wróć do tekstu** (domyślny) i **Zamknij mimo to**.
- Testy: akapit wpisany w pole nie zmienia mapy i zostaje w polu; po poprawieniu linii mapa się aktualizuje; zamknięcie widoku z takimi liniami pokazuje okienko, a oba przyciski działają.

### 4.7 Szablony przy nowej mapie

- „Nowa mapa” (i `:new`) proponuje pustą mapę albo jeden z 2–3 wbudowanych szablonów: SWOT, 5× Dlaczego, retrospektywa („Co poszło dobrze” / „Co poprawić” / „Działania”). Ostateczny zestaw potwierdź z użytkownikiem.
- Szablony jako stałe w JS albo pliki w `www/` (wtedy `sw.js`). Szablon trafia do bieżącego pliku jako nowa mapa (korzeń).
- Własne szablony z folderu to część rozszerzenia 8.5.

### 4.8 `:lint` – sprawdzanie mapy (wzór: walidacja w Workflow Builderze)

- `:lint` i pozycja w palecie. Lista problemów w trybie listy z 2.5; Enter albo klik przechodzi do węzła. Bez automatycznych poprawek.
- Reguły podstawy:
  - pusty węzeł;
  - ten sam tekst u rodzeństwa;
  - niepoprawny adres URL (tylko format, bez łączenia z siecią);
  - gałąź głębsza niż 7 poziomów.
- Rozszerzenia dopisują własne reguły (np. brakujący cel `[[linku]]` w 8.6, niewykonane zadanie po terminie w 8.3). Pojedyncze reguły nie mają przełączników.

**Akceptacja etapu 4:** round-trip każdego rozszerzenia formatu w `parser.spec.js`, testy interakcji w nowych lub istniejących plikach spec (`edit.spec.js`, `view.spec.js`, `menu.spec.js`, `search.spec.js`), aktualne README i `HELP`.

---

## Etap 5 – Wygląd i animacje (`render.js`, `layout.js`, panel z etapu 3, `app.css`)

Zadania 5.1–5.6 to subtelne animacje i wskazówki: **bez przełączników**, wyłącza je tylko `RM`. Zadanie 5.7 zbiera wszystkie zmiany wyglądu mapy w motywy. Cały etap zmienia to, co już jest, więc idzie w głównych plikach (zob. 0.12).

1. **Wyrastanie gałęzi.**
   - Nowy albo rozwijany węzeł: krawędź z `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset` od 1 do 0 przez ok. 200 ms.
   - Węzeł pojawia się z kryciem od 0 do 1 i skalą od 0,9 do 1, od ok. 60% czasu krawędzi.
   - Zwijanie pozostaje na istniejących „duchach”.
   - Test w `animation.spec.js`: z `no-preference` animacja kończy się w stanie końcowym, a z `reduce` stan końcowy jest od razu.
2. **Lot kamery.** Gdy `go()`, skok do wyniku wyszukiwania, `zz` lub Shift+2 wskazuje węzeł poza ekranem, `tx`, `ty` (i `k`) zmieniają się płynnie przez ok. 250 ms. Przesunięcie widoku przez użytkownika przerywa lot.
3. **Ścieżka do korzenia.** Krawędzie od korzenia do zaznaczonego węzła dostają klasę `path` (odrobinę grubsze i pełniejsze). Reszty nie przyciemniamy; przyciemnianie jest tylko przy filtrze tagów (4.4) i w trybie prezentacji (8.7). Tryb skupienia resztę ukrywa (4.5).
4. **Licznik ukrytych.** Zwinięty węzeł pokazuje znacznik „+N” (liczba ukrytych potomków) przy kółku zwijania.
5. **Poświata zaznaczenia.** Zamiast grubej ramki miękki `drop-shadow` w kolorze gałęzi. Sprawdź, że eksport SVG/PNG nie zawiera stanu zaznaczenia. To zmiana wyglądu zaznaczenia – pokaż „przed i po”.
6. **Ruch kreskami tylko przy przeciąganiu.** Animowane przesuwanie kresek (`stroke-dashoffset` w pętli) wyłącznie na krawędzi do aktualnego miejsca upuszczenia. Nigdzie indziej.
7. **Motywy mapy** (zamiast osobnych przełączników wyglądu).
   - W panelu „Wygląd mapy” 3 motywy z podglądem:
     - **Klasyczny** – dzisiejszy wygląd, domyślny;
     - **Lekki** – zaokrąglone kolanka, zwężające się gałęzie, styl zależny od poziomu;
     - **Odręczny** – linie i obramowania z drżeniem.
     Ostateczny zestaw i nazwy ustal w wywiadzie i makietach (3.2).
   - Motyw to zestaw wartości pól stylu. Plik zapisuje tylko pola różne od `DEF`, jak dziś – **bez nowego klucza „motyw”**. Panel rozpoznaje motyw po wartościach, a po zmianie szczegółów pokazuje „Własny”. Motyw nie zmienia palety kolorów.
   - Szczegóły pod „Więcej”: dzisiejsze opcje i nowe pola. Nowe pola w `DEF` mają wartości dające dzisiejszy wygląd:
     - `edgeStyle: 'round'` – zaokrąglone kolanko w `edgeD` dla obu kierunków; promień łuku `min(ST.radius, połowa krótszego odcinka)`;
     - `taper: false` – grubość linii maleje z poziomem: `max(1, ST.edge · (1 − 0.25·(głębokość−1)))`; wystarczy `stroke-width` zależne od głębokości;
     - `levels: false` – korzeń pogrubiony i większy; poziom 1 jako wypełniona „pigułka” w kolorze gałęzi, z kolorem tekstu dobranym kontrastowo według luminancji; głębsze poziomy bez ramki, z podkreśleniem w kolorze gałęzi;
     - `dots: false` – tło z kropek, które blednie przy oddalaniu i nie trafia do eksportu;
     - `sketch: false` – deterministyczne drżenie linii i obramowań (ziarno z id lub tekstu węzła, więc nic nie migocze przy przerysowaniu); czcionka odręczna opcjonalnie (plik czcionki w `www/` i `sw.js`, licencja OFL) – zapytaj. Eksport SVG/PNG w tym samym stylu.
   - Testy w `style.spec.js`: każdy motyw ustawia swoje pola; plik z motywem „Klasyczny” zapisuje się bajt w bajt jak dziś; round-trip nowych pól.

---

## Etap 6 – Układy

Najpierw poprawki istniejących układów (6.1–6.3, w `layout.js`), potem nowe. Każdy nowy układ (6.4–6.7) to osobna wtyczka zgłoszona przez punkt zaczepienia „układy” z 3.1 i wymaga:
- wpisu w `LAY` z ikoną i polską nazwą;
- obsługi `:layout nazwa` i `<!--layout:nazwa-->`;
- poprawnych krawędzi w `edgeD`;
- nawigacji strzałkami i `hjkl` zgodnej z kierunkiem układu;
- działającego przeciągania (`dnd.js`);
- obsługi wielu korzeni;
- testów w `layout.spec.js` i `navigation.spec.js`.

Bez elkjs; wszystko liczy deterministyczny kod własny. Zmiany wyglądu istniejących map (6.1–6.3) pokaż jako „przed i po” i zapytaj.

1. **Upakowanie wielu map** (dotyczy wszystkich układów). Korzenie rozmieszczone w siatce metodą „półek”, w kolejności z pliku, z proporcjami zbliżonymi do okna, a nie w jednej kolumnie.
2. **Zwarty układ „w dół”** (zamiast osobnego schematu organizacyjnego). Jeśli wszystkie dzieci węzła są liśćmi, układają się pionowo pod rodzicem, więc mapa nie rozjeżdża się na szerokość. Bez nowej pozycji w menu układów.
3. *(opcjonalnie, zapytaj przed rozpoczęciem)* **Kompaktowe drzewo** (zbijanie konturów poddrzew, Reingold–Tilford) jako ulepszenie istniejących układów.
4. **`radial` – układ radialny.**
   - Korzeń w środku, kolejne poziomy na współśrodkowych okręgach.
   - Wycinek kąta dla poddrzewa jest proporcjonalny do liczby jego liści (algorytm Eadesa).
   - Promień poziomu zwiększaj, aż prostokąty sąsiadów przestaną na siebie nachodzić.
   - Tekst zawsze poziomo. Węzeł z lewej połowy okręgu zaczepia krawędź po swojej prawej stronie.
   - Nawigacja: → na zewnątrz (dziecko), ← do środka (rodzic), ↑ / ↓ po kącie wśród rodzeństwa.
5. **`timeline` – oś czasu.** Węzły poziomu 1 na poziomej osi, głębsze poziomy ułożone w pionie, na przemian nad osią i pod nią.
6. **`force` – układ grawitacyjny.**
   - Symulacja liczona **„na sucho”** w `lay()` (ok. 300 kroków). Jej wynik to zwykłe pozycje docelowe, a animację nadal robią sprężyny. **Nie uruchamiaj symulacji na żywo** w pętli `requestAnimationFrame`.
   - Start deterministyczny z układu `radial`, więc ta sama mapa zawsze wygląda tak samo.
   - Siły: przyciąganie do rodzica (długość zależna od poziomu), poziomy trzymane na okręgach, kolizje prostokątów węzłów, odpychanie. Odpychanie „każdy z każdym” O(n²) wystarczy do kilkuset węzłów.
   - **W trakcie przeciągania symulacja stoi.** Sąsiedzi tylko lekko się rozsuwają z powodu kolizji. Po upuszczeniu następuje krótkie dociągnięcie (ok. 50 kroków od bieżących pozycji).
   - Upuszczenie na węzeł oznacza „zostań dzieckiem”. Kolejność rodzeństwa wynika z kąta wokół rodzica i to ona trafia do pliku.
   - Upuszczenie na pustym tle przypina węzeł: `<!--pin:x,y-->` na końcu linii węzła (🗳). To jedyna informacja o położeniu zapisywana w pliku. Odpięcie przez menu podręczne.
7. **`fishbone` – ość ryby.** Głowa (korzeń) po prawej, ości poziomu 1 skośne na przemian w górę i w dół, poziom 2 jako poziome żebra.

---

## Etap 7 – Struktura mapy

7.1 zmienia główne pliki (model zaznaczenia). Relacje, granice i podsumowania oraz minimapa (7.2–7.4) to wtyczki korzystające z warstw z 3.1.

### 7.1 Zaznaczanie wielu węzłów

- Shift+klik dodaje lub usuwa węzeł z zaznaczenia. Vim: `v` zaczyna zaznaczanie, ruch je rozszerza, Esc kończy. Lasso: Shift+przeciąganie tła myszą. Gest na dotyku ustal z użytkownikiem: przytrzymanie węzła i tła otwiera dziś menu (na tle przy tym odznacza).
- Operacje na wielu węzłach: usuń, kopiuj / wytnij (w schowku lista gałęzi), przeciągnij, zwiń / rozwiń, wsuń / wysuń, przełącz zadanie.
- Model: `sel` zostaje głównym (ostatnio zaznaczonym) węzłem, dochodzi zbiór zaznaczonych (np. `msel`). Dopisz go do słowniczka w `CLAUDE.md`.
- Testy w nowym `multiselect.spec.js` oraz w `dnd.spec.js`.

### 7.2 Relacje między gałęziami 🗳

- Format do ustalenia: identyfikator węzła (np. `^abc123` na końcu linii, jak bloki w Obsidianie, albo `<!--id:abc123-->`) i relacja na węźle źródłowym (np. `<!--rel:abc123 "etykieta"-->`). Identyfikator dostają tylko węzły, które biorą udział w relacji. Wybierz zapis, którego mogą później użyć wikilinki (8.6).
- Rysowanie: zakrzywiona, przerywana linia ze strzałką i etykietą, w neutralnym kolorze. Na start krzywa Béziera między krawędziami węzłów, bez omijania przeszkód.
- Tworzenie: „Połącz z…” w menu podręcznym i w palecie. Potem klik albo wybór węzła klawiszami i Enter wskazuje cel; `info('wybierz węzeł docelowy, Esc anuluje')`. Etykietę edytuje się dwuklikiem, relację usuwa z menu.
- Relacje są zawsze widoczne, bez przełącznika. W trybie skupienia widać tylko relacje między widocznymi węzłami.
- Przeniesienie węzła nie zrywa relacji (identyfikator jedzie z węzłem). Usunięcie celu usuwa relację, a cofnięcie ją przywraca.
- Działa we wszystkich układach. Eksport SVG/PNG zawiera relacje.

### 7.3 Granice i podsumowania 🗳

- **Granica:** obrys wokół gałęzi albo kilku sąsiednich braci (zaznaczenie z 7.1), z opcjonalnym podpisem, w kolorze gałęzi, półprzezroczysta.
- **Podsumowanie:** klamra przy kilku sąsiednich braciach i węzeł podsumowania za nią (w pierwszej wersji bez dzieci).
- Format do ustalenia (np. znaczniki na pierwszym i ostatnim bracie zakresu).
- `lay()` robi miejsce na klamrę i podsumowanie; granica dodaje tylko margines.

### 7.4 Minimapa

- Mały podgląd całego pliku (miejsce z projektu 3.2) z prostokątem widoku; klik i przeciąganie przesuwa widok.
- **Pokazuje się sama**, gdy mapa nie mieści się na ekranie, i znika, gdy się mieści (jak pasek przewijania). Bez przełącznika i bez pozycji w menu. Na wąskim ekranie (telefon) nie pokazuje się wcale. Nie zapisuje się do pliku i nie trafia do eksportu.
- Testy: pojawia się po przybliżeniu, znika po „Dopasuj całą mapę”, nie ma jej w rozmiarze telefonu ani w eksporcie SVG/PNG.

---

# ROZSZERZENIA (etap 8)

## Etap 8 – Rozszerzenia (domyślnie wyłączone)

Każde rozszerzenie jest wtyczką (3.1), ma wpis z krótkim opisem na liście „Rozszerzenia” i domyślnie jest wyłączone. **Przed startem etapu zapytaj użytkownika, które rozszerzenia i w jakiej kolejności zrobić.**

### 8.1 Paleta dla zaawansowanych

- Tryby z prefiksem: `@` – mapy (korzenie) w pliku, Enter skacze do mapy; `#` – tagi z liczbą węzłów, Enter włącza filtr (wymaga 4.4). W pustym polu krótka podpowiedź z listą prefiksów.
- **Strzałka w prawo** otwiera listę akcji dla podświetlonej pozycji, ale tylko gdy kursor stoi na końcu wpisanego tekstu. Strzałka w lewo albo Esc wraca. Tab nadal działa jak strzałka w dół. Akcje dla węzła na liście trafień: Idź · Przenieś zaznaczony tutaj (jako dziecko) · Wklej tutaj · Kopiuj gałąź · Połącz z… (7.2). Akcje dla polecenia: Uruchom · Pokaż opis i skróty.
- **Własne komendy** 🗳: nazwa i ciąg czynności z `ACT` (wzór: script commands w Vicinae), np. `:zwin-i-dopasuj` = `zM` + `=`. Gdzie zapisywać i jak tworzyć (`:alias` czy okienko) – karta decyzji.

### 8.2 Szukanie zaawansowane (wzór: KFind)

- Opcje w polu szukania: wielkość liter (Aa) i wyrażenie regularne (.*).
- Filtry w zapytaniu: `depth:2`, `in:folded` oraz zgłoszone przez inne funkcje (`is:task`, `is:done`, `has:note`, `has:link`, `#tag`, `due:`).
- Znajdź i zamień: vim `:s/stare/nowe/` (zaznaczony węzeł z poddrzewem) i `:%s/stare/nowe/g` (cały plik). Skrót zwykły ustal według punktu 0.5. Zamiana to jeden krok cofania; `info('zamieniono N')`.
- Testy w `search.spec.js`.

### 8.3 Terminy zadań 🗳

- Termin w formacie wtyczki Obsidian Tasks: `- [ ] tekst 📅 2026-12-01`. Na mapie data jako mała „pigułka” po tekście; niewykonane zadanie po terminie jest wyróżnione. Wybór daty w menu (albo w panelu właściwości, jeśli istnieje).
- Czy przy odhaczaniu dopisywać datę wykonania `✅ 2026-11-25` (jak Obsidian Tasks) – zapytaj.
- Filtr `due:` (składnię porównań ustal przy karcie decyzji) i reguła `:lint` „niewykonane zadanie po terminie”.
- **Terminy na osi czasu** (po 6.5): zadania z terminem rozmieszczone na osi według daty. Przed startem zapytaj, czy to osobny widok, czy wariant układu `timeline`.
- Wyłączone rozszerzenie: `📅 2026-12-01` widać jako zwykły tekst węzła.

### 8.4 Grupowanie według tagu (wzór: Miro)

- Czynność na zaznaczonym węźle: jego dzieci trafiają do nowych gałęzi nazwanych tagami (decyduje pierwszy tag dziecka); dzieci bez tagu zostają na miejscu. Jeden krok cofania.

### 8.5 Folder jako vault

- „Otwórz folder…” w menu „…” i w palecie (File System Access API, `showDirectoryPicker` – Chrome i Edge). W innych przeglądarkach i na Androidzie pozycja jest niedostępna, z powodem w palecie.
- Gdy folder jest otwarty, Ctrl+O otwiera paletę w trybie plików: pliki `.md` z folderu i podfolderów, dopasowanie fuzzy, Enter otwiera. Bez folderu Ctrl+O działa jak dziś.
- Co robić z niezapisanymi zmianami przy przełączaniu pliku – zapytaj.
- Pamiętanie folderu między sesjami (uchwyt w IndexedDB) – 🗳 nowe miejsce zapisu.
- Pliki, które nie są mapami (zwykłe notatki), otwierają się z ostrzeżeniem z zadania 0.2.
- Własne szablony: pliki `.md` z podfolderu `szablony/` pojawiają się obok wbudowanych (4.7).
- Testy: Playwright nie obsłuży okna wyboru folderu, więc listę i przełączanie testuj na podstawionym uchwycie w `page.evaluate`.

### 8.6 `[[Wikilinki]]` i linki zwrotne 🗳 (wymaga 8.5)

- `[[nazwa pliku]]`, `[[nazwa pliku#tekst węzła]]` i `[[nazwa|etykieta]]`, jak w Obsidianie. Wyświetlają się jak link (4.2); Ctrl+klik albo ↗ otwiera plik z folderu i zaznacza węzeł. Brakujący cel to wyszarzony link i reguła `:lint`.
- Bez folderu działa link do węzła w tym samym pliku: `[[#tekst węzła]]`.
- Podczas edycji po wpisaniu `[[` pojawiają się podpowiedzi plików i węzłów (fuzzy).
- Linki zwrotne: lista węzłów z innych plików folderu, które prowadzą do bieżącego pliku lub węzła (miejsce według projektu 3.2); klik przechodzi. Indeks budowany przy otwarciu folderu i odświeżany przy zapisie.
- Karta decyzji: link do węzła przez tekst węzła czy przez identyfikator z 7.2.

### 8.7 Tryb prezentacji (wzór: Pitch Mode w Xmind)

- `:present` i pozycja w palecie. Slajd to węzeł w kolejności z pliku, do wybranej głębokości (domyślnie 2). Kamera leci do węzła (5.2), reszta jest przygaszona jak przy filtrze tagów (4.4). Układ się nie zmienia, więc mapa nie skacze między slajdami.
- Dalej: → / Spacja / PageDown; wstecz: ← / PageUp; koniec: Esc; na telefonie przesunięcie palcem. Pełny ekran (Fullscreen API), jeśli jest dostępny.
- Stan widoku, nie zapisuje się do pliku. Z `RM` przejścia są natychmiastowe.

---

## Etap 9 – Później (nie zaczynaj bez zgody użytkownika)

- **Import notatki Markdown** (np. z Obsidiana): „Importuj notatkę…” tworzy nową mapę z kopii notatki – nagłówki i listy stają się węzłami, a akapity, tabele i kod notatkami tekstowymi (wymaga 4.1). Oryginał zostaje nietknięty; bez zapisu z powrotem do formatu notatki.
- Z dawnego etapu 5: szybkie wpisywanie pomysłów; eksport PDF / OPML / FreeMind / Xmind oraz import z nich; AI; historia wersji; bezpośredni zapis na Androidzie (`@capacitor/filesystem`); współpraca na żywo (zob. punkt 0.10).
- Układ dla jednej gałęzi (`<!--layout:nazwa-->` na końcu linii węzła).
- Odłożone 2026-11-25:
  - eksport do bloku Mermaid `mindmap` i do jednego pliku HTML ze zwijaniem (jak Markmap);
  - z Workflowy: ścieżka nad mapą, ukrywanie wykonanych zadań, węzły lustrzane;
  - z Freeplane: style warunkowe, pola `klucz:: wartość`.

## Odrzucone (nie proponuj ponownie)

- **Burza mózgów z licznikiem czasu i głosowaniem**: aplikacja jest dla jednej osoby.
- **Pełna zgodność z notatkami Obsidiana z przełącznikiem**: komplikuje model i każdą funkcję; zastąpiona przez 0.2 i import z etapu 9.
- **Kalkulator w palecie**: nie pasuje do mapy myśli.
- **Ranking palety według częstości i świeżości**: „5 ostatnio użytych” jest przewidywalne.
- **Zoom kontekstowy** (węzły znikające przy oddalaniu): zaskakuje; do zwijania poziomów jest `z1…z9`.
- **Układ „konspekt drzewiasty”**: dubluje edytowalny widok konspektu (4.6).
- **Osobne szukanie węzłów w palecie**: zastąpione listą trafień (2.5) – jedna droga szukania.
- **Osobne przełączniki wyglądu**: zastąpione motywami (5.7).

---

## Podsumowanie rozszerzeń formatu pliku

Każde wymaga karty decyzji przed startem (🗳).

| Zapis | Znaczenie | Zadanie |
|---|---|---|
| frontmatter `---` … `---` na początku pliku | zachowany bez zmian, niewidoczny na mapie | 0.2 |
| wcięta linia tuż pod `- węzeł` | dalszy ciąg tekstu węzła (wiele linii, Ctrl+Enter) | ✅ 2026-11-25 |
| cytat `>` pod `- węzeł` | notatka | 4.1 |
| `[tekst](url)`, `![opis](url)` | link, obrazek | 4.2 |
| `- [ ] …` / `- [x] …` | zadanie | 4.3 |
| `#tag` w tekście | tag | 4.4 |
| nowe pola w `<!--style:{…}-->`: `edgeStyle:"round"`, `taper`, `levels`, `dots`, `sketch` | motywy mapy | 5.7 |
| `<!--layout:radial\|timeline\|force\|fishbone-->` | nowe układy | 6 |
| `<!--pin:x,y-->` na końcu linii | przypięty węzeł (tylko układ `force`) | 6.6 |
| identyfikator węzła i relacja (do ustalenia) | relacje | 7.2 |
| granica, podsumowanie (do ustalenia) | granice i podsumowania | 7.3 |
| `📅 RRRR-MM-DD` (może też `✅ RRRR-MM-DD`) | termin zadania (rozszerzenie) | 8.3 |
| `[[plik]]`, `[[plik#węzeł]]`, `[[plik\|etykieta]]` | wikilink (rozszerzenie) | 8.6 |

Kolejność znaczników na końcu linii węzła: `tekst <!--pin:…--> <!--c-->`. Parser musi przyjmować je w dowolnej kolejności, a zapis zawsze w tej. Miejsce nowych znaczników (identyfikator, relacja) ustala karta decyzji.
