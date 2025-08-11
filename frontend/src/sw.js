import { precacheAndRoute } from "workbox-precaching"

precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener("push", (event) => {
  let data = {
    title: "New Notification",
    body: "Something new happened!",
    url: "/",
  }

  // Check if the event has data and is valid JSON
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.error("Push event data was not valid JSON.", e)
    }
  }

  const payload = event.data
    ? event.data.json()
    : { title: "Simulated Push", body: "This is a test notification." }

  const title = payload.title || "Default Title"
  const options = {
    body: payload.body || "Default body message.",
    icon: "/x-logo2.png", // Make sure this icon exists
    badge: "/x-logo2.png", // Optional
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const notificationData = event.notification.data

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(notificationData.url) && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(notificationData.url)
      }
    }),
  )
})
