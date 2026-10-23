const CACHE = 'fdf-commissioner-v1';
const MAX_ENTRIES = 300;
const NAVIGATION_TIMEOUT_MS = 3000;

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

// Files under these paths have a content hash in their name, so a cached copy never goes stale.
// Prefixed with the worker's scope so a subpath host such as /fdf-commissioner/ still matches.
const SCOPE_PATH = new URL(self.registration.scope).pathname;
const IMMUTABLE_PATHS = ['_expo/static/', 'assets/'].map((path) => SCOPE_PATH + path);

// Resolves null instead of rejecting so a response that wins the race leaves nothing unhandled behind.
function timeoutAfter(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

// A cached page can outlive the lazily loaded files of its build, so pages try the network first.
// A cached copy is used offline or when the network is slow; with no copy to fall back on the network gets all the time it needs.
// A slow response keeps loading in the background and is cached for the next visit.
async function loadPage(request, event) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const pending = fetchAndCache(request);
  event.waitUntil(pending.catch(() => {}));
  let networkResponse = null;
  try {
    networkResponse = await (cached ? Promise.race([pending, timeoutAfter(NAVIGATION_TIMEOUT_MS)]) : pending);
    if (networkResponse?.ok) return withIsolationHeaders(networkResponse);
  } catch {
    // fall through to a cached copy
  }
  if (cached) return withIsolationHeaders(cached);
  if (networkResponse) return withIsolationHeaders(networkResponse);
  // Offline on a page that was never cached: the app shell can show it through the client router.
  const shell = await caches.match(SCOPE_PATH, { ignoreSearch: true });
  return shell ? withIsolationHeaders(shell) : Response.error();
}

// Other files are cache first so a slow or missing connection never delays opening; the network refreshes mutable copies for next time.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(loadPage(request, event));
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        const { pathname } = new URL(request.url);
        if (!IMMUTABLE_PATHS.some((prefix) => pathname.startsWith(prefix))) {
          event.waitUntil(refresh(request).catch(() => {}));
        }
        return withIsolationHeaders(cached);
      }
      return withIsolationHeaders(await refresh(request));
    })(),
  );
});
