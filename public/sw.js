// Service worker de FincaYa Panamá: notificaciones push y apertura de la app.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: 'FincaYa Panamá', body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'FincaYa Panamá', {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || '/' },
    lang: 'es',
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) { await c.focus(); return c.navigate(url) }
    }
    return self.clients.openWindow(url)
  })())
})

// Necesario para que el navegador ofrezca "Instalar app"; no guarda caché.
self.addEventListener('fetch', () => {})
