# Plan rozwoju mindme – instrukcje dla agenta

Przed pracą przeczytaj `CLAUDE.md` i `HANDOVER.md` (lokalny, poza gitem). Realizuj zadania **po kolei, etapami**. Jedno zadanie to jeden commit.
Jeśli zadanie wymaga decyzji, której tu nie ma, zapytaj użytkownika. Nie zgaduj.

## 0. Zasady obowiązujące w każdym zadaniu

1. **Bez frameworka, bez budowania, bez nowych zależności w `www/`.** Algorytmy (układy, symulacja) pisz sam, w zwykłych skryptach.
2. **Plik `.md` pozostaje głównym źródłem danych.**
   - Nowe dane zapisuj jako standardowy Markdown albo komentarz `<!--…-->`.
   - Plik bez nowych funkcji musi się zapisywać **bajt w bajt tak samo jak dziś**.
   - Stare pliki muszą się otwierać bez zmian.
   - Każde rozszerzenie formatu wymaga: testu round-trip w `tests/parser.spec.js`, rozszerzenia `selfTest()` (`:test`) oraz opisu w README („Format pliku”) i w `HELP` („Format pliku”).
3. **Model:** przed zmianą `snap()`, po zmianie `changed()`. Nowe pola węzła dopisz do `MapNode` w `types/globals.d.ts`. Nowe pola stylu dopisz do `DEF` (zapisują się tylko różnice od domyślnych).
4. **Nowy plik w `www/`:** dopisz go do `index.html` (we właściwej kolejności), do listy w `www/sw.js` i do mapy plików w `CLAUDE.md`.
5. **Skróty:** każda czynność ma jeden skrót zwykły i jeden vim. Nazwę i skróty wpisz w tabeli `ACT` (`actions.js`), z której biorą pomoc, menu podręczne i paleta komend. Naciśnięcie obsłuż w `normal()` (`keys.js`). Zaktualizuj `keys.spec.js` i tabelę w README.
6. **Animacje:**
   - trwają 150–300 ms i sygnalizują wyłącznie zmianę;
   - naraz działa najwyżej jedna;
   - nic nie zapętla się bez końca;
   - wszystkie respektują `prefers-reduced-motion` (`RM` w `render.js`).
7. **Czytelność przed efektem.** Kolor przypisujemy do gałęzi, nie do pojedynczego węzła. Nowe efekty wizualne mają przełącznik w panelu „Wygląd mapy”, chyba że zadanie mówi inaczej.
8. **Po każdej zmianie** uruchom `npm run check` i testy danego obszaru. **Przed commitem** uruchom `npm run verify`. Na koniec każdego etapu zaktualizuj `HANDOVER.md`.
9. Interfejs jest po polsku. Użytkownik nie jest frontendowcem, więc w podsumowaniach tłumacz krótko.

---

## Etap 1 – Skróty klawiszowe (`keys.js`, `edit.js`, `help.js`, `menu.js`)

**Cel:** brak klawiszy F w pomocy, standardy współczesnych aplikacji, częste czynności dostępne lewą ręką (Esc, Tab, Spacja, Shift, Ctrl, rząd 1–5, klawisze Q–T, A–G, Z–B).

### 1.1 Poprawki błędów (osobny commit)

- `Ctrl+Shift+Z` ma wywoływać `redo` (dziś `z: sh ? null : undo` nic nie robi).
- `Backspace` w trybie mapy ma usuwać węzeł jak `Delete`, bo Mac nie ma klawisza Delete.
- `Shift+Tab` w trybie mapy ma **wysuwać poziom** (`outdent`). Dziś dodaje dziecko, tak jak Tab.

### 1.2 Zmiany skrótów

| Czynność | Zwykły | vim | Uwagi |
|---|---|---|---|
| edytuj | **Spacja** | `i`, **`e`** | F2 zostaje jako ukryty alias |
| edytuj od pustego tekstu | – | **`c`** | jak vimowe `cc` |
| zwiń / rozwiń | **Shift+Spacja** | `za` | Spacja przestaje zwijać |
| brat poniżej / powyżej | Enter / Shift+Enter | `o` / `O`, **`s` / `S`** | `s` = sibling / sąsiad, dla lewej ręki |
| usuń | Del, **Backspace** | `x` | |
| ponów | **Ctrl+Shift+Z** | Ctrl+R | Ctrl+Y zostaje jako ukryty alias |
| następne / poprzednie trafienie | **Ctrl+G / Ctrl+Shift+G** | `n` / `N` | w polu szukania także Enter / Shift+Enter; F3 i Shift+F3 jako ukryte aliasy |
| wysuń poziom | **Shift+Tab**, Alt+← | `H` | |
| dopasuj całą mapę | **Shift+1** | `=` | sprawdzaj `ev.code === 'Digit1'`, bo `ev.key` zależy od układu klawiatury |
| pokaż zaznaczony węzeł | **Shift+2** | **`zz`** | `ev.code === 'Digit2'`; wyśrodkowanie, a przy Shift+2 także przybliżenie |
| duplikuj gałąź | **Ctrl+D** | – | nowa operacja `duplicate()` w `ops.js`; kopia wstawiona jako brat za oryginałem |
| paleta komend | **Ctrl+K** | `:` | zob. 1.4 |
| menu podręczne | klawisz Menu | – | Shift+F10 jako ukryty alias |
| pomoc | **Ctrl+/** | `?` | F1 jako ukryty alias |
| pokaż do poziomu N | – | **`z1`–`z9`** | zwija wszystko głębiej niż poziom N |

„Ukryty alias” oznacza, że skrót działa, ale nie ma go w `HELP`, w menu ani w README.

### 1.3 Pułapki do obsłużenia

- **`z` + cyfra.** W `normal()` liczenie cyfr (`cnt`) odbywa się *przed* sprawdzeniem `pend`. Gdy `pend === 'z'`, cyfrę trzeba obsłużyć jako `zN`, a nie jako licznik.
- **Caps Lock.** Gdy `ev.getModifierState('CapsLock')`, normalizuj literę według Shift. Inaczej `j` zamienia się w `J` i zamiast poruszać, przesuwa węzły.
- **Kombinacje zakazane** (nie przypisuj im niczego):
  - `Ctrl+Alt+litera`: na Windowsie z polskim układem to AltGr (ą ć ę ł ń ó ś ź ż);
  - `Alt+litera`: menu Firefoksa, a na macOS znaki specjalne;
  - `Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `Ctrl+Tab`, `Ctrl+Shift+N`, `Ctrl+Shift+T`: przeglądarka ich nie oddaje;
  - `Ctrl+Spacja`: zmiana źródła wprowadzania na macOS;
  - `Ctrl+strzałki`: przełączanie pulpitów na macOS;
  - `Alt+1…8`: przełączanie kart w Chrome na Linuksie.
- Skróty działają tylko w trybie mapy. W trybie edycji Spacja nadal wpisuje spację.

### 1.4 Paleta komend (Ctrl+K)

- Pole jak `#cmd` z listą wszystkich czynności: nazwa po polsku, skrót zwykły i vim. Lista filtruje się podczas pisania (dopasowanie bez polskich znaków i bez rozróżniania wielkości liter).
- Uruchomienie: Enter. Wybór: ↑ / ↓. Zamknięcie: Esc.
- Źródłem listy ma być jedna tablica czynności, z której korzystają też `HELP` i `ctxMenu`. Bez kopiowania treści w trzech miejscach.
- Komendy `:` dalej działają.

**Akceptacja etapu 1:** testy w `keys.spec.js` dla każdego nowego i zmienionego skrótu, także w Firefoksie. Dodatkowo test, że w treści `HELP` nie ma „F1”, „F2”, „F3” ani „F10”.

---

## Etap 2 – Funkcje (format pliku i interakcja)

Uwaga do parsera: `parse()` w `core.js` **pomija linie, które nie są nagłówkiem ani elementem listy**. Każde rozszerzenie musi to uwzględnić.
Tekst węzła w modelu pozostaje surowym Markdownem: edycja w węźle pokazuje źródło, a widok mapy pokazuje wersję wyrenderowaną.
Przy pomiarze i zawijaniu (`tw`, `wrap`, `fit` w `layout.js`) mierz **tekst wyświetlany**, np. bez `](url)`. Każdy wyróżniony fragment rysuj osobnym `<tspan>`, tak jak emoji.

### 2.1 Notatki do węzła

- **Format:** wcięty akapit pod węzłem, w kolumnie treści elementu listy (głębokość·2 + 2 spacje). Kolejne takie linie należą do tej samej notatki.
  ```markdown
  - Węzeł
    Pierwsza linia notatki
    druga linia notatki
    - Dziecko
  ```
- Model: `n.note?: string`.
- Mapa: ikona 📝 przy węźle. Klik w ikonę albo pozycja „Notatka…” w menu podręcznym otwiera popover z polem tekstowym pod węzłem. Komenda: `:note`.
- Notatka trafia do eksportu Markdown i do widoku konspektu (2.6). Do eksportu SVG/PNG trafia tylko ikona.

### 2.2 Linki i obrazki

- `[tekst](url)` wyświetla się jako „tekst” w kolorze gałęzi, z podkreśleniem.
  - Zwykły klik **zaznacza** węzeł, jak dotąd.
  - Ctrl/Cmd+klik albo mała ikona ↗ otwiera link w nowej karcie (`noopener`).
  - Na dotyku link otwiera się z menu podręcznego.
- `![opis](url)` wyświetla się jako miniatura nad tekstem, o szerokości najwyżej `ST.maxw`. Rozmiar wliczaj do `fit()`, a do czasu wczytania obrazka trzymaj miejsce.
- Eksport PNG: obrazki z innej domeny „brudzą” canvas. Jeśli eksport się nie uda, pokaż `info()` z wyjaśnieniem; nie może się wywrócić po cichu.

### 2.3 Zadania (checkboxy)

- **Format:** `- [ ] tekst` / `- [x] tekst`. Model: `n.task?: 0 | 1` (brak pola = to nie jest zadanie).
- Mapa: pole wyboru przed tekstem. Przełączanie: klik w pole, **Ctrl+Enter** albo vim **`t`**. Wykonane zadanie ma tekst przygaszony i przekreślony.
- Postęp: rodzic, który ma dzieci będące zadaniami, pokazuje mały znacznik „3/5”.
- Przełączenie stanu jest zmianą modelu (`snap` / `changed`), więc da się je cofnąć.

### 2.4 Tryb skupienia

- **`f`** i komenda `:focus` włączają i wyłączają tryb. Esc też go wyłącza.
- Widoczne są tylko: ścieżka od korzenia do zaznaczonego węzła oraz całe poddrzewo zaznaczonego węzła. Reszta jest ukryta (stan widoku, **nie zapisuje się do pliku**).
- Wejście i wyjście animują istniejące sprężyny i „duchy”. Na pasku górnym widać wskaźnik „Skupienie: tekst węzła”.

### 2.5 Tagi i filtrowanie

- Tag to `#słowo` poprzedzone początkiem tekstu lub spacją. Wzorzec: `(^|\s)#[\p{L}\d_-]+` z flagą `u`. Nie traktuj jako tagów `#` wewnątrz adresu URL.
- Tag wyświetla się jako „pigułka” w kolorze gałęzi.
- Filtrowanie włącza klik w tag albo `:tag nazwa`. Węzły bez tagu są przyciemnione (opacity ≈ 0,25), a układ się nie zmienia. `:tag` bez argumentu albo Esc wyłącza filtr.

### 2.6 Edytowalny widok konspektu

- Istniejący widok Markdown (`:text`, `toggleText` w `files.js`) staje się edytowalny.
- Zmiany w polu tekstowym (z opóźnieniem ≈ 300 ms) są parsowane i zastępują model z `snap()`, więc można je cofnąć. Zaznaczenie zostaje na węźle o tej samej ścieżce, jeśli taki istnieje.
- Błąd parsowania nie może zgubić danych. Przy niepoprawnym tekście nie podmieniaj modelu i pokaż `info()`.

**Akceptacja etapu 2:** round-trip każdego rozszerzenia w `parser.spec.js`, testy interakcji w nowych lub istniejących plikach spec (`edit.spec.js`, `view.spec.js`, `menu.spec.js`), aktualne README i `HELP`.

---

## Etap 3 – Wygląd i animacje (`render.js`, `layout.js`, `side.js`, `app.css`)

Nowe pola stylu dopisz do `DEF` z wartościami, przy których mapa wygląda **tak jak dziś**. Tylko 3.4–3.7 są domyślnie włączone, bo nie zmieniają wyglądu map w spoczynku.

1. **Zaokrąglone kolanko.** Nowa wartość `edgeStyle: 'round'` w `edgeD` dla obu kierunków. Promień łuku to `min(ST.radius, połowa krótszego odcinka)`. Opcja w panelu, test w `style.spec.js`.
2. **Zwężające się gałęzie** (`taper: false` w DEF). Grubość linii maleje z poziomem: `max(1, ST.edge · (1 − 0.25·(głębokość−1)))`. Wystarczy `stroke-width` zależne od głębokości; pełne zwężanie wypełnioną ścieżką to opcjonalny drugi krok.
3. **Styl zależny od poziomu** (`levels: false`).
   - korzeń: pogrubiony i większy;
   - poziom 1: wypełniona „pigułka” w kolorze gałęzi, kolor tekstu dobrany kontrastowo według luminancji;
   - głębsze poziomy: bez ramki, z podkreśleniem w kolorze gałęzi.
4. **Wyrastanie gałęzi** (domyślnie włączone; wyłącza je tylko `RM`).
   - Nowy albo rozwijany węzeł: krawędź z `pathLength="1"`, `stroke-dasharray: 1`, `stroke-dashoffset` od 1 do 0 przez ≈ 200 ms.
   - Węzeł pojawia się z `opacity` od 0 do 1 i skalą od 0,9 do 1, od ≈ 60% czasu krawędzi.
   - Zwijanie pozostaje na istniejących „duchach”.
   - Test w `animation.spec.js` z `no-preference`: animacja kończy się w stanie końcowym, a z `reduce` stan końcowy jest od razu.
5. **Lot kamery.** Gdy `go()`, skok do wyniku wyszukiwania, `zz` lub Shift+2 wskazuje węzeł poza ekranem, `tx`, `ty` (i `k`) zmieniają się płynnie przez ≈ 250 ms. Przesunięcie widoku przez użytkownika przerywa lot.
6. **Ścieżka do korzenia.** Krawędzie od korzenia do zaznaczonego węzła dostają klasę `path` (odrobinę grubsze i pełniejsze). Reszty nie przyciemniamy; przyciemnianie jest tylko w trybie skupienia i przy filtrze tagów.
7. **Licznik ukrytych.** Zwinięty węzeł pokazuje znacznik „+N” (liczba ukrytych potomków) przy kółku zwijania.
8. **Poświata zaznaczenia.** Zamiast grubej ramki miękki `drop-shadow` w kolorze gałęzi. Sprawdź, że eksport SVG/PNG nie zawiera stanu zaznaczenia.
9. **Ruch kreskami tylko przy przeciąganiu.** Animowane przesuwanie kresek (`stroke-dashoffset` w pętli) wyłącznie na krawędzi do aktualnego miejsca upuszczenia. Nigdzie indziej.
10. **Tło z kropek.** Ustawienie aplikacji (nie stylu mapy, nie zapisuje się do pliku), domyślnie wyłączone. Wzór SVG blednie przy oddalaniu i nie trafia do eksportu.

---

## Etap 4 – Nowe układy (`layout.js`, `icons.js` → `LAY`, `menu.js` → `setLayout`, `ops.js` → `arrow`)

Każdy układ wymaga:
- wpisu w `LAY` z ikoną i polską nazwą;
- obsługi `:layout nazwa` i `<!--layout:nazwa-->`;
- poprawnych krawędzi w `edgeD`;
- nawigacji strzałkami i `hjkl` zgodnej z kierunkiem układu;
- działającego przeciągania (`dnd.js`);
- obsługi wielu korzeni;
- testów w `layout.spec.js` i `navigation.spec.js`.

Bez elkjs; wszystko liczy deterministyczny kod własny. Kolejność wykonania:

1. **Upakowanie wielu map** (dotyczy wszystkich układów). Korzenie rozmieszczone w siatce metodą „półek” w kolejności z pliku, z proporcjami zbliżonymi do okna, a nie w jednej kolumnie.
2. **`tree` – konspekt drzewiasty.** Dzieci pod rodzicem, z wcięciem `gapX`. Krawędzie to kolanka z pionowej linii po lewej. ↑ / ↓ porusza w kolejności listy, ← idzie do rodzica, → do pierwszego dziecka.
3. **`org` – schemat organizacyjny.** Jak „w dół”, ale jeśli wszystkie dzieci węzła są liśćmi, układają się pionowo pod rodzicem. Mapa nie rozjeżdża się wtedy na szerokość.
4. **`radial` – układ radialny.**
   - Korzeń w środku, kolejne poziomy na współśrodkowych okręgach.
   - Wycinek kąta dla poddrzewa jest proporcjonalny do liczby jego liści (algorytm Eadesa).
   - Promień poziomu zwiększaj, aż prostokąty sąsiadów przestaną na siebie nachodzić.
   - Tekst zawsze poziomo. Węzeł z lewej połowy okręgu zaczepia krawędź po swojej prawej stronie.
   - Nawigacja: → na zewnątrz (dziecko), ← do środka (rodzic), ↑ / ↓ po kącie wśród rodzeństwa.
5. **`timeline` – oś czasu.** Węzły poziomu 1 na poziomej osi, głębsze poziomy ułożone w pionie, na przemian nad osią i pod nią.
6. **`force` – układ grawitacyjny.**
   - Symulacja liczona **„na sucho”** w `lay()` (≈ 300 kroków). Jej wynik to zwykłe pozycje docelowe, a animację nadal robią sprężyny. **Nie uruchamiaj symulacji na żywo** w pętli `requestAnimationFrame`.
   - Start deterministyczny z układu `radial`, więc ta sama mapa zawsze wygląda tak samo.
   - Siły: przyciąganie do rodzica (długość zależna od poziomu), poziomy trzymane na okręgach, kolizje prostokątów węzłów, odpychanie. Odpychanie „każdy z każdym” O(n²) wystarczy do kilkuset węzłów.
   - **W trakcie przeciągania symulacja stoi.** Sąsiedzi tylko lekko się rozsuwają z powodu kolizji. Po upuszczeniu następuje krótkie dociągnięcie (≈ 50 kroków od bieżących pozycji).
   - Upuszczenie na węzeł oznacza „zostań dzieckiem”. Kolejność rodzeństwa wynika z kąta wokół rodzica i to ona trafia do pliku.
   - Upuszczenie na pustym tle przypina węzeł: `<!--pin:x,y-->` na końcu linii węzła. To jedyna informacja o położeniu zapisywana w pliku. Odpięcie przez menu podręczne.
7. **`fishbone` – ość ryby** (niższy priorytet). Głowa (korzeń) po prawej, ości poziomu 1 skośne na przemian w górę i w dół, poziom 2 jako poziome żebra.
8. *(opcjonalnie, zapytaj przed rozpoczęciem)* **Układ dla jednej gałęzi:** `<!--layout:nazwa-->` na końcu linii węzła. **Kompaktowe drzewo** (zbijanie konturów poddrzew, Reingold–Tilford) jako ulepszenie istniejących układów.

---

## Etap 5 – Później (nie zaczynaj bez zgody użytkownika)

Połączenia między gałęziami z etykietą i strzałką (wymagają identyfikatorów węzłów w pliku), pasek narzędzi przy zaznaczonym węźle oraz przyciski „+” (dotyk), minimapa, zoom kontekstowy, zaznaczanie wielu węzłów (Shift+klik, `v`, lasso), tryb prezentacji, szybkie wpisywanie pomysłów, granice i podsumowania, eksport PDF / OPML / FreeMind / Xmind oraz import z nich, AI, współpraca na żywo, historia wersji, bezpośredni zapis na Androidzie (`@capacitor/filesystem`).

---

## Podsumowanie rozszerzeń formatu pliku

| Zapis | Znaczenie | Zadanie |
|---|---|---|
| wcięty akapit pod `- węzeł` | notatka | 2.1 |
| `[tekst](url)`, `![opis](url)` | link, obrazek | 2.2 |
| `- [ ] …` / `- [x] …` | zadanie | 2.3 |
| `#tag` w tekście | tag | 2.5 |
| `<!--layout:tree\|org\|radial\|timeline\|force\|fishbone-->` | nowe układy | 4 |
| `<!--pin:x,y-->` na końcu linii | przypięty węzeł (tylko układ `force`) | 4.6 |
| nowe pola w `<!--style:{…}-->`: `edgeStyle:"round"`, `taper`, `levels` | wygląd | 3 |

Kolejność znaczników na końcu linii węzła: `tekst <!--pin:…--> <!--c-->`. Parser musi przyjmować je w dowolnej kolejności, a zapis zawsze w tej.
