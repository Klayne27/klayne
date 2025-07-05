import { FaHeart, FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";

import { Link, useNavigate } from "react-router-dom";
import LoadingSpinner from "../LoadingSpinner";
import { formatPostDate } from "../../../utils/date";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useDeletePosts } from "../../../hooks/postsHooks/useDeletePosts";
import { useLikePost } from "../../../hooks/postsHooks/useLikePosts";
import { useRepostPost } from "../../../hooks/postsHooks/useRepostPost";
import { renderClickableText } from "../../../utils/textUtils";
import { useEffect, useState } from "react";
import { useToggleBookmarks } from "../../../hooks/postsHooks/useToggleBookmarks";
import { FaBookmark, FaRegBookmark } from "react-icons/fa6";
import PollDisplay from "../PollDisyplay";

const Post = ({ post, openImageModal, setFeedType }) => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [hasUserRepostedOriginal, setHasUserRepostedOriginal] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const isRepost = !!post.repostedFrom;
  const originalPost = isRepost ? post.repostedFrom : post;
  const originalPostOwner = originalPost?.user;
  const repostingUser = isRepost ? post.user : null;
  const isLiked = originalPost?.likes?.includes(authUser?._id);
  const canDelete = authUser && authUser._id === post.user._id;
  const isBookmarked = (post.bookmarkedBy || []).includes(authUser?._id);
  // const isMyPost = authUser?._id === post.user._id;

  const { toggleBookmark, isBookmarking } = useToggleBookmarks();
  const { repostPost, isReposting } = useRepostPost();
  const { likePost, isLiking } = useLikePost(originalPost);
  const { deletePost, isDeleting } = useDeletePosts(post);

  const formattedDate = formatPostDate(originalPost.createdAt);

  const navigateToPostPage = (e) => {
    if (
      e.target.closest("a") ||
      e.target.closest("button") ||
      e.target.closest("img") ||
      e.target.closest("video")
    ) {
      // Don't navigate if clicking on media
      return;
    }
    navigate(`/${originalPostOwner.username}/post/${originalPost._id}`);
  };

  const handleInteractiveClick = (e) => {
    e.stopPropagation();
  };

  const handleBookmarkPost = (e) => {
    handleInteractiveClick(e);
    toggleBookmark(post._id);
  };

  const handleDeletePostClick = (e) => {
    handleInteractiveClick(e);
    deletePost();
  };

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e);
    if (isLiking) return;
    likePost(originalPost._id);
  };

  const handleRepostClick = (e) => {
    handleInteractiveClick(e);
    if (isReposting) return;
    repostPost(originalPost._id);
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

  if (!originalPost || !originalPostOwner) {
    console.warn("Post or originalPostOwner not fully populated:", post);
    return null;
  }

  return (
    <div
      className="flex flex-col gap-0 py-3 px-4 border-b border-gray-700 cursor-pointer"
      onClick={navigateToPostPage}
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

      <div className="flex gap-2 items-start">
        <div className="avatar mt-1">
          <Link
            to={`/profile/${originalPostOwner.username}`}
            className="size-8 md:size-10 rounded-full overflow-hidden"
            onClick={() => handleInteractiveClick()}
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
                  <div className="group  duration-200 transition hover:text-red-600  rounded-full px-2.5">
                    <FiTrash
                      className="group-hover:text-red-600 transition duration-200 cursor-pointer text-gray-500"
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
                className="w-full h-auto max-h-80 object-contain rounded-2xl border border-gray-700 block max-w-full"
                alt="post image"
                onClick={(e) => handleMediaClick(originalPost.img, "image", e)}
                loading="lazy"
              />
            )}
            {originalPost.mediaType === "video" && originalPost.video && (
              <video
                controls
                src={originalPost.video}
                className="w-full h-auto max-h-80 object-contain rounded-2xl border border-gray-700 block max-w-full"
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

          <div className="flex justify-between mt-3 relative">
            <div className="flex gap-4 items-center w-2/3 justify-between ">
              <div
                className="flex items-center cursor-pointer group"
                onClick={handleInteractiveClick}
              >
                <div
                  onClick={navigateToPostPage}
                  className="p-2 rounded-full group-hover:bg-sky-400 group-hover:bg-opacity-15 duration-200 transition"
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
              >
                <div className="group-hover:bg-green-400 group-hover:bg-opacity-15 rounded-full p-1 duration-200 transition">
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
              >
                <div
                  className={`group-hover:bg-pink-600 group-hover:bg-opacity-15 rounded-full p-2 duration-200 transition ${
                    isLiking ? "animate-spin" : ""
                  }`}
                >
                  {!isLiked && (
                    <FaRegHeart className="w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-600 duration-200 transition" />
                  )}
                  {isLiked && (
                    <FaHeart
                      className={`w-4 h-4 cursor-pointer text-pink-600 duration-200 transition ${
                        isLiking ? "animate-spin" : ""
                      }`}
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

              <div
                className="flex gap-1 items-center cursor-pointer group absolute right-0.5 p-2 duration-200 transition hover:bg-primary hover:bg-opacity-15 rounded-full"
                onClick={handleBookmarkPost}
              >
                {isBookmarking ? (
                  <LoadingSpinner size="xs" />
                ) : isBookmarked ? (
                  <FaBookmark className="size-4 text-primary" />
                ) : (
                  <FaRegBookmark className="size-4 text-slate-500 group-hover:text-primary duration-200 transition" /> // Outline if not
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Post;
