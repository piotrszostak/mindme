// Tryb offline: Service Worker musi mieć w cache każdy plik, który ładuje index.html.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
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
