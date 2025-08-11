// The self variable refers to the service worker itself
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

  const title = data.title
  const options = {
    body: data.body,
    icon: "/x-logo2.png", 
    badge: "/x-logo2.png",
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
