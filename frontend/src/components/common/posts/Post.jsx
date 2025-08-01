import { FaHeart, FaRegComment } from "react-icons/fa6";
import { FaRetweet } from "react-icons/fa6";
import { FaRegHeart } from "react-icons/fa6";
import { FiTrash } from "react-icons/fi";

import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../../ui/LoadingSpinner";
import { formatPostDate } from "../../../utils/date";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useDeletePosts } from "../../../hooks/postsHooks/useDeletePosts";
import { useLikePost } from "../../../hooks/postsHooks/useLikePosts";
import { useRepostPost } from "../../../hooks/postsHooks/useRepostPost";
import { renderClickableText } from "../../../utils/textUtils";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { useToggleBookmarks } from "../../../hooks/postsHooks/useToggleBookmarks";
import { FaBookmark, FaRegBookmark } from "react-icons/fa6";
import PollDisplay from "../PollDisplay";
import { usePinPost } from "../../../hooks/postsHooks/usePinPost";
import { BsPin, BsPinFill, BsThreeDots } from "react-icons/bs";
import { useBlockUnblockUser } from "../../../hooks/usersHooks/useBlockUnblockUser";
import useFollow from "../../../hooks/usersHooks/useFollow";
import { LuUserRoundMinus, LuUserRoundPlus } from "react-icons/lu";
import { MdBlock } from "react-icons/md";
import { useFetchUserProfile } from "../../../hooks/usersHooks/useFetchUserProfile";
import { useAppStore } from "../../../store/appStore";
import useDropdownMenu from "../../../hooks/useDropdownMenu";

const Post = ({
  post,
  profilePinnedPosts = [],
  currentProfileUsername,
  profileOwnerId,
  postEndpoint,
}) => {
  const openImageModal = useAppStore((state) => state.openImageModal);
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { username } = useParams();
  const [isAnimatingRepost, setIsAnimatingRepost] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isAnimatingPin, setIsAnimatingPin] = useState(false); // NEW
  const [isAnimatingBookmark, setIsAnimatingBookmark] = useState(false); // NEW
  const [isAnimatingComment, setIsAnimatingComment] = useState(false);

  const { pathname } = useLocation();

  const isDraggingRef = useRef(0);
  const initialClientY = useRef(0);
  const initialClientX = useRef(0);

  const { toggleMenu, showMenu, setShowMenu, menuRef } = useDropdownMenu();

  const isRepost = !!post.repostedFrom;
  const sourcePost = post.repostedFrom || post;

  // const sourcePost = isRepost ? post.repostedFrom : post;
  const originalPostOwner = sourcePost?.user;
  const repostingUser = isRepost ? post.user : null;
  const isLiked = sourcePost?.likes?.includes(authUser?._id);
  const isBookmarked = sourcePost?.bookmarkedBy?.includes(authUser?._id);
  const repostedByCurrentUser = sourcePost?.repostedBy?.includes(authUser?._id);
  const hasAuthUserPinnedOriginal = authUser?.pinnedPosts?.includes(sourcePost._id);

  const isPinnedForUI =
    sourcePost?.isPinned !== undefined ? sourcePost.isPinned : hasAuthUserPinnedOriginal;

  const isPinnedOnThisProfile = profilePinnedPosts.some(
    (pinnedPost) => pinnedPost._id === sourcePost._id
  );

  const isPostOwner = authUser && authUser._id === post.user._id;

  const isMyOriginalPost =
    authUser && originalPostOwner && authUser._id === originalPostOwner._id; // NEW: Check if the original post belongs to the current user

  const { userProfile } = useFetchUserProfile(username);

  const { toggleBookmark, isBookmarking } = useToggleBookmarks(
    currentProfileUsername,
    profileOwnerId
  );

  const { repostPost, isReposting } = useRepostPost(postEndpoint);
  const { likePost, isLiking } = useLikePost(username, userProfile?._id);
  const { deletePost, isDeleting } = useDeletePosts();
  const { pinUnpinPost, isPinning } = usePinPost();

  // New: Call useFollow and useBlockUnblockUser hooks
  const { follow, isPending: isFollowingOrUnfollowing } = useFollow();
  const { blockUnblockUser, isBlocking } = useBlockUnblockUser();

  const displayTimestamp = sourcePost.publishedAt
    ? sourcePost.publishedAt
    : sourcePost.createdAt;

  const formattedDate = formatPostDate(displayTimestamp);

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButton, setActiveButton] = useState(null);

  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
  }, []);

  const handleTouchStart = useCallback(
    (id) => {
      if (isTouchDevice) {
        setActiveButton(id);
      }
    },
    [isTouchDevice]
  );

  const handleTouchEnd = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 150);
    }
  }, [isTouchDevice]);

  const handleTouchCancel = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 150);
    }
  }, [isTouchDevice]);

  const navigateToPostPage = (e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }

    if (pathname.includes("/post/")) {
      return;
    }

    if (
      e.target.closest("a") ||
      e.target.closest("button") ||
      e.target.closest("img") ||
      e.target.closest("video") ||
      e.target.closest(".menu-popover") // Prevent navigation if clicking inside the menu
    ) {
      return;
    }
    navigate(`/${originalPostOwner.username}/post/${sourcePost._id}`);
  };

  const handleMouseDown = (e) => {
    initialClientX.current = e.clientX;
    initialClientY.current = e.clientY;
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    const deltaX = Math.abs(e.clientX - initialClientX.current);
    const deltaY = Math.abs(e.clientY - initialClientY.current);
    if (deltaX > 5 || deltaY > 5) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseUp = () => {};

  const handleInteractiveClick = (e) => {
    e.stopPropagation();
  };

  const handleBookmarkPost = (e) => {
    handleInteractiveClick(e);
    setIsAnimatingBookmark(true);

    if (!authUser?._id || isBookmarking) return;
    toggleBookmark(sourcePost._id);
  };

  const handleDeletePostClick = (e) => {
    handleInteractiveClick(e);
    deletePost(sourcePost?._id);
  };

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e);
    setIsAnimatingLike(true);

    if (isLiking) return;
    likePost(sourcePost._id);
  };

  const handleRepostClick = (e) => {
    handleInteractiveClick(e);
    if (isReposting) return;
    setIsAnimatingRepost(true);

    repostPost(sourcePost._id);
  };

  const handleCommentClick = (e) => {
    handleInteractiveClick(e);
    setIsAnimatingComment(true);

    if (pathname.includes("/post/")) {
      return;
    }
    navigate(`/${originalPostOwner.username}/post/${sourcePost._id}`);
  };

  const handlePinPost = (e) => {
    e.stopPropagation();
    setIsAnimatingPin(true);

    if (!authUser?.username || isPinning) return;

    const action = isPinnedForUI ? "unpin" : "pin";
    pinUnpinPost({
      postId: sourcePost._id,
      action: action,
      post: sourcePost,
    });
  };

  const handleMediaClick = (mediaUrl, mediaType, event) => {
    event.stopPropagation();
    if (openImageModal && mediaType === "image") {
      openImageModal(mediaUrl);
    }
  };

  // New: Handle follow/unfollow
  const handleFollowClick = (e) => {
    e.stopPropagation();
    if (!authUser || isFollowingOrUnfollowing) return;
    follow(originalPostOwner._id);
    setShowMenu(false); // Close menu after clicking
  };

  // New: Handle block/unblock
  const handleBlockClick = (e) => {
    e.stopPropagation();
    if (!authUser || isBlocking) return;
    blockUnblockUser(originalPostOwner._id);
    setShowMenu(false); // Close menu after clicking
  };

  const navigateToReposterProfile = (e) => {
    e.stopPropagation();
    if (repostingUser) {
      navigate(`/profile/${repostingUser.username}`);
    }
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const getDisplayUsername = (username) => {
    if (isSmallScreen && username.length > 5) {
      return username.slice(0, 5) + "...";
    }
    return username;
  };

  useEffect(() => {
    let timerLike, timerPin, timerBookmark, timerRepost;

    if (isAnimatingRepost) {
      timerRepost = setTimeout(() => {
        setIsAnimatingRepost(false);
      }, 400); // Match the animation duration (0.4s)
    }

    if (isAnimatingLike) {
      timerLike = setTimeout(() => {
        setIsAnimatingLike(false);
      }, 300);
    }
    if (isAnimatingPin) {
      timerPin = setTimeout(() => {
        setIsAnimatingPin(false);
      }, 200);
    }
    if (isAnimatingBookmark) {
      timerBookmark = setTimeout(() => {
        setIsAnimatingBookmark(false);
      }, 200);
    }

    return () => {
      clearTimeout(timerLike);
      clearTimeout(timerPin);
      clearTimeout(timerBookmark);
    };
  }, [isAnimatingLike, isAnimatingPin, isAnimatingBookmark, isAnimatingRepost]);

  if (!sourcePost || !originalPostOwner) {
    console.warn("Post or originalPostOwner not fully populated:", post);
    return null;
  }

  // Determine if the current authUser is following the original post owner
  const isFollowingOriginalPostOwner = authUser?.following?.includes(
    originalPostOwner._id
  );
  // Determine if the current authUser has blocked the original post owner
  const isBlockedByAuthUser = authUser?.blockedUsers?.includes(originalPostOwner._id);

  return (
    <div
      className={`${
        showMenu ? "bg-base-100" : "hover:bg-gray-700/30"
      } flex flex-col gap-0 py-3 px-4 border-b border-accent cursor-pointer  transition duration-500`}
      onClick={navigateToPostPage}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {isRepost && repostingUser && (
        <div className="flex items-center gap-1 text-slate-500 text-sm ml-6 font-semibold">
          <FaRetweet className="inline-block text-lg" size={16} />
          <span
            className="hover:underline cursor-pointer"
            onClick={navigateToReposterProfile}
          >
            {repostingUser.fullName.length > 15
              ? repostingUser.fullName.slice(0, 15) + "..."
              : repostingUser.fullName}{" "}
            reposted
          </span>
        </div>
      )}
      {isPinnedOnThisProfile && (
        <div className="flex items-center gap-1 text-slate-500 text-sm ml-6 font-semibold">
          <BsPinFill className="inline-block text-lg" size={15} />
          <span className="cursor-pointer">Pinned</span>
        </div>
      )}

      <div className="flex gap-2 items-start relative">
        <div className="avatar mt-1">
          <Link
            to={`/profile/${originalPostOwner.username}`}
            className="size-10 rounded-full overflow-hidden"
            onClick={(e) => handleInteractiveClick(e)}
          >
            <img
              src={originalPostOwner.profileImg || "/avatar-placeholder.png"}
              alt={`${originalPostOwner.username}'s profile`}
              loading="lazy"
            />
          </Link>
        </div>
        <div className="flex flex-col flex-1 min-w-0 relative">
          <div className="flex gap-1 items-center">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              <Link
                to={`/profile/${originalPostOwner.username}`}
                className="font-bold flex items-center gap-1 hover:underline truncate"
                onClick={handleInteractiveClick}
              >
                {originalPostOwner.fullName}
                {originalPostOwner.isVerified && (
                  <img
                    src="/verified.png"
                    className="size-[17px]"
                    alt="Verified"
                    loading="lazy"
                  />
                )}
                {originalPostOwner.isGoldVerified && (
                  <img
                    src="/gold-verified.png"
                    className="size-[17px]"
                    alt="Verified"
                    loading="lazy"
                  />
                )}
              </Link>
              <span className="text-slate-500 flex gap-1 text-sm min-w-0">
                {" "}
                <Link
                  to={`/profile/${originalPostOwner.username}`}
                  className="truncate"
                  onClick={handleInteractiveClick}
                >
                  @{getDisplayUsername(originalPostOwner.username)}
                </Link>
                <span>·</span>
                <span className="shrink-0">{formattedDate}</span>{" "}
              </span>
            </div>

            {/* BsThreeDots Icon and Conditional Menu */}
            <span
              className="flex ml-auto absolute right-0 group rounded-full p-2 mr-0.5 hover:bg-primary/20 transition duration-200"
              onClick={toggleMenu}
            >
              <div className="group duration-200 transition hover:text-primary rounded-full">
                <BsThreeDots className=" group-hover:text-primary cursor-pointer text-slate-500" />
              </div>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 bg-transparent z-10 cursor-default"
                    onClick={toggleMenu}
                  ></div>
                  <div
                    ref={menuRef}
                    className="white-shadow absolute right-0 top-0 w-max bg-base-100  rounded-xl text-lg z-10 menu-popover py-2 shadow-md shadow-primary"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the menu
                  >
                    {isMyOriginalPost ? (
                      <button
                        className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-700/30 duration-200 transition flex items-center gap-2 font-semibold z-50"
                        onClick={handleDeletePostClick}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <LoadingSpinner size="xs" /> : <FiTrash />}
                        Delete Post
                      </button>
                    ) : (
                      <>
                        <button
                          className="w-full text-left px-4 py-2 text-white  flex items-center gap-2 duration-200 transition hover:bg-gray-700/30"
                          onClick={handleFollowClick}
                          disabled={isFollowingOrUnfollowing}
                        >
                          {isFollowingOriginalPostOwner ? (
                            <span className="flex items-center justify-center gap-3 font-semibold">
                              <LuUserRoundMinus strokeWidth={2} /> Unfollow
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-3 font-semibold">
                              <LuUserRoundPlus strokeWidth={2} /> Follow @
                              {originalPostOwner.username}
                            </span>
                          )}
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-red-500 flex items-center gap-2 duration-200 transtion hover:bg-gray-700/30"
                          onClick={handleBlockClick}
                          disabled={isBlocking}
                        >
                          {isBlockedByAuthUser ? (
                            "Unblock"
                          ) : (
                            <span className="flex items-center justify-center gap-3 font-semibold">
                              <MdBlock /> Block @{originalPostOwner.username}
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-3 overflow-hidden">
            <span className="whitespace-pre-wrap word-break-anywhere min-w-0">
              {renderClickableText(sourcePost.text)}
            </span>
            {sourcePost.mediaType === "image" && sourcePost.img && (
              // <div className="w-full max-w-full flex justify-center"> // Optional: for true centering if parent isn't flex-col
              <div className="inline-flex max-w-full justify-center">
                {" "}
                {/* Use inline-flex so it wraps the content, and max-w-full */}
                <img
                  src={sourcePost.img}
                  className="h-auto max-h-80 object-contain rounded-2xl border border-accent block"
                  // Removed w-full from img to allow wrapper to dictate width based on content
                  alt="post image"
                  onClick={(e) => handleMediaClick(sourcePost.img, "image", e)}
                  loading="lazy"
                />
              </div>
            )}
            {sourcePost.mediaType === "video" && sourcePost.video && (
              <video
                controls
                loading="lazy"
                src={sourcePost.video}
                className="w-full h-auto max-h-80 object-contain rounded-2xl border border-accent block max-w-full"
                alt="post video"
                preload="metadata"
                onClick={(e) => handleMediaClick(sourcePost.video, "video", e)}
              >
                Your browser does not support the video tag.
              </video>
            )}
            {post.pollOptions && post.pollOptions.length > 0 && (
              <PollDisplay post={post} />
            )}
          </div>

          <div className="w-2/3 mt-3">
            <div>
              <div className="flex justify-between">
                <div
                  className="flex items-center cursor-pointer group"
                  onClick={handleCommentClick}
                  onTouchStart={() => handleTouchStart("comment")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <div
                    className={`p-2 rounded-full duration-200 transition group ${
                      !isTouchDevice
                        ? "group-hover:bg-sky-400 group-hover:bg-opacity-15"
                        : ""
                    }
                    ${
                      isTouchDevice && activeButton === "comment"
                        ? "bg-sky-400 bg-opacity-15"
                        : ""
                    }`}
                  >
                    <FaRegComment
                      className={`w-4 h-4 text-slate-500 group-hover:text-sky-400 duration-200 transition  ${
                        isAnimatingComment ? "animate-bookmark-pop" : ""
                      }`}
                      strokeWidth={10}
                    />
                  </div>
                  <span
                    className={`text-sm text-slate-500 group-hover:text-sky-400 duration-200 transition`}
                  >
                    {sourcePost.commentsCount || 0}
                  </span>
                </div>

                <div
                  className="flex items-center group cursor-pointer"
                  onClick={handleRepostClick}
                  onTouchStart={() => handleTouchStart("repost")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <div
                    className={`rounded-full p-2 duration-2000 transition ${
                      !isTouchDevice
                        ? "group-hover:bg-emerald-600 group-hover:bg-opacity-15"
                        : ""
                    }
                    ${
                      isTouchDevice && activeButton === "repost"
                        ? "bg-emerald-600 bg-opacity-15"
                        : ""
                    }`}
                  >
                    <FaRetweet
                      className={`size-[18px] duration-200 transition ${
                        repostedByCurrentUser
                          ? "text-emerald-500"
                          : "text-slate-500 group-hover:text-emerald-500"
                      } ${isAnimatingRepost ? "animate-repost-spin" : ""}`}
                    />
                  </div>
                  <span
                    className={`text-sm duration-200 transition ${
                      repostedByCurrentUser
                        ? "text-emerald-500"
                        : "text-slate-500 group-hover:text-emerald-500"
                    }`}
                  >
                    {sourcePost.repostsCount || 0}{" "}
                  </span>
                </div>

                <div
                  className="flex items-center group cursor-pointer rounded-full"
                  onClick={handleLikePostClick}
                  onTouchStart={() => handleTouchStart("like")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <div
                    className={`
                  rounded-full p-2 duration-200 transition relative
                  ${
                    !isTouchDevice
                      ? "group-hover:bg-pink-600 group-hover:bg-opacity-15"
                      : ""
                  }
                  ${
                    isTouchDevice && activeButton === "like"
                      ? "bg-pink-600 bg-opacity-15"
                      : ""
                  }
                  cursor-pointer
                `}
                  >
                    {!isLiked && (
                      <FaRegHeart
                        className={`
                        w-4 h-4 text-slate-500 group-hover:text-pink-600 duration-200 transition
                        ${isAnimatingLike && !isLiked ? "animate-like-bounce" : ""}
                    `}
                      />
                    )}
                    {isLiked && (
                      <FaHeart
                        strokeWidth={10}
                        className={`
                        w-4 h-4 text-pink-600 duration-200 transition
                        ${isAnimatingLike && isLiked ? "animate-like-bounce" : ""}
                    `}
                      />
                    )}
                  </div>
                  <span
                    className={`text-sm group-hover:text-pink-600 duration-200 transition ${
                      isLiked ? "text-pink-600 " : "text-slate-500"
                    }`}
                  >
                    {sourcePost.likes?.length || 0}
                  </span>
                </div>

                <div className="absolute flex right-0.5">
                  {isMyOriginalPost && (
                    <div
                      className={`flex gap-1 items-center cursor-pointer group right-0.5 p-2 duration-200 transition rounded-full
                      ${!isTouchDevice ? "hover:bg-primary hover:bg-opacity-15" : ""}
                      ${
                        isTouchDevice && activeButton === "pin"
                          ? "bg-primary bg-opacity-15"
                          : ""
                      }
                    `}
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
                          className={`size-4.5 text-slate-500 group-hover:text-primary duration-200 transition ${
                            isAnimatingPin ? "animate-pin-down" : ""
                          }`}
                        />
                      )}
                    </div>
                  )}
                  <div
                    className={`flex items-center cursor-pointer group right-0.5 p-2 duration-200 transition rounded-full
                      ${!isTouchDevice ? "hover:bg-primary hover:bg-opacity-15" : ""}
                      ${
                        isTouchDevice && activeButton === "bookmark"
                          ? "bg-primary bg-opacity-15"
                          : ""
                      }
                    `}
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
                        className={`size-4 text-slate-500 group-hover:text-primary duration-200 transition ${
                          isAnimatingBookmark ? "animate-bookmark-pop" : ""
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Post);
