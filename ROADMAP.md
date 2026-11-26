# Plan rozwoju mindme – instrukcje dla agenta

Przed pracą przeczytaj `CLAUDE.md`, `HANDOVER.md` (lokalny, poza gitem), `docs/decyzje.md` i `docs/znane-problemy.md`. Realizuj zadania **po kolei, etapami**. Jedno zadanie to jeden commit.
Jeśli zadanie wymaga decyzji, której tu nie ma, zapytaj użytkownika. Nie zgaduj.

Plan przebudowany 2026-11-25 (przegląd inspiracji: Vicinae, KFind, Obsidian i wtyczki, Miro, Workflow Builder, Xmind, MindNode; podział na **podstawę** i **rozszerzenia**), a potem 2026-11-26 – po przeglądzie kruchości kodu: mniejszy zakres, bez mechanizmu wtyczek, najtrudniejsze funkcje na końcu, a przed nimi przygotowanie kodu (etap R). Zrobione: etapy 0 i 1, zadania 2.1 i 2.2 oraz etap A poza odłożonym A.4.

**Kolejność etapów:** A → T → 2 → 3 → 4 → 5 → 6 → 8 → R → X → P. Etapy dodane później mają litery zamiast numerów, a przeniesione zadania zachowują dawne numery (np. 7.2 w etapie X), żeby numery w `docs/decyzje.md` dalej się zgadzały. Etap 9 – tylko na wyraźną prośbę użytkownika.

**Dlaczego taka kolejność:** najpierw naprawy i rzeczy tanie, które dają najwięcej (bezpieczeństwo pliku, telefon, treść węzła). Funkcje, które naraz dotykają przeciągania, nawigacji, układu i formatu pliku (zaznaczanie wielu węzłów, układ radialny, relacje, minimapa), są na końcu (etap X). Przed nimi etap R dostosowuje kod tak, żeby każda z nich była osobnym plikiem i małą zmianą w głównych plikach, a nie łataniem w dziesięciu miejscach.

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

1. **Bez frameworka, bez budowania, bez nowych zależności w `www/`.** Algorytmy (układy, dopasowanie fuzzy) pisz sam, w zwykłych skryptach.
2. **Plik `.md` pozostaje głównym źródłem danych.**
   - Nowe dane zapisuj jako standardowy Markdown albo komentarz `<!--…-->`.
   - Plik bez nowych funkcji musi się zapisywać **bajt w bajt tak samo jak dziś**.
   - Stare pliki muszą się otwierać bez zmian.
   - Każde rozszerzenie formatu wymaga: karty decyzji, testu round-trip w `tests/parser.spec.js`, rozszerzenia `selfTest()` (`:test`) oraz opisu w README („Format pliku”) i w `HELP` („Format pliku”).
3. **Model:** przed zmianą `snap()`, po zmianie `changed()`. Nowe pola węzła dopisz do `MapNode` w `types/globals.d.ts`. Nowe pola stylu dopisz do `DEF` (zapisują się tylko różnice od domyślnych).
4. **Nowy plik w `www/`:** dopisz go do `index.html` (we właściwej kolejności), do listy w `www/sw.js` i do mapy plików w `CLAUDE.md`.
5. **Skróty:** każda czynność ma jeden skrót zwykły i jeden vim. Nazwę i skróty wpisz w tabeli `ACT` (`actions.js`), z której biorą pomoc, menu i paleta komend. Naciśnięcie obsłuż w `normal()` (`keys.js`). Zaktualizuj `keys.spec.js` i tabelę w README.
   - **Bez nowych ukrytych aliasów.** Zostają tylko dawne F1, F2, F3 i Shift+F10 (decyzja A.3: bez nich przeglądarka otwiera swoją pomoc, szukanie i menu); Ctrl+Y jest widocznym drugim skrótem „Ponów”.
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
7. **Czytelność przed efektem.** Kolor przypisujemy do gałęzi, nie do pojedynczego węzła. Subtelne animacje nie mają przełącznika (wyłącza je tylko `RM`). Efekty, które zmieniają wygląd mapy w spoczynku (np. zwężające się gałęzie), wchodzą tylko w skład motywu (5.7). Wskazówki stanu (ścieżka do korzenia, licznik ukrytych, poświata zaznaczenia z 5.3–5.5) nie są efektami ozdobnymi: działają zawsze, bez przełącznika.
8. **Po każdej zmianie** uruchom `npm run check` i testy danego obszaru. **Przed commitem** uruchom `npm run verify`. Na koniec każdego etapu zaktualizuj `HANDOVER.md` (bieżąca praca) i `docs/znane-problemy.md` (otwarte błędy i rzeczy do sprawdzenia).
9. Interfejs jest po polsku. Użytkownik nie jest frontendowcem, więc w podsumowaniach tłumacz krótko.
10. **Aplikacja dla jednej osoby.** Nie dodawaj funkcji pracy grupowej (głosowanie, liczniki warsztatowe, współpraca na żywo) bez wyraźnej zgody.
11. **Błąd: najpierw test, który pada.** Przy naprawie najpierw napisz test odtwarzający błąd (musi nie przejść), potem poprawka. Gdy nie wiesz, jak odtworzyć błąd, zapytaj użytkownika o kroki.
12. **Bez mechanizmu wtyczek** (decyzja 2026-11-26). Rozszerzenie (etap 8) to wpis w tabeli rozszerzeń (8.0) i sprawdzenie jego flagi tam, gdzie jest używane. Funkcja z własnym zapisem w pliku i własnym rysowaniem (np. notatki, nowy układ, relacje) trafia do osobnego pliku (punkt 4) – to zwykły porządek w kodzie. Nie buduj punktów zaczepienia na zapas.
13. **Filtry szukania zaawansowanego** wymienione przy zadaniach (np. `has:note`) powstają dopiero w 8.2. Pole w panelu właściwości – tylko jeśli panel powstanie (3.5).
14. **Testy w obu przeglądarkach:** testy skrótów, szukania i schowka działają też w Firefoksie. Nowy plik z takimi testami dopisz do `testMatch` projektu `firefox` w `playwright.config.js`.
15. Zmiany dotyku, przeciągania i płynności sprawdź też na telefonie (`/na-telefonie`).
16. **Nowe znaczniki `<!--…-->` w pliku** tylko wtedy, gdy funkcji nie da się zapisać zwykłym Markdownem, i dopiero po R.5 (wspólny odczyt i zapis znaczników na końcu linii). Każdy znacznik to coś, co inny edytor może popsuć albo zgubić.
17. **Wydajność pilnowana od początku.** Pomiar z A.2 jest stałym testem. Zadanie, po którym próg przestaje być spełniony, nie jest skończone.

---

## Etap A – Naprawy i porządki (przed wszystkim)

Cel: zamknąć znane luki i usunąć to, co dokłada kodu i testów bez wartości, zanim przybędzie funkcji.

### A.1 Sprawdzanie stylu i układu z pliku (bezpieczeństwo) ✅ zrobione

`cleanStyle` (`side.js`) przepuszcza z `<!--style:{…}-->` tylko wartości, które da się ustawić w panelu; reszta zostaje domyślna, a nieznany układ to „w prawo”. Pasek stanu wymienia pominięte pola. Wcześniej spreparowany plik uruchamiał skrypt (obrazek z `onerror` w SVG mapy i w próbkach palet), a nieznany układ wywracał wczytywanie i – zapisany w autozapisie – blokował start aplikacji. Pozostałe `innerHTML` przejrzane: tekst z pliku i od użytkownika idzie przez `esc()` albo `textContent`. Testy w `parser.spec.js`, decyzje w `docs/decyzje.md`.

### A.2 Pomiar wydajności od początku ✅ zrobione

Generator `bigMap(n)` (`tests/helpers.js`) i `tests/perf.spec.js` z progami (mapa 500 węzłów w każdym układzie); `npm run verify` uruchamia pomiar osobno (`npm run perf`). **Cel: płynnie do 500 węzłów, także na telefonie; 1000 nie jest celem.** Progi, wyniki z komputera i telefonu – `docs/decyzje.md` (2026-11-26). Od tej chwili obowiązuje zasada 0.17.

### A.3 Ukryte aliasy klawiszy ✅ zrobione

Wybór użytkownika: wszystkie zostają. Ctrl+Y jest teraz widocznym drugim skrótem „Ponów” (pomoc, README), a F1, F2, F3 i Shift+F10 zostają ukryte – bez nich przeglądarka otwierałaby swoją pomoc, szukanie i menu. Szczegóły w `docs/decyzje.md`.

### A.4 Edycja palet bez pamięci przeglądarki 🗳 ⏭ odłożone

- **Odłożone 2026-11-26** na prośbę użytkownika („pomijamy to zadanie na razie”), bez decyzji. Karta była gotowa: (a) edycja zostaje, ale zmienia tylko kolory tej mapy – polecana; (b) edycję usuwamy. Wróć do niej, gdy użytkownik o to poprosi, najpóźniej przy projekcie panelu (3.2).
- Dziś „Edytuj paletę” w panelu zmienia gotową paletę na tym urządzeniu (klucz `mm.pal`), więc ta sama paleta wygląda różnie na komputerze i na telefonie. Kolory bieżącej mapy i tak są w pliku (`colors` w `<!--style-->`).
- **Karta decyzji:** (a) usunąć edycję palet i klucz `mm.pal` – zostają gotowe palety, a kolory mapy w pliku; (b) zostawić edycję, ale zmieniać tylko kolory bieżącej mapy (zapis w pliku), bez `mm.pal`. W obu: co zrobić z poprawkami już zapisanymi w `mm.pal` (np. jednorazowo przenieść do otwartej mapy albo pominąć).
- Pliki z `colors` wczytują się i zapisują bez zmian. Zaktualizuj `style.spec.js` i listę kluczy w `CLAUDE.md`.

### A.5 Tauri dopiero wtedy, gdy będzie potrzebny ✅ zrobione

Usunięte: `@tauri-apps/cli`, skrypt `tauri`, sekcja „Linux (AppImage przez Tauri)” w README, wzmianki w `CLAUDE.md` i `.gitignore`. Capacitor zostaje (etap T). Wpis „Aplikacja na Linuksa (Tauri)” jest w etapie 9.

### A.6 Pytania porządkowe ✅ zrobione

Claude Code w osobnym `Containerfile.agent` (obraz projektu bez agenta). Znane problemy i rzeczy do sprawdzenia w `docs/znane-problemy.md` (w gicie), `HANDOVER.md` tylko na bieżącą pracę. Decyzje w `docs/decyzje.md`.

---

## Etap T – Telefon i wydanie

Dziś telefon łączy się z podglądem przez `http://` z adresem w sieci domowej. Przeglądarka uznaje taki adres za niebezpieczny: nie daje dostępu do schowka (stąd okienko „wklej tutaj”), nie uruchamia `sw.js` (bez trybu offline i instalacji na ekranie głównym), a mapy żyją tylko w jej pamięci. Ten etap daje aplikację na telefon na stałe.

### T.1 Adres https ⏸ STOP

- **W toku (2026-11-26):** wybrane GitHub Pages z publikacją po zielonych testach na `main` (`ci.yml`, zadanie `pages`), test podkatalogu w `pwa.spec.js`. Czeka na użytkownika: Settings → Pages → Source „GitHub Actions” i wysłanie commitów; potem `/na-telefonie` i pułapki.
- **Karta decyzji:** gdzie (np. GitHub Pages – darmowe dla publicznego repozytorium – albo inny darmowy hosting), pod jakim adresem i czy wdrażać automatycznie po wysłaniu na serwer (GitHub Actions), czy ręcznie. Publikuje i wysyła użytkownik.
- Strona może działać z podkatalogu (np. `/mindmap/`): sprawdź ścieżki w `index.html`, `sw.js` i `manifest.webmanifest`; zmianę pokryj testem w `pwa.spec.js`.
- Po wdrożeniu `/na-telefonie`: wklejanie bez okienka „wklej tutaj”, instalacja na ekranie głównym, praca bez sieci, autozapis po ponownym otwarciu.
- Zaktualizuj pułapki w `CLAUDE.md` i skill `/na-telefonie` (gdzie wystarczy adres https zamiast `10.0.0.x`).

### T.2 Identyfikator aplikacji i pierwszy APK 🗳

- **Karta decyzji:** `appId` (otwarta sprawa w `docs/decyzje.md`; po publikacji w sklepie zmiana oznacza nową aplikację) i nazwa aplikacji na ekranie telefonu.
- `npx cap add android` i APK w wersji testowej, zgodnie z dokumentacją Capacitora **6**. Co z folderu `android/` trafia do gita – według tej dokumentacji. Klucze podpisu tylko w plikach z `.gitignore`.
- Android SDK to duże pobranie – zapytaj przed instalacją i opisz, co i gdzie trafi.
- W aplikacji (WebView) sprawdź `/na-telefonie`: wklejanie (okienko „wklej tutaj”), przytrzymanie, przeciąganie, klawiaturę ekranową przy edycji.

### T.3 Otwieranie i zapis plików na Androidzie

- Przeniesione z etapu 9. W APK „Otwórz” i „Zapisz” działają na plikach telefonu; w przeglądarce bez zmian.
- Nowa biblioteka (np. `@capacitor/filesystem` w wersji dla Capacitora 6) albo systemowe okno wyboru pliku – karta z opcjami, rozmiarem, licencją i datą wydania. Zgodnie z 0.1 bez budowania: wtyczka Capacitora przez globalny `Capacitor.Plugins`.
- Testy: logika zapisu na podstawionym obiekcie w `page.evaluate`; całość `/na-telefonie`.

---

# PODSTAWA (etapy 2–6)

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

## Etap 3 – Panel boczny i menu

### 3.2 Projekt panelu bocznego i menu ⏸ STOP

Panel „Wygląd mapy”, menu podręczne, menu „…” i menu układu trzeba przebudować, zanim dojdą nowe funkcje. **Cel: na wierzchu ma być mniej niż dziś.** W tym zadaniu robisz tylko wywiad i makiety, **bez zmian w kodzie aplikacji**.
1. **Spis.** Co jest dziś w panelu i menu, a co dojdzie:
   - motywy mapy (5.7) w miejsce wielu przełączników wyglądu;
   - lista układów (dzisiejsze 4, później radialny z etapu X);
   - które dzisiejsze suwaki i przełączniki panelu „Wygląd mapy” zostają pod „Więcej”, a które znikają z panelu, gdy dojdą motywy (5.7); pola usunięte z panelu nadal wczytują się i zapisują w pliku bez zmian;
   - przyciski „+” na dotyku; pasek narzędzi przy węźle na komputerze – tylko jeśli wywiad pokaże potrzebę;
   - minimapa i relacje (etap X) – tylko miejsce w projekcie, bez kodu;
   - lista „Rozszerzenia” (8.0) z krótkim opisem każdego;
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

- Według zatwierdzonej makiety. Najpierw przenieś to, co już istnieje („Wygląd mapy”, menu), bez zmiany działania; dopiero potem dodaj nowe miejsca. Listę „Rozszerzenia” dodaje zadanie 8.0.
- Menu budowane z `ACT` (grupy czynności), bez kopiowania treści.
- Zaktualizuj `style.spec.js`, `menu.spec.js`, `topbar.spec.js` i `touch.spec.js`. Prototyp usuń po wdrożeniu, jeśli użytkownik się zgodzi.

### 3.4 Przyciski „+” na dotyku (i pasek przy węźle, jeśli jest w projekcie)

- Na dotyku przyciski „+” przy zaznaczonym węźle: dziecko po stronie dzieci (zależnie od układu), brat obok, zgodnie z kierunkiem układu.
- Pasek narzędzi nad zaznaczonym węzłem na komputerze – tylko jeśli przewiduje go zatwierdzony projekt; zestaw akcji z wywiadu.
- Nie trafiają do eksportu SVG/PNG.
- Testy w `touch.spec.js` i `menu.spec.js`.

### 3.5 Panel właściwości węzła – tylko jeśli jest w projekcie

- Jeśli zatwierdzony projekt (3.2) przewiduje panel właściwości: jeden opis pól (nazwa, rodzaj: tekst / wybór / data / przełącznik / lista tagów, odczyt i zapis do węzła) buduje panel (wzór: panele ze schematu w Workflow Builderze). Każda funkcja dopisuje swoje pola do tego opisu.
- Każda zmiana w panelu to `snap()` i `changed()`, więc da się ją cofnąć.
- Jeśli projekt panelu nie przewiduje, pomiń to zadanie i zapisz to w `docs/decyzje.md`.

---

## Etap 4 – Treść węzła

Uwaga do parsera: `parse()` w `core.js` rozpoznaje tytuł mapy, elementy listy, wcięte linie tuż pod punktem (dalsze linie tekstu węzła), znaczniki `<!--layout…-->` / `<!--style…-->` i frontmatter; **inne linie pomija i liczy** (licznik pominiętych linii – dawne zadanie 0.2, zob. `docs/decyzje.md`). Każde rozszerzenie musi to uwzględnić i nie może pomylić swojego zapisu z dalszą linią tekstu węzła.
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
- Filtr dla 8.2: `#tag`. Tryb `#` w palecie i grupowanie według tagu – odrzucone 2026-11-26.

### 4.5 Tryb skupienia

- **`f`** i komenda `:focus` włączają i wyłączają tryb. Esc też go wyłącza.
- Widoczne są tylko: ścieżka od korzenia do zaznaczonego węzła oraz całe poddrzewo zaznaczonego węzła. Reszta jest ukryta i nie zajmuje miejsca – mapa układa się od nowa (stan widoku, **nie zapisuje się do pliku**). Przygaszanie zostaje dla filtra tagów (4.4), więc oba tryby wyglądają różnie.
- Wejście i wyjście animują istniejące sprężyny i „duchy”. Na pasku górnym widać wskaźnik „Skupienie: tekst węzła”.

### 4.6 Edytowalny widok konspektu

- Istniejący widok Markdown (`:text`, `toggleText` w `files.js`) staje się edytowalny.
- Zmiany w polu tekstowym (z opóźnieniem ok. 300 ms) są parsowane i zastępują model z `snap()`, więc można je cofnąć. Zaznaczenie zostaje na węźle o tej samej ścieżce, jeśli taki istnieje.
- **Tekst nie może zniknąć po cichu.** „Niepoprawny tekst” to taki, w którym parser pominąłby jakąś linię (licznik pominiętych linii jest większy od zera), np. zwykły akapit albo „-” bez spacji w trakcie pisania. Wtedy model się nie zmienia, a `info()` raz podaje numer pierwszej takiej linii. Mapa dogania tekst, gdy wszystkie linie znów da się pokazać.
- Zamknięcie widoku, gdy takie linie zostały: okienko „Linie, których mapa nie pokaże (2), znikną.” z przyciskami **Wróć do tekstu** (domyślny) i **Zamknij mimo to**.
- Testy: akapit wpisany w pole nie zmienia mapy i zostaje w polu; po poprawieniu linii mapa się aktualizuje; zamknięcie widoku z takimi liniami pokazuje okienko, a oba przyciski działają.

### 4.7 Szablony przy nowej mapie

- „Nowa mapa” (i `:new`) proponuje pustą mapę albo jeden z 2–3 wbudowanych szablonów: SWOT, 5× Dlaczego, retrospektywa („Co poszło dobrze” / „Co poprawić” / „Działania”). Ostateczny zestaw potwierdź z użytkownikiem.
- Szablony jako stałe w JS albo pliki w `www/` (wtedy `sw.js`). Szablon trafia do bieżącego pliku jako nowa mapa (korzeń).
- Własne szablony – etap 9.

### 4.8 `:lint` – sprawdzanie mapy (wzór: walidacja w Workflow Builderze)

- `:lint` i pozycja w palecie. Lista problemów w trybie listy z 2.5; Enter albo klik przechodzi do węzła. Bez automatycznych poprawek.
- Reguły podstawy:
  - pusty węzeł;
  - ten sam tekst u rodzeństwa;
  - niepoprawny adres URL (tylko format, bez łączenia z siecią);
  - gałąź głębsza niż 7 poziomów.
- Rozszerzenia dopisują własne reguły (np. niewykonane zadanie po terminie w 8.3). Pojedyncze reguły nie mają przełączników.

**Akceptacja etapu 4:** round-trip każdego rozszerzenia formatu w `parser.spec.js`, testy interakcji w nowych lub istniejących plikach spec (`edit.spec.js`, `view.spec.js`, `menu.spec.js`, `search.spec.js`), aktualne README i `HELP`.

---

## Etap 5 – Wygląd i animacje (`render.js`, `layout.js`, panel z etapu 3, `app.css`)

Zadania 5.1–5.6 to subtelne animacje i wskazówki: **bez przełączników**, wyłącza je tylko `RM`. Zadanie 5.7 zbiera wszystkie zmiany wyglądu mapy w motywy. Cały etap zmienia to, co już jest, więc idzie w głównych plikach.

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
   - W panelu „Wygląd mapy” 2 motywy z podglądem:
     - **Klasyczny** – dzisiejszy wygląd, domyślny;
     - **Lekki** – zaokrąglone kolanka, zwężające się gałęzie, styl zależny od poziomu;
     Ostateczny zestaw i nazwy ustal w wywiadzie i makietach (3.2).
   - Motyw to zestaw wartości pól stylu. Plik zapisuje tylko pola różne od `DEF`, jak dziś – **bez nowego klucza „motyw”**. Panel rozpoznaje motyw po wartościach, a po zmianie szczegółów pokazuje „Własny”. Motyw nie zmienia palety kolorów.
   - Szczegóły pod „Więcej”: dzisiejsze opcje, które zostały po projekcie 3.2, i nowe pola. Nowe pola w `DEF` mają wartości dające dzisiejszy wygląd:
     - `edgeStyle: 'round'` – zaokrąglone kolanko w `edgeD` dla obu kierunków; promień łuku `min(ST.radius, połowa krótszego odcinka)`;
     - `taper: false` – grubość linii maleje z poziomem: `max(1, ST.edge · (1 − 0.25·(głębokość−1)))`; wystarczy `stroke-width` zależne od głębokości;
     - `levels: false` – korzeń pogrubiony i większy; poziom 1 jako wypełniona „pigułka” w kolorze gałęzi, z kolorem tekstu dobranym kontrastowo według luminancji; głębsze poziomy bez ramki, z podkreśleniem w kolorze gałęzi;
   - Testy w `style.spec.js`: każdy motyw ustawia swoje pola; plik z motywem „Klasyczny” zapisuje się bajt w bajt jak dziś; round-trip nowych pól.

---

## Etap 6 – Poprawki układów

Poprawki istniejących układów, w `layout.js`. Nowy układ radialny powstaje dopiero w etapie X (6.4), po przygotowaniu kodu układów w R.6. Pozostałe nowe układy (oś czasu, ość ryby, grawitacyjny) – zob. etap 9 i „Odrzucone”.

Bez elkjs; wszystko liczy deterministyczny kod własny. Zmiany wyglądu istniejących map pokaż jako „przed i po” i zapytaj.

1. **Upakowanie wielu map** (dotyczy wszystkich układów). Korzenie rozmieszczone w siatce metodą „półek”, w kolejności z pliku, z proporcjami zbliżonymi do okna, a nie w jednej kolumnie.
2. **Zwarty układ „w dół”** (zamiast osobnego schematu organizacyjnego). Jeśli wszystkie dzieci węzła są liśćmi, układają się pionowo pod rodzicem, więc mapa nie rozjeżdża się na szerokość. Bez nowej pozycji w menu układów.
3. *(opcjonalnie, zapytaj przed rozpoczęciem)* **Kompaktowe drzewo** (zbijanie konturów poddrzew, Reingold–Tilford) jako ulepszenie istniejących układów.

---

# ROZSZERZENIA (etap 8)

## Etap 8 – Rozszerzenia (domyślnie wyłączone)

Rozszerzenia są domyślnie wyłączone i mają wpis z krótkim opisem na liście „Rozszerzenia”. **Przed startem etapu zapytaj użytkownika, które rozszerzenia i w jakiej kolejności zrobić.** Numery zadań bez zmian; 8.1, 8.4, 8.5 i 8.6 usunięte 2026-11-26 (zob. „Odrzucone”).

### 8.0 Lista rozszerzeń 🗳

- Bez mechanizmu wtyczek (zasada 0.12). Tabela `EXT` (id, nazwa, krótki opis) – w `actions.js` albo w nowym pliku (wtedy punkt 0.4). Czynności w `ACT` dostają pole `ext`, więc czynności wyłączonego rozszerzenia znikają z menu, palety i pomocy bez osobnego kodu.
- Lista „Rozszerzenia” w miejscu z projektu 3.2: nazwa, opis, przełącznik.
- **Karta decyzji:** gdzie zapamiętać, które rozszerzenia są włączone – pamięć przeglądarki (nowy klucz) czy plik.
- Wyłączone rozszerzenie nie zmienia zapisu pliku: jego zapis widać jako zwykły tekst węzła.
- Testy: włączenie i wyłączenie zmienia menu, paletę i pomoc; plik zapisuje się tak samo w obu stanach.

### 8.2 Szukanie zaawansowane (wzór: KFind)

- Opcje w polu szukania: wielkość liter (Aa) i wyrażenie regularne (.*).
- Filtry w zapytaniu: `depth:2`, `in:folded` oraz zgłoszone przez inne funkcje (`is:task`, `is:done`, `has:note`, `has:link`, `#tag`, `due:`).
- Znajdź i zamień: vim `:s/stare/nowe/` (zaznaczony węzeł z poddrzewem) i `:%s/stare/nowe/g` (cały plik). Skrót zwykły ustal według punktu 0.5. Zamiana to jeden krok cofania; `info('zamieniono N')`.
- Testy w `search.spec.js`.

### 8.3 Terminy zadań 🗳

- Termin w formacie wtyczki Obsidian Tasks: `- [ ] tekst 📅 2026-12-01`. Na mapie data jako mała „pigułka” po tekście; niewykonane zadanie po terminie jest wyróżnione. Wybór daty w menu (albo w panelu właściwości, jeśli istnieje).
- Czy przy odhaczaniu dopisywać datę wykonania `✅ 2026-11-25` (jak Obsidian Tasks) – zapytaj.
- Filtr `due:` (składnię porównań ustal przy karcie decyzji) i reguła `:lint` „niewykonane zadanie po terminie”.
- Wyłączone rozszerzenie: `📅 2026-12-01` widać jako zwykły tekst węzła.

### 8.7 Tryb prezentacji (wzór: Pitch Mode w Xmind)

- `:present` i pozycja w palecie. Slajd to węzeł w kolejności z pliku, do wybranej głębokości (domyślnie 2). Kamera leci do węzła (5.2), reszta jest przygaszona jak przy filtrze tagów (4.4). Układ się nie zmienia, więc mapa nie skacze między slajdami.
- Dalej: → / Spacja / PageDown; wstecz: ← / PageUp; koniec: Esc; na telefonie przesunięcie palcem. Pełny ekran (Fullscreen API), jeśli jest dostępny.
- Stan widoku, nie zapisuje się do pliku. Z `RM` przejścia są natychmiastowe.

---

# NA KONIEC

## Etap R – Przygotowanie kodu przed trudnymi funkcjami

Funkcje z etapu X dotykają naraz modelu zaznaczenia, przeciągania, nawigacji, układu i formatu pliku. Dziś kod zależny od tych rzeczy jest rozproszony po wielu plikach i opiera się na wspólnych zmiennych globalnych, więc każda taka funkcja oznaczałaby łatki w dziesięciu miejscach. Ten etap to porządek **przed** nimi.

Zasady etapu:
- **Działanie i wygląd bez zmian.** Każde zadanie to przebudowa kodu: istniejące testy przechodzą bez zmian (wolno tylko dopisywać nowe), a plik zapisuje się bajt w bajt.
- Małe kroki: jedna zmiana = jeden commit, `npm run verify` po każdym.
- Pomiar z A.2 przed i po każdym zadaniu.

### R.1 Przegląd i plan ⏸ STOP

- Przejrzyj miejsca, których dotkną zadania z etapu X: użycia `sel` (`ops.js`, `keys.js`, `menu.js`, `dnd.js`), kod zależny od `dir` (`lay`, `layD`, `edgeD`, `arrow`, miejsce upuszczenia w `dnd.js`, `LAY`), zapis znaczników w `serialize()`, przebudowa DOM w `render()`.
- Pokaż użytkownikowi listę zadań R.2–R.8 z oceną: co zmienia, ile kosztuje, czy jest potrzebne przy obecnym stanie kodu. Zadania niepotrzebne pomiń i zapisz to w `docs/decyzje.md`.

### R.2 Testy utrwalające dzisiejsze zachowanie

- Zanim ruszysz kod, dopisz testy tam, gdzie R.1 wskazał brak pokrycia: np. przeciąganie w każdym układzie i przy wielu korzeniach, nawigacja strzałkami i `hjkl` na granicach map, zapis wszystkich znaczników, cofanie po każdej operacji.
- Tylko testy, bez zmian w `www/`.

### R.3 Stan w nazwanych obiektach

- Dziś stan to wiele zmiennych globalnych o krótkich nazwach (`sel`, `tx`, `ty`, `k`, `dir`, `editing`, `dnd`…), zmienianych z wielu plików. Zgrupuj je w kilka obiektów o czytelnych nazwach, np. `view` (przesunięcie i zoom), `doc` (mapy, układ, styl, frontmatter), `ui` (zaznaczenie, edycja, przeciąganie). Zakres i nazwy pokaż użytkownikowi przed zmianą.
- Jeden obiekt na commit. Typy w `types/globals.d.ts`, słowniczek w `CLAUDE.md`.
- Pliki zostają zwykłymi skryptami – bez modułów ES i bez budowania (zasada 0.1).

### R.4 Zaznaczenie jako lista (przygotowanie 7.1)

- Operacje z `ops.js` (usuń, kopiuj, wytnij, duplikuj, zwiń / rozwiń, wsuń, wysuń, przełącz zadanie) i przeciąganie przyjmują listę węzłów, a nie tylko `sel`. Na razie lista ma zawsze jeden element – działanie bez zmian.
- Ustal i pokryj testami (przez `page.evaluate`) zasady dla wielu węzłów, np. węzeł i jego potomek zaznaczone naraz → operacja dotyczy tylko przodka; kolejność w schowku i po wklejeniu – według kolejności w pliku. Jedna operacja na wielu węzłach = jeden krok cofania.

### R.5 Znaczniki na końcu linii i identyfikator węzła 🗳 (przygotowanie 7.2)

- Jedna funkcja odczytu i jedna zapisu znaczników `<!--…-->` na końcu linii węzła: odczyt w dowolnej kolejności, zapis zawsze w tej samej. Dziś jest tylko `<!--c-->`, więc pliki zapisują się bajt w bajt.
- Trwały identyfikator węzła w modelu, niezależny od `n.id` z sesji. W pliku tylko u węzłów, które go potrzebują.
- **Karta decyzji (dawniej w 7.2):** zapis identyfikatora (np. `^abc123` na końcu linii, jak bloki w Obsidianie, albo `<!--id:abc123-->`) i relacji (np. `<!--rel:abc123 "etykieta"-->` na węźle źródłowym).
- Testy: identyfikator przeżywa przeniesienie, cofanie i ponowienie; kopia i duplikat dostają nowy; wycięcie i wklejenie zachowuje go; round-trip w `parser.spec.js`.

### R.6 Układ jako jeden opis (przygotowanie 6.4)

- Dziś to, co zależy od układu, jest rozproszone: `lay()` / `layD`, `edgeD`, nawigacja (`arrow`), miejsce upuszczenia w `dnd.js`, `LAY`. Zbierz to w jeden opis na układ, np. `LAYOUTS.right = { lay, edge, nav, drop, name, icon }`, tak żeby nowy układ był jednym plikiem i jednym wpisem.
- Najpierw przenieś 4 istniejące układy, bez zmian działania (testy z R.2).

### R.7 Warstwy rysowania (przygotowanie 7.2 i 7.4)

- `render()` rysuje warstwy w stałej kolejności: pod krawędziami, krawędzie, węzły, nad węzłami. Nowa warstwa (relacje, minimapa) dopisuje się bez zmian w `nodeHTML`.
- Każda warstwa mówi, czy trafia do eksportu SVG/PNG (relacje – tak, minimapa – nie).

### R.8 Rysowanie bez przebudowy całej mapy – tylko jeśli pomiar pokaże potrzebę

- Dziś `render()` przy każdej zmianie przebudowuje cały SVG przez `innerHTML`. Jeśli pomiar (A.2, R.1) pokaże, że to za wolno dla etapu X: aktualizuj istniejące elementy według `data-id`.
- Uwaga na pułapkę z `CLAUDE.md`: dwuklik wykrywamy sami, bo przebudowa DOM gubi `click` / `dblclick`. Nie zmieniaj tego przy okazji.
- Pomiar przed i po w opisie commitu.

---

## Etap X – Trudne funkcje

Każde zadanie zaczyna się od sprawdzenia, czy przygotowanie z etapu R jest gotowe. Jeśli funkcja wymaga zmian w wielu głównych plikach naraz, wróć do etapu R i dostosuj kod, zamiast dopisywać obejście. Kolejność: od najmniej do najbardziej ryzykownej. Numery zadań bez zmian.

### 7.4 Minimapa (wymaga R.7)

- Mały podgląd całego pliku (miejsce z projektu 3.2) z prostokątem widoku; klik i przeciąganie przesuwa widok.
- **Pokazuje się sama**, gdy mapa nie mieści się na ekranie, i znika, gdy się mieści (jak pasek przewijania). Bez przełącznika i bez pozycji w menu. Na wąskim ekranie (telefon) nie pokazuje się wcale. Nie zapisuje się do pliku i nie trafia do eksportu.
- Testy: pojawia się po przybliżeniu, znika po „Dopasuj całą mapę”, nie ma jej w rozmiarze telefonu ani w eksporcie SVG/PNG.

### 7.1 Zaznaczanie wielu węzłów (wymaga R.4)

- Shift+klik dodaje lub usuwa węzeł z zaznaczenia. Vim: `v` zaczyna zaznaczanie, ruch je rozszerza, Esc kończy. Lasso: Shift+przeciąganie tła myszą. Gest na dotyku ustal z użytkownikiem: przytrzymanie węzła i tła otwiera dziś menu (na tle przy tym odznacza).
- Operacje na wielu węzłach: usuń, kopiuj / wytnij (w schowku lista gałęzi), przeciągnij, zwiń / rozwiń, wsuń / wysuń, przełącz zadanie.
- Model zaznaczenia i zasady dla wielu węzłów są gotowe z R.4: `sel` zostaje głównym (ostatnio zaznaczonym) węzłem, a lista zaznaczonych (np. `msel`) trafia do słowniczka w `CLAUDE.md`.
- Testy w nowym `multiselect.spec.js` oraz w `dnd.spec.js`.

### 6.4 `radial` – układ radialny (wymaga R.6)

Osobny plik i wpis w opisie układów z R.6. Wymaga:
- wpisu z ikoną i polską nazwą;
- obsługi `:layout radial` i `<!--layout:radial-->`;
- poprawnych krawędzi;
- nawigacji strzałkami i `hjkl` zgodnej z kierunkiem układu;
- działającego przeciągania;
- obsługi wielu korzeni;
- testów w `layout.spec.js` i `navigation.spec.js`.

- Korzeń w środku, kolejne poziomy na współśrodkowych okręgach.
- Wycinek kąta dla poddrzewa jest proporcjonalny do liczby jego liści (algorytm Eadesa).
- Promień poziomu zwiększaj, aż prostokąty sąsiadów przestaną na siebie nachodzić.
- Tekst zawsze poziomo. Węzeł z lewej połowy okręgu zaczepia krawędź po swojej prawej stronie.
- Nawigacja: → na zewnątrz (dziecko), ← do środka (rodzic), ↑ / ↓ po kącie wśród rodzeństwa.

### 7.2 Relacje między gałęziami (wymaga R.5 i R.7)

- Format: identyfikator węzła i relacja według karty decyzji z R.5.
- Rysowanie: zakrzywiona, przerywana linia ze strzałką i etykietą, w neutralnym kolorze. Na start krzywa Béziera między krawędziami węzłów, bez omijania przeszkód.
- Tworzenie: „Połącz z…” w menu podręcznym i w palecie. Potem klik albo wybór węzła klawiszami i Enter wskazuje cel; `info('wybierz węzeł docelowy, Esc anuluje')`. Etykietę edytuje się dwuklikiem, relację usuwa z menu.
- Relacje są zawsze widoczne, bez przełącznika. W trybie skupienia widać tylko relacje między widocznymi węzłami.
- Przeniesienie węzła nie zrywa relacji (identyfikator jedzie z węzłem). Usunięcie celu usuwa relację, a cofnięcie ją przywraca.
- Działa we wszystkich układach. Eksport SVG/PNG zawiera relacje.

---

## Etap P – Wydajność (na koniec)

Pomiar i progi powstały w A.2 i obowiązują przez cały czas (zasada 0.17). Tu zostają poprawki, gdy wszystkie funkcje już są. Cel: płynnie do 500 węzłów, także na telefonie; większe mapy nie są celem (decyzja 2026-11-26).

### P.2 Poprawki

- Tylko to, co przekracza progi z A.2, zaczynając od miejsca, które pomiar wskazał jako najwolniejsze.
- Każda poprawka to osobny commit z pomiarem „przed i po” w opisie. Działanie i wygląd bez zmian – wszystkie testy przechodzą.

---

## Etap 9 – Później (nie zaczynaj bez zgody użytkownika)

- **Import notatki Markdown** (np. z Obsidiana): „Importuj notatkę…” tworzy nową mapę z kopii notatki – nagłówki i listy stają się węzłami, a akapity, tabele i kod notatkami tekstowymi (wymaga 4.1). Oryginał zostaje nietknięty; bez zapisu z powrotem do formatu notatki.
- Z dawnego etapu 5: szybkie wpisywanie pomysłów; eksport PDF / OPML / FreeMind / Xmind oraz import z nich; AI; historia wersji; współpraca na żywo (zob. punkt 0.10).
- Układ dla jednej gałęzi (`<!--layout:nazwa-->` na końcu linii węzła).
- Odłożone 2026-11-25:
  - eksport do bloku Mermaid `mindmap` i do jednego pliku HTML ze zwijaniem (jak Markmap);
  - z Workflowy: ścieżka nad mapą, ukrywanie wykonanych zadań, węzły lustrzane;
  - z Freeplane: style warunkowe, pola `klucz:: wartość`.
- **Aplikacja na Linuksa (Tauri)** – usunięta z projektu w A.5; wraca razem z `src-tauri/`.
- **Własne szablony** z wybranego folderu (obok wbudowanych z 4.7).
- Odłożone 2026-11-26 (duży koszt w kodzie przy małej wartości dla jednej osoby; najpierw etap R):
  - układy **oś czasu** i **ość ryby** – każdy nowy układ to nawigacja, przeciąganie, krawędzie i wiele korzeni od nowa;
  - **granice i podsumowania** (obrys gałęzi, klamra z węzłem podsumowania) – nowe znaczniki w pliku i miejsce w `lay()`;
  - **motyw odręczny** (drżenie linii, czcionka odręczna) – czysta ozdoba, także w eksporcie.

## Odrzucone (nie proponuj ponownie)

- **Burza mózgów z licznikiem czasu i głosowaniem**: aplikacja jest dla jednej osoby.
- **Pełna zgodność z notatkami Obsidiana z przełącznikiem**: komplikuje model i każdą funkcję; zastąpiona przez ochronę przed utratą danych (dawne zadanie 0.2: frontmatter zostaje, pominięte linie są liczone) i import z etapu 9.
- **Kalkulator w palecie**: nie pasuje do mapy myśli.
- **Ranking palety według częstości i świeżości**: „5 ostatnio użytych” jest przewidywalne.
- **Zoom kontekstowy** (węzły znikające przy oddalaniu): zaskakuje; do zwijania poziomów jest `z1…z9`.
- **Układ „konspekt drzewiasty”**: dubluje edytowalny widok konspektu (4.6).
- **Osobne szukanie węzłów w palecie**: zastąpione listą trafień (2.5) – jedna droga szukania.
- **Osobne przełączniki wyglądu**: zastąpione motywami (5.7).
- Odrzucone 2026-11-26 (przegląd kruchości kodu):
  - **Mechanizm wtyczek** (dawny etap W): przy zwykłych skryptach ze wspólnym zakresem rejestr punktów zaczepienia rozprasza każdą funkcję po wielu plikach. Rozszerzeniom wystarczy lista z flagami (8.0).
  - **Układ grawitacyjny** z przypinaniem `<!--pin:x,y-->`: symulacja, osobna logika przeciągania i jedyna pozycja zapisana w pliku – najwięcej przypadków brzegowych przy najmniejszej przewidywalności.
  - **Tło z kropek**: ozdoba bez wartości informacyjnej.
  - **Paleta dla zaawansowanych** (prefiksy `@` i `#`, akcje pod strzałką w prawo, własne komendy): druga droga do tego, co już jest (zasada prostoty).
  - **Grupowanie według tagu**: rzadka operacja; filtr tagów (4.4) wystarcza.
  - **Folder jako vault, `[[wikilinki]]` i linki zwrotne**: to osobna aplikacja (indeks plików, przełączanie plików, podpowiedzi) – do tego jest Obsidian.
  - **Ukryte aliasy klawiszy** na przyszłość (zasada 0.5, A.3).

---

## Podsumowanie rozszerzeń formatu pliku

Każde wymaga karty decyzji przed startem (🗳). Lista zmniejszona 2026-11-26: każdy nowy znacznik to coś, co inny edytor może popsuć (zasada 0.16).

| Zapis | Znaczenie | Zadanie |
|---|---|---|
| frontmatter `---` … `---` na początku pliku | zachowany bez zmian, niewidoczny na mapie | ✅ 2026-11-25 |
| wcięta linia tuż pod `- węzeł` | dalszy ciąg tekstu węzła (wiele linii, Ctrl+Enter) | ✅ 2026-11-25 |
| cytat `>` pod `- węzeł` | notatka | 4.1 |
| `[tekst](url)`, `![opis](url)` | link, obrazek | 4.2 |
| `- [ ] …` / `- [x] …` | zadanie | 4.3 |
| `#tag` w tekście | tag | 4.4 |
| nowe pola w `<!--style:{…}-->`: `edgeStyle:"round"`, `taper`, `levels` | motywy mapy | 5.7 |
| `<!--layout:radial-->` | układ radialny | 6.4 (etap X) |
| identyfikator węzła i relacja (do ustalenia) | relacje | R.5, 7.2 |
| `📅 RRRR-MM-DD` (może też `✅ RRRR-MM-DD`) | termin zadania (rozszerzenie) | 8.3 |

Kolejność znaczników na końcu linii węzła ustala R.5; dziś jest tylko `<!--c-->`. Parser musi przyjmować je w dowolnej kolejności, a zapis zawsze w tej samej.
