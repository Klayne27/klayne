// Enhanced version with better error handling and logging
const vapidPublicKey =
  "BK226lMlv1A_NshzSWU5c0Jpns10EielyCWSVYLGjvn_nEs8DItTRXFN1PbEXzDSzvb93-c1zgAueVWb3kICcf4"

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

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId")
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem("deviceId", deviceId)
  }
  return deviceId
}

export const checkSubscriptionStatus = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("❌ Push notifications not supported")
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return !!subscription
  } catch (error) {
    return false
  }
}

export const subscribeUserToPush = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("❌ Push notifications not supported")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready

    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription
    }

    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    return newSubscription
  } catch (error) {
    console.error("💥 Failed to subscribe:", error)
    return null
  }
}

export const handleEnablePushNotifications = async () => {
  try {
    // Check current permission

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission()

      if (permission !== "granted") {
        throw new Error("Notification permission denied")
      }
    }

    const subscription = await subscribeUserToPush()
    if (!subscription) {
      throw new Error("Failed to create subscription")
    }

    const subscriptionObject = subscription.toJSON()
    const deviceId = getOrCreateDeviceId()

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
        deviceId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ Backend error:", errorData)
      throw new Error(`Failed to save subscription: ${errorData.error}`)
    }

    const result = await response.json()
    return true
  } catch (error) {
    console.error("💥 Error enabling notifications:", error)
    return false
  }
}

export const resubscribeIfNeeded = async () => {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) return true

    return await handleEnablePushNotifications()
  } catch (err) {
    console.error("Resubscribe error:", err)
    return false
  }
}

export const isStandalone = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true || // For iOS
    document.referrer.includes("android-app://")
  )
}

export const getNotificationPermissionState = () => {
  if (!("Notification" in window)) return "unsupported"
  return Notification.permission // "default" | "granted" | "denied"
}
