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
import { useDebounce } from "../../../hooks/useDebounce";
import { useSearchUsers } from "../../../hooks/usersHooks/userSearchUsers";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import RepliesSkeleton from "../../skeletons/RepliesSkeleton";

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
  const [isMobile, setIsMobile] = useState(false);

  // --- STATES FOR MENTIONS IN REPLIES ---
  const [replyMentionSearchTerm, setReplyMentionSearchTerm] = useState("");
  const debouncedReplyMentionSearchTerm = useDebounce(replyMentionSearchTerm, 300);
  const [showReplyMentionSuggestions, setShowReplyMentionSuggestions] = useState(false);
  const replyInputRef = useRef(null); // Ref for reply input
  const { suggestedUsers, isLoadingSuggestedUsers } =
    useSearchUsers(
      debouncedReplyMentionSearchTerm,
    );
  // --- END MENTION STATES ---

  const { likeComment, isLikingComment } = useLikeComment();
  const { deleteComment, isDeletingComment } = useDeleteComment();
  const { createComment, isCreatingComment } = useCreateComment(postId, comment._id);

  // --- NEW STATE TO CONTROL REPLIES FETCHING/DISPLAY ---
  const [showRepliesSection, setShowRepliesSection] = useState(false); // Controls rendering of the entire replies section

  const {
    comments: replies,
    isLoading: isLoadingReplies,
    isFetchingNextPage: isFetchingNextRepliesPage,
    hasNextPage: hasNextRepliesPage,
    fetchNextPage: fetchNextRepliesPage,
  } = useFetchComments(postId, comment._id, showRepliesSection); // Pass showRepliesSection to enable fetching

  const observerTarget = useRef(null);

  // --- NEW STATE AND EFFECTS FOR TOUCH FEEDBACK ---
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButton, setActiveButton] = useState(null);

  useEffect(() => {
    const checkIsMobile = () => {
      const mobileBreakpoint = 768; // px
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);
  // --- END MOBILE DETECTION ---

  // --- TEXTAREA HEIGHT ADJUSTMENT ---
  const adjustTextareaHeight = useCallback(() => {
    const textarea = replyInputRef.current; // Use the new ref
    if (textarea) {
      textarea.style.height = "auto"; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [replyText, adjustTextareaHeight]); // Trigger on replyText change
  // --- END TEXTAREA HEIGHT ADJUSTMENT ---

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
      }, 150);
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

  // Intersection Observer for infinite scrolling replies
  useEffect(() => {
    if (
      !observerTarget.current ||
      !hasNextRepliesPage ||
      isFetchingNextRepliesPage ||
      !showRepliesSection
    )
      return; // Only observe if replies section is open

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
  }, [
    hasNextRepliesPage,
    isFetchingNextRepliesPage,
    fetchNextRepliesPage,
    comment._id,
    showRepliesSection,
  ]);

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

  // --- NEW: Handle pasting an image into the input field ---
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/") && item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          setReplyImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setReplyImagePreview(reader.result);
          };
          reader.readAsDataURL(file);
          e.preventDefault(); // Prevent text from being pasted if an image is found
          break; // Stop after finding the first image
        }
      }
    }
  }, []);

  // --- HANDLER FOR OPENING/CLOSING REPLY INPUT ---
  const handleToggleReplyInput = useCallback((e) => {
    e.stopPropagation();
    setShowReplyInput((prev) => !prev);
    // Clear previous reply state when toggling
    setReplyText("");
    setReplyImagePreview(null);
    setReplyImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setReplyMentionSearchTerm("");
    setShowReplyMentionSuggestions(false);
  }, []);

  // --- HANDLER FOR TOGGLING REPLIES SECTION VISIBILITY ---
  const handleToggleRepliesVisibility = useCallback((e) => {
    e.stopPropagation();
    setShowRepliesSection((prev) => !prev);
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

  const handleReplyTextChange = (e) => {
    const newText = e.target.value;
    setReplyText(newText);

    const lastAtIndex = newText.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const potentialMention = newText.substring(lastAtIndex + 1);
      if (potentialMention.length > 0 && !/\s/.test(potentialMention)) {
        setReplyMentionSearchTerm(potentialMention);
        setShowReplyMentionSuggestions(true);
      } else {
        setReplyMentionSearchTerm("");
        setShowReplyMentionSuggestions(false);
      }
    } else {
      setReplyMentionSearchTerm("");
      setShowReplyMentionSuggestions(false);
    }
  };

  const handleSelectReplyMention = useCallback((username) => {
    const currentText = replyText;
    const lastAtIndex = currentText.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textFromAt = currentText.substring(lastAtIndex);
      const match = textFromAt.match(/^@([a-zA-Z0-9_]*)/);

      let partialMentionLength = 0;
      if (match && match[1]) {
        partialMentionLength = match[1].length;
      }

      const replaceStartIndex = lastAtIndex;
      const replaceEndIndex = lastAtIndex + 1 + partialMentionLength;

      const newText =
        currentText.substring(0, replaceStartIndex) +
        `@${username} ` +
        currentText.substring(replaceEndIndex);

      setReplyText(newText);
      setReplyMentionSearchTerm("");
      setShowReplyMentionSuggestions(false);

      setTimeout(() => {
        const input = replyInputRef.current;
        if (input) {
          const newCursorPos =
            currentText.substring(0, replaceStartIndex).length + `@${username} `.length;
          input.setSelectionRange(newCursorPos, newCursorPos);
          input.focus();
        }
      }, 0);
    }
  }, [replyText])

  const handleSendReply = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // if (!replyText.trim() && !replyImageFile) {
    //   return;
    // }
    if (isCreatingComment) return;

    await createComment({ text: replyText, img: replyImagePreview });

    setReplyText("");
    setReplyImagePreview(null);
    setReplyImageFile(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setShowReplyInput(false);
    setReplyMentionSearchTerm("");
    setShowReplyMentionSuggestions(false);
    setShowRepliesSection(true); // Automatically show replies section after sending a reply
  }, [createComment, isCreatingComment, replyText, replyImageFile, replyImagePreview]);

  const handleImageClick = (imageUrl, event) => {
    event.stopPropagation();
    if (openImageModal) {
      openImageModal(imageUrl);
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (showReplyMentionSuggestions && suggestedUsers.length > 0) {
          e.preventDefault();
          // Automatically select the first suggestion on Enter
          handleSelectReplyMention(suggestedUsers[0].username);
        } else if (isMobile) {
          e.preventDefault(); // Prevent default form submission
          const { current: input } = replyInputRef;
          if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newValue =
              replyText.substring(0, start) + "\n" + replyText.substring(end);
            setReplyText(newValue);
            setTimeout(() => {
              input.selectionStart = input.selectionEnd = start + 1;
            }, 0);
          }
        } else {
          // Desktop logic
          if (e.shiftKey) {
            e.preventDefault(); // Prevent default form submission
            const { current: input } = replyInputRef;
            if (input) {
              const start = input.selectionStart;
              const end = input.selectionEnd;
              const newValue =
                replyText.substring(0, start) + "\n" + replyText.substring(end);
              setReplyText(newValue);
              setTimeout(() => {
                input.selectionStart = input.selectionEnd = start + 1;
              }, 0);
            }
          } else {
            // On desktop, Enter sends the message (and not pending)
            if (!isCreatingComment) {
              e.preventDefault(); // Prevent default new line behavior for Enter
              handleSendReply(e);
            }
          }
        }
      }
    },
    [
      isMobile,
      replyInputRef,
      replyText,
      setReplyText,
      showReplyMentionSuggestions,
      suggestedUsers,
      handleSelectReplyMention,
      isCreatingComment,
      handleSendReply,
    ]
  );

  // Reset animation state after it completes
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
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
              {comment.user.isGoldVerified && (
                <img
                  src="/gold-verified.png"
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
                                cursor-pointer
                            `}
              >
                {!isCommentLiked && (
                  <FaRegHeart
                    className={`
                                            w-4 h-4 text-slate-500 group-hover:text-pink-600 duration-200 transition
                                            ${
                                              isAnimating && !isCommentLiked
                                                ? "animate-like-bounce"
                                                : ""
                                            }
                                        `}
                  />
                )}
                {isCommentLiked && (
                  <FaHeart
                    className={`
                                            w-4 h-4 text-pink-600 duration-200 transition
                                            ${
                                              isAnimating && isCommentLiked
                                                ? "animate-like-bounce"
                                                : ""
                                            }
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
              // --- REPLY BUTTON ---
              <button
                onClick={handleToggleReplyInput}
                className="flex items-center cursor-pointer group"
                onTouchStart={() => handleTouchStart("reply")} // Add touch start
                onTouchEnd={handleTouchEnd} // Add touch end
                onTouchCancel={handleTouchCancel} // Add touch cancel
              >
                <div
                  className={`p-2 rounded-full duration-200 transition
                  ${
                    !isTouchDevice
                      ? "group-hover:bg-sky-400 group-hover:bg-opacity-15"
                      : ""
                  }
                  ${
                    isTouchDevice && activeButton === "reply"
                      ? "bg-sky-400 bg-opacity-15"
                      : ""
                  }
                `}
                >
                  {showReplyInput ? (
                    <FaReply
                      className="w-4 h-4 rotate-180 text-sky-400 duration-200 transition"
                      strokeWidth={10}
                    />
                  ) : (
                    <FaReply
                      className={`w-4 h-4 duration-200 transition
                        ${!isTouchDevice ? "text-slate-500 group-hover:text-sky-400" : ""}
                        ${
                          isTouchDevice && activeButton !== "reply"
                            ? "text-slate-500"
                            : activeButton === "reply"
                            ? "text-sky-400"
                            : "text-slate-500"
                        }
                    `}
                      strokeWidth={10}
                    />
                  )}
                </div>
                <span
                  className={`text-sm duration-200 transition
                    ${
                      !isTouchDevice
                        ? showReplyInput
                          ? "text-sky-400"
                          : "text-slate-500 group-hover:text-sky-400"
                        : ""
                    }
                    ${
                      isTouchDevice
                        ? showReplyInput
                          ? "text-sky-400"
                          : activeButton === "reply"
                          ? "text-sky-400"
                          : "text-slate-500"
                        : ""
                    }
                `}
                >
                  Reply
                </span>
              </button>
            )}

            {/* --- VIEW/HIDE REPLIES BUTTON --- */}
            {comment.repliesCount > 0 && (
              <button
                onClick={handleToggleRepliesVisibility}
                className="flex items-center cursor-pointer group"
                onTouchStart={() => handleTouchStart("viewReplies")} // Add touch start
                onTouchEnd={handleTouchEnd} // Add touch end
                onTouchCancel={handleTouchCancel} // Add touch cancel
              >
                <div
                  className={`p-2 rounded-full duration-200 transition
                  ${
                    !isTouchDevice
                      ? "group-hover:bg-blue-500 group-hover:bg-opacity-15"
                      : ""
                  }
                  ${
                    isTouchDevice && activeButton === "viewReplies"
                      ? "bg-blue-500 bg-opacity-15"
                      : ""
                  }
                `}
                >
                  {showRepliesSection ? (
                    <FaChevronUp
                      className="w-4 h-4 text-blue-500 duration-200 transition"
                      strokeWidth={10}
                    />
                  ) : (
                    <FaChevronDown
                      className={`w-4 h-4 duration-200 transition
                        ${
                          !isTouchDevice ? "text-slate-500 group-hover:text-blue-500" : ""
                        }
                        ${
                          isTouchDevice && activeButton !== "viewReplies"
                            ? "text-slate-500"
                            : activeButton === "viewReplies"
                            ? "text-blue-500"
                            : "text-slate-500"
                        }
                    `}
                      strokeWidth={10}
                    />
                  )}
                </div>
                <span
                  className={`text-sm duration-200 transition
                    ${
                      !isTouchDevice
                        ? showRepliesSection
                          ? "text-blue-500"
                          : "text-slate-500 group-hover:text-blue-500"
                        : ""
                    }
                    ${
                      isTouchDevice
                        ? showRepliesSection
                          ? "text-blue-500"
                          : activeButton === "viewReplies"
                          ? "text-blue-500"
                          : "text-slate-500"
                        : ""
                    }
                `}
                >
                  {comment.repliesCount || 0}{" "}
                  {showRepliesSection ? "Hide Replies" : "View Replies"}
                </span>
              </button>
            )}
          </div>

          {showReplyInput && authUser && (
            <form
              onSubmit={handleSendReply}
              className="mt-4 flex flex-col gap-2 relative"
            >
              <div className="flex items-center gap-2">
                <div className="avatar flex-shrink-0">
                  <div className="w-7 rounded-full">
                    <img
                      src={authUser.profileImg || "/avatar-placeholder.png"}
                      alt="Your profile"
                    />
                  </div>
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={replyInputRef}
                    type="text"
                    value={replyText}
                    onChange={handleReplyTextChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    rows={1}
                    placeholder={`Replying to @${comment.user.username}...`}
                    className="w-full pl-3  bg-black/0 placeholder-gray-400 focus:outline-none text-sm resize-none max-h-[140px] overflow-y-auto" // Added resize-none, max-height, and overflow-y-auto
                    disabled={isCreatingComment}
                  />
                  {showReplyMentionSuggestions &&
                    debouncedReplyMentionSearchTerm.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-base-200 border border-accent rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {isLoadingSuggestedUsers ? (
                          <div className="p-2 text-center">
                            <LoadingSpinner size="sm" />
                          </div>
                        ) : suggestedUsers.length > 0 ? (
                          suggestedUsers.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center gap-2 p-2 hover:bg-secondary cursor-pointer"
                              onClick={() => handleSelectReplyMention(user.username)}
                            >
                              <div className="avatar">
                                <div className="w-7 rounded-full">
                                  <img
                                    src={user.profileImg || "/avatar-placeholder.png"}
                                    alt={user.username}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold text-xs">{user.fullName}</p>
                                <p className="text-gray-400 text-xs">@{user.username}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="p-2 text-gray-400">No users found.</p>
                        )}
                      </div>
                    )}
                </div>

                <button
                  type="submit"
                  className="hidden md:block px-3 py-1 bg-primary hover:bg-primary/80 text-sm rounded-full text-primary-content transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold "
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
                    className="absolute -top-2 -right-2 bg-gray-500 text-white transition duration-200 hover:bg-gray-600 rounded-full p-1 text-xs"
                    title="Remove image"
                  >
                    <IoClose size={15} />
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
      {/* Conditional rendering for replies section, based on showRepliesSection */}
      {comment.repliesCount > 0 && showRepliesSection && (
        <div className="border-l border-accent mt-2">
          {isLoadingReplies ? (
            <div className="flex flex-col justify-center py-2 md:py-4 px-4 md:px-5">
              <RepliesSkeleton />
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
