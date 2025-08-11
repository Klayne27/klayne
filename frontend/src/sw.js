// src/sw.js

// Import the Workbox precaching function
import { precacheAndRoute } from "workbox-precaching"


precacheAndRoute(self.__WB_MANIFEST)

// Your push notification handler
self.addEventListener("push", (event) => {
  let payload
  try {
    payload = event.data
      ? event.data.json()
      : { title: "Default Title", body: "Default body message.", url: "/" }
  } catch (e) {
    console.error("Push event data was not valid JSON.", e)
    payload = { title: "Notification Error", body: "Could not parse notification.", url: "/" }
  }
  console.log("push payload:", payload)
  const title = payload.title || "Default Title"
  const options = {
    body: payload.body || "Default body message.",
    icon: "/x-logo2.png",
    badge: "/x-logo2.png",
    data: {
      url: payload.url || "/",
    },
  }
  console.log("title: ", title)
  console.log("options: ", options)
  event.waitUntil(self.registration.showNotification(title, options))
  console.log("push after?")
})

// Your notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const notificationData = event.notification.data
  const urlToOpen = new URL(notificationData.url || "/", self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    }),
  )
})
