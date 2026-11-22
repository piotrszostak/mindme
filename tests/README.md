# Testy (Playwright)

    npm i && npx playwright install chromium firefox
    npm test            # sam uruchomi `npx serve www -l 3000`, jeśli nie działa

- `parser.spec.js` – parse/serialize, round-trip, `<!--c-->`, `<!--layout:-->`, widok tekstowy
- `layout.spec.js` – układy right/left/both/down, brak nakładania, centrowanie, SVG vs model
- `wrap.spec.js`   – zawijanie tekstu w węzłach (maks. 220 px tekstu, linia 18 px)
- `keys.spec.js`   – skróty klawiszowe (vim) nie trafiają do przeglądarki; uruchamiany też w **Firefoksie** z włączonym „Szukaj tekstu podczas pisania”
- `ui.spec.js`     – pasek ikon, przełącznik MD/mapa, menu podręczne, edycja w węźle, klawiatura, drag and drop, dotyk, animacje

Testy działają z `reducedMotion: 'reduce'` (pozycje od razu końcowe); blok „animacja” włącza ruch sam.

## W obrazie z Containerfile
Chromium i jego biblioteki są już w obrazie (`/ms-playwright`) – wystarczy `npm i && npm test`.
Wersja w Containerfile musi być równa `@playwright/test` w package.json (przypięta: 1.65.1).

## Stary kontener bez roota (brak bibliotek Chromium)
`playwright install-deps` wymaga roota. Zamiast tego biblioteki są rozpakowane z .deb do `.pw-libs/root`,
a `playwright.config.js` sam dokłada je do `LD_LIBRARY_PATH`:

    D=$PWD/.pw-libs; mkdir -p $D/lists/partial $D/cache/archives/partial $D/debs
    O="-o Dir::State::Lists=$D/lists -o Dir::Cache=$D/cache -o Debug::NoLocking=1 -o APT::Sandbox::User=$(id -un)"
    apt-get $O update
    (cd $D/debs && apt-get $O download libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdbus-1-3 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 libasound2 libatspi2.0-0 libwayland-server0 libdrm2 \
      libxshmfence1 libxi6)
    for f in $D/debs/*.deb; do dpkg -x $f $D/root; done

Firefox wymaga dodatkowo bibliotek GTK3 (`libgtk-3-0` z zależnościami, `libx11-xcb1`, `libxcursor1`, `libdbus-glib-1-2`, `libxtst6`)
pobranych tak samo do `.pw-libs/root`. Ma własne, nowsze NSS – `playwright.config.js` stawia jego katalog na początku `LD_LIBRARY_PATH`.
