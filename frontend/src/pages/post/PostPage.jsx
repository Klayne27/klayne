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
import { BiImageAdd } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { useDebounce } from "../../hooks/useDebounce";
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers";
import CommentsSkeleton from "../../components/skeletons/CommentsSkeleton";

const PostPage = ({ openImageModal, setFeedType }) => {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();

  const [commentText, setCommentText] = useState("");
  const [replyingToComment, setReplyingToComment] = useState(null);

  const [mainCommentMediaPreview, setMainCommentMediaPreview] = useState(null);
  const [mainCommentMediaFile, setMainCommentMediaFile] = useState(null);
  const mainCommentMediaInputRef = useRef(null);

  // --- NEW STATES FOR MENTIONS ---
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const debouncedMentionSearchTerm = useDebounce(mentionSearchTerm, 300);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const commentInputRef = useRef(null); // RENAMED: was commentInputRef, now points to textarea

  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(
    debouncedMentionSearchTerm
  );
  // --- END NEW STATES ---

  const commentsListRef = useRef(null);
  const observerTarget = useRef(null);

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
    const textarea = commentInputRef.current; // Use the new ref
    if (textarea) {
      textarea.style.height = "auto"; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [commentText, adjustTextareaHeight]); // Trigger on commentText change
  // --- END TEXTAREA HEIGHT ADJUSTMENT ---

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

  // Add this new function
  const handlePaste = (e) => {
    e.preventDefault(); // Prevent default paste behavior

    const items = e.clipboardData.items;
    let fileFound = false;

    for (let i = 0; i < items.length; i++) {
      if (
        items[i].type.indexOf("image") !== -1 ||
        items[i].type.indexOf("video") !== -1
      ) {
        const file = items[i].getAsFile();

        if (file) {
          // Validate file type (image or video)
          if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
            toast.error(
              "Pasted content is not a supported image or video type for comments."
            );
            setMainCommentMediaFile(null);
            setMainCommentMediaPreview(null);
            if (mainCommentMediaInputRef.current)
              mainCommentMediaInputRef.current.value = "";
            return;
          }

          // Validate file size (20MB limit for comments)
          const MAX_COMMENT_MEDIA_SIZE_MB = 20;
          if (file.size > MAX_COMMENT_MEDIA_SIZE_MB * 1024 * 1024) {
            toast.error(
              `Pasted media size exceeds ${MAX_COMMENT_MEDIA_SIZE_MB}MB limit for comments.`
            );
            setMainCommentMediaFile(null);
            setMainCommentMediaPreview(null);
            if (mainCommentMediaInputRef.current)
              mainCommentMediaInputRef.current.value = "";
            return;
          }

          setMainCommentMediaFile(file);
          setMainCommentMediaPreview(URL.createObjectURL(file));
          fileFound = true;
          // Optionally, clear the text input if media is pasted
          // setCommentText("");
          break; // Process only the first image/video found
        }
      }
    }

    // If no media was found, paste as plain text
    if (!fileFound) {
      const pastedText = e.clipboardData.getData("text/plain");
      if (pastedText) {
        const inputElement = commentInputRef.current; // Use the ref for the comment input
        if (inputElement) {
          const cursorStart = inputElement.selectionStart;
          const cursorEnd = inputElement.selectionEnd;

          const newText =
            commentText.substring(0, cursorStart) +
            pastedText +
            commentText.substring(cursorEnd);

          setCommentText(newText);

          // Restore cursor position after paste
          setTimeout(() => {
            if (inputElement) {
              inputElement.setSelectionRange(
                cursorStart + pastedText.length,
                cursorStart + pastedText.length
              );
              inputElement.focus();
            }
          }, 0);
        }
      }
    }
  };

  const handleMainCommentMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(
          "Unsupported file type. Please select an image or a video for your comment."
        );
        setMainCommentMediaFile(null);
        setMainCommentMediaPreview(null);
        if (mainCommentMediaInputRef.current) mainCommentMediaInputRef.current.value = "";
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error("Comment media size exceeds 20MB limit.");
        setMainCommentMediaFile(null);
        setMainCommentMediaPreview(null);
        if (mainCommentMediaInputRef.current) mainCommentMediaInputRef.current.value = "";
        return;
      }

      setMainCommentMediaFile(file);
      setMainCommentMediaPreview(URL.createObjectURL(file));
    } else {
      setMainCommentMediaFile(null);
      setMainCommentMediaPreview(null);
    }
  };

  const handleRemoveMainCommentMedia = () => {
    setMainCommentMediaFile(null);
    setMainCommentMediaPreview(null);
    if (mainCommentMediaInputRef.current) {
      mainCommentMediaInputRef.current.value = "";
    }
  };

  // --- NEW HANDLER FOR MENTION INPUT ---
  const handleCommentTextChange = (e) => {
    const newText = e.target.value;
    setCommentText(newText);

    const lastAtIndex = newText.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const potentialMention = newText.substring(lastAtIndex + 1);
      // Show suggestions if the character after @ is a letter/number and it's not a space
      if (potentialMention.length > 0 && !/\s/.test(potentialMention)) {
        setMentionSearchTerm(potentialMention);
        setShowMentionSuggestions(true);
      } else {
        setMentionSearchTerm("");
        setShowMentionSuggestions(false);
      }
    } else {
      setMentionSearchTerm("");
      setShowMentionSuggestions(false);
    }
  };

  const handleSelectMention = useCallback(
    (username) => {
      const currentText = commentText;
      const lastAtIndex = currentText.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Get the part of the string from the '@' sign onwards
        const textFromAt = currentText.substring(lastAtIndex);

        // Find the length of the *partial* username that was typed after '@'
        // This regex now explicitly matches characters after '@'
        const match = textFromAt.match(/^@([a-zA-Z0-9_]*)/); // Match starts with '@' followed by word chars

        let partialMentionLength = 0;
        if (match && match[1]) {
          // If a match exists and the capture group (the username part) is not empty
          partialMentionLength = match[1].length;
        }

        // Calculate the start and end indices of the segment to replace
        // The start of replacement is `lastAtIndex` (where '@' is)
        // The end of replacement is `lastAtIndex + 1 + partialMentionLength` (after the partial username)
        const replaceStartIndex = lastAtIndex;
        const replaceEndIndex = lastAtIndex + 1 + partialMentionLength;

        // Construct the new text
        const newText =
          currentText.substring(0, replaceStartIndex) + // Text before the @
          `@${username} ` + // The full @username with a space
          currentText.substring(replaceEndIndex); // Text after the partial mention

        setCommentText(newText);
        setMentionSearchTerm("");
        setShowMentionSuggestions(false);

        // Manually set cursor to the end of the newly inserted mention
        setTimeout(() => {
          const input = commentInputRef.current;
          if (input) {
            const newCursorPos =
              currentText.substring(0, replaceStartIndex).length + `@${username} `.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
            input.focus();
          }
        }, 0);
      }
    },
    [commentText]
  );
  // --- END NEW HANDLER ---

  const handleAddOrReplyComment = useCallback(
    async (e) => {
      e.preventDefault();

      if (!commentText.trim() && !mainCommentMediaFile) {
        console.warn("Attempted to send empty comment with no media.");
        return;
      }
      if (isCreatingComment) return;

      let commentPayload = { text: commentText };

      if (mainCommentMediaFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (mainCommentMediaFile.type.startsWith("image/")) {
            commentPayload.img = reader.result;
          } else if (mainCommentMediaFile.type.startsWith("video/")) {
            commentPayload.video = reader.result;
          }

          if (replyingToComment) {
            commentPayload.parentCommentId = replyingToComment._id;
          }

          await createComment(commentPayload);

          setCommentText("");
          setReplyingToComment(null);
          setMainCommentMediaPreview(null);
          setMainCommentMediaFile(null);
          if (mainCommentMediaInputRef.current) {
            mainCommentMediaInputRef.current.value = "";
          }
          // Reset mention states after sending
          setMentionSearchTerm("");
          setShowMentionSuggestions(false);
        };
        reader.readAsDataURL(mainCommentMediaFile);
      } else {
        if (replyingToComment) {
          commentPayload.parentCommentId = replyingToComment._id;
        }
        await createComment(commentPayload);

        setCommentText("");
        setReplyingToComment(null);
        // Reset mention states after sending
        setMentionSearchTerm("");
        setShowMentionSuggestions(false);
      }
    },
    [
      commentText,
      createComment,
      isCreatingComment,
      mainCommentMediaFile,
      replyingToComment,
    ]
  );

  const handleSetReplyingToComment = useCallback((comment) => {
    setReplyingToComment(comment);
    setCommentText("");
    setMainCommentMediaPreview(null);
    setMainCommentMediaFile(null);
    if (mainCommentMediaInputRef.current) {
      mainCommentMediaInputRef.current.value = "";
    }
    // Reset mention states when starting a new reply
    setMentionSearchTerm("");
    setShowMentionSuggestions(false);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (showMentionSuggestions && suggestedUsers.length > 0) {
          e.preventDefault();
          // Automatically select the first suggestion on Enter
          handleSelectMention(suggestedUsers[0].username);
        } else if (isMobile) {
          e.preventDefault(); // Prevent default form submission
          const { current: input } = commentInputRef;
          if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newValue =
              commentText.substring(0, start) + "\n" + commentText.substring(end);
            setCommentText(newValue);
            setTimeout(() => {
              input.selectionStart = input.selectionEnd = start + 1;
            }, 0);
          }
        } else {
          // Desktop logic
          if (e.shiftKey) {
            e.preventDefault(); // Prevent default form submission
            const { current: input } = commentInputRef;
            if (input) {
              const start = input.selectionStart;
              const end = input.selectionEnd;
              const newValue =
                commentText.substring(0, start) + "\n" + commentText.substring(end);
              setCommentText(newValue);
              setTimeout(() => {
                input.selectionStart = input.selectionEnd = start + 1;
              }, 0);
            }
          } else {
            // On desktop, Enter sends the message (and not pending)
            if (!isCreatingComment) {
              e.preventDefault(); // Prevent default new line behavior for Enter
              handleAddOrReplyComment(e);
            }
          }
        }
      }
    },
    [
      isMobile,
      commentInputRef,
      commentText,
      setCommentText,
      showMentionSuggestions,
      suggestedUsers,
      handleSelectMention,
      isCreatingComment,
      handleAddOrReplyComment,
    ]
  );

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
      <div className="flex-1 flex flex-col items-center justify-center h-screen w-ful p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Post Not Found</h2>
        <p className="text-gray-500 text-center">
          The post you are looking for does not exist or has been deleted.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-4 py-2 bg-parimary rounded-full hover:bg-secondary transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 border-accent min-h-screen w-full overflow-x-hidden md:max-w-3xl lg:max-w-4xl mx-auto">
      <div className="flex items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3.5 border-b border-accent">
        <button
          onClick={() => navigate(-1)}
          className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-bold text-lg md:text-xl flex-1 truncate">Post</h1>
      </div>

      <div className="border-accent">
        <Post
          post={displayPost}
          openImageModal={openImageModal}
          setFeedType={setFeedType}
        />
      </div>

      {authUser && (
        <form
          onSubmit={handleAddOrReplyComment}
          className="px-4 py-3 md:p-4 border-b border-accent flex flex-col gap-2 relative" // Added relative for positioning suggestions
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="avatar flex-shrink-0">
              <div className="w-8 md:w-9 rounded-full">
                <img
                  src={authUser?.profileImg || "/avatar-placeholder.png"}
                  alt="Your profile"
                />
              </div>
            </div>
            {/* Wrapper for input and mention suggestions */}
            <div className="flex-1 relative">
              <textarea
                ref={commentInputRef} // Attach ref to the input
                type="text"
                value={commentText}
                onChange={handleCommentTextChange} // Use the new handler
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={
                  replyingToComment
                    ? `Replying to @${replyingToComment.user.username}...`
                    : "Post your comment"
                }
                className="w-full pl-3  bg-black/0 placeholder-gray-400 focus:outline-none text-base sm:text-sm resize-none max-h-[140px] overflow-y-auto" // Added resize-none, max-height, and overflow-y-auto
                disabled={isCreatingComment}
                rows={1}
              />

              {/* Mention Suggestions Dropdown */}
              {showMentionSuggestions && debouncedMentionSearchTerm.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-base-200 border border-accent rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isLoadingSuggestedUsers ? (
                    <div className="p-2 text-center ">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : suggestedUsers.length > 0 ? (
                    suggestedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-2 p-2 hover:bg-secondary cursor-pointer"
                        onClick={() => handleSelectMention(user.username)}
                      >
                        <div className="avatar">
                          <div className="w-8 rounded-full">
                            <img
                              src={user.profileImg || "/avatar-placeholder.png"}
                              alt={user.username}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{user.fullName}</p>
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

            <input
              type="file"
              accept="image/*,video/*"
              hidden
              ref={mainCommentMediaInputRef}
              onChange={handleMainCommentMediaChange}
            />
            <button
              type="button"
              onClick={() => mainCommentMediaInputRef.current.click()}
              className="p-2 rounded-full text-primary hover:text-primary/80 transition duration-200 flex-shrink-0"
              title="Add image or video to comment"
            >
              <BiImageAdd size={24} />
            </button>
            <button
              type="submit"
              className="hidden md:block px-2 py-1 md:px-4 md:py-2 bg-primary hover:bg-primary/80 text-sm md:text-md text-primary-content rounded-full transition duration-300 disabled:bg-gray-500 disabled:text-black font-bold disabled:cursor-default flex-shrink-0"
              disabled={
                isCreatingComment || (!commentText.trim() && !mainCommentMediaPreview)
              }
            >
              {isCreatingComment ? <LoadingSpinner size="sm" /> : "Comment"}
            </button>
          </div>

          {mainCommentMediaPreview && (
            <div className="relative size-40 mt-2 self-start ml-12">
              {mainCommentMediaFile.type.startsWith("image/") ? (
                <img
                  src={mainCommentMediaPreview}
                  alt="Comment preview"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <video
                  controls
                  src={mainCommentMediaPreview}
                  className="w-full h-full object-contain rounded-lg"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              )}
              <button
                type="button"
                onClick={handleRemoveMainCommentMedia}
                className="absolute -top-2 -right-2 bg-gray-500 text-white duration-200 transition hover:bg-gray-600 rounded-full p-1 text-xs"
                title="Remove media"
              >
                <IoClose size={15} />
              </button>
            </div>
          )}
        </form>
      )}

      <div className="flex flex-col" ref={commentsListRef}>
        {isLoadingComments ? (
          <div className="flex flex-col h-full p-2 md:p-4 gap-4 md:gap-14">
            <CommentsSkeleton />
            <CommentsSkeleton />
            <CommentsSkeleton />
            <CommentsSkeleton />
          </div>
        ) : comments.length > 0 ? (
          <>
            {comments.map((comment) => (
              <div key={comment._id} id={`comment-${comment._id}`}>
                <CommentItem
                  openImageModal={openImageModal}
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
