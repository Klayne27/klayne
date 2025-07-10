import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatPostDate } from "../../../utils/date";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { FiTrash } from "react-icons/fi";
import { FaHeart, FaRegHeart, FaReply } from "react-icons/fa";
import LoadingSpinner from "../LoadingSpinner";
import { useLikeComment } from "../../../hooks/commentHooks/useLikeComment";
import { useDeleteComment } from "../../../hooks/commentHooks/useDeleteComment";
import { useCreateComment } from "../../../hooks/commentHooks/useCreateComment";
import { useFetchComments } from "../../../hooks/commentHooks/useFetchComments";
import { renderClickableText } from "../../../utils/textUtils";
import { BiImageAdd } from "react-icons/bi";
import { IoClose } from "react-icons/io5";

const CommentItem = ({ comment, postId, onReplyClick, isPostOwner, openImageModal }) => {
  const { authUser } = useAuthUser();
  const isCommentOwner = authUser && authUser._id === comment.user._id;
  const isCommentLiked = authUser && comment.likes?.includes(authUser._id);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyImagePreview, setReplyImagePreview] = useState(null);
  const [replyImageFile, setReplyImageFile] = useState(null);
  const imageInputRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { likeComment, isLikingComment } = useLikeComment();
  const { deleteComment, isDeletingComment } = useDeleteComment();
  const { createComment, isCreatingComment } = useCreateComment(postId, comment._id);
  const {
    comments: replies,
    isLoading: isLoadingReplies,
    isFetchingNextPage: isFetchingNextRepliesPage,
    hasNextPage: hasNextRepliesPage,
    fetchNextPage: fetchNextRepliesPage,
  } = useFetchComments(postId, comment._id);

  const observerTarget = useRef(null);

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

  useEffect(() => {
    if (!observerTarget.current || !hasNextRepliesPage || isFetchingNextRepliesPage)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextRepliesPage &&
          !isFetchingNextRepliesPage
        ) {
          fetchNextRepliesPage();
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
  }, [hasNextRepliesPage, isFetchingNextRepliesPage, fetchNextRepliesPage, comment._id]);

  const handleLikeCommentClick = (e) => {
    e.stopPropagation();
    setIsAnimating(true);
    if (isLikingComment) return;
    likeComment({
      commentId: comment._id,
      postId: postId,
      parentCommentId: comment.parentComment?._id || null,
    });
  };

  const handleDeleteCommentClick = (e) => {
    e.stopPropagation();
    if (isDeletingComment) return;
    deleteComment({
      commentId: comment._id,
      postId: postId,
      parentCommentId: comment.parentComment?._id || null,
    });
  };

  const handleReplyClick = useCallback((e) => {
    e.stopPropagation();
    setShowReplyInput((prev) => !prev);
    setReplyText("");
    setReplyImagePreview(null);
    setReplyImageFile(null);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReplyImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setReplyImageFile(null);
      setReplyImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setReplyImageFile(null);
    setReplyImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!replyText.trim() && !replyImageFile) {
      return;
    }
    if (isCreatingComment) return;

    await createComment({ text: replyText, img: replyImagePreview });

    setReplyText("");
    setReplyImagePreview(null);
    setReplyImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setShowReplyInput(false);
  };

  const handleImageClick = (imageUrl, event) => {
    event.stopPropagation();
    if (openImageModal) {
      openImageModal(imageUrl);
    }
  };

  // Reset animation state after it completes
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Match this duration to the animation duration (0.3s)
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  if (!comment || !comment.user) {
    console.warn("Comment or comment user not populated:", comment);
    return null;
  }

  return (
    <div className="flex flex-col gap-0 md:gap-2 border-accent p-2 md:p-4 relative">
      <div className="flex gap-1 md:gap-3 items-start">
        <Link
          to={`/profile/${comment.user.username}`}
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="avatar">
            <div className="w-8 md:w-9 rounded-full">
              <img
                src={comment.user.profileImg || "/avatar-placeholder.png"}
                alt={`${comment.user.username}'s profile`}
              />
            </div>
          </div>
        </Link>

        <div className="flex flex-col flex-grow min-w-0">
          <div className="flex flex-wrap gap-1 items-center relative">
            <div className="flex gap-1 items-center flex-wrap">
              <Link
                to={`/profile/${comment.user.username}`}
                className="font-semibold text-sm hover:underline flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {comment.user.fullName}
              </Link>
              {comment.user.isVerified && (
                <img
                  src="/verified.png"
                  className="size-[17px] flex-shrink-0"
                  alt="Verified"
                />
              )}
              <Link
                to={`/profile/${comment.user.username}`}
                className="text-gray-500 text-sm truncate flex-grow min-w-0"
                onClick={(e) => e.stopPropagation()}
              >
                @{comment.user.username}
              </Link>
              {comment.createdAt && (
                <span className="text-gray-500 text-xs text-center flex items-center justify-center gap-1 flex-shrink-0 ml-auto">
                  <span className="text-[7px]">●</span>
                  {formatPostDate(comment.createdAt)}
                </span>
              )}
            </div>
            {(isCommentOwner || isPostOwner) && (
              <button
                className="group absolute right-0 top-0 text-red-500 rounded-full px-2.5 transition duration-200"
                onClick={handleDeleteCommentClick}
                disabled={isDeletingComment}
              >
                {isDeletingComment ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <FiTrash
                    size={17}
                    className="group-hover:text-red-600 transition duration-200 cursor-pointer text-slate-500"
                  />
                )}
              </button>
            )}
          </div>
          {comment.parentComment && comment.parentComment.user && (
            <div className="text-gray-500 text-xs mt-1 mb-2">
              Replying to{" "}
              <Link
                to={`/profile/${comment.parentComment.user.username}`}
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                @{comment.parentComment.user.username}
              </Link>
            </div>
          )}
          <p className="text-sm break-words mt-1">{renderClickableText(comment.text)}</p>

          {comment.img && (
            <img
              src={comment.img}
              alt="Comment attachment"
              className="mt-2 rounded-lg max-w-xs max-h-48 object-cover cursor-pointer"
              onClick={(e) => handleImageClick(comment.img, e)}
            />
          )}

          <div className="flex gap-4 mt-0 md:mt-2 items-center">
            <button
              onClick={handleLikeCommentClick}
              onTouchStart={() => handleTouchStart("like")}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              disabled={isLikingComment}
              className="flex items-center cursor-pointer group"
            >
              <div
                className={`
              rounded-full p-2 duration-200 transition relative
              ${!isTouchDevice ? "group-hover:bg-pink-600 group-hover:bg-opacity-15" : ""}
              ${
                isTouchDevice && activeButton === "like"
                  ? "bg-pink-600 bg-opacity-15"
                  : ""
              }
              cursor-pointer // Ensure the div itself is clickable
          `}
              >
                {!isCommentLiked && (
                  <FaRegHeart
                    className={`
                        w-4 h-4 text-slate-500 group-hover:text-pink-600 duration-200 transition
                        ${
                          isAnimating && !isCommentLiked ? "animate-like-bounce" : ""
                        } // Apply animation only when triggered and not liked yet
                    `}
                  />
                )}
                {isCommentLiked && (
                  <FaHeart
                    className={`
                        w-4 h-4 text-pink-600 duration-200 transition
                        ${
                          isAnimating && isCommentLiked ? "animate-like-bounce" : ""
                        } // Apply animation only when triggered and already liked
                    `}
                  />
                )}
              </div>
              <span
                className={`text-sm group-hover:text-pink-600 duration-200 transition ${
                  isCommentLiked ? "text-pink-600 " : "text-slate-500"
                }`}
              >
                {comment.likes?.length || 0}
              </span>
            </button>

            {authUser && (
              <button
                onClick={handleReplyClick}
                className="flex items-center cursor-pointer group"
              >
                <div className="p-2 rounded-full group-hover:bg-sky-400 group-hover:bg-opacity-15 duration-200 transition">
                  <FaReply
                    className="w-4 h-4 text-slate-500 group-hover:text-sky-400 duration-200 transition"
                    strokeWidth={10}
                  />
                </div>
                <span className="text-sm text-slate-500 group-hover:text-sky-400 duration-200 transition">
                  {comment.repliesCount || 0}
                </span>
              </button>
            )}
          </div>

          {showReplyInput && authUser && (
            <form onSubmit={handleSendReply} className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="avatar flex-shrink-0">
                  <div className="w-7 rounded-full">
                    <img
                      src={authUser.profileImg || "/avatar-placeholder.png"}
                      alt="Your profile"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Replying to @${comment.user.username}...`}
                  className="flex-1 pl-3 py-2 rounded-full bg-black/0  placeholder-gray-400 focus:outline-none text-sm"
                  disabled={isCreatingComment}
                />
                <button
                  type="submit"
                  className="hidden md:block px-3 py-1 bg-primary hover:bg-primary/80 text-sm rounded-full text-primary-content transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold " // Added flex classes
                  disabled={isCreatingComment || (!replyText.trim() && !replyImageFile)}
                >
                  Reply
                </button>
              </div>

              {replyImagePreview && (
                <div className="relative size-40 mt-2 self-start">
                  <img
                    src={replyImagePreview}
                    alt="Reply preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                    title="Remove image"
                  >
                    <IoClose />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                hidden
                ref={imageInputRef}
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current.click()}
                className="mt-2 text-primary hover:text-primary/80 transition duration-200 self-start p-1 rounded-full"
                title="Add image"
                disabled={isCreatingComment}
              >
                <BiImageAdd size={24} />
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="flex justify-center items-center">
        {isCreatingComment && <LoadingSpinner />}
      </div>
      {comment.repliesCount > 0 && (
        <div className="border-l border-accent mt-2">
          {isLoadingReplies ? (
            <div className="flex justify-center py-2">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <>
              {replies.map((reply) => (
                <div key={reply._id} className="ml-2">
                  <CommentItem
                    comment={reply}
                    postId={postId}
                    onReplyClick={onReplyClick}
                    isPostOwner={isPostOwner}
                    openImageModal={openImageModal}
                  />
                </div>
              ))}
              {hasNextRepliesPage && (
                <div className="flex justify-center py-2" ref={observerTarget}>
                  <button
                    onClick={() => fetchNextRepliesPage()}
                    disabled={isFetchingNextRepliesPage}
                    className="text-primary hover:underline text-sm"
                  >
                    {isFetchingNextRepliesPage ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      "Load more replies"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(CommentItem);
