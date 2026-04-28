import { useState } from "react"
import { BsVolumeMute, BsVolumeUp } from "react-icons/bs"
import { useGetMuteStatus } from "../../features/users/usersHooks/useUserQueries"
import { useMuteUser, useUnmuteUser } from "../../features/users/usersHooks/useUserMutations"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"

const MuteButton = ({ profileUser }) => {
  const { authUser } = useAuthUser()
  const [showMuteMenu, setShowMuteMenu] = useState(false)

  const { isMuted, muteType, isLoading } = useGetMuteStatus(profileUser?._id)
  const { muteUser, isMuting } = useMuteUser(profileUser?._id)
  const { unmuteUser, isUnmuting } = useUnmuteUser(profileUser?._id)

  // Only show to followers
  const isFollowing = authUser?.following?.includes(profileUser?._id)
  if (!isFollowing || authUser?._id === profileUser?._id) return null

  if (isMuted) {
    return (
      <button
        onClick={() => unmuteUser()}
        disabled={isUnmuting}
        className="flex items-center gap-1.5 rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-primary hover:text-primary disabled:opacity-50"
        title="Unmute user"
      >
        <BsVolumeUp size={13} />
        Unmute
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMuteMenu((o) => !o)}
        disabled={isMuting || isLoading}
        className="flex items-center gap-1.5 rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-yellow-500 hover:text-yellow-400 disabled:opacity-50"
        title="Mute user"
      >
        <BsVolumeMute size={13} />
        Mute
      </button>

      {showMuteMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMuteMenu(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-accent bg-base-100 py-1.5 shadow-lg">
            <button
              className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-secondary"
              onClick={() => {
                muteUser({ muteType: "standard" })
                setShowMuteMenu(false)
              }}
            >
              <p className="font-semibold">Standard mute</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Hide posts. Mentions still notify you.
              </p>
            </button>
            <div className="mx-3 h-px bg-accent" />
            <button
              className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-secondary"
              onClick={() => {
                muteUser({ muteType: "total" })
                setShowMuteMenu(false)
              }}
            >
              <p className="font-semibold text-yellow-400">Total mute</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Hide posts, block messages and all notifications.
              </p>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default MuteButton
