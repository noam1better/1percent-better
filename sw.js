// ═══════════════════════════════════════════════
// 1% Better — Service Worker v1.2.0
// ═══════════════════════════════════════════════

const CACHE_NAME = '1pb-v1.2.0';
const OFFLINE_URL = '/index.html';
const ALLOWED_CROSS_ORIGINS = [
  'cdn.jsdelivr.net',
  'storage.googleapis.com',
];

const PRE_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
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
// Force-delete ALL caches on activation for clean deployment
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    }).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────
// Strategy: Cache-first for app shell, network-first for API calls
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedCrossOrigin = ALLOWED_CROSS_ORIGINS.includes(url.host);

  if (request.method !== 'GET') return;
  if (!isSameOrigin && !isAllowedCrossOrigin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        const fetchPromise = fetch(request).then(response => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => {});
        return cached;
      }

      return fetch(request).then(response => {
        if (!response) return response;
        if (response.status === 200 || response.type === 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
            .then(r => r || caches.match('/'));
        }
        return Response.error();
      });
    })
  );
});

self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache =>
        Promise.all(
          data.urls.map(url =>
            cache.add(url).catch(err =>
              console.warn('[SW] cache-url failed for', url, err)
            )
          )
        )
      )
    );
    return;
  }
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── PUSH NOTIFICATIONS (Phase 6 placeholder) ─────
self.addEventListener('push', event => {
  let raw = {};
  try { raw = event.data ? event.data.json() : {}; } catch (_) {}

  // Handle both flat format (local scheduler / legacy) and FCM server format.
  // FCM Admin SDK with webpush.data sends flat keys directly.
  // FCM Admin SDK with notification field wraps inside raw.notification.
  const title = raw.title || raw.notification?.title || '1% Better 🔥';
  const body  = raw.body  || raw.notification?.body  || 'הרצף שלך מחכה לך — בוא תוכיח את זה';
  const icon  = raw.icon  || raw.notification?.icon  || '/icon-192.png';
  const badge = raw.badge || raw.notification?.badge || '/icon-192.png';
  const tag   = raw.tag   || 'daily-reminder';
  const url   = raw.url   || raw.data?.url           || '/#hub';

  const options = {
    body, icon, badge, tag,
    data:  { url },
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
  const url = event.notification.data?.url || '/';
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
