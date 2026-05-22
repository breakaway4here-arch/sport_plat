const CACHE_NAME = 'sport_plat_v1';
const ASSETS = [
  '/sport_plat/',
  '/sport_plat/index.html',
  '/sport_plat/css/style.css',
  '/sport_plat/js/exercises.js',
  '/sport_plat/js/app.js',
  '/sport_plat/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 不缓存 wger API 请求
  if (e.request.url.includes('wger.de')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      });
      return cached || fetchPromise;
    })
  );
});
