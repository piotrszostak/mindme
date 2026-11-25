# Testy (Playwright)

    npm i && npx playwright install chromium firefox
    npm test            # sam uruchomi `npx serve www -l 3000`, jeśli nie działa

Jeden plik = jeden obszar (szukaj testów po nazwie pliku, nie czytaj wszystkich):

| plik                                                                  | obszar                                                      |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `parser.spec.js`                                                      | Markdown ⇄ model, wiele korzeni, round-trip, frontmatter    |
| `files.spec.js`                                                       | otwieranie i zapis plików, ochrona linii spoza mapy         |
| `layout.spec.js`, `wrap.spec.js`                                      | układy, brak nakładania, zawijanie, emoji w tekście         |
| `topbar.spec.js`                                                      | pasek, przełącznik Markdown/mapa, menu „…”                  |
| `menu.spec.js`                                                        | menu podręczne, kopiuj/wytnij/wklej/usuń                    |
| `selection.spec.js`                                                   | odznaczanie, praca bez zaznaczenia                          |
| `edit.spec.js`                                                        | edycja w węźle                                              |
| `keys.spec.js`                                                        | **wszystkie skróty** (zwykły + vim), także w **Firefoksie** |
| `palette.spec.js`                                                     | paleta komend (Ctrl+K, `:`), tabela czynności `ACT`         |
| `navigation.spec.js`                                                  | strzałki zgodne z układem, Alt+strzałki                     |
| `dnd.spec.js`, `touch.spec.js`                                        | przeciąganie myszą, gesty dotykowe                          |
| `animation.spec.js`                                                   | sprężyny, wyrastanie/chowanie węzłów                        |
| `style.spec.js`, `emoji.spec.js`, `multiroot.spec.js`, `view.spec.js` | panel wyglądu, emoji, wiele korzeni, pomoc i widok          |
| `pwa.spec.js`                                                         | `sw.js` ma w cache każdy plik z `index.html`                |

Wspólne pomocniki (`box`, `act`, `texts`, `MD`…) są w `helpers.js`.

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
