
import { useNavigate } from "react-router-dom"
import { useGetFollowRequests } from "../../users/usersHooks/useUserQueries"
import { useAcceptFollowRequest, useDeclineFollowRequest } from "../../users/usersHooks/useUserMutations"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import LoadingSpinner from "../../../components/common/LoadingSpinner"


const FollowRequestsTab = () => {
  const { followRequests, isLoading } = useGetFollowRequests()
  const { acceptRequest, isAccepting } = useAcceptFollowRequest()
  const { declineRequest, isDeclining } = useDeclineFollowRequest()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    )
  }

  if (followRequests.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-lg font-semibold">No pending requests</p>
        <p className="mt-1 text-sm">Follow requests from other users will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {followRequests.map((user) => (
        <div key={user._id} className="flex items-center gap-3 border-b border-accent px-4 py-3">
          {/* Avatar */}
          <div
            className="avatar cursor-pointer"
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            <div className="w-11 rounded-full">
              <img
                src={getOptimizedImageUrl(
                  user.profileImg?.imageUrl || "/avatar-placeholder.png",
                  "avatar",
                )}
                alt={user.username}
              />
            </div>
          </div>

          {/* Name + username */}
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            <p
              className="truncate font-bold leading-tight"
              style={user.nameColor ? { color: user.nameColor } : undefined}
            >
              {user.fullName}
            </p>
            <p className="truncate text-sm text-slate-500">@{user.username}</p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => acceptRequest(user._id)}
              // disabled={isAccepting || isDeclining}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold transition hover:bg-primary/80 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => declineRequest(user._id)}
              // disabled={isAccepting || isDeclining}
              className="rounded-full border border-accent px-4 py-1.5 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default FollowRequestsTab
