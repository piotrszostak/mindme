# Znane problemy i rzeczy do sprawdzenia

Otwarte sprawy, które nie są zadaniem w planie (`ROADMAP.md`) ani decyzją (`docs/decyzje.md`; otwarte decyzje – tamże, „Otwarte”). Załatwione usuwaj – ślad zostaje w historii gita. `HANDOVER.md` (lokalny) służy tylko bieżącej pracy (decyzja A.6, 2026-11-26).

## Błędy

- **Wklejanie w edycji przez pasek schowka klawiatury** (np. Gboard, bez zdarzenia `paste`): w teście ostatnie złamanie linii znika („dwatrzy”), a edycja się zamyka (`ed` → `input` w `edit.js` bierze to za Enter). Na telefonie niesprawdzone; poprawka musi odróżnić wklejenie od Entera klawiatury ekranowej – tylko z próbą na telefonie.

## Do sprawdzenia

- **Na telefonie:** wklejanie kilku linii przez „Wklej jako dziecko” dało spację, choć test zachowuje linie. Użytkownik uznał, że działa. Jeśli wróci: najpierw odświeżenie karty (podejrzenie: stary kod w karcie otwartej przed `3166f4b`).
- **W Obsidianie:** plik z węzłem wielolinijkowym (linie wcięte pod punktem) – czy Obsidian pokazuje go jako jeden punkt listy.

## Zależności

- **`npm audit`: 5 ostrzeżeń (1 krytyczne, 1 wysokie)** – wszystkie z `@capacitor/cli` 6 (narzędzie do budowania APK, nie trafia do aplikacji; `tar`, `glob`, `minimatch`, `rimraf`). Znikają dopiero z Capacitorem 8 – do rozstrzygnięcia kartą decyzji przy etapie T (stan z 2026-11-26).
