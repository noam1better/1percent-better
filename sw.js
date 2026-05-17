// ═══════════════════════════════════════════════
// 1% Better — Service Worker
// ═══════════════════════════════════════════════

const VERSION         = '1.1.0';
// Cache names include the VERSION so each version-bump invalidates the
// previous cache wholesale. Without this, skipWaiting() still leaves
// the old HTML/JS in the cache and stale content keeps being served.
const CACHE_NAME      = `1pb-v${VERSION}`;
const ASSET_CACHE     = `1pb-assets-v${VERSION}`;
const OFFLINE_URL     = '/offline.html';

// Cross-origin hosts whose responses we DO want to cache: the MediaPipe
// loader/wasm from jsDelivr and the pose-landmarker model from Google's
// public bucket. Everything else (Firebase APIs, fonts, etc.) we skip so
// we don't accidentally cache short-lived API responses.
const CACHEABLE_CROSS_ORIGINS = [
  'cdn.jsdelivr.net',
  'storage.googleapis.com',
];

const PRE_CACHE = [
  '/1percent-better.html',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
];

// ── INSTALL ──────────────────────────────────────
// Use per-asset add() so a single missing file (e.g. an icon not yet
// uploaded) doesn't fail the entire SW install via addAll's atomic semantics.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        PRE_CACHE.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] pre-cache miss for', url, err)
          )
        )
      )
    )
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────
// Delete old caches when a new SW takes over. Keep both the app shell
// cache and the long-lived asset cache so the MediaPipe model survives
// across SW updates.
self.addEventListener('activate', event => {
  console.info('[SW] activating v' + VERSION);
  const keep = new Set([CACHE_NAME, ASSET_CACHE]);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────
// Strategy:
//   - Same-origin GETs   → stale-while-revalidate against CACHE_NAME.
//   - Whitelisted cross-origin (MediaPipe CDN + model bucket) → cache-first
//     against ASSET_CACHE. These assets are content-addressed by version
//     in the URL so they're safe to cache indefinitely; saves a ~6MB
//     model re-download every time the user opens the workout screen.
//   - Other cross-origin (Firebase APIs, fonts, analytics) → skip the SW
//     entirely so we don't accidentally cache short-lived responses.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (!CACHEABLE_CROSS_ORIGINS.includes(url.hostname)) return;
    event.respondWith(
      caches.open(ASSET_CACHE).then(cache =>
        cache.match(request).then(hit => {
          if (hit) return hit;
          return fetch(request, { mode: 'cors', credentials: 'omit' })
            .then(resp => {
              // Cache only successful, non-opaque responses. Opaque
              // (no-cors) responses can't be inspected and would also
              // poison the cache if the origin later returned an error.
              if (resp && resp.status === 200 && resp.type !== 'opaque') {
                cache.put(request, resp.clone());
              }
              return resp;
            })
            .catch(() => Response.error());
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Serve from cache, refresh in background (stale-while-revalidate).
        fetch(request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Offline fallback — only for navigations; other request types
        // should surface the network error so the page can react.
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
            .then(r => r || caches.match('/1percent-better.html'));
        }
        return Response.error();
      });
    })
  );
});

// ── PUSH NOTIFICATIONS (Phase 6 placeholder) ─────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '1% Better 🔥';
  const options = {
    body:  data.body  || 'הרצף שלך מחכה לך — בוא תוכיח את זה',
    icon:  data.icon  || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag:   data.tag   || 'daily-reminder',
    data:  { url: data.url || '/1percent-better.html' },
    actions: [
      { action: 'open',    title: '🚀 פתח' },
      { action: 'dismiss', title: 'אחר כך' },
    ],
    requireInteraction: false,
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ───────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/1percent-better.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('1percent-better'));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (Phase 6 placeholder) ────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPendingPosts());
  }
});

async function syncPendingPosts() {
  // Will be implemented in Phase 3 (Backend)
  // Will read pending posts from IndexedDB and send to server
  console.log('[SW] Background sync: sync-posts');
}
