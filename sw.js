// ═══════════════════════════════════════════════
// 1% Better — Service Worker v1.0
// ═══════════════════════════════════════════════

const CACHE_NAME   = '1pb-v1';
const OFFLINE_URL  = '/offline.html';

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
// Delete old caches when a new SW takes over
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────
// Strategy: Cache-first for app shell, network-first for API calls
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (e.g. Google Fonts)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Serve from cache, but refresh in background (stale-while-revalidate)
        const fetchPromise = fetch(request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => {}); // ignore network errors silently
        return cached;
      }

      // Not in cache — fetch from network, cache it, return it
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Offline fallback — only for navigations; other request types should
        // surface the network error so the page can react appropriately.
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
