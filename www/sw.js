// Najpierw sieć (zawsze świeża wersja po aktualizacji), cache jako zapas offline i przy bardzo wolnej sieci.
const C = 'mm-v6',
  A = [
    './',
    'index.html',
    'manifest.webmanifest',
    'icon-192.png',
    'icon-512.png',
    'css/fonts.css',
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
    'js/actions.js',
    'js/palette.js',
    'js/whichkey.js',
    'js/help.js',
    'js/side.js',
    'js/dnd.js',
    'js/pointer.js',
    'js/nodebar.js',
    'js/main.js',
    'fonts/nunito-latin-400-normal.woff2',
    'fonts/nunito-latin-ext-400-normal.woff2',
    'fonts/nunito-latin-700-normal.woff2',
    'fonts/nunito-latin-ext-700-normal.woff2',
    'fonts/kalam-latin-400-normal.woff2',
    'fonts/kalam-latin-ext-400-normal.woff2',
    'fonts/kalam-latin-700-normal.woff2',
    'fonts/kalam-latin-ext-700-normal.woff2',
    'fonts/archivo-narrow-latin-400-normal.woff2',
    'fonts/archivo-narrow-latin-ext-400-normal.woff2',
    'fonts/archivo-narrow-latin-700-normal.woff2',
    'fonts/archivo-narrow-latin-ext-700-normal.woff2',
  ]; // przy nowym pliku dopisz go tutaj
/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);
sw.addEventListener('install', e =>
  e.waitUntil(
    caches
      .open(C)
      .then(c => c.addAll(A))
      .then(() => sw.skipWaiting())
  )
);
sw.addEventListener('activate', e =>
  e.waitUntil(
    caches
      .keys()
      .then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))
      .then(() => sw.clients.claim())
  )
);
/* słaba sieć (telefon): po tylu ms bez odpowiedzi podajemy plik z cache, a sieć dalej go odświeża */
const NET_WAIT = 3000;
sw.addEventListener('fetch', e => {
  const q = e.request;
  if (q.method !== 'GET' || new URL(q.url).origin !== location.origin) return;
  const cached = () => caches.match(q, { ignoreSearch: true }),
    net = fetch(q).then(r => {
      if (r.ok) {
        const c = r.clone();
        caches.open(C).then(x => x.put(q, c));
      }
      return r;
    });
  net.catch(() => {});
  const slow = new Promise(res => setTimeout(res, NET_WAIT)).then(cached).then(r => r || net);
  e.respondWith(
    Promise.race([net, slow]).catch(
      async () => (await cached()) || (await caches.match('index.html')) || Response.error()
    )
  );
});
