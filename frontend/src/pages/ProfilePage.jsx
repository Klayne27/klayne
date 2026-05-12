import { useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import Posts from "../features/posts/components/Posts.jsx"
import ProfileHeaderSkeleton from "../components/skeletons/ProfileHeaderSkeleton"
import EditProfileModal from "../components/common/EditProfileModal"
import FollowListModal from "../components/common/FollowListModal"

import { FaArrowLeft, FaGraduationCap } from "react-icons/fa6"
import { IoCalendarOutline } from "react-icons/io5"
import { MdBlock, MdDeleteForever, MdEdit, MdSchool } from "react-icons/md"
import { formatMemberSinceDate } from "../utils/date"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { CiMail } from "react-icons/ci"
import ScrollToTop from "../utils/ScrollToTop"
import ConfirmationModal from "../components/common/ConfirmationModal"
import FollowButton from "../components/common/FollowButton"
import { showAppToast } from "../utils/showAppToast"
import { useAppStore } from "../store/useAppStore"
import { useTouchHoverEffect } from "../hooks/customHooks/useTouchHoverEffect"
import { formatCount, formatProfileLink, getFullProfileLink } from "../utils/textUtils"
import { RiLockFill, RiRadioButtonLine } from "react-icons/ri"
import PostModal from "../features/posts/components/PostModal.jsx"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils.js"
import { BiHealth } from "react-icons/bi"
import { PiLinkSimpleBold } from "react-icons/pi"
import ReactCalendarHeatmap from "react-calendar-heatmap"
import { Tooltip } from "react-tooltip"
import {
  useGetConversationBetweenUsers,
  useGetOrCreateConversation,
} from "../features/chat/private/privateChatHooks/usePrivateChatQueries.js"
import {
  useAdminDeleteUser,
  useBlockUnblockUser,
  useFollow,
  useMuteUser,
  useUnmuteUser,
  useUpdateUserProfile,
} from "../features/users/usersHooks/useUserMutations.js"
import {
  useGetMuteStatus,
  useGetUserProfile,
  useGetUserStats,
} from "../features/users/usersHooks/useUserQueries.js"
import { useGetPinnedPosts } from "../features/posts/postsHooks/usePostsQueries.js"
import { useLightboxStore } from "../store/useLightboxStore.js"
import { WARDROBE_CONFIG } from "../features/wardrobe/wardrobeConfig.js"
import UserAvatar from "../components/common/UserAvatar.jsx"
import { useEffect } from "react"
import { loadGoogleFont } from "../features/wardrobe/StyleWrapper.jsx"
import DropdownMenu from "../components/common/DropdownMenu.jsx"
import { BsThreeDots, BsVolumeMute, BsVolumeUp } from "react-icons/bs"
import MuteOptionsModal from "../components/common/MuteOptionsModal.jsx"
import useDropdownMenu from "../hooks/customHooks/useDropdownMenu.js"
import { useServerTimeOffset } from "../features/pomodoro/pomodoroHooks/usePomodoroMutations.js"
import PomodoroCountdown from "../features/pomodoro/components/PomodoroCountdown.jsx"

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

const getOverlayClass = (wardrobeConfig, equippedOverlayKey) => {
  if (!equippedOverlayKey || !wardrobeConfig[equippedOverlayKey]) return ""

  return wardrobeConfig[equippedOverlayKey].overlayClass || ""
}

const ProfilePage = ({ feedType, setFeedType }) => {
  const openProfileImageModal = useAppStore((state) => state.openProfileImageModal)

  const clockOffset = useServerTimeOffset()

  const [coverImg, setCoverImg] = useState(null)
  const [profileImg, setProfileImg] = useState(null)
  const [showBlockConfirmationModal, setShowBlockConfirmationModal] = useState(false)
  const [showUnfollowModal, setShowUnfollowModal] = useState(false)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [userToUnfollow, setUserToUnfollow] = useState(null)
  const navigate = useNavigate()

  const [userPostsCount, setUserPostsCount] = useState(0)
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false)
  const [isUnmuteConfirmOpen, setIsUnmuteConfirmOpen] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)

  const coverImgRef = useRef(null)
  const profileImgRef = useRef(null)

  const { username } = useParams()

  const { authUser } = useAuthUser()
  const { follow, isPending } = useFollow()

  const { blockUnblockUser, isBlocking } = useBlockUnblockUser()
  const { adminDeleteUser, isPending: isDeletingUser } = useAdminDeleteUser()
  const { totalLikes, totalReposts } = useGetUserStats(username)

  const { userProfile, isLoading, isRefetching, isError, error, isBlockedByYou, hasBlockedYou } =
    useGetUserProfile(username)

  const { conversationStatus, isLoadingConversationStatus, isErrorConversationStatus } =
    useGetConversationBetweenUsers(userProfile?._id)

  const openLightbox = useLightboxStore((s) => s.openLightbox)

  const equippedFont = userProfile?.equipped?.font

  // 2. Map them to your config values
  const fontVars = WARDROBE_CONFIG[equippedFont]?.cssVars || {}

  const activeOverlayClass = getOverlayClass(WARDROBE_CONFIG, userProfile?.equipped?.overlay)

  const getDatesInRange = (startDate, endDate) => {
    const dates = []
    let curr = new Date(startDate)
    while (curr <= endDate) {
      dates.push(curr.toISOString().split("T")[0])
      curr.setDate(curr.getDate() + 1)
    }
    return dates
  }

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
  const [showMuteMenu, setShowMuteMenu] = useState(false)

  const { isMuted, muteType } = useGetMuteStatus(userProfile?._id)
  const { muteUser, isMuting } = useMuteUser(userProfile?._id)
  const { unmuteUser, isUnmuting } = useUnmuteUser(userProfile?._id)

  const isMyProfile = authUser?._id === userProfile?._id
  const amIFollowing = authUser?.following?.includes(userProfile?._id)

  const isAdminUser = authUser?.isAdmin
  const blockModalTitle = isBlockedByYou ? `Unblock @${username}?` : `Block @${username}?`
  const confirmButtonText = isBlockedByYou ? "Unblock" : "Block"

  const isBlockingRelationship = isBlockedByYou || hasBlockedYou

  const isPrivateAndNotFollowing =
    userProfile?.isPrivate && !amIFollowing && authUser?._id !== userProfile?._id

  const liveSession = userProfile?.activeSession

  const isSessionLive =
    liveSession?.isActive &&
    liveSession?.expectedEndTime &&
    new Date(liveSession.expectedEndTime) > new Date()

  // Visibility rules:
  // - Always visible to the profile owner (own-view)
  // - Visible to others only if isPomodoroPrivate is false
  const canSeeLiveSession = isSessionLive && (isMyProfile || !userProfile?.isPomodoroPrivate)

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
      adminDeleteUser(userProfile._id)
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
      follow({ userIdToFollow: userToUnfollow._id })
      closeUnfollowModal()
    }
  }

  const handleImgChange = (e, imgType) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (imgType === "profileImg") setProfileImg(reader.result)
        else if (imgType === "coverImg") setCoverImg(reader.result)
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

    if (isLoadingConversationStatus || isCreatingConversation) {
      return
    }

    if (isErrorConversationStatus) {
      showAppToast("Failed to get conversation status.", "error")
      return
    }

    if (!conversationStatus.conversationId || conversationStatus.isHiddenForCurrentUser) {
      getOrCreateConversation({ targetUserId: userProfile._id })
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

  const handleUnmute = () => {
    unmuteUser()
    setIsUnmuteConfirmOpen(false)
  }

  const handleCloseEditModal = () => {
    setOpenEditModal(false)
    setCoverImg(null)
    setProfileImg(null)
  }

  useEffect(() => {
    const fontKey = userProfile?.equipped?.font
    const config = WARDROBE_CONFIG[fontKey]

    if (config?.googleFont) {
      loadGoogleFont(config.googleFont)
    }

    // Apply the variable to the profile container or root
    if (config?.cssVars) {
      const root = document.documentElement
      Object.entries(config.cssVars).forEach(([k, v]) => root.style.setProperty(k, v))
    }

    // Cleanup: Reset the font variable when leaving the profile
    return () => {
      document.documentElement.style.removeProperty("--user-font")
    }
  }, [userProfile?.equipped?.font])

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
      <div
        className={`template min-h-screen min-w-0 flex-[4_4_0] overflow-hidden border-accent md:border-x ${WARDROBE_CONFIG[userProfile?.equipped?.fonts] || ""}`}
        style={{
          ...fontVars,
          fontFamily: "var(--user-font, inherit)", // Force the font variable
        }}
      >
        {" "}
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
              <div className="flex min-w-0 flex-col">
                <p
                  className="min-w-0 truncate pl-0.5 text-lg font-bold"
                  style={userProfile?.nameColor ? { color: userProfile?.nameColor } : undefined}
                >
                  {userProfile?.fullName}
                </p>
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
              <div className={`group/cover relative overflow-hidden ${activeOverlayClass}`}>
                {" "}
                <img
                  src={getOptimizedImageUrl(
                    coverImg || userProfile?.coverImg?.imageUrl || "/cover.png",
                    "cover",
                  )}
                  onClick={() => {
                    const url = userProfile?.coverImg?.imageUrl || "/cover.png"
                    openLightbox({ imageUrl: url })
                  }}
                  className="h-52 w-full cursor-pointer object-cover"
                  alt="cover image"
                  loading="lazy"
                />
                {/* Edit button stays inside inner wrapper so it's clipped correctly */}
                {isMyProfile && (
                  <div
                    className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-primary bg-opacity-75 p-2 text-white opacity-0 transition duration-200 group-hover/cover:opacity-100"
                    onClick={() => coverImgRef.current.click()}
                  >
                    <MdEdit className="h-5 w-5" />
                  </div>
                )}
              </div>
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
              <div className="absolute -bottom-16 left-4 rounded-full border-4 border-base-100">
                <div
                  className="group/avatar relative cursor-pointer rounded-full"
                  onClick={() => {
                    const url =
                      profileImg || userProfile?.profileImg?.imageUrl || "/avatar-placeholder.png"
                    openLightbox({ imageUrl: url })
                  }}
                >
                  <UserAvatar
                    user={{
                      ...userProfile,
                      profileImg: profileImg ? { imageUrl: profileImg } : userProfile?.profileImg,
                    }}
                    size="xxl"
                    className={`cursor-pointer ${userProfile?.equipped}`}
                    // 2. Attach the Lightbox click handler here
                  />

                  {/* 3. Keep the edit button overlay */}
                  {isMyProfile && (
                    <div
                      className="absolute right-1 top-1 z-10 cursor-pointer rounded-full bg-primary p-1.5 text-white opacity-0 shadow-md duration-200 group-hover/avatar:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        profileImgRef.current.click()
                      }}
                    >
                      <MdEdit className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 px-4">
              {!isMyProfile && (
                <DropdownMenu icon={<BsThreeDots size={20} />}>
                  {/* MUTE ACTION */}
                  {
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
                      onClick={() => {
                        if (isMuted) {
                          unmuteUser()
                        } else {
                          setIsMuteModalOpen(true)
                        }
                      }}
                    >
                      {isMuted ? <BsVolumeUp size={18} /> : <BsVolumeMute size={18} />}
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                  }

                  {/* BLOCK ACTION */}
                  {!hasBlockedYou && (
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-error transition hover:bg-white/10"
                      onClick={openBlockConfirmationModal}
                    >
                      <MdBlock size={18} />
                      {isBlockedByYou
                        ? `Unblock @${userProfile?.username}`
                        : `Block @${userProfile?.username}`}
                    </button>
                  )}

                  {/* ADMIN DELETE */}
                  {isAdminUser && (
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-error transition hover:bg-white/10"
                      onClick={openDeleteUserModal}
                    >
                      <MdDeleteForever size={18} />
                      Delete User
                    </button>
                  )}
                </DropdownMenu>
              )}
              {authUser.username === username && (
                <button
                  className="rounded-full border border-secondary px-4 py-1.5 transition duration-200 hover:bg-secondary"
                  onClick={() => setOpenEditModal(true)}
                >
                  Edit profile
                </button>
              )}

              {!isMyProfile && amIFollowing && !isBlockingRelationship && (
                <button
                  onClick={handleMessageClick}
                  className="z-1 rounded-full border border-accent px-2 transition duration-200 hover:bg-primary/20"
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

              {!isMyProfile && !isBlockingRelationship && (
                <FollowButton
                  user={userProfile}
                  isFollowing={amIFollowing}
                  hasRequestedFollow={userProfile?.hasRequestedFollow}
                  openUnfollowModal={openUnfollowModal}
                />
              )}

              {(coverImg || profileImg) && (
                <div className="flex gap-2">
                  <button
                    className="rounded-full border border-accent bg-accent/30 px-2 py-0.5 transition duration-300 hover:bg-secondary md:px-4 md:py-1.5"
                    onClick={async () => {
                      const updatePayload = {}
                      if (profileImg !== null) {
                        updatePayload.profileImg = profileImg
                      }
                      if (coverImg !== null) {
                        updatePayload.coverImg = coverImg
                      }

                      await updateProfile(updatePayload)

                      setProfileImg(null)
                      setCoverImg(null)
                    }}
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? "Updating..." : "Update"}
                  </button>
                  <button
                    className="rounded-full border border-accent bg-base-100 px-2 py-0.5 transition duration-300 hover:border-red-600 hover:bg-red-700/20 hover:text-red-600 md:px-4 md:py-1.5"
                    onClick={() => {
                      setCoverImg(null)
                      setProfileImg(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              <MuteOptionsModal
                isOpen={isMuteModalOpen}
                onClose={() => setIsMuteModalOpen(false)}
                username={userProfile?.username}
                isLoading={isMuting}
                onMute={(data) => {
                  muteUser(data)
                  setIsMuteModalOpen(false)
                }}
              />
              <ConfirmationModal
                isOpen={isUnmuteConfirmOpen}
                onClose={() => setIsUnmuteConfirmOpen(false)}
                onConfirm={handleUnmute}
                modalTitle={`Unmute @${userProfile?.username}?`}
                message="Posts from this account will now be allowed in your Home timeline."
                confirmButtonText="Unmute"
                danger={false} // Blue/White theme
                isLoading={isUnmuting}
              />
            </div>
          </>
        )}
        {!isLoading && !isRefetching && displayMessage && (
          <p className="mt-16 flex items-center justify-center text-center text-lg text-slate-400">
            {displayMessage}
          </p>
        )}
        {showFullProfileContent && userProfile && (
          <>
            <div className="mt-3 flex flex-col gap-4 px-4">
              {/* ── Basic info — always visible for non-blocked profiles ── */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span
                    className="break-all text-lg font-bold"
                    style={userProfile.nameColor ? { color: userProfile.nameColor } : undefined}
                  >
                    {userProfile?.fullName}
                  </span>
                  <span className="flex items-center">
                    {userProfile?.isVerified && (
                      <img src="/verified2.png" className="size-[18px]" />
                    )}
                    {userProfile?.isGoldVerified && (
                      <img src="/gold-verified2.png" className="size-[18px]" />
                    )}
                    {userProfile?.isCha && (
                      <img src="/cha.png" className="size-[16px] rounded-md" />
                    )}
                  </span>
                </div>
                <span className="break-all text-sm text-slate-500">@{userProfile?.username}</span>
                <span className="my-1 text-sm">{userProfile?.bio}</span>
                {/* {canSeeLiveSession && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
                    <RiRadioButtonLine className="animate-pulse text-primary" size={12} />
                    <span className="text-xs font-bold text-primary">
                      {liveSession.type === "work" ? "Focus" : "Break"}
                    </span>
                    <PomodoroCountdown
                      expectedEndTime={new Date(liveSession.expectedEndTime).getTime()}
                      clockOffset={clockOffset}
                      className="text-xs font-bold text-primary"
                    />
                    {isMyProfile && userProfile?.isPomodoroPrivate && (
                      <span className="text-[10px] text-slate-500">(only you)</span>
                    )}
                  </div>
                )} */}
              </div>

              <div className="flex flex-wrap gap-2">
                {userProfile?.link && (
                  <div className="flex items-center gap-1">
                    <PiLinkSimpleBold className="size-4 text-slate-500" />
                    <a
                      href={getFullProfileLink(userProfile?.link)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {formatProfileLink(userProfile?.link)}
                    </a>
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
                      <span className="text-[16px] text-slate-400 flex items-center gap-1.5">
                        Studies{" "}
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
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

              {/* ── Follow counts — visible but NOT clickable when profile is locked ── */}
              <div className="flex gap-4">
                <div
                  className={`flex items-center gap-1 ${
                    isPrivateAndNotFollowing ? "cursor-default" : "cursor-pointer hover:underline"
                  }`}
                  onClick={() => !isPrivateAndNotFollowing && openFollowListModal("following")}
                >
                  <span className="text-sm font-bold">
                    {formatCount(userProfile?.following?.length)}
                  </span>
                  <span className="text-sm text-slate-500">Following</span>
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    isPrivateAndNotFollowing ? "cursor-default" : "cursor-pointer hover:underline"
                  }`}
                  onClick={() => !isPrivateAndNotFollowing && openFollowListModal("followers")}
                >
                  <span className="text-sm font-bold">
                    {formatCount(userProfile?.followers?.length)}
                  </span>
                  <span className="text-sm text-slate-500">Followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">
                    {formatCount(totalLikes.toLocaleString())}
                  </span>
                  <span className="text-sm text-slate-500">Likes</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">
                    {formatCount(totalReposts.toLocaleString())}
                  </span>
                  <span className="text-sm text-slate-500">Reposts</span>
                </div>
              </div>

              {/* ── Private account gate — everything below is locked ── */}
              {isPrivateAndNotFollowing ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <RiLockFill className="text-slate-400" size={36} />
                  <p className="text-base font-bold">This account is private</p>
                  <p className="max-w-xs text-sm text-slate-500">
                    {userProfile?.username}'s study space is currently private. Send a follow
                    request to join their circle!"
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Study activity heatmap ── */}
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
                            {formatCount(userProfile?.totalSessionsCompleted) || 0}
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
                          gutterSize={3}
                          classForValue={(value) => {
                            if (!value || !value.count) return "color-empty"
                            return `color-scale-${Math.min(Math.ceil(value.count / 2), 4)}`
                          }}
                          tooltipDataAttrs={(value) => {
                            const formattedDate = value?.date
                              ? formatHeatmapDate(value.date)
                              : "Unknown date"
                            if (!value || !value.count) {
                              return {
                                "data-tooltip-id": "study-tooltip",
                                "data-tooltip-content": `${formattedDate}: No activity recorded`,
                              }
                            }
                            const timeLabel = formatStudyTime(value.duration || 0)
                            const sessionLabel = value.count === 1 ? "session" : "sessions"
                            return {
                              "data-tooltip-id": "study-tooltip",
                              "data-tooltip-content": `${formattedDate}: ${value.count} ${sessionLabel} (${timeLabel})`,
                            }
                          }}
                        />
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
                        <div className="size-2 rounded-[2px] bg-[#161b22]" />
                        <div className="size-2 rounded-[2px] bg-[#1e6334]" />
                        <div className="size-2 rounded-[2px] bg-[#27813f]" />
                        <div className="size-2 rounded-[2px] bg-[#36ad56]" />
                        <div className="size-2 rounded-[2px] bg-[#42e46a]" />
                      </div>
                      <span className="text-[10px] text-slate-500">More</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Mute notice ── */}
            {!isMyProfile && isMuted && !isPrivateAndNotFollowing && (
              <div className="mt-4 px-4 py-3 transition">
                <p className="text-sm text-slate-500">
                  You have muted posts from this account.{" "}
                  <button
                    onClick={() => setIsUnmuteConfirmOpen(true)}
                    className="font-bold text-primary hover:underline"
                  >
                    Unmute
                  </button>
                </p>
              </div>
            )}

            {/* ── Post tabs — hidden for locked profiles ── */}
            {!isPrivateAndNotFollowing && (
              <div className="mt-4 flex w-full border-b border-accent">
                <div
                  className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                    isTouchDevice && activeButtonId === "posts" ? "bg-secondary bg-opacity-50" : ""
                  } ${feedType === "posts" ? "font-bold" : "opacity-50"}`}
                  onClick={() => setFeedType("posts")}
                  onTouchStart={() => handleTouchStart("posts")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  Posts
                  {feedType === "posts" && (
                    <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary" />
                  )}
                </div>
                <div
                  className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                    isTouchDevice && activeButtonId === "userReplies"
                      ? "bg-secondary bg-opacity-50"
                      : ""
                  } ${feedType === "userReplies" ? "font-bold" : "opacity-50"}`}
                  onClick={() => setFeedType("userReplies")}
                  onTouchStart={() => handleTouchStart("userReplies")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  Replies
                  {feedType === "userReplies" && (
                    <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary" />
                  )}
                </div>
                <div
                  className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                    isTouchDevice && activeButtonId === "userMedia"
                      ? "bg-secondary bg-opacity-50"
                      : ""
                  } ${feedType === "userMedia" ? "font-bold" : "opacity-50"}`}
                  onClick={() => setFeedType("userMedia")}
                  onTouchStart={() => handleTouchStart("userMedia")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  Media
                  {feedType === "userMedia" && (
                    <div className="absolute bottom-0 h-1 w-10 rounded-full bg-primary" />
                  )}
                </div>
                <div
                  className={`relative flex flex-1 cursor-pointer justify-center p-3 transition duration-150 ${!isTouchDevice ? "hover:bg-secondary" : ""} ${
                    isTouchDevice && activeButtonId === "likes" ? "bg-secondary bg-opacity-50" : ""
                  } ${feedType === "likes" ? "font-bold" : "opacity-50"}`}
                  onClick={() => setFeedType("likes")}
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
            )}

            {/* Private likes notice — only makes sense when content is unlocked */}
            {!isPrivateAndNotFollowing &&
              isMyProfile &&
              feedType === "likes" &&
              authUser?.isLikedFeedPrivate && (
                <div className="m-1 flex flex-col items-start rounded-lg bg-[#02113D] px-4 py-2.5">
                  <p className="flex items-center gap-3 text-[15px]">
                    <RiLockFill />
                    Your likes are private. Only you can see them.
                  </p>
                </div>
              )}
          </>
        )}
        {showFullProfileContent && userProfile && !isBlockedByYou && !isPrivateAndNotFollowing && (
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
      {isMyProfile && (
        <EditProfileModal
          authUser={authUser}
          isOpen={openEditModal}
          onClose={handleCloseEditModal}
          profileImg={profileImg}
          setProfileImg={setProfileImg}
          coverImg={coverImg}
          setCoverImg={setCoverImg}
        />
      )}
    </>
  )
}
export default ProfilePage
