import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Post from "../../components/common/posts/Post";
import CommentItem from "../../components/common/posts/CommentItem";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useFetchPost } from "../../hooks/postsHooks/useFetchPost";
import { useCreateComment } from "../../hooks/commentHooks/useCreateComment";
import { useFetchComments } from "../../hooks/commentHooks/useFetchComments";

const PostPage = ({ openImageModal, setFeedType }) => {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();

  const [commentText, setCommentText] = useState("");
  const [replyingToComment, setReplyingToComment] = useState(null);

  const commentsListRef = useRef(null);
  const observerTarget = useRef(null);

  const { post, isLoading, isError, error, refetch: refetchPost } = useFetchPost(pid);
  const {
    comments,
    isLoading: isLoadingComments,
    isFetchingNextPage: isFetchingNextCommentsPage,
    hasNextPage: hasNextCommentsPage,
    fetchNextPage: fetchNextCommentsPage,
    refetch: refetchComments,
  } = useFetchComments(pid, null);

  const { createComment, isCreatingComment } = useCreateComment(pid, null);

  const displayPost = post?.repostedFrom || post;

  const handleAddOrReplyComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isCreatingComment) return;

    if (replyingToComment) {
      await createComment({ text: commentText, parentCommentId: replyingToComment._id });
    } else {
      await createComment({ text: commentText });
    }
    setCommentText("");
    setReplyingToComment(null);
  };

  const handleSetReplyingToComment = useCallback((comment) => {
    setReplyingToComment(comment);
  }, []);

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

  useEffect(() => {
    if (pid) {
      refetchComments();
      refetchPost();
    }
  }, [pid, refetchComments, refetchPost]);

  useEffect(() => {
    if (!observerTarget.current || !hasNextCommentsPage || isFetchingNextCommentsPage)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextCommentsPage &&
          !isFetchingNextCommentsPage
        ) {
          fetchNextCommentsPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [fetchNextCommentsPage, hasNextCommentsPage, isFetchingNextCommentsPage, pid]);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center h-screen w-full">
        <LoadingSpinner size="lg" />
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

      <div className="border-gray-700">
        <Post
          post={displayPost}
          openImageModal={openImageModal}
          setFeedType={setFeedType}
        />
      </div>

      {authUser && (
        <form
          onSubmit={handleAddOrReplyComment}
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
            placeholder={"Post your comment"}
            className="flex-1 pl-3 py-2 rounded-full w-1 bg-black text-white placeholder-gray-400 focus:outline-none text-base sm:text-lg"
            disabled={isCreatingComment}
          />
          <button
            type="submit"
            className="px-2 py-1 md:px-4 md:py-2 bg-primary hover:bg-[#1d9cf0d8] text-sm md:text-md text-white rounded-full transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default flex-shrink-0"
            disabled={isCreatingComment || !commentText.trim()}
          >
            {"Comment"}
          </button>
        </form>
      )}

      <div className="flex flex-col" ref={commentsListRef}>
        {isLoadingComments ? (
          <div className="flex justify-center h-full items-center py-4">
            <LoadingSpinner size="md" />
          </div>
        ) : comments.length > 0 ? (
          <>
            {comments.map((comment) => (
              <div key={comment._id} id={`comment-${comment._id}`}>
                <CommentItem
                  comment={comment}
                  postId={displayPost._id}
                  onReplyClick={handleSetReplyingToComment}
                  isPostOwner={authUser?._id === displayPost.user?._id}
                />
              </div>
            ))}
            {hasNextCommentsPage && (
              <div className="flex justify-center py-4" ref={observerTarget}>
                <button
                  onClick={() => fetchNextCommentsPage()}
                  disabled={isFetchingNextCommentsPage}
                  className="text-primary hover:underline"
                >
                  {isFetchingNextCommentsPage ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    "Load more comments"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-400 text-center mt-4 p-4">
            No comments yet. Be the first to add one!
          </p>
        )}
      </div>
    </div>
  );
};

export default PostPage;
