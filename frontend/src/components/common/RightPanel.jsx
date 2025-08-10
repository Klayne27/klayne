import React from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import { usePWAInstall } from "../../hooks/customHooks/usePWAInstall"

const RightPanel = () => {
  const { deferredPrompt, isInstalled, installApp } = usePWAInstall()

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
    </div>
  )
}
export default React.memo(RightPanel)
