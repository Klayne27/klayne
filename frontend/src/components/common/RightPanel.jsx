import React, { useState, useEffect } from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { checkSubscriptionStatus, handleEnablePushNotifications } from "../../utils/push"

const RightPanel = ({ deferredPrompt, isInstalled, installApp }) => {
  const { authUser } = useAuthUser()
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)

  useEffect(() => {
    const checkPushStatus = async () => {
      if (isInstalled) {
        setIsCheckingSubscription(true)
        const isSubscribed = await checkSubscriptionStatus()
        setIsPushSubscribed(isSubscribed)
        setIsCheckingSubscription(false)
      }
    }

    checkPushStatus()
  }, [isInstalled])

  useEffect(() => {
    if (!isInstalled) return

    const interval = setInterval(async () => {
      const isSubscribed = await checkSubscriptionStatus()
      if (isSubscribed !== isPushSubscribed) {
        setIsPushSubscribed(isSubscribed)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [isInstalled, isPushSubscribed])

  const handleNotificationClick = async () => {
    const success = await handleEnablePushNotifications()
    if (success) {
      setIsPushSubscribed(true)
    }
  }

  return (
    <div className="sticky top-0 hidden h-[100vh] w-[380px] border-l border-accent px-4 pt-4 lg:block">
      <SearchPanel />
      <SuggestedUsersPanel />

      {!isInstalled && deferredPrompt && (
        <div className="mt-4 rounded-2xl border border-accent p-4">
          <p className="mb-2 text-xl font-bold">Install the App</p>
          <p className="mb-4 text-sm text-gray-500">Get the full experience on your device.</p>
          <button
            onClick={installApp}
            className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
          >
            Install
          </button>
        </div>
      )}

      {isInstalled && !isCheckingSubscription && !isPushSubscribed && (
        <div className="mt-4 rounded-2xl border border-accent p-4">
          <p className="mb-2 text-xl font-bold">Stay Updated</p>
          <p className="mb-4 text-sm text-gray-500">
            Enable push notifications to get real-time updates.
          </p>
          <button
            onClick={handleNotificationClick}
            className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* {isInstalled && !isCheckingSubscription && isPushSubscribed && (
        <div className="mt-4 rounded-2xl border border-green-500 p-4">
          <p className="mb-2 text-xl font-bold text-green-600">✓ Notifications Enabled</p>
          <p className="text-sm text-gray-500">You're all set to receive push notifications!</p>
        </div>
      )} */}
    </div>
  )
}

export default React.memo(RightPanel)
