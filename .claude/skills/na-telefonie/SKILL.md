---
name: na-telefonie
description: Sprawdzenie na prawdziwym telefonie. Użyj po zmianach dotyku, przeciągania, animacji albo wydajności, przy błędzie widocznym tylko na telefonie i gdy użytkownik chce coś sprawdzić na telefonie.
---

Testy i przeglądarka na komputerze nie pokażą prawdziwego dotyku, płynności ani zachowania Androida. Ten skill prowadzi krótkie sprawdzenie na telefonie użytkownika.

1. Uruchom serwer `mapa` z panelu podglądu albo `npx serve www -l 3000`; oba słuchają w całej sieci lokalnej. Adres dla telefonu: `http://<adres komputera z ip -4 -br addr>:3000`.
2. Zapora ufw bywa włączona (2026-11-25 była wyłączona – niech użytkownik sprawdzi `sudo ufw status`). Gdy jest aktywna, podaj użytkownikowi komendę do samodzielnego uruchomienia, np. `sudo ufw allow from <sieć lokalna z kroku 1> to any port 3000 proto tcp`, i komendę, która to cofa (`sudo ufw delete allow …`). Zapory nie zmieniasz sam.
3. Napisz: telefon w tej samej sieci, adres w Chrome; Chrome na Androidzie poprosi o zgodę „Urządzenia w pobliżu” – bez niej strona się nie otworzy, a w dzienniku serwera nie widać żądań z telefonu. Uprzedź, że przez taki adres nie działa tryb offline ani instalacja aplikacji, co nie przeszkadza w sprawdzaniu dotyku.
   - Odczyt schowka systemowego (np. „Wklej” na dotyku) działa tylko na bezpiecznym adresie: w Chrome na telefonie `chrome://flags/#unsafely-treat-insecure-origin-as-secure` → adres serwera → Enabled → Relaunch.
4. Daj 3–5 kroków. W każdym: co zrobić palcem, czego się spodziewać i o co pytasz (tak/nie i co widać). Kroki dotyczą ostatniej zmiany albo listy „Do sprawdzenia na prawdziwym urządzeniu” z `HANDOVER.md`.
5. Zapisz wynik: potwierdzone sprawy usuń z tej listy, nowe dopisz. Błąd przekaż do `/naprawa`.
