self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('desina-store').then((cache) => cache.addAll([
      '/',
      '/index-ar.html',
      '/logo-512.png'
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
