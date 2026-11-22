// Najpierw sieć (zawsze świeża wersja po aktualizacji), cache tylko jako zapas offline.
const C = 'mm-v4',
  A = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icon-192.png',
    'icon-512.png',
    'css/app.css',
    'js/core.js',
    'js/icons.js',
    'js/layout.js',
    'js/render.js',
    'js/edit.js',
    'js/ops.js',
    'js/emoji.js',
    'js/menu.js',
    'js/keys.js',
    'js/files.js',
    'js/help.js',
    'js/side.js',
    'js/dnd.js',
    'js/pointer.js',
    'js/main.js',
  ]; // przy nowym pliku dopisz go tutaj
self.addEventListener('install', e =>
  e.waitUntil(
    caches
      .open(C)
      .then(c => c.addAll(A))
      .then(() => self.skipWaiting())
  )
);
self.addEventListener('activate', e =>
  e.waitUntil(
    caches
      .keys()
      .then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  )
);
self.addEventListener('fetch', e => {
  const q = e.request;
  if (q.method !== 'GET' || new URL(q.url).origin !== location.origin) return;
  e.respondWith(
    fetch(q)
      .then(r => {
        if (r.ok) {
          const c = r.clone();
          caches.open(C).then(x => x.put(q, c));
        }
        return r;
      })
      .catch(() => caches.match(q, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
