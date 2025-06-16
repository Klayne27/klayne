import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaArrowLeft } from "react-icons/fa";

import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Post from "../../components/common/Post";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { formatPostDate } from "../../utils/date";

const fetchPost = async (postId) => {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch post");
  }
  return res.json();
};

// New mutation function for adding comments
const addCommentApi = async ({ postId, text }) => {
  const res = await fetch(`/api/posts/comment/${postId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to add comment");
  }
  return res.json(); // Backend should return the updated post or the new comment
};

const PostPage = () => {
  const { pid } = useParams(); // 'pid' corresponds to ':pid' in your route
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Get current logged-in user for comments

  const [commentText, setCommentText] = useState(""); // State for comment input

  const {
    data: post,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["post", pid], // Query key includes post ID for unique caching
    queryFn: () => fetchPost(pid),
    enabled: !!pid, // Only fetch if pid is available
  });

  // Mutation for adding a comment
  const addCommentMutation = useMutation({
    mutationFn: addCommentApi,
    onSuccess: (updatedPost) => {
      // Backend should ideally return the updated post
      toast.success("Comment added successfully!");
      setCommentText(""); // Clear the input field
      // Invalidate the 'post' query to refetch the updated post data
      queryClient.invalidateQueries(["post", pid]);
      // Also invalidate the 'posts' query if you have a feed that shows comment counts
      queryClient.invalidateQueries(["posts"]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add comment.");
    },
  });

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ postId: pid, text: commentText });
  };

  useEffect(() => {
    if (isError) {
      toast.error(error.message || "Could not load post.");
      navigate("/"); // Redirect to home if post not found or error
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
      {/* Header with back button and title */}
      <div className="flex items-center gap-2 p-4 border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <FaArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-xl text-white">Post</h1>
      </div>

      {/* Display the main post */}
      <div className="border-gray-700">
        <Post post={post} />
      </div>

      {/* Comment Input Section */}
      {authUser && ( // Only show comment input if user is logged in
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
            disabled={addCommentMutation.isPending}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-full hover:bg-blue-600 transition duration-300 disabled:bg-gray-600 disabled:text-black font-bold disabled:cursor-default"
            disabled={addCommentMutation.isPending || !commentText.trim()}
          >
            Reply
          </button>
        </form>
      )}

      {/* Comments List */}
      <div className=" flex flex-col">
        {post.comments && post.comments.length > 0 ? (
          post.comments.map((comment) => (
            <div key={comment._id} className="flex gap-3 text-white border-b border-gray-700 p-4">
              {/*
                IMPORTANT: For `comment.user.username` and `comment.user.profilePic` to work,
                your backend MUST populate the 'user' field in the comments array.
                See the "Backend Enhancement" section below.
              */}
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
                  <img src="/verified.png" className="size-[17px]" />
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
