# Słownik pojęć

Jedna nazwa na jedno pojęcie – w interfejsie, w planie (`ROADMAP.md`), w dokumentacji i w rozmowie. Nowe pojęcie dopisz tutaj, zanim pojawi się w interfejsie albo w planie. Skróty nazw w kodzie (`sel`, `tx`…) opisuje „Słowniczek stanu” w `CLAUDE.md`.

## Mapa i jej części

| Pojęcie               | Znaczenie                                                                                            | W kodzie                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| plik                  | jeden plik `.md`; może zawierać kilka map                                                            | `parse`, `serialize`                                        |
| mapa                  | korzeń z całym drzewem; „Nowa mapa” dodaje do pliku nowy korzeń                                      | dziecko `root`                                              |
| korzeń                | najwyższy węzeł mapy (`# tytuł` w pliku)                                                             | `root.children[i]` – sam `root` to niewidoczny kontener map |
| węzeł                 | jeden punkt mapy (`- tekst` w pliku)                                                                 | `MapNode`                                                   |
| gałąź                 | węzeł razem ze wszystkimi potomkami („Kopiuj gałąź”)                                                 |                                                             |
| kolor gałęzi          | kolor głównej gałęzi (poziom 1), dziedziczony przez jej potomków                                     | `COL`                                                       |
| rodzic, dziecko, brat | brat to węzeł o tym samym rodzicu; wszyscy razem to rodzeństwo („Między rodzeństwem”)                |                                                             |
| poziom                | odległość od korzenia: korzeń = 0, główne gałęzie = 1 (`z1`…`z9`)                                    |                                                             |
| linia                 | połączenie rodzica z dzieckiem („Grubość linii”, „Kształt linii”); w planie i kodzie także „krawędź” | `edgeD`                                                     |
| układ                 | rozmieszczenie mapy: w prawo, w lewo, na obie strony, w dół; później radialny (6.4)                  | `dir`, `LAY`                                                |

## Treść węzła

| Pojęcie               | Znaczenie                                                                                 | Zadanie |
| --------------------- | ----------------------------------------------------------------------------------------- | ------- |
| tekst węzła           | może mieć kilka linii (Ctrl+Enter w edycji)                                               | ✅      |
| notatka do węzła      | dłuższy tekst pod węzłem (`>` w pliku), na mapie ikona 📝; **nie mylić z kartką**         | 4.1     |
| zadanie (pole wyboru) | węzeł z polem wyboru (`- [ ]` / `- [x]`); gdy chodzi o punkt planu, mów „zadanie z planu” | 4.3     |
| tag                   | `#słowo` w tekście węzła                                                                  | 4.4     |
| filtr tagu            | przygasza węzły bez wybranego tagu; tag działa na całą gałąź; układ się nie zmienia       | 4.4     |
| link, obrazek         | `[tekst](url)`, `![opis](url)` w tekście węzła                                            | 4.2     |

## Elementy poza drzewem

| Pojęcie             | Znaczenie                                                                                  | Zadanie |
| ------------------- | ------------------------------------------------------------------------------------------ | ------- |
| relacja             | przerywana strzałka między dwoma dowolnymi węzłami, z etykietą; w jedną stronę albo w obie | 7.2     |
| klamra podsumowania | klamra przy kilku sąsiednich braciach z krótkim tekstem, bez dzieci                        | 7.3     |
| granice             | obrys wokół gałęzi                                                                         | etap 9  |
| kartka              | swobodna ramka z tekstem (legenda, tl;dr, strona tytułowa); przesuwa się razem z mapą      | 7.6     |

## Wygląd

| Pojęcie             | Znaczenie                                                                                                                                                           | W kodzie         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| styl mapy           | wszystkie ustawienia z panelu „Wygląd mapy”; plik zapisuje tylko różnice od domyślnych (`<!--style:…-->`)                                                           | `ST`, `DEF`      |
| motyw mapy          | gotowy zestaw wartości stylu, wygląd według poziomów: Klasyczny, Minimalistyczny, Czytelny (5.7), Organiczny, Odręczny (7.5); samo „motyw” znaczy zawsze motyw mapy |                  |
| tryb jasny / ciemny | wygląd całej aplikacji („Tryb jasny / ciemny”, `:theme`); nie zapisuje się w pliku mapy; nie nazywaj go „motywem”                                                   | `mm.theme`       |
| paleta kolorów      | zestaw kolorów gałęzi („Kolory gałęzi” w panelu); zawsze z dopowiedzeniem „kolorów”, bo samo „paleta” myli się z paletą komend                                      | `PAL0`, `mm.pal` |

## Ekran i obsługa

| Pojęcie                                 | Znaczenie                                                                                                                                                                        | W kodzie              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| widok                                   | co zajmuje ekran: mapa, „Widok Markdown” (w planie też „.md”), później drzewko (3.6); przesuwanie i zoom mapy to „przesunięcie” i „przybliżenie” – w nowych tekstach nie „widok” | `tv`; `tx`, `ty`, `k` |
| tryb (na pasku stanu)                   | NORMAL – mapa, INSERT – edycja tekstu, COMMAND – komenda „:”, TEKST – widok Markdown                                                                                             | `setMode`             |
| tryb skupienia                          | widać tylko ścieżkę do zaznaczonego węzła i jego gałąź; na pasku górnym klikalna ścieżka (4.5); osobno: tryb prezentacji (8.7)                                                   |                       |
| zaznaczenie                             | zaznaczony węzeł; później zaznaczanie wielu węzłów (7.1)                                                                                                                         | `sel`                 |
| edycja                                  | zmiana tekstu w samym węźle                                                                                                                                                      | `editing`, `edId`     |
| zwinięcie / rozwinięcie                 | ukrycie dzieci węzła; na mapie „…” na końcu tekstu, w pliku `<!--c-->`                                                                                                           | `collapsed`           |
| przeciąganie, miejsce upuszczenia       | przenoszenie gałęzi myszą albo palcem; miejsce upuszczenia to puste miejsce, które otwiera się w mapie                                                                           | `dnd`, `ph`           |
| przycisk „+”                            | dodaje dziecko albo brata przy zaznaczonym węźle (3.4)                                                                                                                           |                       |
| pasek górny, pasek stanu                | przyciski u góry; dolny pasek z trybem i komunikatami                                                                                                                            | `hint`, `info`        |
| menu „…”, menu podręczne, menu układu   | menu aplikacji (pliki, eksport, pomoc); menu węzła albo tła (prawy przycisk, przytrzymanie, klawisz Menu); wybór układu                                                          | `moreMenu`, `ctxMenu` |
| panel „Wygląd mapy”                     | wysuwany z prawej panel stylu mapy                                                                                                                                               | `side.js`             |
| polecenie / czynność                    | jedna rzecz do zrobienia z nazwą, skrótami i komendą; w interfejsie „polecenie”, w kodzie i planie „czynność”                                                                    | `ACT`                 |
| paleta komend                           | okienko „Wszystkie polecenia…” (Ctrl+K)                                                                                                                                          | `openPal`             |
| komenda „:”                             | polecenie wpisane w palecie po dwukropku, np. `:w`, `:layout down`                                                                                                               | `exec`                |
| szukanie, trafienie, lista trafień      | Ctrl+F albo `/`, zawsze bez polskich znaków i wielkości liter; trafienie to znaleziony węzeł; lista trafień – wszystkie naraz w palecie (Alt+Enter albo przycisk „wszystkie” w polu szukania, 2.5) | `search`, `jump`, `hitList` |
| tryb listy (palety)                     | paleta z węzłami albo innymi pozycjami zamiast poleceń, z tytułem nad listą: lista trafień (2.5), „Przenieś do…” (2.7), `:lint` (4.8)                                           | `openList`            |
| ścieżka (od korzenia)                   | przodkowie węzła od korzenia mapy, „Mapa › Projekt”; na liście trafień drobnym tekstem pod węzłem; w trybie skupienia – klikalna na pasku górnym (4.5)                          | `nodeItems`           |
| skrót zwykły / skrót vim / ukryty alias | każda czynność ma skrót zwykły i vim; ukryty alias działa, ale nie ma go w pomocy, menu ani README                                                                               | `normal()`            |

## Zapis i schowek

| Pojęcie           | Znaczenie                                                                                | W kodzie |
| ----------------- | ---------------------------------------------------------------------------------------- | -------- |
| autozapis         | zapis po każdej zmianie w pamięci przeglądarki; w Chrome i Edge także do otwartego pliku | `mm.md`  |
| karta (przeglądarki) | karta albo okno aplikacji z tą samą mapą; zapis z innej karty nie znika po cichu („Mapę zmieniono w innej karcie”); nie mylić z kartą decyzji | `toStorage`, `lsLast` |
| plik zmieniony na dysku | otwarty plik zmieniony przez inny program (np. Syncthing); przy niezapisanych zmianach – pytanie, a zapis do pliku czeka | `diskAsk`, `fhConflict` |
| zapis             | zapis do pliku (Ctrl+S, `:w`)                                                            |          |
| schowek aplikacji | gałąź skopiowana w aplikacji (`p` / `P`)                                                 | `yank`   |
| schowek systemowy | tekst z innych aplikacji (Ctrl+V)                                                        |          |
| frontmatter       | blok `---` … `---` na początku pliku; zachowany bez zmian, niewidoczny na mapie          |          |
| pominięte linie   | linie pliku, których mapa nie pokazuje; plik z nimi nie zapisuje się sam                 |          |
| eksport           | obraz mapy: SVG albo PNG                                                                 |          |
| „Udostępnij”      | tekst wysłany do mindme z innej aplikacji na telefonie (T.4)                             |          |

## Plan i praca

| Pojęcie                 | Znaczenie                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| etap, zadanie z planu   | punkty `ROADMAP.md` (np. etap X, zadanie 3.4)                                                                               |
| karta decyzji (🗳)       | 2–3 opcje ze skutkiem, kosztem i rekomendacją; wybór trafia do `docs/decyzje.md`                                            |
| podstawa / rozszerzenie | podstawa jest zawsze włączona; rozszerzenie (etap 8) jest domyślnie wyłączone i ma przełącznik na liście „Rozszerzenia”     |
| wtyczka                 | tylko biblioteka Capacitora (np. pliki na Androidzie); funkcja z przełącznikiem to rozszerzenie – mechanizmu wtyczek nie ma |
| prototyp                | kod na próbę w `www/_prototyp/` (poza gitem), wyrzucany po decyzji                                                          |
| bramka                  | `npm run verify` uruchamiany przed każdym commitem                                                                          |

## Nazwy z innych aplikacji

| U nich                                                                        | U nas                                 |
| ----------------------------------------------------------------------------- | ------------------------------------- |
| topic (SimpleMind, Xmind), block (Logseq), headline (Org-mode), card (Gingko) | węzeł                                 |
| theme (Xmind)                                                                 | motyw mapy                            |
| dark mode, theme (jasny / ciemny)                                             | tryb jasny / ciemny                   |
| summary (Mind Elixir, Xmind)                                                  | klamra podsumowania                   |
| boundary (Xmind)                                                              | granice                               |
| relationship, arrow (Xmind, Mind Elixir)                                      | relacja                               |
| note, sticky note (Whimsical)                                                 | kartka                                |
| note (Xmind, MindNode)                                                        | notatka do węzła                      |
| hoist, zoom in, narrow (Workflowy, Logseq, Org-mode)                          | tryb skupienia                        |
| command palette                                                               | paleta komend („Wszystkie polecenia”) |
| vault (Obsidian)                                                              | — (odrzucone)                         |
