# Znane problemy i rzeczy do sprawdzenia

Otwarte sprawy, które nie są zadaniem w planie (`ROADMAP.md`) ani decyzją (`docs/decyzje.md`; otwarte decyzje – tamże, „Otwarte”). Załatwione usuwaj – ślad zostaje w historii gita. `HANDOVER.md` (lokalny) służy tylko bieżącej pracy (decyzja A.6, 2026-11-26).

## Błędy

- **Wklejanie w edycji przez pasek schowka klawiatury** (np. Gboard, bez zdarzenia `paste`): w teście ostatnie złamanie linii znika („dwatrzy”), a edycja się zamyka (`ed` → `input` w `edit.js` bierze to za Enter). Na telefonie niesprawdzone; poprawka musi odróżnić wklejenie od Entera klawiatury ekranowej – tylko z próbą na telefonie.

## Do sprawdzenia

- **Etap 2 na prawdziwych urządzeniach** (2026-11-27, testy przechodzą w Chromium i Firefoksie): Ctrl+M („Przenieś do…”) w prawdziwym Firefoksie nie wycisza karty (testy widzą tylko, że strona dostaje klawisz); na telefonie przycisk „wszystkie” i lista trafień, „Przenieś do…” z menu po przytrzymaniu węzła (wysuwa się klawiatura), dymek podpowiedzi nie przeszkadza.
- **Ochrona danych z A.7 w prawdziwych warunkach** (2026-11-27, testy przechodzą, w przeglądarce niesprawdzone): w Chrome otwarty plik w folderze Syncthinga zmieniony na drugim urządzeniu przy niezapisanych zmianach → pytanie; mapa otwarta w dwóch kartach (albo w karcie i w zainstalowanej aplikacji) → druga karta wczytuje zmiany sama. Service Worker przy bardzo słabym zasięgu: start z cache po ok. 3 s.
- **Na telefonie:** wklejanie kilku linii przez „Wklej jako dziecko” dało spację, choć test zachowuje linie. Użytkownik uznał, że działa. Jeśli wróci: najpierw odświeżenie karty (podejrzenie: stary kod w karcie otwartej przed `3166f4b`).
- **W Obsidianie:** plik z węzłem wielolinijkowym (linie wcięte pod punktem) – czy Obsidian pokazuje go jako jeden punkt listy.

## Zależności

- **Akcje GitHuba na Node 20:** `actions/checkout@v4` i `actions/configure-pages@v5` dają w CI ostrzeżenie o wycofywanym Node 20 (działają, GitHub uruchamia je na Node 24). Podnieść wersje, gdy oficjalny wzór `pages/static.yml` je zmieni (stan z 2026-11-26).
- Ostrzeżenia `npm audit` z `@capacitor/cli` 6 i API 34 zniknęły razem z Capacitorem (2026-11-27); przy porcie – nowa karta (`ROADMAP.md`, „Po PWA”).
