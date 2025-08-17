import { precacheAndRoute } from "workbox-precaching"

precacheAndRoute(self.__WB_MANIFEST)

// Your push notification handler
self.addEventListener("push", (event) => {
  let payload

  try {
    if (event.data) {
      // Try to get the text first
      const data = event.data.text()

      // Try to parse as JSON
      try {
        payload = JSON.parse(data)
      } catch (jsonError) {
        // If it's not JSON (like DevTools test), create a payload from the text
        payload = {
          title: "Test Notification",
          body: data,
          url: "/",
        }
      }
    } else {
      // No data received
      payload = {
        title: "Default Title",
        body: "Default body message.",
        url: "/",
      }
    }
  } catch (e) {
    console.error("Error processing push event data:", e)
    payload = {
      title: "Notification Error",
      body: "Could not process notification.",
      url: "/",
    }
  }

  const title = payload.title || "Default Title"
  const options = {
    body: payload.body || "Default body message.",
    icon: "/x-logo2.png",
    badge: "/kbadge.png",
    data: {
      url: payload.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
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
