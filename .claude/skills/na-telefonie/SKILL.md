---
name: na-telefonie
description: Sprawdzenie na prawdziwym telefonie. Użyj po zmianach dotyku, przeciągania, animacji albo wydajności, przy błędzie widocznym tylko na telefonie i gdy użytkownik chce coś sprawdzić na telefonie.
---

Testy i przeglądarka na komputerze nie pokażą prawdziwego dotyku, płynności ani zachowania Androida. Ten skill prowadzi krótkie sprawdzenie na telefonie użytkownika.

1. Uruchom serwer `mapa` z panelu podglądu albo `npx serve www -l 3000`; oba słuchają w całej sieci lokalnej. Adres dla telefonu: `http://<adres komputera z ip -4 -br addr>:3000`.
2. Na tym komputerze działa zapora ufw i domyślnie blokuje telefon. Podaj użytkownikowi komendę do samodzielnego uruchomienia, np. `sudo ufw allow from <sieć lokalna z kroku 1> to any port 3000 proto tcp`, i komendę, która to cofa (`sudo ufw delete allow …`). Zapory nie zmieniasz sam.
3. Napisz: telefon w tej samej sieci, adres w Chrome. Uprzedź, że przez taki adres nie działa tryb offline ani instalacja aplikacji, co nie przeszkadza w sprawdzaniu dotyku.
4. Daj 3–5 kroków. W każdym: co zrobić palcem, czego się spodziewać i o co pytasz (tak/nie i co widać). Kroki dotyczą ostatniej zmiany albo listy „Do sprawdzenia na prawdziwym urządzeniu” z `HANDOVER.md`.
5. Zapisz wynik: potwierdzone sprawy usuń z tej listy, nowe dopisz. Błąd przekaż do `/naprawa`.
