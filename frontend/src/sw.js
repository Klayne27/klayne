import { precacheAndRoute } from "workbox-precaching"

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener("push", (event) => {
  let payload

  try {
    if (event.data) {
      const data = event.data.text()
      try {
        payload = JSON.parse(data)
      } catch (jsonError) {
        payload = { title: "Test Notification", body: data, url: "/" }
      }
    } else {
      payload = { title: "Default Title", body: "Default body message.", url: "/" }
    }
  } catch (e) {
    console.error("Error processing push event data:", e)
    payload = { title: "Notification Error", body: "Could not process notification.", url: "/" }
  }

  const title = payload.title || "Default Title"
  const options = {
    body: payload.body || "Default body message.",
    icon: "/twatter.png",
    badge: "/twatterbadge2.png",
    data: { url: payload.url || "/" },
  }

  // Only show the banner if the user isn't actively looking at the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const appFocused = windowClients.some((c) => c.visibilityState === "visible")
      if (appFocused) return
      return self.registration.showNotification(title, options)
    }),
  )
})

// Your notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const notificationData = event.notification.data
  const urlToOpen = new URL(notificationData.url || "/", self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Look for an existing window/tab
      for (const client of windowClients) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      // If no existing window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    }),
  )
})
