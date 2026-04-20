import { Link } from "react-router-dom"
import RightPanelSkeleton from "../skeletons/RightPanelSkeleton"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { BiRefresh } from "react-icons/bi"
import React, { useState } from "react"
import FollowButton from "./FollowButton"
import ConfirmationModal from "./ConfirmationModal"
import { useAppStore } from "../../store/useAppStore"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useGetSuggestedUsers } from "../../features/users/usersHooks/useUserQueries"
import { useFollow } from "../../features/users/usersHooks/useUserMutations"
import { truncateText } from "../../utils/truncateText"
import UserAvatar from "./UserAvatar"

const SuggestedUsersPanel = () => {
  const showUnfollowModal = useAppStore((state) => state.showUnfollowModal)
  const setShowUnfollowModal = useAppStore((state) => state.setShowUnfollowModal)
  const { suggestedUsers, isLoading, refetch, isRefetching } = useGetSuggestedUsers()
  const { follow } = useFollow()
  const { authUser: currentUser } = useAuthUser()
  const [userToUnfollow, setUserToUnfollow] = useState(null)

  const handleRefreshClick = () => {
    refetch()
  }

  const openUnfollowModal = (userToUnfollow) => {
    setUserToUnfollow(userToUnfollow)
    setShowUnfollowModal(true)
  }

  const closeUnfollowModal = () => {
    setShowUnfollowModal(false)
    setUserToUnfollow(null)
  }

  const handleConfirmUnfollow = () => {
    if (userToUnfollow) {
      follow(userToUnfollow._id)
      closeUnfollowModal()
    }
  }

  if (!isLoading && !isRefetching && suggestedUsers?.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-accent p-4">
      <p className="mb-4 text-xl font-bold">Who to follow</p>
      <div className="flex flex-col">
        {!suggestedUsers && isLoading && (
          <div className="flex flex-col gap-2.5">
            <RightPanelSkeleton />
            <RightPanelSkeleton />
            <RightPanelSkeleton />
            <RightPanelSkeleton />
          </div>
        )}
        {suggestedUsers?.length > 0 &&
          suggestedUsers.map((user) => {
            const isFollowing = currentUser?.following?.includes(user._id)

            return (
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center justify-between gap-2 " // Added py-1 for vertical breathing room
                key={user._id}
              >
                <div className="flex min-w-0 flex-grow items-center gap-1">
                  {/* AVATAR WRAPPER: Added padding and removed overflow-hidden */}
                  <div className="relative flex-shrink-0 p-1 mt-2">
                    <UserAvatar user={user} size={"sm"} />
                  </div>

                  {/* TEXT CONTENT: Moved overflow-hidden here specifically */}
                  <div className="flex min-w-0 flex-col overflow-hidden">
                    <span className="flex items-center gap-1 font-bold tracking-tight hover:underline">
                      <span
                        className="truncate"
                        style={user.nameColor ? { color: user.nameColor } : undefined}
                      >
                        {user.fullName}
                      </span>
                      {user.isVerified && (
                        <img src="/verified2.png" className="size-[16px]" alt="verified" />
                      )}
                      {user.isGoldVerified && (
                        <img
                          src="/gold-verified2.png"
                          className="size-[16px]"
                          alt="gold verified"
                        />
                      )}
                      {user.isCha && (
                        <img src="/cha.png" className="size-[14px] rounded-md" alt="cha" />
                      )}
                    </span>
                    <span className="truncate text-sm text-slate-500">
                      @{truncateText(user.username, 12)}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <FollowButton
                    user={user}
                    currentUserId={currentUser?._id}
                    isFollowing={isFollowing}
                    openUnfollowModal={openUnfollowModal}
                  />
                </div>
              </Link>
            )
          })}
        <button
          onClick={handleRefreshClick}
          className="flex items-center justify-center gap-1 text-primary"
          disabled={isRefetching || isLoading}
        >
          {isLoading || isRefetching ? <div></div> : <BiRefresh className="h-5 w-5" />}
          {isLoading || isRefetching ? "Refreshing..." : "Refresh Suggestions"}
        </button>
      </div>

      <ConfirmationModal
        isOpen={showUnfollowModal}
        modalTitle={
          <>
            Unfollow <p>@{userToUnfollow?.username}</p>
          </>
        }
        message="Their posts will no longer show up in your For You timeline. You can still view
          their profile, unless their posts are protected."
        confirmButtonText="Unfollow"
        onConfirm={handleConfirmUnfollow}
        onClose={closeUnfollowModal}
        danger={false}
      />
    </div>
  )
}

export default React.memo(SuggestedUsersPanel)
