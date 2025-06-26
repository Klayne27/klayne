import { FaHeart, FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";

import { Link, useNavigate } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatPostDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useDeletePosts } from "../../hooks/postsHooks/useDeletePosts";
import { useLikePost } from "../../hooks/postsHooks/useLikePosts";
import { useRepostPost } from "../../hooks/postsHooks/useRepostPost";
import { renderClickableText } from "../../utils/textUtils";
import { useEffect, useState } from "react";

const Post = ({ post, openImageModal, setFeedType }) => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [hasUserRepostedOriginal, setHasUserRepostedOriginal] = useState(false);

  const isRepost = !!post.repostedFrom;
  const originalPost = isRepost ? post.repostedFrom : post;
  const originalPostOwner = originalPost?.user;
  const repostingUser = isRepost ? post.user : null;
  const isLiked = originalPost?.likes?.includes(authUser?._id);
  const canDelete = authUser && authUser._id === post.user._id;

  const { repostPost, isReposting } = useRepostPost();
  const { likePost, isLiking } = useLikePost(originalPost);
  const { deletePost, isDeleting } = useDeletePosts(post);

  const formattedDate = formatPostDate(originalPost.createdAt);

  const navigateToPostPage = (e) => {
    if (e.target.closest("a") || e.target.closest("button")) {
      return;
    }
    navigate(`/${originalPostOwner.username}/post/${originalPost._id}`);
  };

  const handleInteractiveClick = (e) => {
    e.stopPropagation();
  };

  const handleDeletePostClick = (e) => {
    handleInteractiveClick(e);
    deletePost();
  };

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e);
    if (isLiking) return;
    likePost(originalPost.id);
  };

  const handleRepostClick = (e) => {
    handleInteractiveClick(e);
    if (isReposting) return;
    repostPost(originalPost._id);
  };

  const handleImageClick = (imageUrl, event) => {
    event.stopPropagation();
    if (openImageModal) {
      openImageModal(imageUrl);
    }
  };

  const navigateToReposterProfile = (e) => {
    e.stopPropagation();
    if (repostingUser) {
      navigate(`/profile/${repostingUser.username}`);
    }
  };

  useEffect(() => {
    const checkIfUserRepostedStatus = async () => {
      if (!authUser || !originalPost?._id) {
        setHasUserRepostedOriginal(false);
        return;
      }
      try {
        const response = await fetch(`/api/posts/check-repost/${originalPost._id}`, {
        });
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
            className="w-10 h-10 rounded-full overflow-hidden"
            onClick={() => {
              setFeedType("posts");
              handleInteractiveClick();
            }}
          >
            <img
              src={originalPostOwner.profileImg || "/avatar-placeholder.png"}
              alt={`${originalPostOwner.username}'s profile`}
            />
          </Link>
        </div>
        <div className="flex flex-col flex-1">
          <div className="flex gap-1 items-center relative">
            <Link
              to={`/profile/${originalPostOwner.username}`}
              className="font-bold flex items-center gap-1 hover:underline"
              onClick={() => {
                setFeedType("posts");
                handleInteractiveClick();
              }}
            >
              {originalPostOwner.fullName.length > 15
                ? originalPostOwner.fullName.slice(0, 15) + "..."
                : originalPostOwner.fullName}{" "}
              {originalPostOwner.isVerified && (
                <img src="/verified.png" className="size-[17px]" alt="Verified" />
              )}
            </Link>
            <span className="text-gray-500 flex gap-1 text-sm">
              <Link
                to={`/profile/${originalPostOwner.username}`}
                onClick={() => {
                  setFeedType("posts");
                  handleInteractiveClick();
                }}
              >
                @{originalPostOwner.username}
              </Link>
              <span>·</span>
              <span>{formattedDate}</span>
            </span>
            {canDelete && (
              <span className="flex justify-end flex-1">
                {!isDeleting && (
                  <div className="group hover:bg-red-600 duration-200 transition hover:text-red-600 hover:bg-opacity-15 rounded-full p-2 absolute -right-4 -top-2">
                    <FiTrash
                      className="group-hover:text-red-600 transition duration-200 cursor-pointer text-gray-500"
                      onClick={handleDeletePostClick}
                      size={20}
                    />
                  </div>
                )}
                {isDeleting && <LoadingSpinner size="sm" />}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 overflow-hidden">
            <span className="whitespace-pre-wrap">
              {renderClickableText(originalPost.text)}
            </span>
            {originalPost.img && (
              <img
                src={originalPost.img}
                className="h-80 object-contain rounded-2xl border border-gray-700"
                alt="post image"
                onClick={(e) => handleImageClick(originalPost.img, e)}
              />
            )}
          </div>

          <div className="flex justify-between mt-3">
            <div className="flex gap-4 items-center w-2/3 justify-between">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Post;
