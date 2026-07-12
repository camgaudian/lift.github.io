/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
void self.skipWaiting()
clientsClaim()

self.addEventListener('push', (event) => {
  let title = 'Lift'
  let body = ''
  let url = '/'
  let type = 'unknown'

  try {
    const data = event.data?.json() as {
      title?: string
      body?: string
      url?: string
      type?: string
    } | null
    if (data) {
      title = data.title || title
      body = data.body || body
      url = data.url || url
      type = data.type || type
    }
  } catch {
    const text = event.data?.text()
    if (text) body = text
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url, type },
      icon: `${self.registration.scope}favicon.svg`,
      badge: `${self.registration.scope}favicon.svg`,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = (event.notification.data as { url?: string } | undefined)?.url || '/'
  const targetUrl = new URL(rawUrl, self.registration.scope).href

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await (client as WindowClient).navigate(targetUrl)
          }
          return
        }
      }

      await self.clients.openWindow(targetUrl)
    })(),
  )
})
