// @ts-check
const { defineConfig } = require('@playwright/test');
const fs = require('fs'),
  path = require('path');
// Kontener bez roota: biblioteki przeglądarek rozpakowane lokalnie z .deb (zob. tests/README.md).
// Tylko w kontenerze – na zwykłym systemie te biblioteki psują powłokę (/bin/sh: symbol lookup error).
const libs = path.join(__dirname, '.pw-libs/root');
const inContainer = fs.existsSync('/run/.containerenv') || fs.existsSync('/.dockerenv');
// Firefox ma własne (nowsze) NSS – jego katalog musi być na ścieżce przed bibliotekami z Debiana.
// Ustawiamy w procesie testów, bo Playwright tym środowiskiem sprawdza też zależności przeglądarek.
if (inContainer && fs.existsSync(libs)) {
  let ffDir = [];
  try {
    ffDir = [path.dirname(require('playwright-core').firefox.executablePath())];
  } catch (e) {}
  process.env.LD_LIBRARY_PATH = [
    ...ffDir,
    libs + '/usr/lib/x86_64-linux-gnu',
    libs + '/lib/x86_64-linux-gnu',
    process.env.LD_LIBRARY_PATH,
  ]
    .filter(Boolean)
    .join(':');
}

// Port serwera testowego: domyślnie 3000; równoległa kopia repozytorium (worktree) dostaje własny, np. PW_PORT=3101,
// bo przy reuseExistingServer testy użyłyby cudzego serwera (np. podglądu) z innym kodem.
const port = Number(process.env.PW_PORT) || 3000;

module.exports = defineConfig({
  testDir: 'tests',
  use: {
    baseURL: `http://localhost:${port}`,
    serviceWorkers: 'block', // bez cache SW – zawsze świeży index.html
    reducedMotion: 'reduce', // animacje natychmiastowe; testy animacji włączają ruch same
    viewport: { width: 1280, height: 800 },
  },
  webServer: { command: `npx serve www -l ${port}`, url: `http://localhost:${port}`, reuseExistingServer: true },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // Firefox: skróty klawiszowe i paleta (m.in. Ctrl+M – „Przenieś do…”, w Firefoksie wyciszanie karty) przy włączonym „Szukaj tekstu podczas pisania” (typeaheadfind) i szybkim wyszukiwaniu „/”; dołączone kroje (w Firefoksie zamiast „Odręcznej” wychodził Noto Nastaliq Urdu)
    {
      name: 'firefox',
      testMatch: /(keys|search|clipboard|palette|fonts|nodebar|mdbar)\.spec\.js/,
      use: {
        browserName: 'firefox',
        launchOptions: {
          firefoxUserPrefs: { 'accessibility.typeaheadfind': true, 'accessibility.typeaheadfind.manual': true },
        },
      },
    },
  ],
});
