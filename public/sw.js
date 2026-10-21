// Offline-capable, never-stale caching for NBA Legacy.
// - Page (navigations): network first, cached copy only when offline or the network is slower than 3 s.
// - Hashed build files and our own images: cache first (their URLs change when they change).
// - Google Fonts: cache first. Other cross-origin requests (e.g. NBA logos) are left alone: opaque
//   responses would eat the storage quota.
const CACHE = 'nbalegacy-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const put = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone(); // clone now: the page may consume the body before the cache opens
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
};

async function networkFirst(req) {
  const cached = caches.match(req);
  try {
    const net = fetch(req).then((res) => put(req, res));
    const timeout = new Promise((resolve) => setTimeout(resolve, 3000)).then(() => cached);
    const res = await Promise.race([net, timeout]);
    return res || (await net);
  } catch {
    return (await cached) || Response.error();
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  return put(req, await fetch(req));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req));
  if (url.origin === self.location.origin) {
    if (/\/(assets|crests|flags|icons|stock)\//.test(url.pathname)) return e.respondWith(cacheFirst(req));
    return;
  }
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') e.respondWith(cacheFirst(req));
});
