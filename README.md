# Mapa myśli
Aplikacja w `www/` (PWA bez budowania: `index.html`, `css/app.css`, `js/*.js`). Testy: `npm test`, formatowanie: `npm run format`. Notatki dla agenta: `CLAUDE.md`.
## PWA (Android/Arch)
Wrzuć `www/` na HTTPS (GitHub Pages/Netlify) → Chrome: „Zainstaluj aplikację”. Lokalnie: `npx serve www`.
## Android APK (Capacitor)
npm i && npx cap add android && npm run android → Build > Build APK w Android Studio.
Uwaga: WebView nie ma File System Access API → otwieranie/zapis działa przez picker i pobieranie. Do natywnego zapisu dodaj @capacitor/filesystem albo użyj Syncthing + otwórz plik z folderu.
## Arch (Tauri → AppImage)
npm i && npx tauri init (frontendDist=../www, bez dev servera) && npm run tauri
## Kontener (Podman)
    podman build -t mindmap -f Containerfile .
    podman run -it --rm -p 3000:3000 -v "$PWD":/work:Z mindmap bash
    # w kontenerze: npx serve www -l 3000   → na hoście http://localhost:3000
`-p` musi być przy `podman run` – Containerfile może tylko zadeklarować `EXPOSE 3000`.
## Obsługa
- Mysz: klik – zaznacz, dwuklik – edycja w węźle, PPM – menu (na węźle zaznacza go, na tle dotyczy zaznaczonego), przeciągnij węzeł – przenieś (prawa część węzła = dziecko, lewa góra/dół = brat przed/za, Esc anuluje), przeciągnij tło – przesuń, kółko – zoom, dwuklik na tle lub Esc – odznacz.
- Dotyk: stuknij – zaznacz, przytrzymaj węzeł – menu (jak PPM), przytrzymaj tło – odznacz, stuknij 2× węzeł – edycja, stuknij 2× tło – menu, przeciągnij węzeł – przenieś, przeciągnij tło – przesuń, dwa palce – zoom.
- Edycja: Enter/Esc zatwierdza i zostawia węzeł zaznaczony, kolejny Enter dodaje brata; Tab zatwierdza i dodaje dziecko.
- Jedno menu podręczne (to samo na komputerze i telefonie, ze skrótami), zawsze dla zaznaczonego węzła: dodaj brata (przy korzeniu – nowy korzeń), dodaj dziecko, emoji (na końcu tekstu), zwiń/rozwiń, kopiuj, wytnij, wklej, usuń, dopasuj widok, rozwiń/zwiń wszystko.
- Bez zaznaczenia: Enter i wklejanie tworzą nowy korzeń (brata korzeni), strzałki zaczynają od pierwszego korzenia.
- Klawiatura: dla każdej czynności skrót zwykły i vim, np. strzałki | hjkl, F2 | i, Enter | o (brat), Tab | a (dziecko), Ctrl+C | yy (kopiuj), Ctrl+X | dd (wytnij), Del | x (usuń bez kopiowania), Ctrl+V | p (wklej), Spacja | za, Alt+strzałki | JKLH, Ctrl+Z | u, Ctrl+Y | Ctrl+R, Ctrl+F | /. Pełna lista: F1 lub `?`.
- Pasek: po lewej „…” (otwórz, zapisz, nowa mapa, eksport, motyw, pomoc), cofnij, ponów, układ, dopasuj widok, Markdown/mapa; po prawej tylko panel „Wygląd mapy”.
- Panel „Wygląd mapy”: czcionka (systemowa, szeryfowa, maszynowa, zaokrąglona, odręczna, wąska) i jej grubość, rozmiar i szerokość tekstu, grubość i kształt linii, obramowanie, zaokrąglenie, wypełnienie, odstępy, kolory gałęzi z 8 palet (paletę można edytować – zmiany pamięta urządzenie). Wygląd zapisuje się w pliku mapy (`<!--style:{…}-->`) i jest cofalny (Ctrl+Z).
- Emoji: Ctrl+. albo „Wstaw emoji” w menu (na końcu tekstu węzła), w edycji także przycisk 😊 przy polu (w miejscu kursora).
- Animacje wyłącza systemowe „ogranicz ruch” (prefers-reduced-motion).
## Komendy
:w :e :new :test :text :fit :layout right|left|both|down :export svg|png :theme dark|light
## Format
`# Tytuł`, opcjonalnie `<!--layout:both-->`, zagnieżdżone listy `- `; `<!--c-->` = zwinięty. Każdy kolejny nagłówek `# …` to osobny korzeń (wiele map w jednym pliku).
