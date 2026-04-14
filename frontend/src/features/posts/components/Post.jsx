import { FaHeart, FaPen, FaRegComment, FaReply } from "react-icons/fa6"
import { FaRetweet } from "react-icons/fa6"
import { FaRegHeart } from "react-icons/fa6"
import { FaTrashCan } from "react-icons/fa6"

import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import LoadingSpinner from "../../../components/common/LoadingSpinner.jsx"
import { formatPostDate } from "../../../utils/date/index.js"
import { useAuthUser } from "../../auth/authHooks/useAuthUser.js"
import { renderClickableText } from "../../../utils/textUtils.jsx"
import React, { useEffect, useState, useRef } from "react"
import { FaBookmark, FaRegBookmark } from "react-icons/fa6"
import PollDisplay from "../../../components/common/PollDisplay.jsx"
import { BsPin, BsPinFill, BsThreeDots } from "react-icons/bs"
import { MdBlock } from "react-icons/md"
import { useAppStore } from "../../../store/useAppStore.js"
import useDropdownMenu from "../../../hooks/customHooks/useDropdownMenu.js"
import { useTouchHoverEffect } from "../../../hooks/customHooks/useTouchHoverEffect.js"
import AnimatedCount from "../../../components/common/AnimatedCount.jsx"

import { TbUserMinus, TbUserPlus } from "react-icons/tb"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile.js"
import { getDisplayUsername, truncateText } from "../../../utils/truncateText.js"
import { useProfileCardHover } from "../../../hooks/customHooks/useProfileCardHover.js"
import ProfileInfoModal from "../../../components/common/ProfileInfoModal.jsx"
import PostModal from "./PostModal.jsx"
import EditHistoryModal from "./EditHistoryModal.jsx"
import { FaHistory } from "react-icons/fa"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils.js"
import ConfirmationModal from "../../../components/common/ConfirmationModal.jsx"
import { useQueryClient } from "@tanstack/react-query"
import { postKeys } from "../postsHooks/postKeys.js"
import { getPostThreadApi } from "../../../api/postsApi.js"
import { useBlockUnblockUser, useFollow } from "../../users/usersHooks/useUserMutations.js"
import { useGetPostHistory, useGetPostThread } from "../postsHooks/usePostsQueries.js"
import {
  useDeletePosts,
  useLikePost,
  usePinPost,
  useRepostPost,
  useToggleBookmarks,
} from "../postsHooks/usePostsMutations.js"
import { useLightboxStore } from "../../../store/useLightboxStore.js"

const Post = ({
  post,
  profilePinnedPosts = [],
  currentProfileUsername,
  hasLineBelow = false,
  hasLineAbove = false,
  index,
}) => {
  // const openImageModal = useAppStore((state) => state.openImageModal)
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { username, pid } = useParams()
  const [isAnimatingRepost, setIsAnimatingRepost] = useState(false)
  const [isAnimatingLike, setIsAnimatingLike] = useState(false)
  const [isAnimatingPin, setIsAnimatingPin] = useState(false)
  const [isAnimatingBookmark, setIsAnimatingBookmark] = useState(false)
  const [isAnimatingComment, setIsAnimatingComment] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [showDeletePostModal, setShowDeletePostModal] = useState(false)

  const openLightbox = useLightboxStore((s) => s.openLightbox)

  const { setEditPostModalData } = useAppStore()
  const queryClient = useQueryClient()

  const { pathname } = useLocation()

  const isMobile = useIsMobile()

  const isDraggingRef = useRef(0)
  const initialClientY = useRef(0)
  const initialClientX = useRef(0)

  const { toggleMenu, showMenu, setShowMenu, menuRef } = useDropdownMenu()
  const { ancestors, isLoading: isLoadingThread } = useGetPostThread(post._id)

  const {
    modalState,
    userProfile,
    isUserLoading,
    handleMouseEnter,
    handleMouseLeave,
    handleModalEnter,
    handleModalLeave,
    cleanup,
  } = useProfileCardHover()

  const isRepost = !!post.repostedFrom
  const sourcePost = post.repostedFrom || post

  const prevLikesCount = useRef(sourcePost.likes?.length)
  const prevRepostsCount = useRef(sourcePost.repostsCount)

  const originalPostOwner = sourcePost?.user
  const repostingUser = isRepost ? post.user : null
  const isLiked = sourcePost?.likes?.includes(authUser?._id)

  const isBookmarked = sourcePost?.bookmarkedBy?.includes(authUser?._id)
  const repostedByCurrentUser = sourcePost?.repostedBy?.includes(authUser?._id)
  const hasAuthUserPinnedOriginal = authUser?.pinnedPosts?.includes(sourcePost._id)

  const isPinnedForUI =
    sourcePost?.isPinned !== undefined ? sourcePost.isPinned : hasAuthUserPinnedOriginal

  const isPinnedOnThisProfile = profilePinnedPosts.some(
    (pinnedPost) => pinnedPost._id === sourcePost._id,
  )

  const isMyOriginalPost = authUser && originalPostOwner && authUser._id === originalPostOwner._id
  const hasEditHistory = sourcePost.editHistory && sourcePost.editHistory.length > 0

  const { toggleBookmark, isBookmarking } = useToggleBookmarks(currentProfileUsername)

  const { repostPost, isReposting } = useRepostPost(username)
  const { likePost, isLiking } = useLikePost(username)
  const { deletePost, isDeleting } = useDeletePosts()
  const { pinUnpinPost, isPinning } = usePinPost()

  const { follow, isPending: isFollowingOrUnfollowing } = useFollow()
  const { blockUnblockUser, isBlocking } = useBlockUnblockUser()

  const displayTimestamp = sourcePost.publishedAt ? sourcePost.publishedAt : sourcePost.createdAt

  const formattedDate = formatPostDate(displayTimestamp)
  const isMainPost = pid === sourcePost._id

  const { history, isLoadingHistory } = useGetPostHistory(isHistoryModalOpen ? post._id : null)

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const handlePrefetch = () => {
    queryClient.prefetchQuery({
      queryKey: postKeys.thread(post._id),
      queryFn: () => getPostThreadApi(post._id),
      staleTime: 5 * 60 * 1000,
    })
  }

  const navigateToPostPage = (e) => {
    if (isHistoryModalOpen || showEditModal) {
      e.stopPropagation()
      return
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false
      return
    }

    const currentPagePostId = pathname.split("/post/")[1]
    if (currentPagePostId && currentPagePostId === sourcePost._id?.toString()) {
      return
    }

    if (
      e.target.closest("a") ||
      e.target.closest("button") ||
      e.target.closest("img") ||
      e.target.closest("video") ||
      e.target.closest(".menu-popover") ||
      e.target.closest(".profile-modal") ||
      e.target.closest(".history-button")
    ) {
      return
    }

    navigate(
      `/${sourcePost.isAnonymous ? "Anonymous" : originalPostOwner.username}/post/${sourcePost._id}`,
    )
  }

  const handleEditClick = () => {
    setEditPostModalData(sourcePost)
  }

  const handleMouseDown = (e) => {
    initialClientX.current = e.clientX
    initialClientY.current = e.clientY
    isDraggingRef.current = false
  }

  const handleMouseMove = (e) => {
    const deltaX = Math.abs(e.clientX - initialClientX.current)
    const deltaY = Math.abs(e.clientY - initialClientY.current)
    if (deltaX > 5 || deltaY > 5) {
      isDraggingRef.current = true
    }
  }

  const handleMouseUp = () => {}

  const handleInteractiveClick = (e) => {
    e.stopPropagation()
  }

  const handleBookmarkPost = (e) => {
    handleInteractiveClick(e)
    setIsAnimatingBookmark(true)

    if (!authUser?._id || isBookmarking) return
    toggleBookmark(sourcePost._id)
  }

  const handleCloseDeletePostModal = () => {
    setShowDeletePostModal(false)
  }

  const handleConfirmDeletePost = (e) => {
    handleInteractiveClick(e)
    deletePost(sourcePost?._id)
    setShowMenu(false)
    setShowDeletePostModal(false)
  }

  useEffect(() => {
    const currentLikes = sourcePost.likes?.length || 0
    if (prevLikesCount.current !== currentLikes) {
      setIsAnimatingLike(true)
      const timer = setTimeout(() => setIsAnimatingLike(false), 400)

      prevLikesCount.current = currentLikes

      return () => clearTimeout(timer)
    }
  }, [sourcePost.likes?.length])

  useEffect(() => {
    const currentReposts = sourcePost.repostsCount || 0
    if (prevRepostsCount.current !== currentReposts) {
      setIsAnimatingRepost(true)
      const timer = setTimeout(() => setIsAnimatingRepost(false), 400)

      prevRepostsCount.current = currentReposts

      return () => clearTimeout(timer)
    }
  }, [sourcePost.repostsCount])

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e)

    if (isLiking) return
    likePost(sourcePost._id)
  }

  const handleRepostClick = (e) => {
    handleInteractiveClick(e)
    if (isReposting) return

    repostPost(sourcePost._id)
  }

  const handleCommentClick = (e) => {
    handleInteractiveClick(e)
    setIsAnimatingComment(true)

    if (pathname.includes("/post/")) {
      return
    }
    navigate(`/${originalPostOwner.username}/post/${sourcePost._id}`)
  }

  const handlePinPost = (e) => {
    e.stopPropagation()
    setIsAnimatingPin(true)

    if (!authUser?.username || isPinning) return

    const action = isPinnedForUI ? "unpin" : "pin"
    pinUnpinPost({
      postId: sourcePost._id,
      action: action,
      post: sourcePost,
    })
  }

  const handleMediaClick = (mediaUrl, mediaType, event) => {
    event.stopPropagation()
    // if (openImageModal && mediaType === "image") {
    //   openImageModal(mediaUrl)
    // }
  }

  const handleFollowClick = (e) => {
    e.stopPropagation()
    if (!authUser || isFollowingOrUnfollowing) return
    follow(originalPostOwner._id)
    setShowMenu(false)
  }

  const handleBlockClick = (e) => {
    e.stopPropagation()
    if (!authUser || isBlocking) return
    blockUnblockUser(originalPostOwner._id)
    setShowMenu(false)
  }

  const navigateToReposterProfile = (e) => {
    e.stopPropagation()
    if (repostingUser) {
      navigate(`/profile/${repostingUser.username}`)
    }
  }

  const handleImageClick = (imageUrl) => {
    navigate("/image-view", { state: { src: imageUrl } })
  }

  useEffect(() => {
    let timerLike, timerPin, timerBookmark, timerRepost

    if (isAnimatingRepost) {
      timerRepost = setTimeout(() => {
        setIsAnimatingRepost(false)
      }, 400)
    }

    if (isAnimatingLike) {
      timerLike = setTimeout(() => {
        setIsAnimatingLike(false)
      }, 400)
    }
    if (isAnimatingPin) {
      timerPin = setTimeout(() => {
        setIsAnimatingPin(false)
      }, 200)
    }
    if (isAnimatingBookmark) {
      timerBookmark = setTimeout(() => {
        setIsAnimatingBookmark(false)
      }, 200)
    }

    return () => {
      clearTimeout(timerLike)
      clearTimeout(timerPin)
      clearTimeout(timerBookmark)
    }
  }, [isAnimatingLike, isAnimatingPin, isAnimatingBookmark, isAnimatingRepost])

  if (!sourcePost || !originalPostOwner) {
    console.warn("Post or originalPostOwner not fully populated:", post)
    return null
  }

  const isFollowingOriginalPostOwner = authUser?.following?.includes(originalPostOwner._id)
  const isBlockedByAuthUser = authUser?.blockedUsers?.includes(originalPostOwner._id)

  return (
    <div
      className={`min-w-0 ${
        showMenu ? "bg-base-100" : "hover:bg-gray-700/30"
      } flex cursor-pointer flex-col gap-0 px-4 transition duration-500 ${
        index === 0 && "pt-3"
      } ${hasLineAbove ? "" : "pt-3"} ${hasLineBelow ? "" : "border-b border-accent pb-2"}`}
      // We add a dynamic z-index so the active post sits on top of others
      style={{ zIndex: showMenu ? 50 : 1 }}
      onClick={isMainPost ? undefined : navigateToPostPage}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {hasLineAbove && index > 0 && (
        <div className="ml-[20px] flex h-3 w-0.5 items-center bg-gray-600/50" />
      )}

      {!isMainPost && isRepost && repostingUser && (
        <div
          className="ml-6 flex items-center gap-1 text-sm font-semibold text-slate-500"
          data-profile-trigger="true"
          onMouseEnter={(e) => handleMouseEnter(repostingUser, e)}
          onMouseLeave={handleMouseLeave}
        >
          <FaRetweet className="inline-block text-lg" size={16} />
          <span className="cursor-pointer hover:underline" onClick={navigateToReposterProfile}>
            {repostingUser.username.length > 15
              ? repostingUser.username.slice(0, 15) + "..."
              : repostingUser.username}{" "}
            reposted
          </span>
        </div>
      )}

      {isPinnedOnThisProfile && (
        <div className="ml-6 flex items-center gap-1 text-sm font-semibold text-slate-500">
          <BsPinFill className="inline-block text-lg" size={15} />
          <span className="cursor-pointer">Pinned</span>
        </div>
      )}

      {post.parentPost && !pathname.includes("/post/") && (
        <div
          className="ml-6 flex items-center gap-1 text-sm font-semibold text-slate-500"
          data-profile-trigger="true"
          onMouseEnter={(e) => handleMouseEnter(repostingUser, e)}
          onMouseLeave={handleMouseLeave}
        >
          <FaReply className="inline-block text-lg" size={14} />
          <span className="min-w-0 truncate">Replying to @{post.parentPost?.user?.username}</span>
        </div>
      )}

      <div className="relative flex min-w-0 cursor-pointer gap-2">
        <div
          className={`flex w-10 flex-shrink-0 flex-col items-center ${index === 0 && "mt-1"} mt-1`}
        >
          {post.isAnonymous ? (
            <div className="size-10 flex-shrink-0 overflow-hidden rounded-full">
              <img
                src={"/avatar-placeholder.png"}
                alt={`${originalPostOwner.username}'s profile`}
                loading="lazy"
              />
            </div>
          ) : (
            <Link
              to={`/profile/${originalPostOwner.username}`}
              className="size-10 flex-shrink-0 overflow-hidden rounded-full hover:opacity-80"
              onClick={(e) => handleInteractiveClick(e)}
              onMouseEnter={(e) => handleMouseEnter(originalPostOwner, e)}
              onMouseLeave={handleMouseLeave}
            >
              <img
                src={getOptimizedImageUrl(originalPostOwner?.profileImg?.imageUrl, "avatar")}
                alt={`${originalPostOwner.username}'s profile`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </Link>
          )}
          {hasLineBelow && <div className="mt-1 h-full w-0.5 bg-gray-600/50" />}
        </div>

        <div className={`relative flex min-w-0 flex-1 flex-col`}>
          <div className="flex items-center gap-1">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {post.isAnonymous ? (
                <div
                  className="flex min-w-0 items-center gap-1 overflow-hidden"
                  onClick={handleInteractiveClick}
                >
                  {/* Added shrink-0 to preserve "Anonymous" */}
                  <span className="shrink-0 font-bold">Anonymous</span>
                </div>
              ) : (
                <Link
                  to={`/profile/${originalPostOwner.username}`}
                  className="flex min-w-0 items-center gap-1 font-bold"
                  onClick={handleInteractiveClick}
                  data-profile-trigger="true"
                  onMouseEnter={(e) => handleMouseEnter(originalPostOwner, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* CHANGED: Added flex-shrink-0 so the Full Name never truncates first */}
                  <span className="flex-shrink-0 hover:underline">
                    {originalPostOwner.fullName}
                  </span>

                  <span className="flex shrink-0 items-center">
                    {originalPostOwner.isVerified && (
                      <img
                        src="/verified2.png"
                        className="size-[17px]"
                        alt="Verified"
                        loading="lazy"
                      />
                    )}
                    {originalPostOwner.isGoldVerified && (
                      <img
                        src="/gold-verified2.png"
                        className="size-[17px]"
                        alt="Gold Verified"
                        loading="lazy"
                      />
                    )}
                    {originalPostOwner.isCha && (
                      <img src="/cha.png" className="size-[15px] rounded-md" loading="lazy" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-shrink items-center gap-1 text-sm font-normal text-slate-500">
                    {post.isAnonymous ? (
                      <span className="truncate">@Anonymous</span>
                    ) : (
                      <Link
                        to={`/profile/${originalPostOwner.username}`}
                        className="min-w-0 truncate hover:underline"
                        onClick={handleInteractiveClick}
                        data-profile-trigger="true"
                        onMouseEnter={(e) => handleMouseEnter(originalPostOwner, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        @{originalPostOwner.username}
                      </Link>
                    )}
                    {pathname.includes("/post/") && post._id === pid ? null : (
                      <>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0">{formattedDate}</span>
                      </>
                    )}
                  </span>
                </Link>
              )}

              {/* CHANGED: This span handles the truncation for username and date */}
            </div>

            <span
              className="group relative ml-auto mr-0.5 flex rounded-full p-2 transition duration-200 hover:bg-primary/20"
              onClick={toggleMenu}
            >
              <div className="group relative rounded-full transition duration-200 hover:text-primary">
                <BsThreeDots className="cursor-pointer text-slate-500 group-hover:text-primary" />
              </div>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                    }}
                  />

                  <div
                    style={{
                      animation: "fadeInSlideDown 0.2s ease-out forwards",
                    }}
                    ref={menuRef}
                    className="white-shadow menu-popover absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-xl bg-base-100 py-2 text-lg shadow-md shadow-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isMyOriginalPost ? (
                      <>
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
                          onClick={(e) => {
                            handleInteractiveClick(e)
                            setShowEditModal(true)
                            setShowMenu(false)
                          }}
                        >
                          <FaPen /> Edit
                        </button>

                        {hasEditHistory && (
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsHistoryModalOpen(true)
                              setShowMenu(false)
                            }}
                          >
                            <FaHistory className="inline-block" /> View History
                          </button>
                        )}

                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeletePostModal(true)
                            setShowMenu(false)
                          }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <LoadingSpinner size="xs" /> : <FaTrashCan />}
                          Delete Post
                        </button>
                      </>
                    ) : (
                      <>
                        {!sourcePost.isAnonymous && (
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-white transition duration-200 hover:bg-gray-700/30"
                            onClick={handleFollowClick}
                            disabled={isFollowingOrUnfollowing}
                          >
                            {isFollowingOriginalPostOwner ? (
                              <span className="flex items-center justify-center gap-3 font-semibold">
                                <TbUserMinus strokeWidth={2} className="shrink-0" />
                                <span className="truncate"> Unfollow </span>
                              </span>
                            ) : (
                              <span className="flex w-full min-w-0 items-center gap-3 font-semibold">
                                <TbUserPlus strokeWidth={2} className="shrink-0" />{" "}
                                <span className="truncate">
                                  Follow @{originalPostOwner.username}
                                </span>
                              </span>
                            )}
                          </button>
                        )}

                        {hasEditHistory && (
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsHistoryModalOpen(true)
                              setShowMenu(false)
                            }}
                          >
                            <FaHistory className="inline-block" /> View History
                          </button>
                        )}

                        {!sourcePost.isAnonymous && (
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-500 transition duration-200 hover:bg-gray-700/30"
                            onClick={handleBlockClick}
                            disabled={isBlocking}
                          >
                            {isBlockedByAuthUser ? (
                              <span className="flex w-full min-w-0 items-center gap-3 font-semibold">
                                {" "}
                                <CgUnblock className="shrink-0" />{" "}
                                <span className="truncate">
                                  Unblock @{originalPostOwner.username}
                                </span>
                              </span>
                            ) : (
                              <span className="flex w-full min-w-0 items-center gap-3 font-semibold">
                                {" "}
                                <MdBlock className="shrink-0 text-red-500" />{" "}
                                <span className="truncate text-red-500">
                                  Block @{originalPostOwner.username}
                                </span>
                              </span>
                            )}
                          </button>
                        )}

                        {authUser?.isAdmin && (
                          <button
                            className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeletePostModal(true)
                              setShowMenu(false)
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <LoadingSpinner size="xs" /> : <FaTrashCan />}
                            Delete Post
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </span>
          </div>

          <div className="flex cursor-pointer flex-col gap-3 overflow-hidden">
            <span className="word-break-anywhere min-w-0 whitespace-pre-wrap">
              {renderClickableText(sourcePost.text)}
            </span>
            {sourcePost.mediaType === "image" &&
              sourcePost?.image?.imageUrl &&
              sourcePost.image?._id && (
                <div className="inline-flex max-w-full justify-center">
                  {/* <Link to={`/images/${sourcePost.image?._id}`}> */}
                  <img
                    src={getOptimizedImageUrl(sourcePost.image.imageUrl, "post")}
                    onClick={() => openLightbox({ imageUrl: sourcePost.image.imageUrl })}
                    className="block h-auto max-h-80 rounded-2xl border border-accent object-contain"
                    alt="post image"
                    loading="lazy"
                  />
                  {/* </Link> */}
                </div>
              )}
            {sourcePost.mediaType === "video" && sourcePost.video && (
              <video
                controls
                loading="lazy"
                src={sourcePost.video}
                className="block h-auto max-h-80 w-full max-w-full rounded-2xl border border-accent object-contain"
                alt="post video"
                preload="metadata"
                onClick={(e) => handleMediaClick(sourcePost.video, "video", e)}
              >
                Your browser does not support the video tag.
              </video>
            )}
            {post.pollOptions && post.pollOptions.length > 0 && <PollDisplay post={post} />}
          </div>

          <div className={`mt-3 w-2/3 ${hasLineBelow && "pb-2 pt-3"}`}>
            <div className="flex justify-between">
              <div
                className="group flex cursor-pointer items-center"
                onClick={handleCommentClick}
                onTouchStart={() => handleTouchStart("comment")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <div
                  className={`group rounded-full p-2 transition duration-200 ${
                    !isTouchDevice ? "group-hover:bg-sky-400 group-hover:bg-opacity-15" : ""
                  } ${
                    isTouchDevice && activeButtonId === "comment" ? "bg-sky-400 bg-opacity-15" : ""
                  }`}
                >
                  <FaRegComment
                    className={`h-4 w-4 text-slate-500 transition duration-200 group-hover:text-sky-400 ${
                      isAnimatingComment ? "animate-bookmark-pop" : ""
                    }`}
                    strokeWidth={10}
                  />
                </div>
                <span
                  className={`text-sm text-slate-500 transition duration-200 group-hover:text-sky-400`}
                >
                  {sourcePost.repliesCount || 0}
                </span>
              </div>

              <div
                className="group flex cursor-pointer items-center"
                onClick={handleRepostClick}
                onTouchStart={() => handleTouchStart("repost")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <div
                  className={`duration-2000 rounded-full p-2 transition ${
                    !isTouchDevice ? "group-hover:bg-emerald-600 group-hover:bg-opacity-15" : ""
                  } ${
                    isTouchDevice && activeButtonId === "repost"
                      ? "bg-emerald-600 bg-opacity-15"
                      : ""
                  }`}
                >
                  <FaRetweet
                    className={`size-[18px] transition duration-200 ${
                      repostedByCurrentUser
                        ? "text-emerald-500"
                        : "text-slate-500 group-hover:text-emerald-500"
                    } ${isAnimatingRepost ? "animate-repost-spin" : ""}`}
                  />
                </div>
                <AnimatedCount
                  count={sourcePost.repostsCount || 0}
                  className={`absolute text-sm transition duration-200 ${
                    repostedByCurrentUser
                      ? "text-emerald-500"
                      : "text-slate-500 group-hover:text-emerald-500"
                  }`}
                />
              </div>

              <div
                className="group flex cursor-pointer items-center rounded-full"
                onClick={handleLikePostClick}
                onTouchStart={() => handleTouchStart("like")}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
              >
                <div
                  className={`relative rounded-full p-2 transition duration-200 ${
                    !isTouchDevice ? "group-hover:bg-pink-600 group-hover:bg-opacity-15" : ""
                  } ${
                    isTouchDevice && activeButtonId === "like" ? "bg-pink-600 bg-opacity-15" : ""
                  } cursor-pointer`}
                >
                  {!isLiked && (
                    <FaRegHeart
                      className={`h-4 w-4 text-slate-500 transition duration-200 group-hover:text-pink-600 ${
                        isAnimatingLike && !isLiked ? "animate-like-bounce" : ""
                      } `}
                    />
                  )}
                  {isLiked && (
                    <FaHeart
                      strokeWidth={10}
                      className={`h-4 w-4 text-pink-600 transition duration-200 ${
                        isAnimatingLike && isLiked ? "animate-like-bounce" : ""
                      } `}
                    />
                  )}
                </div>
                <AnimatedCount
                  count={sourcePost.likes?.length || 0}
                  className={`absolute text-sm transition duration-200 group-hover:text-pink-600 ${
                    isLiked ? "text-pink-600" : "text-slate-500"
                  }`}
                />
              </div>

              {!post.isVent && (
                <div className="absolute right-0.5 flex">
                  {isMyOriginalPost && (
                    <div
                      className={`group right-0.5 flex cursor-pointer items-center gap-1 rounded-full p-2 transition duration-200 ${
                        !isTouchDevice ? "hover:bg-primary hover:bg-opacity-15" : ""
                      } ${
                        isTouchDevice && activeButtonId === "pin" ? "bg-primary bg-opacity-15" : ""
                      } `}
                      onClick={handlePinPost}
                      onTouchStart={() => handleTouchStart("pin")}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchCancel}
                    >
                      {isPinnedOnThisProfile || isPinnedForUI ? (
                        <BsPinFill
                          className={`size-4.5 text-primary ${
                            isAnimatingPin ? "animate-pin-down" : ""
                          }`}
                          strokeWidth={0.5}
                        />
                      ) : (
                        <BsPin
                          strokeWidth={0.5}
                          className={`size-4.5 text-slate-500 transition duration-200 group-hover:text-primary ${
                            isAnimatingPin ? "animate-pin-down" : ""
                          }`}
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={`group right-0.5 flex cursor-pointer items-center rounded-full p-2 transition duration-200 ${
                      !isTouchDevice ? "hover:bg-primary hover:bg-opacity-15" : ""
                    } ${
                      isTouchDevice && activeButtonId === "bookmark"
                        ? "bg-primary bg-opacity-15"
                        : ""
                    } `}
                    onClick={handleBookmarkPost}
                    onTouchStart={() => handleTouchStart("bookmark")}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchCancel}
                  >
                    {isBookmarked ? (
                      <FaBookmark
                        className={`size-4 text-primary ${
                          isAnimatingBookmark ? "animate-bookmark-pop" : ""
                        }`}
                      />
                    ) : (
                      <FaRegBookmark
                        className={`size-4 text-slate-500 transition duration-200 group-hover:text-primary ${
                          isAnimatingBookmark ? "animate-bookmark-pop" : ""
                        }`}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals section */}
      {modalState.isOpen && (
        <div
          onMouseEnter={handleModalEnter}
          onMouseLeave={handleModalLeave}
          className="z-[1000]" // Ensure this is high
        >
          {isUserLoading ? (
            <div
              className="fixed z-[1000] flex h-48 w-72 items-center justify-center rounded-xl border border-accent bg-base-200 shadow-lg"
              style={{
                top: modalState.position.top,
                left: modalState.position.left,
              }}
            >
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <ProfileInfoModal user={userProfile} position={modalState.position} />
          )}
        </div>
      )}

      {isHistoryModalOpen && (
        <EditHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          history={history}
        />
      )}

      {showEditModal && (
        <PostModal
          mode="edit"
          editPost={sourcePost}
          title="Edit Your Post"
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeletePostModal && (
        <ConfirmationModal
          isOpen={showDeletePostModal}
          modalTitle="Delete post?"
          message={`This can’t be undone and it will be removed from your profile and from the timeline of any accounts that follow you `}
          confirmButtonText="Delete"
          onConfirm={handleConfirmDeletePost}
          onClose={handleCloseDeletePostModal}
          danger={true}
        />
      )}
    </div>
  )
}

export default React.memo(Post)
