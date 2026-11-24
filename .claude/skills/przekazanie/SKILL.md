---
name: przekazanie
description: Notatka przekazania w HANDOVER.md, żeby nowa sesja zaczęła tam, gdzie skończyła ta.
disable-model-invocation: true
---

Zapisz `HANDOVER.md` w katalogu projektu. Plik jest w `.gitignore` i nie trafia do commitów. Nadpisz poprzednią wersję, przenosząc z niej sprawy wciąż otwarte. Najwyżej około 40 linii.

- **Stan:** data, gałąź, ostatni commit, czy `npm run verify` przechodzi (uruchom, jeśli nie wiesz).
- **W toku:** co zaczęte, na czym skończono, następny krok.
- **Otwarte sprawy:** decyzje czekające na użytkownika i lista „Do sprawdzenia na prawdziwym urządzeniu”.
- **Nowe pułapki:** co w tej sesji kosztowało czas. Jeśli warto to pamiętać na stałe, zaproponuj dopisanie do `CLAUDE.md`.

Nie powtarzasz tego, co jest w `CLAUDE.md`, `docs/decyzje.md` i historii gita, tylko wskazujesz plik. Żadnych sekretów.

Jeśli użytkownik napisał, czym zajmie się następna sesja, dopasuj do tego notatkę. Na końcu powiedz, że w nowej sesji wystarczy napisać „Przeczytaj HANDOVER.md”.
