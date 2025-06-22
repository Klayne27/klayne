import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Post from "../../components/common/Post"; 
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { formatPostDate } from "../../utils/date";
import { useFetchPost } from "../../hooks/postsHooks/useFetchPost";
import { useAddComment } from "../../hooks/postsHooks/useAddComment";
import { useDeleteComment } from "../../hooks/postsHooks/useDeleteComment";
import { FiTrash } from "react-icons/fi";
import { useLikeComment } from "../../hooks/postsHooks/useLikeComment";
import { FaHeart, FaRegHeart } from "react-icons/fa";

const PostPage = ({ openImageModal }) => {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();


  const [commentText, setCommentText] = useState("");

  const { post, isLoading, isError, error, refetch } = useFetchPost(pid);
  const { addComment, isAddingComment } = useAddComment(pid);
  const { deleteComment, isDeletingComment } = useDeleteComment();
  const { likeComment, isLikingComment } = useLikeComment();

  const displayPost = post?.repostedFrom || post;



  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment({ postId: displayPost._id, text: commentText });
    setCommentText("");
  };

  const handleDeleteComment = (commentId) => {
    deleteComment({ postId: displayPost._id, commentId });
  };


  const handleLikeCommentClick = (commentId) => {
    likeComment({ postId: displayPost._id, commentId }); // Use the likeComment from the hook
  };

  useEffect(() => {
    if (!isLoading && (isError || !post)) {
      if (isError) {
        toast.error(error?.message || "Could not load post.");
      } else if (!post) {
        toast.error("The post you are looking for does not exist or has been deleted.");
      }
      navigate("/", { replace: true });
    }
  }, [isLoading, isError, error, post, navigate]);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center h-screen w-full">
        <LoadingSpinner className="w-20 h-20" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen w-full text-white p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Post Not Found</h2>
        <p className="text-gray-400 text-center">
          The post you are looking for does not exist or has been deleted.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 border-r border-gray-700 min-h-screen w-full overflow-x-hidden md:max-w-3xl lg:max-w-4xl mx-auto">
      <div className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-bold text-xl flex-1 truncate">Post</h1>
      </div>

      <div className="border-b border-gray-700">
        <Post post={displayPost} openImageModal={openImageModal} />
      </div>

      {authUser && (
        <form
          onSubmit={handleAddComment}
          className="p-4 border-b border-gray-700 flex items-center justify-between sm:gap-4"
        >
          <div className="avatar flex-shrink-0">
            <div className="w-9 rounded-full">
              <img
                src={authUser?.profileImg || "/avatar-placeholder.png"}
                alt="Your profile"
              />
            </div>
          </div>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Post your reply"
            className="flex-1 pl-3 py-2 rounded-full w-1 bg-black text-white placeholder-gray-400 focus:outline-none text-base sm:text-lg"
            disabled={isAddingComment}
          />
          <button
            type="submit"
            className="px-2 py-1 md:px-4 md:py-2 bg-primary hover:bg-[#1d9cf0d8] text-sm md:text-md text-white rounded-full transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default flex-shrink-0"
            disabled={isAddingComment || !commentText.trim()}
          >
            Reply
          </button>
        </form>
      )}

      <div className="flex flex-col">
        {displayPost.comments && displayPost.comments.length > 0 ? (
          displayPost.comments.map((comment) => {
            const isCommentLiked = comment.likes?.includes(authUser?._id);

            return (
              <div
                key={comment._id}
                className="flex gap-3 text-white border-b border-gray-700 p-4 relative items-start"
              >
                <Link
                  to={`/profile/${comment.user?.username || ""}`}
                  className="flex-shrink-0"
                >
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      <img
                        src={comment.user?.profileImg || "/avatar-placeholder.png"}
                        alt={`${comment.user?.username}'s profile`}
                      />
                    </div>
                  </div>
                </Link>

                <div className="flex flex-col flex-grow min-w-0">
                  <div className="flex flex-wrap gap-1 items-center relative">
                    <div className="flex gap-1">
                      <Link
                        to={`/profile/${comment.user?.username || ""}`}
                        className="font-semibold text-sm hover:underline flex-shrink-0"
                      >
                        {comment.user?.fullName}
                      </Link>
                      {comment.user?.isVerified && ( // Ensure comment.user is populated
                        <img
                          src="/verified.png"
                          className="size-[17px] flex-shrink-0"
                          alt="Verified"
                        />
                      )}
                      <Link
                        to={`/profile/${comment.user?.username || ""}`}
                        className="text-gray-500 text-sm truncate flex-grow min-w-0"
                      >
                        @{comment.user?.username}
                      </Link>
                      {comment.createdAt && (
                        <span className="text-gray-500 text-xs text-center flex items-center justify-center gap-1 flex-shrink-0 ml-auto">
                          <span className="text-[7px]">●</span>
                          {formatPostDate(comment.createdAt)}
                        </span>
                      )}
                    </div>

                    {authUser?._id === comment.user?._id && (
                      <button
                        className="group absolute right-0 top-0 text-red-500 rounded-full hover:bg-red-600 hover:bg-opacity-15 p-1 transition duration-200" // Added p-1 for better hit area
                        onClick={() => handleDeleteComment(comment._id)}
                        disabled={isDeletingComment} // Assuming useDeleteComment has a general isDeletingComment state
                      >
                        {isDeletingComment ? ( // Could improve this to show spinner only for the specific comment being deleted
                          <LoadingSpinner size="sm" />
                        ) : (
                          <FiTrash
                            size={16}
                            className="group-hover:text-red-600 transition duration-200 cursor-pointer text-gray-500"
                          />
                        )}{" "}
                      </button>
                    )}
                  </div>
                  <p className="text-sm break-words mt-1">{comment.text}</p>

                  {/* NEW: Comment like section */}
                  <div
                    className="flex items-center group cursor-pointer mt-2"
                    onClick={() => handleLikeCommentClick(comment._id)}
                  >
                    <div
                      className={`group-hover:bg-pink-600 group-hover:bg-opacity-15 rounded-full p-2 duration-200 transition`}
                    >
                      {isLikingComment ? ( // Show spinner if any comment like is in progress
                        <LoadingSpinner size="xs" /> // Or a small custom spinner/icon
                      ) : (
                        <>
                          {!isCommentLiked && (
                            <FaRegHeart className="w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-600 duration-200 transition" />
                          )}
                          {isCommentLiked && (
                            <FaHeart className="w-4 h-4 cursor-pointer text-pink-600 duration-200 transition" />
                          )}
                        </>
                      )}
                    </div>
                    <span
                      className={`text-sm group-hover:text-pink-600 duration-200 transition ${
                        isCommentLiked ? "text-pink-600" : "text-slate-500"
                      }`}
                    >
                      {comment.likes?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-center mt-4 p-4">
            No comments yet. Be the first to reply!
          </p>
        )}
      </div>
    </div>
  );
};

export default PostPage;
