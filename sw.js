/* Service worker do CalcTudo.
   Guarda os arquivos no aparelho para o app abrir sem internet.
   Ao publicar uma nova versão dos arquivos, aumente o número em CACHE. */
const CACHE = 'calctudo-v1';
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'fonts/fonts.css',
  'fonts/bricolage-grotesque-latin-wght-normal.woff2',
  'fonts/azeret-mono-latin-wght-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/favicon.ico'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Página: abre na hora com a cópia guardada e atualiza em segundo plano.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match('index.html');
      const net = fetch(req)
        .then(r => { if (r && r.ok) cache.put('index.html', r.clone()); return r; })
        .catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response('Sem conexão.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }

  // Demais arquivos (ícones, fontes): usa a cópia guardada e busca na rede só se faltar.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }))
  );
});
