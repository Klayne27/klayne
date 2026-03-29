import { Link, useNavigate } from "react-router-dom"
import FollowButton from "../common/FollowButton" // Assuming this is your Follow button component
import { formatMemberSinceDate } from "../../utils/date"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const ProfileInfoModal = ({ user, position = 1 }) => {
  const { authUser } = useAuthUser()
  const navigate = useNavigate()

   const isFollowing = authUser?.following?.includes(user?._id)

  if (!user) return null

  const isMyProfile = authUser?._id === user._id
  const handleModalClick = (e) => e.stopPropagation()

  return (
    <>
        <div
          className="absolute z-50 flex w-72 flex-col rounded-xl border border-accent bg-base-200 shadow-lg"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          onClick={handleModalClick}
        >
          {/* Cover Photo */}
          <div className="relative h-24 w-full">
            <img
              src={getOptimizedImageUrl(user?.coverImg?.imageUrl || "/cover.png", "cover")}
              alt="cover"
              className="h-full w-full rounded-t-xl object-cover"
            />
            {/* Profile Image */}
            <div className="avatar absolute -bottom-8 left-4">
              <div
                className="w-16 cursor-pointer rounded-full border-2 border-base-200"
                onClick={() => navigate(`/profile/${user.username}`)}
              >
                <img src={getOptimizedImageUrl(user?.profileImg?.imageUrl || "/avatar-placeholder.png", "avatar")} alt="profile" />
              </div>
            </div>
          </div>

          <div className="flex flex-col p-4 pt-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col cursor-pointer" onClick={() => navigate(`/profile/${user.username}`)}>
                <p className="text-lg font-bold">{user.fullName}</p>
                <span className="text-sm text-slate-500">@{user.username}</span>
              </div>

              {!isMyProfile && (
                <FollowButton user={user} isFollowing={isFollowing}  />
              )}
            </div>

            {/* Bio */}
            {user.bio && <span className="my-2 text-sm text-base-content">{user.bio}</span>}

            <div className="flex items-center text-slate-500">
              <span className="text-xs">Joined {formatMemberSinceDate(user.createdAt)}</span>
            </div>

            {/* Following/Followers Count */}
            <div className="mt-2 flex gap-4">
              <div
                className="flex items-center gap-1"
              >
                <span className="text-sm font-bold">{user.following?.length}</span>{" "}
                <span className="text-sm">Following</span>
              </div>
              <div
                className="flex items-center gap-1"
              >
                <span className="text-sm font-bold">{user.followers?.length}</span>{" "}
                <span className="text-sm">Followers</span>
              </div>
            </div>
          </div>
        </div>
    </>
  )
}

export default ProfileInfoModal
