---
name: naprawa
description: Naprawa błędu metodą zamiast zgadywania. Użyj, gdy użytkownik zgłasza błąd, coś działa inaczej, niż powinno, albo test nagle przestaje przechodzić.
---

Kolejność jest obowiązkowa. Fazę pomijasz tylko z podanym powodem.

1. **Odtworzenie jedną komendą.** Zbuduj sygnał, który robi się czerwony dokładnie na tym błędzie, najlepiej test Playwright w pliku obszaru (`npx playwright test tests/<obszar>.spec.js -g "nazwa"`), odtwarzający objaw opisany przez użytkownika. Uruchom go i pokaż wynik. Bez takiej komendy nie przechodzisz dalej. Gdy błąd widać tylko na telefonie albo potrzebny jest człowiek, prowadź użytkownika krok po kroku (`/na-telefonie`) i zapisuj każdy wynik.
2. **Zawężenie.** Usuwaj po jednym elemencie przykładu (węzły, kroki, ustawienia), aż każdy pozostały będzie potrzebny, żeby błąd wystąpił.
3. **Hipotezy.** 3–5 możliwych przyczyn, od najbardziej prawdopodobnej, każda z przewidywaniem: „jeśli przyczyną jest X, to zmiana Y usunie błąd”. Pokaż je użytkownikowi prostym językiem i sprawdzaj dalej, nie czekając na odpowiedź.
4. **Sprawdzanie.** Jedna zmienna naraz. Tymczasowe logi oznaczasz `[DEBUG-…]`, żeby łatwo je potem znaleźć.
5. **Test i poprawka.** Zawężony przykład staje się testem regresji: najpierw czerwony, potem poprawka, potem zielony. Na koniec jeszcze raz komenda z kroku 1.
6. **Sprzątanie.** Usuń logi `[DEBUG-…]` i pliki tymczasowe. W raporcie i w opisie commita: przyczyna, poprawka i test, który pilnuje, żeby błąd nie wrócił.

Po drugiej nieudanej próbie tej samej poprawki zatrzymaj się i zastosuj zasadę „cofnij zamiast brnąć” z `CLAUDE.md`.
