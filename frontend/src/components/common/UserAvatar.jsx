import { WARDROBE_CONFIG } from "../../features/wardrobe/wardrobeConfig"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

/**
 * Drop-in avatar component that applies the user's equipped ring.
 * Works for any user object — reads their equipped.ring if present.
 *
 * Usage: <UserAvatar user={post.user} size="md" />
 * Sizes: sm=8, md=10, lg=14, xl=20 (Tailwind units)
 */
const SIZE_MAP = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  lg2: "h-16 w-16",
  xl: "h-20 w-20",
  xxl: "w-24 h-24 md:h-32 md:w-32"
}

const UserAvatar = ({ user, size = "md", className = "", onClick }) => {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md
  const equippedRing = user?.equipped?.ring
  const ringConfig = equippedRing ? WARDROBE_CONFIG[equippedRing] : null
  const ringClass = ringConfig?.ringClass || ""

  return (
    <div className={`inline-flex flex-shrink-0 ${ringClass}`}>
      <img
        src={getOptimizedImageUrl(
          user?.profileImg?.imageUrl || "/avatar-placeholder.png",
          "avatar",
        )}
        alt={user?.username || "avatar"}
        className={`rounded-full object-cover ${sizeClass} ${className} cursor-pointer`}
        loading="lazy"
        onClick={onClick}
      />
    </div>
  )
}

export default UserAvatar
