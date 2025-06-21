import { FaHeart, FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FiTrash } from "react-icons/fi"; // Assuming this is your trash icon

import { Link, useNavigate } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatPostDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useDeletePosts } from "../../hooks/postsHooks/useDeletePosts"; // Assuming this is for deleting *any* post
import { useLikePost } from "../../hooks/postsHooks/useLikePosts"; // Assuming this handles liking
import { useRepostPost } from "../../hooks/postsHooks/useRepostPost"; // <--- NEW: Import the repost hook
import { renderClickableText } from "../../utils/textUtils";
import { useEffect, useState } from "react";

const Post = ({ post, openImageModal }) => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();

  // Determine if this post object itself is a repost
  const isRepost = !!post.repostedFrom;

  // The 'originalPost' object is the one whose content (text, img, likes, comments, actual creation date) we display.
  // If 'post' is a repost, 'originalPost' is the populated 'repostedFrom' object.
  // Otherwise, 'post' IS the original post.
  const originalPost = isRepost ? post.repostedFrom : post;

  const originalPostOwner = originalPost?.user; // Ensure originalPost.user exists

  // The 'repostingUser' is the user who performed the repost (this is 'post.user').
  // Only relevant if `isRepost` is true.
  const repostingUser = isRepost ? post.user : null;

  // Check if the current user is the author of the original content
  // const isMyOriginalPost = authUser?._id === originalPostOwner?._id;

  // Check if the current user is the one who performed *this specific repost*
  // const isMyRepost = isRepost && authUser?._id === repostingUser?._id;

  // Is the original post liked by the authUser?
  const isLiked = originalPost?.likes?.includes(authUser?._id);

  const canDelete = authUser && authUser._id === post.user._id;


  const [hasUserRepostedOriginal, setHasUserRepostedOriginal] = useState(false);

  // Repost functionality
  const { repostPost, isReposting } = useRepostPost();
  const { likePost, isLiking } = useLikePost(originalPost); // Pass originalPost to hook
  const { deletePost, isDeleting } = useDeletePosts(post);

  const formattedDate = formatPostDate(originalPost.createdAt); // Date of original post creation

  const handleInteractiveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeletePostClick = (e) => {
    handleInteractiveClick(e);
    deletePost(); // Deletes THIS specific post object (either original or a repost)
  };

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e);
    if (isLiking) return;
    // When liking, always send the ID of the ORIGINAL content
    // Assuming useLikePost hook takes the post object and extracts its ID,
    // or you can explicitly pass originalPost._id: `likePost(originalPost._id);`
    likePost(originalPost.id);
  };

  // ... inside handleRepostClick for optimistic update ...
  const handleRepostClick = (e) => {
    handleInteractiveClick(e);
    if (isReposting) return;
    setHasUserRepostedOriginal((prev) => {
      if(originalPost?.reposts?.includes(authUser?._id)) {
        return
      }
      return !prev
    });
    repostPost(originalPost._id);
    // Optimistic UI update: Toggle the state
  };

  const navigateToPostPage = (e) => {
    if (!e.defaultPrevented) {
      // Navigate to the post page using the ID of THIS specific post (original or repost)
      // The PostPage will then correctly render the content based on its 'repostedFrom' property.
      navigate(`/${post.user.username}/post/${post._id}`);
    }
  };

  const handleImageClick = (imageUrl, event) => {
    event.stopPropagation();
    if (openImageModal) {
      openImageModal(imageUrl);
    }
  };

  // New: Navigate to the profile of the user who reposted
  const navigateToReposterProfile = (e) => {
    e.stopPropagation(); // Crucial to prevent navigating to the post page
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
        const response = await fetch(`/api/posts/checkrepost/${originalPost._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
  }, [authUser, originalPost?._id]);

  if (!originalPost || !originalPostOwner) {
    console.warn("Post or originalPostOwner not fully populated:", post);
    return null; // Or render a fallback UI/error message
  }


  return (
    <div
      className="flex flex-col gap-0 py-3 px-4 border-b border-gray-700 cursor-pointer" // Changed to flex-col
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
            >
              {originalPostOwner.fullName.length > 15
                ? originalPostOwner.fullName.slice(0, 15) + "..."
                : originalPostOwner.fullName}{" "}
              {originalPostOwner.isVerified && (
                <img src="/verified.png" className="size-[17px]" alt="Verified" />
              )}
            </Link>
            <span className="text-gray-500 flex gap-1 text-sm">
              <Link to={`/profile/${originalPostOwner.username}`}>
                @{originalPostOwner.username}
              </Link>
              <span>·</span>
              <span>{formattedDate}</span>
            </span>
            {/* Delete button: only show if it's MY original post or MY specific repost */}
            {(canDelete) && (
              <span className="flex justify-end flex-1">
                {!isDeleting && (
                  <div className="hover:bg-red-600 duration-200 transition hover:text-red-600 hover:bg-opacity-15 rounded-full p-2 absolute -right-4 -top-2">
                    <FiTrash
                      className="cursor-pointer"
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
            {/* Display original post's text */}
            <span className="whitespace-pre-wrap">
              {renderClickableText(originalPost.text)}
            </span>
            {/* Display original post's image */}
            {originalPost.img && (
              <img
                src={originalPost.img}
                className="h-80 object-contain rounded-2xl border border-gray-700"
                alt="post image"
                onClick={(e) => handleImageClick(originalPost.img, e)}
              />
            )}
          </div>

          {/* Interaction buttons (comments, reposts, likes) - these apply to the ORIGINAL post counts */}
          <div className="flex justify-between mt-3">
            <div className="flex gap-4 items-center w-2/3 justify-between">
              <div
                className="flex items-center cursor-pointer group"
                onClick={navigateToPostPage} // Still navigates to this post's ID for comments
              >
                <div className="p-2 rounded-full group-hover:bg-sky-400 group-hover:bg-opacity-15 duration-200 transition">
                  <FaRegComment
                    className="w-4 h-4 text-slate-500 group-hover:text-sky-400 duration-200 transition"
                    strokeWidth={10}
                  />
                </div>
                <span className="text-sm text-slate-500 group-hover:text-sky-400 duration-200 transition">
                  {originalPost.comments?.length || 0}{" "}
                  {/* Use originalPost comments count */}
                </span>
              </div>

              {/* Repost Button */}
              <div
                className="flex items-center group cursor-pointer"
                onClick={handleRepostClick} // New repost handler
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

              {/* Like Button */}
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
                  className={`text-sm group-hover:text-pink-600 ${
                    isLiked ? "text-pink-600 " : "text-slate-500"
                  }`}
                >
                  {originalPost.likes?.length || 0} {/* Use originalPost likes count */}
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
