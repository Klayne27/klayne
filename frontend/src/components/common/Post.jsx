import { FaHeart, FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";

import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatPostDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useDeletePosts } from "../../hooks/postsHooks/useDeletePosts";
import { useLikePost } from "../../hooks/postsHooks/useLikePosts";

const Post = ({ post }) => {
  const navigate = useNavigate();

  const { authUser } = useAuthUser();
  const { deletePost, isDeleting } = useDeletePosts(post);
  const { likePost, isLiking } = useLikePost(post);
  const { pid } = useParams();

  const postOwner = post.user;
  const isLiked = post.likes.includes(authUser?._id);
  const isMyPost = authUser?._id === post?.user?._id;

  const formattedDate = formatPostDate(post.createdAt);

  const handleInteractiveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };



  const handleDeletePostClick = (e) => {
    handleInteractiveClick(e);
    deletePost();
  };

  const handleLikePostClick = (e) => {
    handleInteractiveClick(e);
    if (isLiking) return;
    likePost();
  };

  const navigateToPostPage = (e) => {
    if (!e.defaultPrevented) {
      navigate(`/${post.user.username}/post/${post._id}`);
    }
  };

  return (
    <div
      className="flex gap-2 items-start py-3 px-4 border-b border-gray-700 cursor-pointer"
      onClick={navigateToPostPage}
    >
      <div className="avatar mt-1">
        <Link
          to={`/profile/${postOwner.username}`}
          className="w-10 h-10 rounded-full overflow-hidden"
        >
          <img
            src={postOwner.profileImg || "/avatar-placeholder.png"}
            alt={`${postOwner.username}'s profile`}
          />
        </Link>
      </div>

      <div className="flex flex-col flex-1">
        <div className="flex gap-1 items-center">
          <Link
            to={`/profile/${postOwner.username}`}
            className="font-bold flex items-center gap-1 hover:underline"
          >
            {postOwner.fullName.length > 15
              ? postOwner.fullName.slice(0, 15) + "..."
              : postOwner.fullName}{" "}
            {postOwner.isVerified && (
              <img src="/verified.png" className="size-[17px]" alt="Verified" />
            )}
          </Link>
          <span className="text-gray-500 flex gap-1 text-sm">
            <Link to={`/profile/${postOwner.username}`}>@{postOwner.username}</Link>
            <span>·</span>
            <span>{formattedDate}</span>
          </span>
          {isMyPost && (
            <span className="flex justify-end flex-1 ">
              {!isDeleting && (
                <div className="hover:bg-red-600 duration-200 transition hover:text-red-600 hover:bg-opacity-15 rounded-full p-2">
                  <FiTrash
                    className="cursor-pointer "
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
          <span>{post.text}</span>
          {post.img && (
            <img
              src={post.img}
              className="h-80 object-contain rounded-2xl border border-gray-700"
              alt="post image"
            />
          )}
        </div>

        <div className="flex justify-between mt-3">
          <div className="flex gap-4 items-center w-2/3 justify-between">
            <div
              className="flex items-center cursor-pointer group"
              onClick={navigateToPostPage}
            >
              <div className="p-2 rounded-full group-hover:bg-sky-400 group-hover:bg-opacity-15 duration-200 transition">
                <FaRegComment
                  className="w-4 h-4 text-slate-500 group-hover:text-sky-400 duration-200 transition"
                  strokeWidth={10}
                />
              </div>
              <span className="text-sm text-slate-500 group-hover:text-sky-400 duration-200 transition">
                {post.comments.length}
              </span>
            </div>
            <div
              className="flex items-center group cursor-pointer "
              onClick={handleInteractiveClick}
            >
              <div className="group-hover:bg-green-400 group-hover:bg-opacity-15 rounded-full p-1 duration-200 transition">
                <BiRepost className="w-6 h-6 text-slate-500 group-hover:text-green-500  duration-200 transition" />
              </div>
              <span className="text-sm text-slate-500 group-hover:text-green-500 duration-200 transition">
                0
              </span>
            </div>

            <div
              className="flex items-center group cursor-pointer rounded-full"
              onClick={handleLikePostClick}
            >
              <div className="group-hover:bg-pink-600 group-hover:bg-opacity-15 rounded-full p-2 duration-200 transition">
                {!isLiked && (
                  <FaRegHeart className="w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-600 duration-200 transition" />
                )}
                {isLiked && (
                  <FaHeart className="w-4 h-4 cursor-pointer text-pink-600  duration-200 transition" />
                )}
              </div>
              <span
                className={`text-sm group-hover:text-pink-600 ${
                  isLiked ? "text-pink-600 " : "text-slate-500"
                }`}
              >
                {post.likes.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Post;
