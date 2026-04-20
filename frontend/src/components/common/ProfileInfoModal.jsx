import { Link, useNavigate } from "react-router-dom"
import FollowButton from "../common/FollowButton"
import { formatMemberSinceDate } from "../../utils/date"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import UserAvatar from "./UserAvatar"

const ProfileInfoModal = ({ user, position }) => {
  const { authUser } = useAuthUser()
  const navigate = useNavigate()

  const isFollowing = authUser?.following?.includes(user?._id)

  if (!user) return null

  const isMyProfile = authUser?._id === user._id

  // Ensure we have defaults if position isn't passed correctly
  const modalStyle = {
    top: position?.top ? `${position.top}px` : "auto",
    left: position?.left ? `${position.left}px` : "auto",
    position: "fixed", // Use fixed to escape parent overflow-hidden
  }

  return (
    <div
      className="gray-shadow fixed z-[1000] flex w-72 flex-col rounded-xl border border-accent bg-base-100"
      style={modalStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative h-24 w-full">
        <img
          src={getOptimizedImageUrl(user?.coverImg?.imageUrl || "/cover.png", "cover")}
          alt="cover"
          className="h-full w-full rounded-t-xl object-cover"
          onClick={() => navigate(`/profile/${user.username}`)}
        />
        <Link to={`/profile/${user?.username}`} className="absolute -bottom-8 left-4">
      
          {/* <div
            className="w-16 cursor-pointer rounded-full border-2 border-base-200"
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            <img
              src={getOptimizedImageUrl(
                user?.profileImg?.imageUrl || "/avatar-placeholder.png",
                "avatar",
              )}
              alt="profile"
              className="rounded-full"
            />
          </div> */}

          <UserAvatar
            user={user}
            size={"lg2"}
            onClick={() => navigate(`/profile/${user?.username}`)}
          />
        </Link>
      </div>

      <div className="flex flex-col p-4 pt-10">
        <div className="flex items-center justify-between">
          <div
            className="flex min-w-0 cursor-pointer flex-col"
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            <p
              className="truncate text-lg font-bold"
              style={user.nameColor ? { color: user.nameColor } : undefined}
            >
              {user.fullName}
            </p>
            <span className="truncate text-sm text-slate-500">@{user.username}</span>
          </div>

          {!isMyProfile && <FollowButton user={user} isFollowing={isFollowing} />}
        </div>

        {user.bio && <p className="my-2 line-clamp-3 text-sm text-base-content">{user.bio}</p>}

        {/* <div className="mt-1 flex items-center text-slate-500">
          <span className="text-xs">Joined {formatMemberSinceDate(user.createdAt)}</span>
        </div> */}

        <div className="mt-3 flex gap-4">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold">{user.following?.length || 0}</span>
            <span className="text-sm text-slate-500">Following</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold">{user.followers?.length || 0}</span>
            <span className="text-sm text-slate-500">Followers</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileInfoModal
