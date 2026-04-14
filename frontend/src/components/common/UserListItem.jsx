import { Link } from "react-router-dom"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import FollowButton from "./FollowButton"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const UserListItem = ({ user: listUser }) => {
  const { authUser } = useAuthUser()

  const amIFollowing = authUser?.following.includes(listUser?._id)

  const isMyProfile = authUser?._id === listUser?._id

  return (
    <div className="flex items-center justify-between border-accent px-4 py-3 last:border-b-0">
      <Link to={`/profile/${listUser?.username}`} className="flex items-center gap-2">
        <div className="avatar">
          <div className="w-8 rounded-full">
            <img
              src={getOptimizedImageUrl(
                listUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                "avatar",
              )}
              alt={`${listUser.username}'s avatar`}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <span
            className="text-sm font-bold"
            style={listUser.nameColor ? { color: listUser.nameColor } : undefined}
          >
            {listUser.fullName}
          </span>
          <span className="text-xs text-gray-500">@{listUser.username}</span>
        </div>
      </Link>

      {!isMyProfile && (
        <FollowButton user={listUser} currentUserId={authUser?._id} isFollowing={amIFollowing} />
      )}
    </div>
  )
}

export default UserListItem
