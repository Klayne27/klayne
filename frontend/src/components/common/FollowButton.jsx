import { useState, useEffect } from "react"
import { useFollow } from "../../features/users/usersHooks/useUserMutations"

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
      className={`flex items-center justify-center rounded-full border border-accent px-[8px] py-[6px] text-sm font-medium transition duration-200 md:min-w-[90px] md:text-center ${
        !isCurrentlyFollowing
          ? "bg-primary hover:bg-primary/80 transition duration-200"
          :
            "transition duration-200"
      } ${
        isCurrentlyFollowing && isHoveringUnfollow && !isTouchDevice
          ? "border-red-600 bg-red-700/20 text-red-600"
          : ""
      } `}
      onClick={handleFollowClick}
      onMouseEnter={!isTouchDevice ? () => setIsHoveringUnfollow(true) : undefined}
      onMouseLeave={!isTouchDevice ? () => setIsHoveringUnfollow(false) : undefined}
      disabled={isPending}
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
