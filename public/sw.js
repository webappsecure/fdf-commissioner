const CACHE = 'fdf-commissioner-v1';
const MAX_ENTRIES = 300;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// expo-sqlite on web needs SharedArrayBuffer, which needs cross-origin isolation.
// A static host cannot send these headers, so the worker adds them.
function withIsolationHeaders(response) {
  if (response.status === 0 || response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Cache.put replaces an existing entry by removing it and appending, so the oldest keys are the stalest.
async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((key) => cache.delete(key)));
}

async function refresh(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

// Cache first so a slow or missing connection never delays opening; the network refreshes the copy for next time.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
      if (cached) {
        event.waitUntil(refresh(request).catch(() => {}));
        return withIsolationHeaders(cached);
      }
      return withIsolationHeaders(await refresh(request));
    })(),
  );
});
