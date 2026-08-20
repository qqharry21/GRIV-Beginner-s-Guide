/* RICOH GR IV 新手完全指南 — Service Worker
   改了 index.html 之後，把 VERSION 加一，使用者下次開啟就會拿到新版。 */
const VERSION   = 'gr4-v3';
const CORE      = VERSION + '-core';
const RUNTIME   = VERSION + '-runtime';

const CORE_FILES = [
  './',
  './index.html',
  './caption.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CORE)
      .then(function (c) { return c.addAll(CORE_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CORE && k !== RUNTIME) { return caches.delete(k); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') { self.skipWaiting(); }
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') { return; }
  const url = new URL(req.url);

  // 導覽請求：先試網路，失敗就用快取的頁面（離線可讀）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CORE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html', { ignoreSearch: true })
          .then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  // 同源靜態檔：快取優先
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          const copy = res.clone();
          caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
    return;
  }

  // 字型等跨網域資源：先給快取，同時背景更新
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(RUNTIME).then(function (c) {
        return c.match(req).then(function (hit) {
          const net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) { c.put(req, res.clone()); }
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
  }
});
