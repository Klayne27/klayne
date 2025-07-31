import { Link } from "react-router-dom";
import RightPanelSkeleton from "../skeletons/RightPanelSkeleton";
import useFollow from "../../hooks/usersHooks/useFollow";
import { useSuggestedUsers } from "../../hooks/usersHooks/useSuggestedUsers";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { BiRefresh } from "react-icons/bi";
import React, { useState } from "react";
import FollowButton from "../ui/FollowButton";
import ConfirmationModal from "../ui/ConfirmationModal";
import { useAppStore } from "../../store/appStore";

const SuggestedUsersPanel = () => {
  const showUnfollowModal = useAppStore((state) => state.showUnfollowModal);
  const setShowUnfollowModal = useAppStore((state) => state.setShowUnfollowModal);
  const { suggestedUsers, isLoading, refetch, isRefetching } = useSuggestedUsers();
  const { follow } = useFollow();
  const { authUser: currentUser } = useAuthUser();
  const [userToUnfollow, setUserToUnfollow] = useState(null);

  const handleRefreshClick = () => {
    refetch();
  };

  const openUnfollowModal = (userToUnfollow) => {
    setUserToUnfollow(userToUnfollow);
    setShowUnfollowModal(true);
  };

  const closeUnfollowModal = () => {
    setShowUnfollowModal(false);
    setUserToUnfollow(null);
  };

  const handleConfirmUnfollow = () => {
    if (userToUnfollow) {
      follow(userToUnfollow._id);
      closeUnfollowModal();
    }
  };

  if (!isLoading && !isRefetching && suggestedUsers?.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl border border-accent">
      <p className="font-bold mb-4 text-xl">Who to follow</p>
      <div className="flex flex-col gap-4">
        {!suggestedUsers && isLoading && (
          <>
            <RightPanelSkeleton />
            <RightPanelSkeleton />
            <RightPanelSkeleton />
            <RightPanelSkeleton />
          </>
        )}
        {suggestedUsers?.length > 0 &&
          suggestedUsers.map((user) => {
            const isFollowing = currentUser?.following?.includes(user._id);

            return (
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center justify-between gap-4"
                key={user._id}
              >
                <div className="flex gap-2 items-center flex-grow">
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      <img src={user.profileImg || "/avatar-placeholder.png"} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold tracking-tight truncate w-full hover:underline flex items-center gap-1">
                      {user.fullName.length > 15
                        ? user.fullName.slice(0, 15) + "..."
                        : user.fullName}{" "}
                      {user.isVerified && (
                        <img src="/verified.png" className="size-[17px]" />
                      )}
                      {user.isGoldVerified && (
                        <img src="/gold-verified.png" className="size-[17px]" />
                      )}
                    </span>
                    <span className="text-sm text-slate-500">@{user.username}</span>
                  </div>
                </div>
                <div>
                  <FollowButton
                    user={user}
                    currentUserId={currentUser?._id}
                    isFollowing={isFollowing}
                    openUnfollowModal={openUnfollowModal}
                  />
                </div>
              </Link>
            );
          })}
        <button
          onClick={handleRefreshClick}
          className="flex items-center justify-center gap-1 text-primary "
          disabled={isRefetching || isLoading}
        >
          {isLoading || isRefetching ? (
            <LoadingSpinner size="xs" />
          ) : (
            <BiRefresh className="w-5 h-5" />
          )}
          {isLoading || isRefetching ? "Refreshing..." : "Refresh Suggestions"}
        </button>
      </div>

      <ConfirmationModal
        isOpen={showUnfollowModal}
        modalTitle={`Unfollow  @${userToUnfollow?.username}`}
        message="Their posts will no longer show up in your For You timeline. You can still view
          their profile, unless their posts are protected."
        confirmButtonText="Unfollow"
        onConfirm={handleConfirmUnfollow}
        onClose={closeUnfollowModal}
        danger={false}
      />
    </div>
  );
};

export default React.memo(SuggestedUsersPanel);
