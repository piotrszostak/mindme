// Tryb offline: Service Worker musi mieć w cache każdy plik, który ładuje index.html.
const { test, expect } = require('@playwright/test');
const fs = require('fs'),
  path = require('path');
const www = path.join(__dirname, '..', 'www');

test('sw.js ma w cache wszystkie skrypty i style z index.html', () => {
  const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
  const used = [...html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css|webmanifest|png))"/g)].map(m => m[1]);
  expect(used.length).toBeGreaterThan(10);
  for (const f of used) {
    expect(sw, `brak „${f}” w liście cache sw.js`).toContain(`'${f}'`);
    expect(fs.existsSync(path.join(www, f)), `plik ${f} nie istnieje`).toBe(true);
  }
});

test('sw.js ma w cache pliki, do których odsyłają style (czcionki w fonts/)', () => {
  const sw = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
  const css = fs.readdirSync(path.join(www, 'css')).filter(f => f.endsWith('.css'));
  let n = 0;
  for (const c of css)
    for (const m of fs
      .readFileSync(path.join(www, 'css', c), 'utf8')
      .matchAll(/url\(["']?(?!data:)([^"')]+)["']?\)/g)) {
      const f = path.posix.normalize('css/' + m[1]);
      expect(sw, `brak „${f}” (z ${c}) w liście cache sw.js`).toContain(`'${f}'`);
      expect(fs.existsSync(path.join(www, f)), `plik ${f} nie istnieje`).toBe(true);
      n++;
    }
  expect(n).toBeGreaterThanOrEqual(12); // 3 kroje × 2 grubości × 2 podzbiory
  expect(fs.existsSync(path.join(www, 'fonts', 'OFL.txt')), 'licencja czcionek').toBe(true);
});

// GitHub Pages podaje aplikację z podkatalogu (https://…github.io/mindme/), więc ścieżki muszą być względne.
test('aplikacja działa z podkatalogu (jak na GitHub Pages): nic nie sięga poza niego', async ({ page, baseURL }) => {
  const outside = [];
  await page.route(`${baseURL}/**`, async route => {
    const u = new URL(route.request().url());
    if (!u.pathname.startsWith('/mindme/')) {
      outside.push(u.pathname);
      return route.fulfill({ status: 404, body: '' });
    }
    u.pathname = u.pathname.slice('/mindme'.length);
    return route.fulfill({ response: await route.fetch({ url: u.href }) });
  });
  await page.goto('/mindme/');
  await expect(page.locator('#info')).toContainText('round-trip OK');
  expect(await page.evaluate(() => [...document.styleSheets].map(s => s.href && new URL(s.href).pathname))).toEqual([
    '/mindme/css/fonts.css',
    '/mindme/css/app.css',
  ]);
  expect(outside, 'żądania spoza podkatalogu').toEqual([]);
  /* manifest i lista cache Service Workera (tych test w przeglądarce nie pobiera) */
  const man = JSON.parse(fs.readFileSync(path.join(www, 'manifest.webmanifest'), 'utf8'));
  for (const u of [man.start_url, ...man.icons.map(i => i.src)]) expect(u, 'ścieżka w manifeście').not.toMatch(/^\//);
  expect(fs.readFileSync(path.join(www, 'sw.js'), 'utf8'), 'ścieżka od korzenia w sw.js').not.toMatch(/'\/[^']/);
});

// Słaba sieć w telefonie: Service Worker nie czeka na nią w nieskończoność, jeśli ma plik w cache.
test('sw.js: bez odpowiedzi sieci po 3 s podaje plik z cache', async () => {
  const vm = require('vm');
  /** @type {Record<string, Function>} */
  const on = {};
  const cached = { from: 'cache' };
  const ctx = {
    self: { addEventListener: (n, f) => (on[n] = f), skipWaiting: () => {}, clients: { claim: () => {} } },
    location: { origin: 'http://x' },
    URL,
    setTimeout,
    fetch: () => new Promise(() => {}),
    caches: { match: async () => cached, open: async () => ({ put: async () => {}, addAll: async () => {} }) },
  };
  vm.runInNewContext(fs.readFileSync(path.join(www, 'sw.js'), 'utf8'), ctx);
  let res;
  on.fetch({ request: { method: 'GET', url: 'http://x/index.html' }, respondWith: p => (res = p) });
  const t0 = Date.now();
  expect(await res).toBe(cached);
  expect(Date.now() - t0).toBeGreaterThan(2500);
  expect(Date.now() - t0).toBeLessThan(4500);
});
