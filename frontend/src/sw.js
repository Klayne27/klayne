import { precacheAndRoute } from "workbox-precaching"

precacheAndRoute(self.__WB_MANIFEST)

// Your push notification handler
self.addEventListener("push", (event) => {
  let payload

  try {
    if (event.data) {
      // Try to get the text first
      const data = event.data.text()
      console.log("Raw push data received:", data)

      // Try to parse as JSON
      try {
        payload = JSON.parse(data)
        console.log("Parsed JSON payload:", payload)
      } catch (jsonError) {
        // If it's not JSON (like DevTools test), create a payload from the text
        console.log("Not JSON, treating as plain text:", data)
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

  console.log("Showing notification:", title, options)
  event.waitUntil(self.registration.showNotification(title, options))
})

// Your notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.notification)
  event.notification.close()

  const notificationData = event.notification.data
  const urlToOpen = new URL(notificationData.url || "/", self.location.origin).href

  console.log("Opening URL:", urlToOpen)

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Look for an existing window/tab
      for (const client of windowClients) {
        if (client.url === urlToOpen && "focus" in client) {
          console.log("Focusing existing window")
          return client.focus()
        }
      }
      // If no existing window found, open a new one
      if (clients.openWindow) {
        console.log("Opening new window")
        return clients.openWindow(urlToOpen)
      }
    }),
  )
})
