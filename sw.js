// ALFIE Service Worker v4
// HTML is served network-first so a new build always reaches the device.
// Static assets stay cache-first for speed and offline use.
const CACHE = 'alfie-v4';
const ASSETS = [
  '/home-dashboard/mobile.html',
  '/home-dashboard/manifest.json',
  '/home-dashboard/icon192.png',
  '/home-dashboard/icon512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// let the page force a full cache wipe
self.addEventListener('message', e => {
  if (e.data === 'alfie-clear-cache') {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never touch API calls (Google Sheets, HA, OAuth)
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('google.com') ||
      url.hostname.includes('ha-cruz.com') ||
      url.hostname.includes('anthropic.com')) {
    return;
  }

  const isHTML = e.request.mode === 'navigate' ||
                 e.request.destination === 'document' ||
                 url.pathname.endsWith('.html');

  if (isHTML) {
    // NETWORK-FIRST: always fetch the newest build, fall back to cache when offline
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/home-dashboard/mobile.html')))
    );
    return;
  }

  // CACHE-FIRST for the rest (icons, manifest, fonts)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => cached))
  );
});
