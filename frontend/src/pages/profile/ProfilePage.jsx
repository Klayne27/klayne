import { useEffect, useRef, useState, useCallback } from "react"; // Import useCallback
import { useNavigate, useParams } from "react-router-dom";
import useFollow from "../../hooks/usersHooks/useFollow";

import Posts from "../../components/common/posts/Posts";
import ProfileHeaderSkeleton from "../../components/skeletons/ProfileHeaderSkeleton";
import EditProfileModal from "./EditProfileModal";
import FollowListModal from "../../components/common/FollowListModal";

import { FaArrowLeft } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5";
import { FaLink } from "react-icons/fa";
import { MdBlock, MdDeleteForever, MdEdit } from "react-icons/md";
import { formatMemberSinceDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useUpdateUserProfile } from "../../hooks/usersHooks/useUpdateUserProfile";
import { useFetchUserProfile } from "../../hooks/usersHooks/useFetchUserProfile";
import { CiMail } from "react-icons/ci";
import ScrollToTop from "../../utils/ScrollToTop";
import { useBlockUnblockUser } from "../../hooks/usersHooks/useBlockUnblockUser";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { useFetchPinnedPosts } from "../../hooks/postsHooks/useFetchPinnedPosts";
import FollowButton from "../../components/common/FollowButton";
import { useAdminDeleteUser } from "../../hooks/usersHooks/useAdminDeleteUser";
import DeleteUserConfirmationModal from "../../components/common/DeleteUserConfirmationModal";
import { useToggleConversationVisibility } from "../../hooks/messagesHooks/useToggleConversationVisibility";
import { useFetchConversationBetweenUsers } from "../../hooks/messagesHooks/useFetchConversationBetweenUsers";
import { useQueryClient } from "@tanstack/react-query";
import { showAppToast } from "../../utils/showAppToast";

const ProfilePage = ({ openImageModal, feedType, setFeedType, openProfileImgModal }) => {
  const [coverImg, setCoverImg] = useState(null);
  const [profileImg, setProfileImg] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [showBlockConfirmationModal, setShowBlockConfirmationModal] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false); // New state for unfollow modal
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false); // NEW STATE for delete modal
  const [userToUnfollow, setUserToUnfollow] = useState(null); // State to hold user info for unfollow modal
  const navigate = useNavigate();

  const [userPostsCount, setUserPostsCount] = useState(0);
  const [isHoveringUnfollow, setIsHoveringUnfollow] = useState(false); // NEW state for hover

  const coverImgRef = useRef(null);
  const profileImgRef = useRef(null);
  const queryClient = useQueryClient();

  const { username } = useParams();

  const { authUser } = useAuthUser();
  const { follow, isPending } = useFollow();

  const { blockUnblockUser, isBlocking } = useBlockUnblockUser();
  const { adminDeleteUser, isPending: isDeletingUser } = useAdminDeleteUser(); // USE NEW HOOK

  const {
    userProfile,
    isLoading,
    refetch,
    isRefetching,
    isError,
    error,
    isBlockedByYou,
    hasBlockedYou,
    userProfileId,
    httpStatus,
  } = useFetchUserProfile(username);

  const {
    conversationStatus, // Will be { conversationId: string | null, isHiddenForCurrentUser: boolean }
    isLoadingConversationStatus,
    isErrorConversationStatus,
    conversationStatusError,
  } = useFetchConversationBetweenUsers(userProfile?._id);

  // NEW: Fetch pinned posts separately
  const {
    pinnedPosts,
    isLoading: isLoadingPinnedPosts,
    isRefetching: isRefetchingPinnedPosts,
    error: pinnedPostsError,
  } = useFetchPinnedPosts(username);

  const { updateProfile, isUpdatingProfile } = useUpdateUserProfile();
  const { toggleVisibility, isTogglingVisibility } = useToggleConversationVisibility();

  const isMyProfile = authUser?._id === userProfile?._id;
  const amIFollowing = authUser?.following?.includes(userProfile?._id);

  const isAdminUser = authUser?.isAdmin; // Assuming `isAdmin` field on authUser
  const modalTitle = isBlockedByYou ? `Unblock @${username}?` : `Block @${username}?`;
  const confirmButtonText = isBlockedByYou ? "Unblock" : "Block";

  const isBlockingRelationship = isBlockedByYou || hasBlockedYou;

  // --- NEW STATE AND EFFECTS FOR TOUCH FEEDBACK ---
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // To control the active state for touch feedback

  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
  }, []);

  const handleTouchStart = useCallback(
    (type) => {
      if (isTouchDevice) {
        setActiveTab(type);
      }
    },
    [isTouchDevice]
  );

  const handleTouchEnd = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveTab(null);
      }, 150); // Use 150ms to match common touch feedback duration
    }
  }, [isTouchDevice]);

  const handleTouchCancel = useCallback(() => {
    // Good practice for touches that don't complete
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveTab(null);
      }, 150);
    }
  }, [isTouchDevice]);
  // --- END NEW STATE AND EFFECTS FOR TOUCH FEEDBACK ---

  // NEW: Functions for Admin Delete User Modal
  const openDeleteUserModal = () => {
    if (!userProfile?._id) return;
    setShowDeleteUserModal(true);
  };

  const closeDeleteUserModal = () => {
    setShowDeleteUserModal(false);
  };

  const handleConfirmDeleteUser = () => {
    if (userProfile?._id) {
      adminDeleteUser(userProfile._id); // Call the new mutation hook
      closeDeleteUserModal();
    }
  };

  const openBlockConfirmationModal = () => {
    if (!userProfile?._id) return;
    setShowBlockConfirmationModal(true);
  };

  const closeBlockConfirmationModal = () => {
    setShowBlockConfirmationModal(false);
  };

  const handleConfirmBlockUnblock = () => {
    closeBlockConfirmationModal();
    if (!userProfile?._id) return;
    blockUnblockUser(userProfile._id);
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

  const handleImgChange = (e, state) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        state === "coverImg" && setCoverImg(reader.result);
        state === "profileImg" && setProfileImg(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMessageClick = () => {
    if (isBlockingRelationship) return;

    if (!authUser || !userProfile?._id) {
      showAppToast("Authentication or profile data is missing.", "error");
      return;
    }

    // Good to disable interaction while these are loading/in-progress
    if (isLoadingConversationStatus || isTogglingVisibility) {
      // Maybe return a loading spinner or disable the button instead of a <p> tag
      return; // Or return a loading indicator JSX
    }

    if (isErrorConversationStatus) {
      console.error("Error fetching conversation status:", conversationStatusError);
      showAppToast("Failed to get conversation status.", "error"); // Inform the user
      return;
    }

    if (conversationStatus && conversationStatus.conversationId) {
      const existingConversationId = conversationStatus.conversationId;
      const isHiddenForCurrentUser = conversationStatus.isHiddenForCurrentUser;

      if (isHiddenForCurrentUser) {
        toggleVisibility(
          { conversationId: existingConversationId, isHiding: false },
          {
            onSuccess: () => {
              // Navigate only after the unhide operation is successful
              navigate(`/messages/${existingConversationId}`);
            },
            onError: (err) => {
              showAppToast(
                "Failed to unhide conversation: " +
                  (err.message || "Unknown error", "error")
              );
            },
          }
        );
      } else {
        // Case 2: Conversation exists and is NOT hidden for the current user.
        // Just navigate to it directly. No API call to toggle visibility needed.
        navigate(`/messages/${existingConversationId}`);
      }
    }
  };

  const handleProfileImageClick = (imageUrl, event) => {
    event.stopPropagation();
    if (openProfileImgModal) {
      openProfileImgModal(imageUrl)
    } else {
      console.warn(
        "openImageModal prop is undefined in ProfilePage component. Image modal will not open."
      );
    }
  };

    const handleImageClick = (imageUrl, event) => {
      event.stopPropagation();
      if (openImageModal) {
        openImageModal(imageUrl);
      } else {
        console.warn(
          "openImageModal prop is undefined in ProfilePage component. Image modal will not open."
        );
      }
    };

  const openFollowListModal = (type) => {
    setModalType(type);
    document.getElementById(`follow_list_modal_${type}`).showModal();
  };

  const closeFollowListModal = (type) => {
    document.getElementById(`follow_list_modal_${type}`).close();
    setModalType(null);
  };

  const handlePostsFetched = (count) => {
    setUserPostsCount(count);
  };

  let displayMessage = "";
  let showFullProfileHeader = false;
  let showFullProfileContent = false;

  if (isLoading || isRefetching) {
    showFullProfileHeader = false;
    showFullProfileContent = false;
  } else if (hasBlockedYou) {
    displayMessage =
      "You are blocked by this user. You cannot view their profile content.";
    showFullProfileHeader = false;
    showFullProfileContent = false;
  } else if (!userProfile) {
    displayMessage = error?.message || "User not found.";
    showFullProfileHeader = false;
    showFullProfileContent = false;
  } else if (isBlockedByYou) {
    displayMessage = "Content is unavailable because you have blocked this user.";
    showFullProfileHeader = true;
    showFullProfileContent = false;
  } else {
    showFullProfileHeader = true;
    showFullProfileContent = true;
  }

  let message;
  if (isBlockedByYou) {
    message = `They will be able to follow you, message you, and engage with your public posts.`;
  } else {
    message = `They will not be able to see your public posts and will no longer be able to engage with them. @${username} 
    will also not be able to follow or message you, and you will not see notifications from them.`;
  }

  return (
    <>
      <ScrollToTop />
      <div className="flex-[4_4_0] border-accent min-h-screen">
        {!hasBlockedYou && (isLoading || isRefetching) && !isError && (
          <ProfileHeaderSkeleton />
        )}

        {showFullProfileHeader && userProfile && (
          <>
            <div className="flex gap-2 md:gap-4 px-3 md:px-4 py-0.5 md:py-2 items-center">
              <button
                onClick={() => navigate(-1)}
                className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200"
              >
                <FaArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col">
                <p className="font-bold text-lg">{userProfile?.fullName}</p>
                <span className="text-sm text-slate-500">
                  {feedType === "posts"
                    ? `${userPostsCount} posts`
                    : `${userPostsCount} likes`}
                </span>
              </div>
            </div>
            <div className="relative group/cover">
              <img
                src={coverImg || userProfile?.coverImg || "/cover.png"}
                className="h-52 w-full object-cover cursor-pointer"
                alt="cover image"
                onClick={(e) => handleImageClick(userProfile?.coverImg, e)}
                loading="lazy"
              />
              {isMyProfile && (
                <div
                  className="absolute top-2 text-white right-2 rounded-full p-2 bg-primary bg-opacity-75 cursor-pointer opacity-0 group-hover/cover:opacity-100 transition duration-200"
                  onClick={() => coverImgRef.current.click()}
                >
                  <MdEdit className="w-5 h-5 " />
                </div>
              )}

              <input
                type="file"
                hidden
                accept="image/*"
                ref={coverImgRef}
                onChange={(e) => handleImgChange(e, "coverImg")}
              />
              <input
                type="file"
                hidden
                accept="image/*"
                ref={profileImgRef}
                onChange={(e) => handleImgChange(e, "profileImg")}
              />
              <div className="avatar absolute -bottom-16 left-4">
                <div className="w-32 rounded-full relative group/avatar border-4 border-base-100">
                  <img
                    src={
                      profileImg || userProfile?.profileImg || "/avatar-placeholder.png"
                    }
                    alt="user avatar"
                    className="cursor-pointer"
                    onClick={(e) => handleProfileImageClick(userProfile?.profileImg, e)}
                    loading="lazy"
                  />
                  {isMyProfile && (
                    <div className="absolute text-white top-5 right-3 p-1 bg-primary rounded-full group-hover/avatar:opacity-100 opacity-0 cursor-pointer duration-200">
                      <MdEdit
                        className="w-4 h-4"
                        onClick={() => profileImgRef.current.click()}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end px-4 mt-5 gap-2">
              {isMyProfile && <EditProfileModal authUser={authUser} />}

              {/* ADMIN DELETE BUTTON - ONLY VISIBLE IF currentUser IS ADMIN AND NOT viewing their own profile */}
              {isAdminUser && !isMyProfile && userProfile && (
                <button
                  onClick={openDeleteUserModal}
                  className="btn btn-sm btn-error text-white md:px-3 top-4 rounded-full py-1 md:text-base text-xs absolute flex items-center gap-1 transition duration-200 hover:scale-105"
                  disabled={isDeletingUser}
                >
                  <MdDeleteForever size={20} />
                </button>
              )}

              {!isMyProfile && !hasBlockedYou && (
                <button
                  className={`flex items-center gap-1 font-bold px-1.5 md:px-3 rounded-full py-1 md:text-base text-xs transition duration-200 absolute border border-red-700 top-20
                    ${
                      isBlockedByYou
                        ? "bg-red-700 hover:bg-red-800"
                        : "bg-red-700 hover:bg-red-800"
                    }
                  `}
                  onClick={openBlockConfirmationModal}
                  disabled={isBlocking}
                >
                  {!isBlockedByYou && <MdBlock size={20} />}
                  {isBlocking ? "Loading..." : isBlockedByYou ? "Unblock" : "Block"}
                </button>
              )}

              {!isMyProfile && amIFollowing && !isBlockingRelationship && (
                <button
                  onClick={handleMessageClick}
                  className="px-1 border rounded-full hover:bg-secondary border-accent transition duration-200 z-20"
                  disabled={
                    isLoadingConversationStatus ||
                    isTogglingVisibility ||
                    !authUser ||
                    !userProfile?._id ||
                    isBlockingRelationship
                  }
                >
                  <CiMail size={20} strokeWidth={1} />
                </button>
              )}

              {/* {!isMyProfile && !amIFollowing && !isBlockingRelationship && (
                <button
                  onClick={handleMessageClick}
                  className="hidden p-1 md:p-2 border rounded-full hover:bg-secondary transition duration-200 z-20 md:text-md text-xs"
                  disabled={isBlockingRelationship}
                >
                  <CiMail size={20} strokeWidth={1} />
                </button>
              )} */}

              {/* Follow/Unfollow Button - FIXED WIDTH */}
              {!isMyProfile && !isBlockingRelationship && (
                <FollowButton
                  user={userProfile}
                  isFollowing={amIFollowing}
                  currentUserId={authUser?._id}
                  openUnfollowModal={openUnfollowModal} // Pass the new prop
                />
              )}

              {(coverImg || profileImg) && (
                <button
                  className="border border-accent rounded-full px-2 md:px-4 py-0.5 md:py-1.5 bg-accent/30 hover:bg-secondary transition duration-300"
                  onClick={async () => {
                    const updatePayload = {};
                    if (profileImg !== null) {
                      // Only add if a new profile image was selected
                      updatePayload.profileImg = profileImg;
                    }
                    if (coverImg !== null) {
                      // Only add if a new cover image was selected
                      updatePayload.coverImg = coverImg;
                    }

                    await updateProfile(updatePayload); // Send only the relevant image data

                    // Reset local states after successful update
                    setProfileImg(null);
                    setCoverImg(null);
                  }}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? "Updating..." : "Update"}
                </button>
              )}
            </div>
          </>
        )}

        {!isLoading && !isRefetching && displayMessage && (
          <p className="text-center text-lg mt-16 text-slate-400">{displayMessage}</p>
        )}

        {showFullProfileContent && userProfile && (
          <>
            <div className="flex flex-col gap-4 mt-3 px-4">
              <div className="flex flex-col">
                <div className="flex gap-1 items-center">
                  <span className="font-bold text-lg">{userProfile?.fullName}</span>
                  {userProfile?.isVerified && (
                    <img src="/verified.png" className="size-[18px]" />
                  )}
                  {userProfile?.isGoldVerified && (
                    <img src="/gold-verified.png" className="size-[18px]" />
                  )}
                </div>
                <span className="text-sm text-slate-500">@{userProfile?.username}</span>
                <span className="text-sm my-1">{userProfile?.bio}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {userProfile?.link && (
                  <div className="flex gap-1 items-center ">
                    <>
                      <FaLink className="w-3 h-3 text-slate-500" />
                      <a
                        href={userProfile?.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {userProfile?.link.slice(12)}
                      </a>
                    </>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <IoCalendarOutline className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-500">
                    {formatMemberSinceDate(userProfile?.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                {" "}
                <div
                  className="flex gap-1 items-center cursor-pointer hover:underline"
                  onClick={() => openFollowListModal("following")}
                >
                  <span className="font-bold text-sm">
                    {userProfile?.following?.length}
                  </span>{" "}
                  <span className="text-slate-500 text-sm">Following</span>{" "}
                </div>
                <div
                  className="flex gap-1 items-center cursor-pointer hover:underline"
                  onClick={() => openFollowListModal("followers")}
                >
                  <span className="font-bold text-sm">
                    {userProfile?.followers?.length}
                  </span>{" "}
                  <span className="text-slate-500 text-sm">Followers</span>{" "}
                </div>
              </div>
            </div>
            <div className="flex w-full border-b border-accent mt-4">
              {/* Posts Tab */}
              <div
                className={`flex justify-center flex-1 p-3 relative cursor-pointer
                  transition duration-150           
                  ${!isTouchDevice ? "hover:bg-secondary" : ""}
                  ${
                    isTouchDevice && activeTab === "posts"
                      ? "bg-secondary bg-opacity-50"
                      : ""
                  }
                  ${feedType === "posts" ? "font-bold" : "opacity-50"}
                `}
                onClick={() => {
                  setFeedType("posts");
                  // Optional: if you want immediate touch feedback, you can add setActiveTab here
                  // but onClick handles the primary navigation which is often enough.
                }}
                onTouchStart={() => handleTouchStart("posts")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                Posts
                {feedType === "posts" && (
                  <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
                )}
              </div>
              {/* Likes Tab */}
              <div
                className={`flex justify-center flex-1 p-3 relative cursor-pointer
                  transition duration-150         
                  ${!isTouchDevice ? "hover:bg-secondary" : ""} 
                  ${
                    isTouchDevice && activeTab === "likes"
                      ? "bg-secondary bg-opacity-50"
                      : ""
                  } {/* Active background for touch */}
                  ${
                    feedType === "likes" ? "font-bold" : "opacity-50"
                  } {/* Existing active text styling */}
                `}
                onClick={() => {
                  setFeedType("likes");
                  // Optional: if you want immediate touch feedback, you can add setActiveTab here
                  // but onClick handles the primary navigation which is often enough.
                }}
                onTouchStart={() => handleTouchStart("likes")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                Likes
                {feedType === "likes" && (
                  <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
                )}
              </div>
            </div>
          </>
        )}

        {showFullProfileContent && userProfile && !isBlockedByYou && (
          <Posts
            feedType={feedType}
            username={username}
            userId={userProfile?._id}
            onPostsFetched={handlePostsFetched}
            openImageModal={openImageModal}
            pinnedPosts={pinnedPosts || []}
            isLoadingPinnedPosts={isLoadingPinnedPosts || isRefetchingPinnedPosts}
          />
        )}
      </div>

      {userProfile && (
        <FollowListModal
          userId={userProfile._id}
          type="following"
          page="profilePage"
          onClose={() => closeFollowListModal("following")}
        />
      )}

      {userProfile && (
        <FollowListModal
          userId={userProfile._id}
          type="followers"
          page="profilePage"
          onClose={() => closeFollowListModal("followers")}
        />
      )}

      <ConfirmationModal
        isOpen={showBlockConfirmationModal}
        onClose={closeBlockConfirmationModal}
        onConfirm={handleConfirmBlockUnblock}
        danger={!isBlockedByYou}
        message={message}
        confirmButtonText={confirmButtonText}
        modalTitle={modalTitle}
      />

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

      {userProfile && (
        <DeleteUserConfirmationModal
          isOpen={showDeleteUserModal}
          onClose={closeDeleteUserModal}
          onConfirm={handleConfirmDeleteUser}
          username={userProfile.username}
        />
      )}
    </>
  );
};
export default ProfilePage;
