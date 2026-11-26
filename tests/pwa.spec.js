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

// GitHub Pages podaje aplikację z podkatalogu (https://…github.io/mindme/), więc ścieżki muszą być względne.
test('aplikacja działa z podkatalogu (jak na GitHub Pages): nic nie sięga poza niego', async ({ page }) => {
  const outside = [];
  await page.route('http://localhost:3000/**', async route => {
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
    '/mindme/css/app.css',
  ]);
  expect(outside, 'żądania spoza podkatalogu').toEqual([]);
  /* manifest i lista cache Service Workera (tych test w przeglądarce nie pobiera) */
  const man = JSON.parse(fs.readFileSync(path.join(www, 'manifest.webmanifest'), 'utf8'));
  for (const u of [man.start_url, ...man.icons.map(i => i.src)]) expect(u, 'ścieżka w manifeście').not.toMatch(/^\//);
  expect(fs.readFileSync(path.join(www, 'sw.js'), 'utf8'), 'ścieżka od korzenia w sw.js').not.toMatch(/'\/[^']/);
});
