import React, { useState, useEffect } from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { checkSubscriptionStatus, handleEnablePushNotifications } from "../../utils/push"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"

const RightPanel = ({ deferredPrompt, isInstalled, installApp }) => {
  const { authUser } = useAuthUser()
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const isMobile = useIsMobile()

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
    }, 30000)

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
    </div>
  )
}

export default React.memo(RightPanel)
