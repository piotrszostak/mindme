---
name: prototyp
description: Prototyp na próbę – warianty wyglądu albo zachowania do przeklikania, zanim powstanie właściwy kod. Użyj, gdy użytkownik zgodzi się na prototyp albo poprosi o warianty.
---

Prototyp to kod do wyrzucenia, który odpowiada na jedno pytanie. Najpierw zapisz to pytanie jednym zdaniem.

- **Pytanie o wygląd:** 2–3 wyraźnie różne warianty na jednym ekranie, przełączane przyciskami albo klawiszami 1–3, każdy podpisany.
- **Pytanie o zachowanie:** jedna strona z przyciskami akcji; po każdej akcji widać cały stan, np. mapę zapisaną jako tekst.

Zasady:

- Pliki w `www/_prototyp/<temat>/`. Folder jest w `.gitignore`, więc nie trafia do commitów. W panelu podglądu otwierasz `/_prototyp/<temat>/`.
- Prototyp jest samodzielny: własny HTML, CSS i JS. Może kopiować fragmenty aplikacji, ale niczego w niej nie zmienia.
- Bez testów, bez dopracowania, bez zapisu danych.
- Pokazujesz warianty, mówisz, czym się różnią, i prosisz o wybór kartą decyzji.
- Po wyborze: decyzja do `docs/decyzje.md`, właściwa zmiana małymi krokami w kodzie aplikacji, folder prototypu usuwasz.
