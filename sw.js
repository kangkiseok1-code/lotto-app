// 오행 로또 서비스워커 — 앱 셸 오프라인 캐시
// HTML은 network-first(항상 최신, 오프라인 시 캐시), 그 외 same-origin은 stale-while-revalidate.
const CACHE = 'ohaeng-lotto-v2';
const CORE = [
  './', './index.html', './engine.browser.js', './jsQR.min.js',
  './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return; // 외부(결과/CDN)는 네트워크 그대로

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // network-first: 온라인이면 항상 최신 HTML, 실패 시 캐시
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // stale-while-revalidate: 캐시 즉시 + 백그라운드 갱신
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  }
});
