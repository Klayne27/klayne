const vapidPublicKey =
  "BAobWDLKcBxIRRJJCgoNz7TC_bpt-fBLdNHVof61Ngpsc2vC0ao7QLmvApnvhmqWHwk0S2l-gzyOnfOX63pj00Y"

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const subscribeUserToPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications are not supported by this browser.")
    return null
  }

  try {
    // Wait for the service worker to be ready
    const registration = await navigator.serviceWorker.ready
    console.log("Service worker is ready.")

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    console.log("Push subscription created:", subscription)
    return subscription
  } catch (error) {
    console.error("Failed to subscribe the user:", error)
    return null
  }
}

export const handleEnablePushNotifications = async () => {
  const subscription = await subscribeUserToPush()
  if (subscription) {
    const subscriptionObject = subscription.toJSON()

    try {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscriptionObject.endpoint,
          keys: {
            p256dh: subscriptionObject.keys.p256dh,
            auth: subscriptionObject.keys.auth,
          },
        }),
      })

      if (response.ok) {
        console.log("Push subscription sent to backend successfully.")
      } else {
        console.error("Failed to send push subscription to backend.")
      }
    } catch (error) {
      console.error("Error sending push subscription to backend:", error)
    }
  }
}