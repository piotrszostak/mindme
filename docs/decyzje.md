# Dziennik decyzji

Wpis: data, decyzja, powód, odrzucone opcje. Założenia agenta oznaczone jako założenia.

## Otwarte

- **appId aplikacji na Androida** – teraz `pl.example.mindmap` (`capacitor.config.json`). Ustalić przed pierwszym wydaniem: po publikacji zmiana oznacza nową aplikację w sklepie, a użytkownicy tracą zapisane mapy.

## Podjęte

- **2026-11-24 – Szukanie: Ctrl+F jak w przeglądarce, „/” jak w vim** (ROADMAP.md, zadanie 1.2; wybór użytkownika). Po Ctrl+F pole zostaje otwarte: Enter / Shift+Enter (też Ctrl+G / Ctrl+Shift+G) przechodzą po trafieniach, Esc zamyka. Po „/” Enter szuka i zamyka pole, dalej n / N. Odrzucone: zawsze jak w przeglądarce (w stylu vim trzeba by naciskać Esc przed n); „jak dotąd + Shift+Enter” (Enter nie przechodzi po trafieniach).
- **2026-11-24 – „Duplikuj gałąź” (Ctrl+D) także w menu podręcznym**, za „Kopiuj gałąź” (wybór użytkownika). Powód: na telefonie nie ma klawiatury. Odrzucone: tylko Ctrl+D.
- **2026-11-24 – Zmiany skrótów z zadania 1.2** (ROADMAP.md): Spacja edytuje, Shift+Spacja zwija, `e`, `c`, `s`/`S`, Ctrl+G, Shift+1, Shift+2/`zz`, Ctrl+D, Ctrl+/, `z1`–`z9`, Caps Lock nie zmienia znaczenia liter, Ctrl+Alt+litera (AltGr) nic nie robi; F1, F2, F3, Shift+F10 to ukryte aliasy. Założenia agenta: Shift+2 przybliża do 100%, jeśli widok był oddalony (bardziej przybliżonego nie oddala); `z1`–`z9` liczą poziomy od korzenia = 0, więc `z1` pokazuje korzeń i główne gałęzie; pasek stanu przy skoku po trafieniach pokazuje „trafienie 2 z 7”; „Dopasuj widok” nazywa się teraz „Dopasuj całą mapę”.
- **2026-11-24 – Backspace usuwa węzeł, Ctrl+Shift+Z ponawia, Shift+Tab wysuwa poziom** (ROADMAP.md, zadanie 1.1). Powód: Mac nie ma klawisza Delete, a Ctrl+Shift+Z i Shift+Tab to standard innych aplikacji. Wcześniej te klawisze celowo nic nie robiły (zasada „jeden skrót zwykły i jeden vim, bez duplikatów”). Teraz dawne skróty mogą zostać jako ukryte aliasy: działają, ale nie ma ich w pomocy, w menu ani w README (pierwszy taki: Ctrl+Y).
- **2026-11-22 – Licencja MIT.** Powód nie został zapisany.
- **Przed 2026-11-22 – Wklejanie tylko w obrębie aplikacji.** Wklejanie ze schowka systemowego wycofano. Powód nie został zapisany.
