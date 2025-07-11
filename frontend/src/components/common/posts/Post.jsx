import { FaHeart, FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";

import { Link, useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../LoadingSpinner";
import { formatPostDate } from "../../../utils/date";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useDeletePosts } from "../../../hooks/postsHooks/useDeletePosts";
import { useLikePost } from "../../../hooks/postsHooks/useLikePosts";
import { useRepostPost } from "../../../hooks/postsHooks/useRepostPost";
import { renderClickableText } from "../../../utils/textUtils";
import { useCallback, useEffect, useState, useRef } from "react";
import { useToggleBookmarks } from "../../../hooks/postsHooks/useToggleBookmarks";
import { FaBookmark, FaRegBookmark } from "react-icons/fa6";
import PollDisplay from "../PollDisyplay";
import { usePinPost } from "../../../hooks/postsHooks/usePinPost";
import { BsPin, BsPinFill } from "react-icons/bs";

const Post = ({ post, openImageModal, profilePinnedPosts = [], currentProfileUsername, profileOwnerId }) => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [hasUserRepostedOriginal, setHasUserRepostedOriginal] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { username } = useParams();
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isAnimatingPin, setIsAnimatingPin] = useState(false); // NEW
  const [isAnimatingBookmark, setIsAnimatingBookmark] = useState(false); // NEW

  const isDraggingRef = useRef(false);
  const initialClientY = useRef(0);
  const initialClientX = useRef(0);

  const resolvedProfileUsername = currentProfileUsername || username; // Use prop if available

  const isRepost = !!post.repostedFrom;
  const originalPost = isRepost ? post.repostedFrom : post;
  const originalPostOwner = originalPost?.user;
  const repostingUser = isRepost ? post.user : null;
  const isLiked = originalPost?.likes?.includes(authUser?._id);
  const isBookmarked = (post.bookmarkedBy || []).includes(authUser?._id);

  // 1. Check if the authenticated user has pinned *this specific original post*.
  const hasAuthUserPinnedOriginal = authUser?.pinnedPosts?.includes(originalPost._id);

  // 2. The `isPinned` state for the UI should reflect `hasAuthUserPinnedOriginal` *optimistically*.
  //    This means your `updatePostPinStatus` helper should set an `isPinned` flag on the post object in the cache.
  //    When `originalPost` comes from the query cache, it *might* have this `isPinned` property.
  //    If not, fall back to checking `authUser.pinnedPosts`.
  const isPinnedForUI =
    originalPost?.isPinned !== undefined
      ? originalPost.isPinned
      : hasAuthUserPinnedOriginal;

  // The `profilePinnedPosts` prop is likely used by `ProfilePage` to display the list of pinned posts.
  // It shouldn't directly influence the `isPinned` status of an individual post *icon* unless the Post component
  // is specifically checking if it's *in that list*. For the icon, `authUser.pinnedPosts` is more direct.
  const isPinnedOnThisProfile = profilePinnedPosts.some(
    (pinnedPost) => pinnedPost._id === originalPost._id
  );
  // const isPinned = originalPost?.isPinned; // This directly uses the optimistic flag on the post object

  const canDelete = authUser && authUser._id === post.user._id;
  const isMyOriginalPost =
    authUser && originalPostOwner && authUser._id === originalPostOwner._id; // NEW: Check if the original post belongs to the current user

  const { toggleBookmark, isBookmarking } = useToggleBookmarks(
    resolvedProfileUsername,
    profileOwnerId
  ); // <--- Pass profileOwnerId here!
  const { repostPost, isReposting } = useRepostPost();
  const { likePost, isLiking } = useLikePost(username);
  const { deletePost, isDeleting } = useDeletePosts(post);
  const { pinUnpinPost, isPinning } = usePinPost(); // Use the new pin hook

  const formattedDate = formatPostDate(originalPost.createdAt);

  // --- NEW STATE AND EFFECTS FOR TOUCH FEEDBACK ---
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButton, setActiveButton] = useState(null); // To control the active state for touch feedback on interactive buttons
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
      }, 150); // Match desired fade-out duration
    }
  }, [isTouchDevice]);

  const handleTouchCancel = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 150);
    }
  }, [isTouchDevice]);
  // --- END NEW STATE AND EFFECTS FOR TOUCH FEEDBACK ---

  // --- MODIFIED navigateToPostPage to prevent navigation during text selection ---
  const navigateToPostPage = (e) => {
    // If a drag/highlight action was detected, prevent navigation
    if (isDraggingRef.current) {
      isDraggingRef.current = false; // Reset for the next interaction
      return;
    }

    if (
      e.target.closest("a") ||
      e.target.closest("button") ||
      e.target.closest("img") ||
      e.target.closest("video")
    ) {
      // Don't navigate if clicking on interactive elements
      return;
    }
    navigate(`/${originalPostOwner.username}/post/${originalPost._id}`);
  };

  // --- NEW HANDLERS FOR MOUSE EVENTS ---
  const handleMouseDown = (e) => {
    initialClientX.current = e.clientX;
    initialClientY.current = e.clientY;
    isDraggingRef.current = false; // Assume no drag until proven otherwise
  };

  const handleMouseMove = (e) => {
    // If the mouse moves more than a few pixels, it's likely a drag
    const deltaX = Math.abs(e.clientX - initialClientX.current);
    const deltaY = Math.abs(e.clientY - initialClientY.current);
    if (deltaX > 5 || deltaY > 5) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseUp = () => {
    // This is where navigateToPostPage will be called by the parent div's onClick
    // The `isDraggingRef.current` flag will be checked there.
  };
  // --- END NEW HANDLERS FOR MOUSE EVENTS ---

  const handleInteractiveClick = (e) => {
    e.stopPropagation();
  };

  const handleBookmarkPost = (e) => {
    handleInteractiveClick(e);
    setIsAnimatingBookmark(true); // Trigger bookmark animation

    if (!authUser?._id || isBookmarking) return;
    toggleBookmark(originalPost._id);
  };

  const handleDeletePostClick = (e) => {
    handleInteractiveClick(e);
    deletePost();
  };

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e);
    setIsAnimatingLike(true);

    if (isLiking) return;
    likePost(originalPost._id);
  };

  const handleRepostClick = (e) => {
    handleInteractiveClick(e);
    if (isReposting) return;
    repostPost(originalPost._id);
  };

  const handlePinPost = (e) => {
    e.stopPropagation();
    setIsAnimatingPin(true);

    if (!authUser?.username || isPinning) return; // Prevent action if not authenticated or already pinning

    const action = isPinnedForUI ? "unpin" : "pin"; // Determine action based on current UI state
    // Pass the full originalPost object and the profile owner's username
    pinUnpinPost({
      postId: originalPost._id,
      action: action,
      post: originalPost, // Pass the full originalPost object
    });
  };

  const handleMediaClick = (mediaUrl, mediaType, event) => {
    event.stopPropagation();
    if (openImageModal && mediaType === "image") {
      openImageModal(mediaUrl);
    }
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

  useEffect(() => {
    const checkIfUserRepostedStatus = async () => {
      if (!authUser || !originalPost?._id) {
        setHasUserRepostedOriginal(false);
        return;
      }
      try {
        const response = await fetch(`/api/posts/check-repost/${originalPost._id}`, {});
        if (!response.ok) {
          console.warn("Authentication issue checking repost status or other error.");
          setHasUserRepostedOriginal(false);
          return;
        }
        const data = await response.json();
        setHasUserRepostedOriginal(data.hasReposted);
      } catch (error) {
        console.error("Error checking if user reposted:", error);
        setHasUserRepostedOriginal(false);
      }
    };
    checkIfUserRepostedStatus();
  }, [authUser, originalPost?._id, isReposting]);

  const getDisplayUsername = (username) => {
    if (isSmallScreen && username.length > 5) {
      return username.slice(0, 5) + "...";
    }
    return username;
  };

  // Reset animation states after they complete
  useEffect(() => {
    let timerLike, timerPin, timerBookmark;

    if (isAnimatingLike) {
      timerLike = setTimeout(() => {
        setIsAnimatingLike(false);
      }, 300); // Match like-bounce duration
    }
    if (isAnimatingPin) {
      timerPin = setTimeout(() => {
        setIsAnimatingPin(false);
      }, 200); // Match pin-down duration
    }
    if (isAnimatingBookmark) {
      timerBookmark = setTimeout(() => {
        setIsAnimatingBookmark(false);
      }, 200); // Match bookmark-pop duration
    }

    return () => {
      clearTimeout(timerLike);
      clearTimeout(timerPin);
      clearTimeout(timerBookmark);
    };
  }, [isAnimatingLike, isAnimatingPin, isAnimatingBookmark]);

  if (!originalPost || !originalPostOwner) {
    console.warn("Post or originalPostOwner not fully populated:", post);
    return null;
  }

  return (
    <div
      className="flex flex-col gap-0 py-3 px-4 border-b border-accent cursor-pointer"
      onClick={navigateToPostPage}
      onMouseDown={handleMouseDown} // Add mouse down listener
      onMouseMove={handleMouseMove} // Add mouse move listener
      onMouseUp={handleMouseUp} // Add mouse up listener
    >
      {isRepost && repostingUser && (
        <div className="flex items-center gap-1 text-gray-500 text-sm ml-6 font-semibold">
          <BiRepost className="inline-block text-lg" size={20} />
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
        <div className="flex items-center gap-1 text-gray-500 text-sm ml-6 font-semibold">
          <BsPinFill className="inline-block text-lg" size={15} />
          <span className="cursor-pointer">Pinned</span>
        </div>
      )}

      <div className="flex gap-2 items-start relative">
        <div className="avatar mt-1">
          <Link
            to={`/profile/${originalPostOwner.username}`}
            className="size-8 md:size-10 rounded-full overflow-hidden"
            onClick={(e) => handleInteractiveClick(e)}
          >
            <img
              src={originalPostOwner.profileImg || "/avatar-placeholder.png"}
              alt={`${originalPostOwner.username}'s profile`}
              loading="lazy"
            />
          </Link>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex gap-1 items-center">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              <Link
                to={`/profile/${originalPostOwner.username}`}
                className="font-bold flex items-center gap-1 hover:underline truncate"
                onClick={handleInteractiveClick}
              >
                {originalPostOwner.fullName}
                {originalPostOwner.isVerified && (
                  <img src="/verified.png" className="size-[17px] mr-1" alt="Verified" />
                )}
              </Link>
              <span className="text-gray-500 flex gap-1 text-sm min-w-0">
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

            {canDelete && (
              <span className="flex ml-auto">
                {!isDeleting && (
                  <div className="group  duration-200 transition hover:text-red-600  rounded-full px-2.5">
                    <FiTrash
                      className="group-hover:text-red-600 transition duration-200 cursor-pointer text-slate-500"
                      onClick={handleDeletePostClick}
                      size={17}
                    />
                  </div>
                )}
                {isDeleting && <LoadingSpinner size="sm" />}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 overflow-hidden">
            <span className="whitespace-pre-wrap word-break-anywhere min-w-0">
              {renderClickableText(originalPost.text)}
            </span>
            {originalPost.mediaType === "image" && originalPost.img && (
              <img
                src={originalPost.img}
                className="w-full h-auto max-h-80 object-contain rounded-2xl border border-accent block max-w-full"
                alt="post image"
                onClick={(e) => handleMediaClick(originalPost.img, "image", e)}
                loading="lazy"
              />
            )}
            {originalPost.mediaType === "video" && originalPost.video && (
              <video
                controls
                src={originalPost.video}
                className="w-full h-auto max-h-80 object-contain rounded-2xl border border-accent block max-w-full"
                alt="post video"
                preload="metadata"
                onClick={(e) => handleMediaClick(originalPost.video, "video", e)}
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
                  onClick={() => {
                    handleInteractiveClick();
                    // This specific comment icon click should still navigate
                    navigate(`/${originalPostOwner.username}/post/${originalPost._id}`);
                  }}
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
                      className="w-4 h-4 text-slate-500 group-hover:text-sky-400 duration-200 transition"
                      strokeWidth={10}
                    />
                  </div>
                  <span className="text-sm text-slate-500 group-hover:text-sky-400 duration-200 transition">
                    {originalPost.commentsCount || 0}
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
                    className={`rounded-full p-1 duration-200 transition ${
                      !isTouchDevice
                        ? "group-hover:bg-green-400 group-hover:bg-opacity-15"
                        : ""
                    }
                      ${
                        isTouchDevice && activeButton === "repost"
                          ? "bg-green-400 bg-opacity-15"
                          : ""
                      }`}
                  >
                    <BiRepost
                      className={`w-6 h-6 duration-200 transition ${
                        hasUserRepostedOriginal
                          ? "text-green-500"
                          : "text-slate-500 group-hover:text-green-500"
                      } ${isReposting ? "animate-spin" : ""}`}
                    />
                  </div>
                  <span
                    className={`text-sm duration-200 transition ${
                      hasUserRepostedOriginal
                        ? "text-green-500"
                        : "text-slate-500 group-hover:text-green-500"
                    }`}
                  >
                    {originalPost.repostsCount || 0}{" "}
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
                  cursor-pointer // Ensure the div itself is clickable
              `}
                  >
                    {!isLiked && (
                      <FaRegHeart
                        className={`
                        w-4 h-4 text-slate-500 group-hover:text-pink-600 duration-200 transition
                        ${
                          isAnimatingLike && !isLiked ? "animate-like-bounce" : ""
                        } // Apply animation only when triggered and not liked yet
                    `}
                      />
                    )}
                    {isLiked && (
                      <FaHeart
                        className={`
                        w-4 h-4 text-pink-600 duration-200 transition
                        ${
                          isAnimatingLike && isLiked ? "animate-like-bounce" : ""
                        } // Apply animation only when triggered and already liked
                    `}
                      />
                    )}
                  </div>
                  <span
                    className={`text-sm group-hover:text-pink-600 duration-200 transition ${
                      isLiked ? "text-pink-600 " : "text-slate-500"
                    }`}
                  >
                    {originalPost.likes?.length || 0}
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
                      /> // Outline if not
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

export default Post;
