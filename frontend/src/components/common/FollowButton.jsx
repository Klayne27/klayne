import { useState, useEffect } from "react"
import { useFollow } from "../../features/users/usersHooks/useUserMutations"
import { showAppToast } from "../../utils/showAppToast"

const FollowButton = ({
  user,
  isFollowing: initialIsFollowing,
  hasRequestedFollow: initialHasRequested = false,
  openUnfollowModal,
}) => {
  const [isHoveringUnfollow, setIsHoveringUnfollow] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const { follow, isPending } = useFollow()

  // Local optimistic state — keeps UI snappy without waiting for server
  const [isCurrentlyFollowing, setIsCurrentlyFollowing] = useState(initialIsFollowing)
  const [hasCurrentlyRequested, setHasCurrentlyRequested] = useState(initialHasRequested)

  // Sync when server data refreshes
  useEffect(() => {
    setIsCurrentlyFollowing(initialIsFollowing)
  }, [initialIsFollowing])
  useEffect(() => {
    setHasCurrentlyRequested(initialHasRequested)
  }, [initialHasRequested])

  useEffect(() => {
    const checkTouch = () =>
      "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    setIsTouchDevice(checkTouch())
  }, [])

  const handleFollowClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return

    if (isCurrentlyFollowing) {
      // ── Unfollow ────────────────────────────────────────────────────────────
      if (openUnfollowModal) {
        openUnfollowModal(user)
      } else {
        setIsCurrentlyFollowing(false)
        follow({userIdToFollow: user._id, isTargetPrivate: user.isPrivate})
      }
    } else if (hasCurrentlyRequested) {
      // ── Cancel pending request ───────────────────────────────────────────────
      setHasCurrentlyRequested(false)
      follow({userIdToFollow: user._id, isTargetPrivate: user.isPrivate}) // backend sees pending request → cancels it
    } else {
      // ── Follow or request ────────────────────────────────────────────────────
      if (user.isPrivate) {
        setHasCurrentlyRequested(true)
        showAppToast("Follow request has been sent.", "success")
      } else {
        setIsCurrentlyFollowing(true)
      }
      follow({userIdToFollow: user._id, isTargetPrivate: user.isPrivate})
    }
  }

  // ── Derive label and style ──────────────────────────────────────────────────
  let label, extraClass

  if (isCurrentlyFollowing) {
    const showUnfollowState = isHoveringUnfollow && !isTouchDevice
    label = showUnfollowState ? "Unfollow" : "Following"
    extraClass = showUnfollowState ? "border-red-600 bg-red-700/20 text-red-600" : "border-accent"
  } else if (hasCurrentlyRequested) {
    label = "Requested"
    extraClass = "border-accent text-slate-400 hover:border-red-400 hover:text-red-400"
  } else {
    label = "Follow"
    extraClass = "bg-primary hover:bg-primary/80 border-primary"
  }

  return (
    <button
      className={`flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition duration-200 disabled:opacity-50 md:min-w-[105px] md:text-center ${extraClass}`}
      onClick={handleFollowClick}
      onMouseEnter={
        !isTouchDevice && isCurrentlyFollowing ? () => setIsHoveringUnfollow(true) : undefined
      }
      onMouseLeave={!isTouchDevice ? () => setIsHoveringUnfollow(false) : undefined}
    >
      {label}
    </button>
  )
}

export default FollowButton
