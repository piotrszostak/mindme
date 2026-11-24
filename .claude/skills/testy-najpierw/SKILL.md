---
name: testy-najpierw
description: Testy logiki pisane przed kodem. Użyj przed zmianą logiki aplikacji (model mapy, parse/serialize, układ, operacje na gałęziach, cofanie, skróty) i przed poprawką błędu w logice.
---

Pętla: jeden test → uruchom i zobacz, że nie przechodzi z właściwego powodu → najmniejszy kod, który go zalicza → następny test. Porządki dopiero, gdy wszystko jest zielone.

- Test sprawdza zachowanie widoczne z zewnątrz: wynik `parse`/`serialize`, kształt mapy, tekst i położenie węzłów na ekranie. Nie sprawdza szczegółów, które mogą się zmienić bez zmiany działania.
- Wartość oczekiwana pochodzi z przykładu wpisanego ręcznie, nigdy z tego samego wyliczenia co w kodzie.
- Testy są w Playwright, w pliku obszaru z `tests/README.md`. Logikę wywołujesz przez `page.evaluate`, jak w `tests/parser.spec.js`; wspólne pomocniki są w `tests/helpers.js`.
- Kod bez testów: najpierw test, który zapisuje obecne zachowanie zmienianego fragmentu, dopiero potem zmiana.
- Granice testów wybierasz sam. Użytkownikowi mówisz jednym zdaniem, co test łapie, na przykładzie: „jeśli zwinięta gałąź zgubi dzieci po zapisie, test to złapie”.
- W trakcie pracy uruchamiasz jeden plik: `npx playwright test tests/<obszar>.spec.js`. Całość uruchamia bramka przed commitem.
- Nie osłabiasz ani nie usuwasz testu po to, żeby przeszedł. Jeśli test jest zły, mówisz to wprost i pytasz.
