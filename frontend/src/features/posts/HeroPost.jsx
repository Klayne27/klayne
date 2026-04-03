import { FaHeart, FaLink, FaPen, FaRegComment, FaWrench } from "react-icons/fa6"
import { FaRetweet, FaRegHeart, FaTrashCan, FaBookmark, FaRegBookmark } from "react-icons/fa6"
import { Link, useNavigate, useParams } from "react-router-dom"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { renderClickableText } from "../../utils/textUtils"
import { useEffect, useState, useRef, forwardRef } from "react"
import PollDisplay from "../../components/common/PollDisplay"
import { BsThreeDots } from "react-icons/bs"
import { MdBlock } from "react-icons/md"
import useDropdownMenu from "../../hooks/customHooks/useDropdownMenu"
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect"
import AnimatedCount from "../../components/common/AnimatedCount"
import { TbUserMinus, TbUserPlus } from "react-icons/tb"
import { useProfileCardHover } from "../../hooks/customHooks/useProfileCardHover.js"
import ProfileInfoModal from "../../components/common/ProfileInfoModal.jsx"
import PostModal from "./PostModal.jsx"
import EditHistoryModal from "./EditHistoryModal.jsx"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils.js"
import { FaHistory } from "react-icons/fa"
import ConfirmationModal from "../../components/common/ConfirmationModal.jsx"
import { getDisplayUsername } from "../../utils/truncateText.js"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile.js"
import { useBlockUnblockUser, useFollow } from "../users/usersHooks/useUserMutations.js"
import { useGetPostHistory } from "./postsHooks/usePostsQueries.js"
import { useDeletePosts, useLikePost, useRepostPost, useToggleBookmarks } from "./postsHooks/usePostsMutations.js"

const HeroPost = forwardRef(({ post, hasLineAbove = false }, ref) => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { username } = useParams()

  const [isAnimatingRepost, setIsAnimatingRepost] = useState(false)
  const [isAnimatingLike, setIsAnimatingLike] = useState(false)
  const [isAnimatingBookmark, setIsAnimatingBookmark] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showDeletePostModal, setShowDeletePostModal] = useState(false)

  const { toggleMenu, showMenu, setShowMenu, menuRef } = useDropdownMenu()
  const {
    modalState,
    userProfile,
    isUserLoading,
    handleMouseEnter,
    handleMouseLeave,
    handleModalEnter,
    handleModalLeave,
  } = useProfileCardHover()

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const isMobile = useIsMobile()

  const isRepost = !!post.repostedFrom
  const sourcePost = post.repostedFrom || post
  const originalPostOwner = sourcePost?.user
  const repostingUser = isRepost ? post.user : null

  const isLiked = sourcePost?.likes?.includes(authUser?._id)
  const isBookmarked = sourcePost?.bookmarkedBy?.includes(authUser?._id)
  const repostedByCurrentUser = sourcePost?.repostedBy?.includes(authUser?._id)
  const isMyOriginalPost = authUser && originalPostOwner && authUser._id === originalPostOwner._id
  const hasEditHistory = sourcePost.editHistory && sourcePost.editHistory.length > 0
  const isFollowingOriginalPostOwner = authUser?.following?.includes(originalPostOwner._id)
  const isBlockedByAuthUser = authUser?.blockedUsers?.includes(originalPostOwner._id)

  const prevLikesCount = useRef(sourcePost.likes?.length)
  const prevRepostsCount = useRef(sourcePost.repostsCount)

  const { toggleBookmark, isBookmarking } = useToggleBookmarks()
  const { repostPost, isReposting } = useRepostPost(username)
  const { likePost, isLiking } = useLikePost(username)
  const { deletePost, isDeleting } = useDeletePosts()
  const { follow, isPending: isFollowingOrUnfollowing } = useFollow()
  const { blockUnblockUser, isBlocking } = useBlockUnblockUser()

  const { history } = useGetPostHistory(isHistoryModalOpen ? post._id : null)

  // Full timestamp for the hero post — "3:45 PM · Jun 12, 2025"
  const displayTimestamp = sourcePost.publishedAt ?? sourcePost.createdAt
  const fullDate = new Date(displayTimestamp).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  useEffect(() => {
    const currentLikes = sourcePost.likes?.length || 0
    if (prevLikesCount.current !== currentLikes) {
      setIsAnimatingLike(true)
      const t = setTimeout(() => setIsAnimatingLike(false), 400)
      prevLikesCount.current = currentLikes
      return () => clearTimeout(t)
    }
  }, [sourcePost.likes?.length])

  useEffect(() => {
    const currentReposts = sourcePost.repostsCount || 0
    if (prevRepostsCount.current !== currentReposts) {
      setIsAnimatingRepost(true)
      const t = setTimeout(() => setIsAnimatingRepost(false), 400)
      prevRepostsCount.current = currentReposts
      return () => clearTimeout(t)
    }
  }, [sourcePost.repostsCount])

  const stopProp = (e) => e.stopPropagation()

  const handleCopyLink = (e) => {
    stopProp(e)
    const postUrl = `${window.location.origin}/${sourcePost.isAnonymous ? "Anonymous" : originalPostOwner.username}/post/${sourcePost._id}`

    navigator.clipboard.writeText(postUrl).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      // Optional: toast.success("Link copied to clipboard!");
    })
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

  const handleCloseDeletePostModal = () => {
    setShowDeletePostModal(false)
  }

  const handleConfirmDeletePost = (e) => {
    e.stopPropagation()
    deletePost(sourcePost?._id)
    setShowMenu(false)
    setShowDeletePostModal(false)
  }

  if (!sourcePost || !originalPostOwner) return null

  return (
    <div ref={ref} className={`border-b border-accent px-4 ${hasLineAbove ? "" : "py-3"}`}>
      {/* ── Repost banner ── */}
      {isRepost && repostingUser && (
        <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-500">
          <FaRetweet size={16} />
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate(`/profile/${repostingUser.username}`)}
          >
            {repostingUser.username.length > 15
              ? repostingUser.username.slice(0, 15) + "..."
              : repostingUser.username}{" "}
            reposted
          </span>
        </div>
      )}

      {/* ── Author row: larger avatar + stacked name/username ── */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center self-stretch">
          {hasLineAbove && <div className="mb-1 h-3 w-0.5 bg-gray-600/50" />}

          {post.isAnonymous ? (
            <div className="size-10 flex-shrink-0 overflow-hidden rounded-full">
              {" "}
              <img
                src={"/avatar-placeholder.png"}
                alt={`${originalPostOwner.username}'s profile`}
                loading="lazy"
              />
            </div>
          ) : (
            <Link
              to={`/profile/${originalPostOwner.username}`}
              className="mt-1 size-10 flex-shrink-0 overflow-hidden rounded-full hover:opacity-80"
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
        </div>
        <div className={`flex min-w-0 flex-1 flex-col ${hasLineAbove && "mt-3"}`}>
          {post.isAnonymous ? (
            <div className="flex items-center gap-1 truncate font-bold">
              {post.isAnonymous ? "Anonymous" : originalPostOwner.fullName}

              {post.isAnonymous && originalPostOwner ? (
                <span></span>
              ) : (
                <span className="flex items-center">
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
                      alt="Verified"
                      loading="lazy"
                    />
                  )}
                </span>
              )}
            </div>
          ) : (
            <Link
              to={`/profile/${originalPostOwner.username}`}
              className="flex items-center gap-1 font-bold hover:underline"
              onMouseEnter={(e) => handleMouseEnter(originalPostOwner, e)}
              onMouseLeave={handleMouseLeave}
            >
              {originalPostOwner.fullName}
              <span className="flex items-center">
                {originalPostOwner.isVerified && (
                  <img src="/verified2.png" className="size-[17px]" alt="Verified" loading="lazy" />
                )}
                {originalPostOwner.isGoldVerified && (
                  <img
                    src="/gold-verified2.png"
                    className="size-[17px]"
                    alt="Gold Verified"
                    loading="lazy"
                  />
                )}
              </span>
            </Link>
          )}

          <span className="flex min-w-0 gap-1 text-sm text-slate-500">
            {post.isAnonymous ? (
              <span>@{getDisplayUsername("Anonymous", isMobile)}</span>
            ) : (
              <Link
                to={`/profile/${originalPostOwner.username}`}
                className="text-sm text-slate-500 hover:underline"
              >
                @{originalPostOwner.username}
              </Link>
            )}
          </span>
        </div>

        {/* ── Three-dot menu ── */}
        <span
          className="group relative ml-auto flex flex-shrink-0 cursor-pointer rounded-full p-2 transition duration-200 hover:bg-primary/20"
          onClick={toggleMenu}
        >
          <BsThreeDots className="cursor-pointer text-slate-500 group-hover:text-primary" />
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10 cursor-default bg-transparent"
                onClick={toggleMenu}
              />
              <div
                ref={menuRef}
                className="white-shadow menu-popover absolute right-0 top-0 z-10 w-max rounded-xl bg-base-100 py-2 text-lg shadow-md shadow-primary"
                onClick={(e) => e.stopPropagation()}
              >
                {isMyOriginalPost ? (
                  <>
                    <button
                      className="z-50 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
                      onClick={(e) => {
                        stopProp(e)
                        setShowEditModal(true)
                        setShowMenu(false)
                      }}
                    >
                      <FaPen /> Edit
                    </button>
                    {hasEditHistory && (
                      <button
                        className="z-50 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsHistoryModalOpen(true)
                          setShowMenu(false)
                        }}
                      >
                        <FaHistory /> View History
                      </button>
                    )}
                    <button
                      className="z-50 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
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
                          <span className="flex items-center gap-3 font-semibold">
                            <TbUserMinus strokeWidth={2} /> Unfollow
                          </span>
                        ) : (
                          <span className="flex items-center gap-3 font-semibold">
                            <TbUserPlus strokeWidth={2} /> Follow @{originalPostOwner.username}
                          </span>
                        )}
                      </button>
                    )}
                    {hasEditHistory && (
                      <button
                        className="z-50 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-white transition duration-200 hover:bg-gray-700/30"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsHistoryModalOpen(true)
                          setShowMenu(false)
                        }}
                      >
                        <FaHistory /> View History
                      </button>
                    )}
                    {!sourcePost.isAnonymous && (
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-500 transition duration-200 hover:bg-gray-700/30"
                        onClick={handleBlockClick}
                        disabled={isBlocking}
                      >
                        {isBlockedByAuthUser ? (
                          "Unblock"
                        ) : (
                          <span className="flex items-center gap-3 font-semibold">
                            <MdBlock /> Block @{originalPostOwner.username}
                          </span>
                        )}
                      </button>
                    )}
                    {authUser?.isAdmin && (
                      <button
                        className="z-50 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 transition duration-200 hover:bg-gray-700/30"
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

      {/* ── Post content ── */}
      <div className="mt-3 flex flex-col gap-3">
        <span className="word-break-anywhere min-w-0 whitespace-pre-wrap text-[17px]">
          {renderClickableText(sourcePost.text)}
        </span>

        {sourcePost.mediaType === "image" &&
          sourcePost?.image?.imageUrl &&
          sourcePost.image?._id && (
            <div className="inline-flex max-w-full justify-center">
              <Link to={`/images/${sourcePost.image._id}`}>
                <img
                  src={getOptimizedImageUrl(sourcePost.image.imageUrl, "post")}
                  className="block h-auto max-h-96 w-full rounded-2xl border border-accent object-contain"
                  alt="post image"
                  loading="lazy"
                />
              </Link>
            </div>
          )}

        {sourcePost.mediaType === "video" && sourcePost.video && (
          <video
            controls
            src={sourcePost.video}
            className="block h-auto max-h-96 w-full rounded-2xl border border-accent object-contain"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {post.pollOptions && post.pollOptions.length > 0 && <PollDisplay post={post} />}
      </div>

      {/* ── Full timestamp ── */}
      <div className="mt-3 border-b border-accent pb-3 text-sm text-slate-500">{fullDate}</div>

      {/* ── Stats row: X · likes, Y · reposts ── */}
      {
        <div className="flex gap-4 border-b border-accent py-3 text-sm">
          {
            <span className="flex gap-1">
              {/* <span className="font-bold text-white">{sourcePost.repliesCount}</span>{" "} */}
              <AnimatedCount count={sourcePost?.repliesCount || "0"} className={"font-bold"} />
              <span className="text-slate-500">Replies</span>
            </span>
          }
          {
            <span className="flex gap-1">
              {/* <span className="font-bold text-white">{sourcePost.repostsCount}</span>{" "} */}
              <AnimatedCount count={sourcePost.repostsCount} className={"font-bold"} />
              <span className="text-slate-500">Reposts</span>
            </span>
          }
          {
            <span className="flex gap-1">
              {/* <span className="font-bold text-white">{sourcePost.likes.length}</span>{" "} */}
              <AnimatedCount count={sourcePost.likes.length} className={"font-bold"} />

              <span className="text-slate-500">Likes</span>
            </span>
          }
        </div>
      }

      {/* ── Action bar ── */}
      <div className="flex items-center justify-around pt-1">
        {/* Reply — just an icon, no count, no navigation (you're already here) */}
        <div
          className="group flex cursor-pointer items-center rounded-full p-2 transition duration-200 hover:bg-sky-400/15"
          onTouchStart={() => handleTouchStart("comment")}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <FaRegComment className="h-5 w-5 text-slate-500 transition duration-200 group-hover:text-sky-400" />
        </div>

        {/* Repost */}
        <div
          className="group flex cursor-pointer items-center rounded-full p-2 transition duration-200 hover:bg-emerald-600/15"
          onClick={(e) => {
            stopProp(e)
            if (!isReposting) repostPost(sourcePost._id)
          }}
          onTouchStart={() => handleTouchStart("repost")}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <FaRetweet
            className={`size-5 transition duration-200 ${
              repostedByCurrentUser
                ? "text-emerald-500"
                : "text-slate-500 group-hover:text-emerald-500"
            } ${isAnimatingRepost ? "animate-repost-spin" : ""}`}
          />
        </div>

        {/* Like */}
        <div
          className="group flex cursor-pointer items-center rounded-full p-2 transition duration-200 hover:bg-pink-600/15"
          onClick={(e) => {
            stopProp(e)
            if (!isLiking) likePost(sourcePost._id)
          }}
          onTouchStart={() => handleTouchStart("like")}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {isLiked ? (
            <FaHeart
              className={`h-5 w-5 text-pink-600 ${isAnimatingLike ? "animate-like-bounce" : ""}`}
            />
          ) : (
            <FaRegHeart
              className={`h-5 w-5 text-slate-500 transition duration-200 group-hover:text-pink-600 ${isAnimatingLike ? "animate-like-bounce" : ""}`}
            />
          )}
        </div>

        {/* Bookmark */}
        {!post.isVent && (
          <div
            className="group flex cursor-pointer items-center rounded-full p-2 transition duration-200 hover:bg-primary/15"
            onClick={(e) => {
              stopProp(e)
              setIsAnimatingBookmark(true)
              if (!isBookmarking) toggleBookmark(sourcePost._id)
            }}
            onTouchStart={() => handleTouchStart("bookmark")}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            {isBookmarked ? (
              <FaBookmark
                className={`size-5 text-primary ${isAnimatingBookmark ? "animate-bookmark-pop" : ""}`}
              />
            ) : (
              <FaRegBookmark
                className={`size-5 text-slate-500 transition duration-200 group-hover:text-primary ${isAnimatingBookmark ? "animate-bookmark-pop" : ""}`}
              />
            )}
          </div>
        )}

        <div
          className="group flex cursor-pointer items-center rounded-full p-2 transition duration-200 hover:bg-blue-400/15"
          onClick={handleCopyLink}
          title="Copy link to post"
        >
          <FaLink
            className={`size-5 transition duration-200 ${
              isCopied ? "scale-110 text-blue-400" : "text-slate-500 group-hover:text-blue-400"
            }`}
          />
          {isCopied && (
            <span className="absolute mb-10 rounded bg-gray-800 px-2 py-1 text-[10px] text-white">
              Copied!
            </span>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modalState.isOpen && (
        <div
          onMouseEnter={handleModalEnter}
          onMouseLeave={handleModalLeave}
          className="profile-modal"
        >
          {isUserLoading ? (
            <div
              className="absolute z-50 flex h-48 w-72 items-center justify-center rounded-xl border border-accent bg-base-200 shadow-lg"
              style={{ top: modalState.position.top, left: modalState.position.left }}
            >
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <ProfileInfoModal
              user={userProfile}
              onClose={handleModalLeave}
              position={modalState.position}
            />
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
})

export default HeroPost
