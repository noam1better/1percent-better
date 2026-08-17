const CACHE = 'prime-v23'

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/', '/index.html']))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const action = e.action   // 'done' | 'later' | 'help' | '' (body click)
  const data   = e.notification.data || {}

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const msg = { type: 'NUDGE_RESPONSE', action: action || 'open', data }
      if (list.length > 0) {
        list[0].postMessage(msg)
        list[0].focus()
      } else {
        clients.openWindow('/').then(c => c && c.postMessage(msg))
      }
    })
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/')))
  )
})
