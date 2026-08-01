// ALFIE Service Worker v1
const CACHE = 'alfie-v2';
const ASSETS = [
  '/home-dashboard/mobile.html',
  '/home-dashboard/manifest.json',
  '/home-dashboard/icon192.png',
  '/home-dashboard/icon512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>null)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache API calls (Google Sheets, HA, OAuth)
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('google.com') ||
      url.hostname.includes('ha-cruz.com') ||
      url.hostname.includes('anthropic.com')) {
    return;
  }
  // Cache-first for static assets
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
