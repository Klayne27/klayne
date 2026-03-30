import { useState, useEffect } from "react"
import useFollow from "../../features/users/usersHooks/useFollow"

const FollowButton = ({
  user,
  isFollowing: initialIsFollowing,
  openUnfollowModal, 
}) => {
  const [isHoveringUnfollow, setIsHoveringUnfollow] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const { follow, isPending } = useFollow()

  const [isCurrentlyFollowing, setIsCurrentlyFollowing] =
    useState(initialIsFollowing)

  useEffect(() => {
    setIsCurrentlyFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  useEffect(() => {
    const checkTouch = () => {
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      )
    }
    setIsTouchDevice(checkTouch())
  }, [])

  const handleFollowClick = (e) => {
    e.preventDefault()
    if (isCurrentlyFollowing) {
      if (openUnfollowModal) {
        openUnfollowModal(user)
      } else {
        follow(user._id)
        setIsCurrentlyFollowing((prev) => !prev)
      }
    } else {
      follow(user._id)
      setIsCurrentlyFollowing((prev) => !prev)
    }
  }

  return (
    <button
      className={`flex items-center justify-center rounded-full border border-accent px-3 py-2 text-sm font-semibold transition duration-200 md:min-w-[90px] md:text-center ${
        // Initial state for "Follow" button
        !isCurrentlyFollowing
          ? "bg-primary hover:bg-primary/80 transition duration-200"
          : // Initial state for "Following" button
            "bg-secondary/40 transition duration-200 md:hover:bg-secondary" // Added a subtle border for consistency
      } ${
        // Apply red styles ONLY if following, hovering AND NOT a touch device
        isCurrentlyFollowing && isHoveringUnfollow && !isTouchDevice
          ? "border-red-600 bg-red-700/20 text-red-600"
          : ""
      } `}
      onClick={handleFollowClick}
      onMouseEnter={!isTouchDevice ? () => setIsHoveringUnfollow(true) : undefined}
      onMouseLeave={!isTouchDevice ? () => setIsHoveringUnfollow(false) : undefined}
      disabled={isPending} // Disable button during pending follow/unfollow action
    >
      {isCurrentlyFollowing
        ? isHoveringUnfollow && !isTouchDevice
          ? "Unfollow"
          : "Following"
        : "Follow"}
    </button>
  )
}

export default FollowButton
