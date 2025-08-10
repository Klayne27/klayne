// The self variable refers to the service worker itself
self.addEventListener("push", (event) => {
  const data = event.data.json()
  const title = data.title
  const options = {
    body: data.body,
    icon: "/x-logo2.png", // The path to your icon
    badge: "/x-logo2.png", // The path to your badge icon (optional)
    data: {
      url: data.url,
    },
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
