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

const PostPage = () => {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();

  const [commentText, setCommentText] = useState("");

  const { post, isLoading, isError, error } = useFetchPost(pid);
  const { addComment, isAddingComment } = useAddComment(pid);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment({ postId: pid, text: commentText });
    setCommentText("")
  };

  useEffect(() => {
    if (isError) {
      toast.error(error.message || "Could not load post.");
      navigate("/");
    }
  }, [isError, error, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
        <p className="text-gray-400">
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
    <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
      <div className="flex items-center gap-10 px-4 py-3.5 border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-bold text-xl">Post</h1>
      </div>

      <div className="border-gray-700">
        <Post post={post} />
      </div>

      {authUser && (
        <form
          onSubmit={handleAddComment}
          className="p-4 border-b border-gray-700 flex items-center gap-2"
        >
          <div className="avatar">
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
            className="flex-1 px-1 py-6 rounded-full bg-black text-white placeholder-gray-400  focus:outline-none text-xl"
            disabled={isAddingComment}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary hover:bg-[#1d9cf0d8] text-white rounded-full hover:bg-blue-600 transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default"
            disabled={isAddingComment || !commentText.trim()}
          >
            Reply
          </button>
        </form>
      )}

      <div className=" flex flex-col">
        {post.comments && post.comments.length > 0 ? (
          post.comments.map((comment) => (
            <div
              key={comment._id}
              className="flex gap-3 text-white border-b border-gray-700 p-4"
            >
              <Link to={`/profile/${comment.user?.username || ""}`}>
                <div className="avatar">
                  <div className="w-8 rounded-full">
                    <img src={comment.user?.profileImg || "/avatar-placeholder.png"} />
                  </div>
                </div>
              </Link>
              <div className="flex flex-col">
                <div className="flex gap-1 items-center">
                  <Link
                    to={`/profile/${comment.user?.username || ""}`}
                    className="font-semibold text-sm hover:underline"
                  >
                    {comment.user?.fullName}
                  </Link>
                  {comment.user.isVerified && <img src="/verified.png" className="size-[17px]" />}
                  <Link
                    to={`/profile/${comment.user?.username || ""}`}
                    className="text-gray-500 text-sm"
                  >
                    @{comment.user?.username}
                  </Link>
                  {comment.createdAt && (
                    <span className="text-gray-500 text-xs text-center flex items-center justify-center gap-1">
                      <span className="text-[7px]">●</span>{" "}
                      {formatPostDate(comment.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm">{comment.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center mt-4">
            No comments yet. Be the first to reply!
          </p>
        )}
      </div>
    </div>
  );
};

export default PostPage;
