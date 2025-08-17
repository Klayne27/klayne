// Enhanced version with better error handling and logging
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

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("deviceId")
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem("deviceId", deviceId)
  }
  return deviceId
}

export const checkSubscriptionStatus = async () => {
  console.log("🔍 Checking subscription status...")

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("❌ Push notifications not supported")
    return false
  }

  try {
    console.log("⏳ Waiting for service worker...")
    const registration = await navigator.serviceWorker.ready
    console.log("✅ Service worker ready:", registration)

    const subscription = await registration.pushManager.getSubscription()
    console.log("📱 Current subscription:", subscription)

    if (!subscription) {
      console.log("❌ No subscription found")
      return false
    }

    console.log("🌐 Checking with backend...")
    const response = await fetch("/api/push/status")
    console.log("📡 Backend response:", response.status, response.statusText)

    if (!response.ok) {
      console.error("❌ Backend check failed:", response.status)
      return false
    }

    const data = await response.json()
    console.log("📊 Backend data:", data)
    return data.hasActiveSubscription
  } catch (error) {
    console.error("💥 Error checking subscription:", error)
    return false
  }
}

export const subscribeUserToPush = async () => {
  console.log("🚀 Starting push subscription...")

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("❌ Push notifications not supported")
    return null
  }

  try {
    console.log("⏳ Waiting for service worker...")
    const registration = await navigator.serviceWorker.ready
    console.log("✅ Service worker ready")

    // Check existing subscription
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      console.log("🗑️ Unsubscribing from existing subscription...")
      await existingSubscription.unsubscribe()
    }

    console.log("📝 Creating new subscription...")
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    console.log("✅ New subscription created:", newSubscription)
    return newSubscription
  } catch (error) {
    console.error("💥 Failed to subscribe:", error)
    return null
  }
}

export const handleEnablePushNotifications = async () => {
  console.log("🔔 Enabling push notifications...")

  try {
    // Check current permission
    console.log("🔍 Current permission:", Notification.permission)

    if (Notification.permission !== "granted") {
      console.log("🙋 Requesting permission...")
      const permission = await Notification.requestPermission()
      console.log("📋 Permission result:", permission)

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

    console.log("📤 Sending subscription to backend...")
    console.log("🔑 Subscription object:", subscriptionObject)

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

    console.log("📡 Backend response:", response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ Backend error:", errorData)
      throw new Error(`Failed to save subscription: ${errorData.error}`)
    }

    const result = await response.json()
    console.log("✅ Success:", result)
    return true
  } catch (error) {
    console.error("💥 Error enabling notifications:", error)
    return false
  }
}

export const resubscribeIfNeeded = async () => {
  const isSubscribed = await checkSubscriptionStatus()
  if (!isSubscribed) {
    console.log("🔄 Re-subscribing user...")
    return await handleEnablePushNotifications()
  }
  return true
}
