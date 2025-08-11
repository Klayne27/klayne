import React from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { handleEnablePushNotifications } from "../../utils/push"

const RightPanel = ({ deferredPrompt, isInstalled, installApp, isPushSubscribed }) => {
  const { authUser } = useAuthUser()

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
      {authUser?.isAdmin && (
        <div className="mt-4 rounded-2xl border border-accent p-4">
          <p className="mb-2 text-xl font-bold">Stay Updated</p>
          <p className="mb-4 text-sm text-gray-500">
            Enable push notifications to get real-time updates.
          </p>
          <button
            onClick={handleEnablePushNotifications}
            className="w-full rounded-md bg-primary py-2 text-white transition duration-200 hover:bg-primary/85"
          >
            Enable Notifications
          </button>
        </div>
      )}
    </div>
  )
}
export default React.memo(RightPanel)
