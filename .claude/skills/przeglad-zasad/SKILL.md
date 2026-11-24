---
name: przeglad-zasad
description: Przegląd zasad, skilli i automatów – co pomaga, co przeszkadza, co poprawić.
disable-model-invocation: true
---

1. Zbierz materiał: `.claude/MOJA-KONFIGURACJA.md` (data poprzedniego przeglądu), `git log` od tej daty, `HANDOVER.md`, `docs/decyzje.md`. Zapytaj użytkownika jednym pytaniem, co w pracy z agentem irytowało albo się powtarzało.
2. Szukaj pomyłek agenta, powtarzanych próśb, zasad, które przeszkadzały albo nie były używane, i kosztownych nawyków (tokeny, długie testy). Których skilli nikt nie używa, pokaże użytkownikowi `/skill-doctor`.
3. Każde znalezisko przypisz:
   - da się wykryć maszynowo → automat (test, hook, bramka), a nie nowa zasada;
   - wymaga oceny → jedna linia w `CLAUDE.md`;
   - nieużywane albo niezmieniające zachowania → do usunięcia.
4. Pokaż najwyżej 5 propozycji, od najważniejszej: co zmienić, w którym pliku i dlaczego. Zmieniasz tylko te, które użytkownik zaakceptuje.
5. Zaktualizuj mapę: zmienione pozycje, datę tego przeglądu i termin następnego (domyślnie za miesiąc).
