/* Ball Hawk Buddy service worker.
 *
 * Scope: make the app installable, keep the app shell available offline, and —
 * as a progressive enhancement — wake open clients to flush the offline Catch
 * queue when connectivity returns (Background Sync API; unsupported on iOS,
 * where the in-app flush triggers handle it). The queue itself lives in app
 * code (IndexedDB); the SW only nudges clients to drain it.
 */

const SYNC_TAG = "bhb-sync-catches";

const CACHE_VERSION = "bhb-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Background sync: when the browser fires this (connectivity returned), tell any
// open client to drain the IndexedDB catch queue. If no client is open we can't
// sync (no auth in the SW), which is fine — the next app open will flush.
self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) =>
        clients.forEach((c) => c.postMessage({ type: "bhb:flush" }))
      )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests; let cross-origin (MLB API, headshots)
  // hit the network normally.
  if (url.origin !== self.location.origin) return;

  // Never cache Supabase auth/storage or Next.js data requests.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Static assets: cache-first with background refresh.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
