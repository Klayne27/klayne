import { Link } from "react-router-dom";
import RightPanelSkeleton from "../skeletons/RightPanelSkeleton";
import useFollow from "../../hooks/usersHooks/useFollow";
import { useSuggestedUsers } from "../../hooks/usersHooks/useSuggestedUsers";
import LoadingSpinner from "./LoadingSpinner";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { BiRefresh } from "react-icons/bi";
import React, { useState } from "react";
import FollowButton from "./FollowButton";
import UnfollowModal from "./UnfollowModal";

const SuggestedUsersPanel = ({ setShowUnfollowModal, showUnfollowModal}) => {
  const { suggestedUsers, isLoading, refetch, isRefetching } = useSuggestedUsers();
  const { follow, isPending } = useFollow();
  const { authUser: currentUser } = useAuthUser();
  // const [showUnfollowModal, setShowUnfollowModal] = useState(false); // New state for unfollow modal
  const [userToUnfollow, setUserToUnfollow] = useState(null); // State to hold user info for unfollow modal

  const handleRefreshClick = () => {
    refetch();
  };

  // New functions for Unfollow Modal
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
      follow(userToUnfollow._id); // This will unfollow the user
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

      {/* Unfollow Confirmation Modal */}
      <UnfollowModal
        isOpen={showUnfollowModal}
        onClose={closeUnfollowModal}
        onUnfollowConfirm={handleConfirmUnfollow}
        username={userToUnfollow?.username}
      />
    </div>
  );
};

export default React.memo(SuggestedUsersPanel);
