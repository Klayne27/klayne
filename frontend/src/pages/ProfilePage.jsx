import { useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import useFollow from "../features/users/usersHooks/useFollow"

import Posts from "../features/posts/Posts"
import ProfileHeaderSkeleton from "../components/skeletons/ProfileHeaderSkeleton"
import EditProfileModal from "../components/common/EditProfileModal"
import FollowListModal from "../components/common/FollowListModal"

import { FaArrowLeft, FaGraduationCap, FaWrench } from "react-icons/fa6"
import { IoCalendarOutline } from "react-icons/io5"
import { MdBlock, MdDeleteForever, MdEdit, MdLocalPolice, MdSchool } from "react-icons/md"
import { formatMemberSinceDate } from "../utils/date"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useUpdateUserProfile } from "../features/users/usersHooks/useUpdateUserProfile"
import { useGetUserProfile } from "../features/users/usersHooks/useGetUserProfile"
import { CiMail } from "react-icons/ci"
import ScrollToTop from "../utils/ScrollToTop"
import { useBlockUnblockUser } from "../features/users/usersHooks/useBlockUnblockUser"
import ConfirmationModal from "../components/common/ConfirmationModal"
import { useGetPinnedPosts } from "../features/posts/postsHooks/useGetPinnedPosts"
import FollowButton from "../components/common/FollowButton"
import { useAdminDeleteUser } from "../features/users/usersHooks/useAdminDeleteUser"
import { useGetConversationBetweenUsers } from "../features/chat/private/privateChatHooks/useGetConversationBetweenUsers"
import { showAppToast } from "../utils/showAppToast"
import { useAppStore } from "../store/useAppStore"
import { useTouchHoverEffect } from "../hooks/customHooks/useTouchHoverEffect"
import { formatProfileLink, getFullProfileLink } from "../utils/textUtils"
import { useGetOrCreateConversation } from "../features/chat/private/privateChatHooks/useGetOrCreateConversation"
import { RiLockFill } from "react-icons/ri"
import PostModal from "../features/posts/PostModal.jsx"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils.js"
import { BiHealth } from "react-icons/bi"
import { PiChefHatFill, PiLinkSimpleBold } from "react-icons/pi"
import ReactCalendarHeatmap from "react-calendar-heatmap"
import { Tooltip } from "react-tooltip"

const formatStudyTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const formatHeatmapDate = (dateString) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date)
}

const ProfilePage = ({ feedType, setFeedType }) => {
  const openProfileImageModal = useAppStore((state) => state.openProfileImageModal)

  const [coverImg, setCoverImg] = useState(null)
  const [profileImg, setProfileImg] = useState(null)
  const [showBlockConfirmationModal, setShowBlockConfirmationModal] = useState(false)
  const [showUnfollowModal, setShowUnfollowModal] = useState(false) // New state for unfollow modal
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false) // NEW STATE for delete modal
  const [userToUnfollow, setUserToUnfollow] = useState(null) // State to hold user info for unfollow modal
  const navigate = useNavigate()

  const [userPostsCount, setUserPostsCount] = useState(0)

  const coverImgRef = useRef(null)
  const profileImgRef = useRef(null)

  const { username } = useParams()

  const { authUser } = useAuthUser()
  const { follow, isPending } = useFollow()

  const { blockUnblockUser, isBlocking } = useBlockUnblockUser()
  const { adminDeleteUser, isPending: isDeletingUser } = useAdminDeleteUser() // USE NEW HOOK

  const { userProfile, isLoading, isRefetching, isError, error, isBlockedByYou, hasBlockedYou } =
    useGetUserProfile(username)

  const { conversationStatus, isLoadingConversationStatus, isErrorConversationStatus } =
    useGetConversationBetweenUsers(userProfile?._id)

const getDatesInRange = (startDate, endDate) => {
  const dates = []
  let curr = new Date(startDate)
  while (curr <= endDate) {
    dates.push(curr.toISOString().split("T")[0])
    curr.setDate(curr.getDate() + 1)
  }
  return dates
}

// 2. Map your existing data into a full calendar year
const allYearDates = getDatesInRange(new Date("2026-01-01"), new Date("2026-12-31"))

const heatmapData = allYearDates.map((dateStr) => {
  const existingEntry = userProfile?.studyHistory.find((item) => item.date === dateStr)
  return {
    date: dateStr,
    count: existingEntry ? existingEntry.count : 0,
    duration: existingEntry ? existingEntry.duration : 0,
  }
})

  const {
    pinnedPosts,
    isLoading: isLoadingPinnedPosts,
    isRefetching: isRefetchingPinnedPosts,
  } = useGetPinnedPosts(username)

  const { editPostModalData, closeEditPostModal } = useAppStore()

  const { updateProfile, isUpdatingProfile } = useUpdateUserProfile()
  const { getOrCreateConversation, isCreatingConversation } = useGetOrCreateConversation()

  const isMyProfile = authUser?._id === userProfile?._id
  const amIFollowing = authUser?.following?.includes(userProfile?._id)

  const isAdminUser = authUser?.isAdmin
  const blockModalTitle = isBlockedByYou ? `Unblock @${username}?` : `Block @${username}?`
  const confirmButtonText = isBlockedByYou ? "Unblock" : "Block"

  const isBlockingRelationship = isBlockedByYou || hasBlockedYou

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const openDeleteUserModal = () => {
    if (!userProfile?._id) return
    setShowDeleteUserModal(true)
  }

  const closeDeleteUserModal = () => {
    setShowDeleteUserModal(false)
  }

  const handleConfirmDeleteUser = () => {
    if (userProfile?._id) {
      adminDeleteUser(userProfile._id) // Call the new mutation hook
      closeDeleteUserModal()
    }
  }

  const openBlockConfirmationModal = () => {
    if (!userProfile?._id) return
    setShowBlockConfirmationModal(true)
  }

  const closeBlockConfirmationModal = () => {
    setShowBlockConfirmationModal(false)
  }

  const handleConfirmBlockUnblock = () => {
    closeBlockConfirmationModal()
    if (!userProfile?._id) return
    blockUnblockUser(userProfile._id)
  }

  // New functions for Unfollow Modal
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
      follow(userToUnfollow._id) // This will unfollow the user
      closeUnfollowModal()
    }
  }

  const handleImgChange = (e, state) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        state === "coverImg" && setCoverImg(reader.result)
        state === "profileImg" && setProfileImg(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMessageClick = () => {
    if (isBlockingRelationship) return

    if (!authUser || !userProfile?._id) {
      showAppToast("Authentication or profile data is missing.", "error")
      return
    }

    // Add the new loading state to the check
    if (isLoadingConversationStatus || isCreatingConversation) {
      return
    }

    if (isErrorConversationStatus) {
      showAppToast("Failed to get conversation status.", "error")
      return
    }

    console.log(conversationStatus);

    if (!conversationStatus.conversationId || conversationStatus.isHiddenForCurrentUser) {
      getOrCreateConversation(userProfile._id)
    } else {
      navigate(`/messages/${conversationStatus.conversationId}`)
    }
  }

  const handleProfileImageClick = (imageUrl, event) => {
    event.stopPropagation()
    if (openProfileImageModal) {
      openProfileImageModal(imageUrl)
    }
  }

  const openFollowListModal = (type) => {
    document.getElementById(`follow_list_modal_${type}`).showModal()
  }

  const closeFollowListModal = (type) => {
    document.getElementById(`follow_list_modal_${type}`).close()
  }

  const handlePostsFetched = (count) => {
    setUserPostsCount(count)
  }

  let displayMessage = ""
  let showFullProfileHeader = false
  let showFullProfileContent = false

  if (isLoading || isRefetching) {
    showFullProfileHeader = false
    showFullProfileContent = false
  } else if (hasBlockedYou) {
    displayMessage = "You are blocked by this user. You cannot view their profile content."
    showFullProfileHeader = false
    showFullProfileContent = false
  } else if (!userProfile) {
    displayMessage = error?.message || "User not found."
    showFullProfileHeader = false
    showFullProfileContent = false
  } else if (isBlockedByYou) {
    displayMessage = "Content is unavailable because you have blocked this user."
    showFullProfileHeader = true
    showFullProfileContent = false
  } else {
    showFullProfileHeader = true
    showFullProfileContent = true
  }

  let message
  if (isBlockedByYou) {
    message = `They will be able to follow you, message you, and engage with your public posts.`
  } else {
    message = `They will not be able to see your public posts and will no longer be able to engage with them. @${username} 
    will also not be able to follow or message you, and you will not see notifications from them.`
  }

  return (
    <>
      <ScrollToTop />
      <div className="template min-h-screen flex-[4_4_0] border-accent">
        {!hasBlockedYou && (isLoading || isRefetching) && !isError && <ProfileHeaderSkeleton />}

        {showFullProfileHeader && userProfile && (
          <>
            <div className="flex items-center gap-2 px-3 py-0.5 md:gap-4 md:px-4 md:py-2">
              <button
                onClick={() => navigate(-1)}
                className="rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
              >
                <FaArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-col">
                <p className="text-lg font-bold">{userProfile?.fullName}</p>
                <span className="text-sm text-slate-500">
                  {feedType === "likes"
                    ? `${userPostsCount} likes`
                    : feedType === "posts"
                      ? `${userPostsCount} posts`
                      : `${userPostsCount} replies`}
                </span>
              </div>
            </div>
            <div className="group/cover relative">
              <Link to={userProfile?.coverImg?._id && `/images/${userProfile?.coverImg?._id}`}>
                <img
                  src={getOptimizedImageUrl(
                    coverImg || userProfile?.coverImg?.imageUrl || "/cover.png",
                    "cover",
                  )}
                  className={`h-52 w-full cursor-pointer object-cover`}
                  alt="cover image"
                  loading="lazy"
                />
              </Link>
              {isMyProfile && (
                <div
                  className="absolute right-2 top-2 cursor-pointer rounded-full bg-primary bg-opacity-75 p-2 text-white opacity-0 transition duration-200 group-hover/cover:opacity-100"
                  onClick={() => coverImgRef.current.click()}
                >
                  <MdEdit className="h-5 w-5" />
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
                <div className="group/avatar relative w-32 rounded-full border-4 border-base-100">
                  {/* <Link to={`/images/${userProfile?.profileImg?._id}`}> */}
                  <img
                    src={getOptimizedImageUrl(
                      profileImg || userProfile?.profileImg?.imageUrl || "/avatar-placeholder.png",
                      "avatar",
                    )}
                    alt="user avatar"
                    className="cursor-pointer"
                    onClick={(e) => handleProfileImageClick(userProfile?.profileImg?.imageUrl, e)}
                    loading="lazy"
                  />
                  {/* </Link> */}
                  {isMyProfile && (
                    <div className="absolute right-3 top-5 cursor-pointer rounded-full bg-primary p-1 text-white opacity-0 duration-200 group-hover/avatar:opacity-100">
                      <MdEdit className="h-4 w-4" onClick={() => profileImgRef.current.click()} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 px-4">
              {authUser.username === username && (
                <button
                  className="rounded-full border border-secondary px-4 py-1.5 transition duration-200 hover:bg-secondary"
                  onClick={() => document.getElementById("edit_profile_modal").showModal()}
                >
                  Edit profile
                </button>
              )}
              {/* ADMIN DELETE BUTTON - ONLY VISIBLE IF currentUser IS ADMIN AND NOT viewing their own profile */}
              {isAdminUser && !isMyProfile && userProfile && (
                <button
                  onClick={openDeleteUserModal}
                  className="btn btn-error btn-sm absolute top-4 flex items-center gap-1 rounded-full py-1 text-xs text-white transition duration-200 hover:scale-105 md:px-3 md:text-base"
                  disabled={isDeletingUser}
                >
                  <MdDeleteForever size={20} />
                </button>
              )}

              {!isMyProfile && !hasBlockedYou && (
                <button
                  className={`absolute top-20 flex items-center gap-1 rounded-full border border-red-700 px-1.5 py-1 text-xs font-bold transition duration-200 md:px-3 md:text-base ${
                    isBlockedByYou ? "bg-red-700 hover:bg-red-800" : "bg-red-700 hover:bg-red-800"
                  } `}
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
                  className="z-1 rounded-full border border-accent px-2 transition duration-200 hover:bg-secondary"
                  disabled={
                    isLoadingConversationStatus ||
                    isCreatingConversation ||
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
                  className="rounded-full border border-accent bg-accent/30 px-2 py-0.5 transition duration-300 hover:bg-secondary md:px-4 md:py-1.5"
                  onClick={async () => {
                    const updatePayload = {}
                    if (profileImg !== null) {
                      // Only add if a new profile image was selected
                      updatePayload.profileImg = profileImg
                    }
                    if (coverImg !== null) {
                      // Only add if a new cover image was selected
                      updatePayload.coverImg = coverImg
                    }

                    await updateProfile(updatePayload) // Send only the relevant image data

                    // Reset local states after successful update
                    setProfileImg(null)
                    setCoverImg(null)
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
          <p className="mt-16 text-center text-lg  flex justify-center items-center text-slate-400">{displayMessage}</p>
        )}

        {showFullProfileContent && userProfile && (
          <>
            <div className="mt-3 flex flex-col gap-4 px-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold">{userProfile?.fullName}</span>
                  <span className="flex items-center">
                    {userProfile?.isVerified && (
                      <img src="/verified2.png" className="size-[18px]" />
                    )}
                    {userProfile?.isGoldVerified && (
                      <img src="/gold-verified2.png" className="size-[18px]" />
                    )}
                  </span>
                </div>
                <span className="text-sm text-slate-500">@{userProfile?.username}</span>
                <span className="my-1 text-sm">{userProfile?.bio}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {userProfile?.link && (
                  <div className="flex items-center gap-1">
                    <>
                      <PiLinkSimpleBold className="size-4 text-slate-500" />
                      <a
                        href={getFullProfileLink(userProfile?.link)} // Use the new function for the href
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {formatProfileLink(userProfile?.link)}
                      </a>
                    </>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <IoCalendarOutline className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-500">
                    {formatMemberSinceDate(userProfile?.createdAt)}
                  </span>
                </div>
              </div>
              {(userProfile?.levelOfEducation || userProfile?.majorOrField) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {userProfile?.levelOfEducation && (
                    <div className="flex items-center gap-1.5">
                      <FaGraduationCap className="size-4 text-slate-500" />
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                        {userProfile.levelOfEducation}
                      </span>
                    </div>
                  )}

                  {userProfile?.majorOrField && (
                    <div className="flex items-center gap-1.5">
                      <MdSchool className="size-4 text-slate-500" />
                      <span className="text-sm text-slate-400">
                        Studies{" "}
                        <span className="font-medium text-slate-200">
                          {userProfile.majorOrField}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
              {userProfile?.relationshipStatus && (
                <div className="flex flex-col">
                  <p className="text-sm text-slate-500">Relationship Status</p>
                  <span className="text-sm font-medium">
                    <em>{userProfile.relationshipStatus}</em>
                  </span>
                </div>
              )}
              <div className="flex gap-4">
                {" "}
                <div
                  className="flex cursor-pointer items-center gap-1 hover:underline"
                  onClick={() => openFollowListModal("following")}
                >
                  <span className="text-sm font-bold">{userProfile?.following?.length}</span>{" "}
                  <span className="text-sm text-slate-500">Following</span>{" "}
                </div>
                <div
                  className="flex cursor-pointer items-center gap-1 hover:underline"
                  onClick={() => openFollowListModal("followers")}
                >
                  <span className="text-sm font-bold">{userProfile?.followers?.length}</span>{" "}
                  <span className="text-sm text-slate-500">Followers</span>{" "}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <BiHealth className="text-primary" size={18} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Study Activity
                    </h3>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-500">Total Sessions</span>
                      <span className="text-sm font-bold">
                        {userProfile?.totalSessionsCompleted || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-500">Total Time</span>
                      <span className="text-sm font-bold">
                        {formatStudyTime(userProfile?.totalStudyDuration || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <ReactCalendarHeatmap
                      startDate={new Date("2026-01-01")}
                      endDate={new Date("2026-12-31")}
                      values={heatmapData}
                      gutterSize={3} // Increases the space between the rounded squares
                      classForValue={(value) => {
                        if (!value || !value.count) return "color-empty"
                        return `color-scale-${Math.min(value.count, 4)}`
                      }}
                      tooltipDataAttrs={(value) => {
                        const date = value?.date
                        const formattedDate = date ? formatHeatmapDate(date) : "Unknown date"

                        // 2. Handle the "Empty" case
                        if (!value || !value.count) {
                          return {
                            "data-tooltip-id": "study-tooltip",
                            "data-tooltip-content": `${formattedDate}: No activity recorded`,
                          }
                        }

                        // 3. Handle the "Active" case
                        const timeLabel = formatStudyTime(value.duration || 0)
                        const sessionLabel = value.count === 1 ? "session" : "sessions"

                        return {
                          "data-tooltip-id": "study-tooltip",
                          "data-tooltip-content": `${formattedDate}: ${value.count} ${sessionLabel} (${timeLabel})`,
                        }
                      }}
                    />

                    {/* Ensure the Tooltip component is present below the Heatmap */}
                    <Tooltip
                      id="study-tooltip"
                      className="z-50 !opacity-100 shadow-xl"
                      style={{
                        backgroundColor: "var(--fallback-b2,oklch(var(--b2)))",
                        color: "var(--fallback-bc,oklch(var(--bc)))",
                        borderRadius: "12px",
                        padding: "6px 12px",
                        
                      }}
                      border="1px solid var(--fallback-b3,oklch(var(--b3)))"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 px-1">
                  <span className="text-[10px] text-slate-500">Less</span>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-[2px] bg-[#161b22]"></div>
                    <div className="size-2 rounded-[2px] bg-[#1e6334]"></div>
                    <div className="size-2 rounded-[2px] bg-[#27813f]"></div>
                    <div className="size-2 rounded-[2px] bg-[#36ad56]"></div>
                    <div className="size-2 rounded-[2px] bg-[#42e46a]"></div>
                  </div>
                  <span className="text-[10px] text-slate-500">More</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex w-full border-b border-accent">
              {/* Posts Tab */}
              <div
                className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                  isTouchDevice && activeButtonId === "posts" ? "bg-secondary bg-opacity-50" : ""
                } ${feedType === "posts" ? "font-bold" : "opacity-50"} `}
                onClick={() => {
                  setFeedType("posts")
                }}
                onTouchStart={() => handleTouchStart("posts")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                Posts
                {feedType === "posts" && (
                  <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary" />
                )}
              </div>
              {/* Replies Tab */}
              <div
                className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                  isTouchDevice && activeButtonId === "userReplies"
                    ? "bg-secondary bg-opacity-50"
                    : ""
                } {/* Active background for touch */} ${
                  feedType === "userReplies" ? "font-bold" : "opacity-50"
                } {/* Existing text styling */} active`}
                onClick={() => {
                  setFeedType("userReplies")
                }}
                onTouchStart={() => handleTouchStart("userReplies")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                Replies
                {feedType === "userReplies" && (
                  <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary" />
                )}
              </div>
              {/* Likes Tab */}
              <div
                className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                  isTouchDevice && activeButtonId === "likes" ? "bg-secondary bg-opacity-50" : ""
                } {/* Active background for touch */} ${
                  feedType === "likes" ? "font-bold" : "opacity-50"
                } {/* Existing text styling */} active`}
                onClick={() => {
                  setFeedType("likes")
                }}
                onTouchStart={() => handleTouchStart("likes")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                Likes
                {feedType === "likes" && (
                  <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary" />
                )}
              </div>
            </div>
            {isMyProfile && feedType === "likes" && authUser?.isLikedFeedPrivate && (
              <div className="m-1 flex flex-col items-start rounded-lg bg-[#02113D] px-4 py-2.5">
                <p className="flex items-center gap-3 text-[15px]">
                  <RiLockFill />
                  Your likes are private. Only you can see them.
                </p>
              </div>
            )}
          </>
        )}

        {showFullProfileContent && userProfile && !isBlockedByYou && (
          <Posts
            feedType={feedType}
            username={username}
            userId={userProfile?._id}
            onPostsFetched={handlePostsFetched}
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
        modalTitle={blockModalTitle}
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
        <ConfirmationModal
          isOpen={showDeleteUserModal}
          onClose={closeDeleteUserModal}
          onConfirm={handleConfirmDeleteUser}
          modalTitle={
            <>
              Delete account of <p>@{userProfile?.username}?</p>
            </>
          }
          // modalTitle="Delete User Account?"
          message="This action is irreversible and will permanently delete all of their posts,
            replies, likes, messages, and followers."
          confirmButtonText="Delete Permanently"
          danger={true}
        />
      )}

      {editPostModalData && (
        <PostModal
          mode="edit"
          editPost={editPostModalData}
          title="Edit Your Post"
          onClose={closeEditPostModal}
        />
      )}
      {isMyProfile && <EditProfileModal authUser={authUser} />}
    </>
  )
}
export default ProfilePage
