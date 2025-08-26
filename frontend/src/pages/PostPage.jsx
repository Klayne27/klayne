import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa6"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useDebounce } from "../hooks/customHooks/useDebounce"
import { useSearchUsers } from "../hooks/usersHooks/userSearchUsers"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import { useGetPost } from "../features/posts/postsHooks/useGetPost"
import { useGetComments } from "../features/comments/commentHooks/useGetComments"
import { useCreateComment } from "../features/comments/commentHooks/useCreateComment"
import { usePasteHandler } from "../hooks/customHooks/usePasteHandler"
import { showAppToast } from "../utils/showAppToast"
import LoadingSpinner from "../components/common/LoadingSpinner"
import CommentItem from "../features/comments/CommentItem"
import CommentsSkeleton from "../components/skeletons/CommentsSkeleton"
import Post from "../features/posts/Post"
import { BiImageAdd } from "react-icons/bi"

const PostPage = () => {
  const { pid } = useParams()
  const navigate = useNavigate()
  const { authUser } = useAuthUser()

  const [replyingToComment, setReplyingToComment] = useState(null)

  const [commentInput, setCommentInput] = useState("")
  const [commentPreviewImage, setCommentPreviewImage] = useState(null)
  const [commentSelectedFile, setCommentSelectedFile] = useState(null)
  const commentFileInputRef = useRef(null)
  const commentInputRef = useRef(null)

  const [showButton, setShowButton] = useState(false)

  // --- NEW STATES FOR MENTIONS ---
  const [mentionSearchTerm, setMentionSearchTerm] = useState("")
  const debouncedMentionSearchTerm = useDebounce(mentionSearchTerm, 300)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)

  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)
  // --- END NEW STATES ---

  const commentsListRef = useRef(null)
  const observerTarget = useRef(null)

  const isMobile = useIsMobile()

  // --- TEXTAREA HEIGHT ADJUSTMENT ---
  const adjustTextareaHeight = useCallback(() => {
    const textarea = commentInputRef.current // Use the new ref
    if (textarea) {
      textarea.style.height = "auto" // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [commentInput, adjustTextareaHeight]) // Trigger on commentInput change
  // --- END TEXTAREA HEIGHT ADJUSTMENT ---

  const { post, isLoading, isError, error, refetch: refetchPost } = useGetPost(pid)
  const {
    comments,
    isLoading: isLoadingComments,
    isFetchingNextPage: isFetchingNextCommentsPage,
    hasNextPage: hasNextCommentsPage,
    fetchNextPage: fetchNextCommentsPage,
    refetch: refetchComments,
  } = useGetComments(pid, null)

  const { createComment, isCreatingComment } = useCreateComment(pid, null)

  const displayPost = post?.repostedFrom || post

  // Add this new function
  const handlePaste = usePasteHandler({
    inputRef: commentInputRef,
    input: commentInput,
    setInput: setCommentInput,
    setSelectedFile: setCommentSelectedFile,
    setPreviewImage: setCommentPreviewImage,
    fileInputRef: commentFileInputRef,
  })

  const handleFocus = () => {
    setShowButton(true)
  }

  const handleMainCommentMediaChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCommentSelectedFile(file)
      setCommentPreviewImage(URL.createObjectURL(file))
    } else {
      setCommentSelectedFile(null)
      setCommentPreviewImage(null)
    }
  }

  const handleRemoveMainCommentMedia = () => {
    setCommentSelectedFile(null)
    setCommentPreviewImage(null)
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = ""
    }
  }

  // --- NEW HANDLER FOR MENTION INPUT ---
  const handleCommentTextChange = (e) => {
    const newText = e.target.value
    setCommentInput(newText)

    const lastAtIndex = newText.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const potentialMention = newText.substring(lastAtIndex + 1)
      // Show suggestions if the character after @ is a letter/number and it's not a space
      if (potentialMention.length > 0 && !/\s/.test(potentialMention)) {
        setMentionSearchTerm(potentialMention)
        setShowMentionSuggestions(true)
      } else {
        setMentionSearchTerm("")
        setShowMentionSuggestions(false)
      }
    } else {
      setMentionSearchTerm("")
      setShowMentionSuggestions(false)
    }
  }

  const handleSelectMention = useCallback(
    (username) => {
      const currentText = commentInput
      const lastAtIndex = currentText.lastIndexOf("@")

      if (lastAtIndex !== -1) {
        // Get the part of the string from the '@' sign onwards
        const textFromAt = currentText.substring(lastAtIndex)

        const match = textFromAt.match(/^@([a-zA-Z0-9_]*)/) // Match starts with '@' followed by word chars

        let partialMentionLength = 0
        if (match && match[1]) {
          // If a match exists and the capture group (the username part) is not empty
          partialMentionLength = match[1].length
        }

        // Calculate the start and end indices of the segment to replace
        // The start of replacement is `lastAtIndex` (where '@' is)
        // The end of replacement is `lastAtIndex + 1 + partialMentionLength` (after the partial username)
        const replaceStartIndex = lastAtIndex
        const replaceEndIndex = lastAtIndex + 1 + partialMentionLength

        // Construct the new text
        const newText =
          currentText.substring(0, replaceStartIndex) + // Text before the @
          `@${username} ` + // The full @username with a space
          currentText.substring(replaceEndIndex) // Text after the partial mention

        setCommentInput(newText)
        setMentionSearchTerm("")
        setShowMentionSuggestions(false)

        // Manually set cursor to the end of the newly inserted mention
        setTimeout(() => {
          const input = commentInputRef.current
          if (input) {
            const newCursorPos =
              currentText.substring(0, replaceStartIndex).length + `@${username} `.length
            input.setSelectionRange(newCursorPos, newCursorPos)
            input.focus()
          }
        }, 0)
      }
    },
    [commentInput],
  )
  // --- END NEW HANDLER ---

  const handleAddOrReplyComment = useCallback(
    async (e) => {
      e.preventDefault()

      if (!commentInput.trim() && !commentSelectedFile) {
        console.warn("Attempted to send empty comment with no media.")
        return
      }
      if (isCreatingComment) return

      let commentPayload = { text: commentInput }

      if (commentSelectedFile) {
        const reader = new FileReader()
        reader.onloadend = async () => {
          if (commentSelectedFile.type.startsWith("image/")) {
            commentPayload.img = reader.result
          } else if (commentSelectedFile.type.startsWith("video/")) {
            commentPayload.video = reader.result
          }

          if (replyingToComment) {
            commentPayload.parentCommentId = replyingToComment._id
          }

          await createComment(commentPayload)

          setCommentInput("")
          // setReplyingToComment(null);
          setCommentPreviewImage(null)
          setCommentSelectedFile(null)
          if (commentFileInputRef.current) {
            commentFileInputRef.current.value = ""
          }
          // Reset mention states after sending
          setMentionSearchTerm("")
          setShowMentionSuggestions(false)
        }
        reader.readAsDataURL(commentSelectedFile)
      } else {
        if (replyingToComment) {
          commentPayload.parentCommentId = replyingToComment._id
        }
        await createComment(commentPayload)

        setCommentInput("")
        // setReplyingToComment(null);
        // Reset mention states after sending
        setMentionSearchTerm("")
        setShowMentionSuggestions(false)
      }
    },
    [commentInput, createComment, isCreatingComment, commentSelectedFile, replyingToComment],
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (showMentionSuggestions && suggestedUsers.length > 0) {
          e.preventDefault()
          handleSelectMention(suggestedUsers[0].username)
        } else if (isMobile) {
          e.preventDefault()
          const { current: input } = commentInputRef
          if (input) {
            const start = input.selectionStart
            const end = input.selectionEnd
            const newValue = commentInput.substring(0, start) + "\n" + commentInput.substring(end)
            setCommentInput(newValue)
            setTimeout(() => {
              input.selectionStart = input.selectionEnd = start + 1
            }, 0)
          }
        } else {
          if (e.shiftKey) {
            e.preventDefault()
            const { current: input } = commentInputRef
            if (input) {
              const start = input.selectionStart
              const end = input.selectionEnd
              const newValue = commentInput.substring(0, start) + "\n" + commentInput.substring(end)
              setCommentInput(newValue)
              setTimeout(() => {
                input.selectionStart = input.selectionEnd = start + 1
              }, 0)
            }
          } else {
            if (!isCreatingComment) {
              e.preventDefault()
              handleAddOrReplyComment(e)
            }
          }
        }
      }
    },
    [
      isMobile,
      commentInputRef,
      commentInput,
      setCommentInput,
      showMentionSuggestions,
      suggestedUsers,
      handleSelectMention,
      isCreatingComment,
      handleAddOrReplyComment,
    ],
  )

  useEffect(() => {
    if (!isLoading && (isError || !post)) {
      if (isError) {
        showAppToast(error?.message || "Could not load post.", "error")
      } else if (!post) {
        showAppToast("The post you are looking for does not exist or has been deleted.", "error")
      }
      navigate("/", { replace: true })
    }
  }, [isLoading, isError, error, post, navigate])

  useEffect(() => {
    if (pid) {
      refetchComments()
      refetchPost()
    }
  }, [pid, refetchComments, refetchPost])

  useEffect(() => {
    const currentObserverTarget = observerTarget.current
    if (!currentObserverTarget || !hasNextCommentsPage || isFetchingNextCommentsPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextCommentsPage && !isFetchingNextCommentsPage) {
          fetchNextCommentsPage()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(currentObserverTarget)

    return () => {
      if (currentObserverTarget) {
        observer.unobserve()
      }
    }
  }, [fetchNextCommentsPage, hasNextCommentsPage, isFetchingNextCommentsPage, pid])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="w-ful flex h-screen flex-1 flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-center text-2xl font-bold">Post Not Found</h2>
        <p className="text-center text-slate-500">
          The post you are looking for does not exist or has been deleted.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-parimary mt-6 rounded-full px-4 py-2 transition-colors hover:bg-secondary"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl lg:max-w-4xl">
      <div className="flex items-center gap-2 border-b border-accent px-3 py-2 md:gap-4 md:px-4 md:py-3.5">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold md:text-xl">Post</h1>
      </div>

      <div className="border-accent">
        <Post post={displayPost} />
      </div>

      {authUser && (
        <form
          onSubmit={handleAddOrReplyComment}
          className="relative flex flex-col gap-2 border-b border-accent px-2 py-3 md:p-4" // Added relative for positioning suggestions
        >
          <div className="flex items-start md:gap-4">
            <div className="avatar flex-shrink-0">
              <div className={`w-8 rounded-full md:w-9`}>
                <img
                  src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                  alt="Your profile"
                />
              </div>
            </div>
            {/* Wrapper for input and mention suggestions */}
            <div className="relative flex-1">
              <textarea
                ref={commentInputRef} // Attach ref to the input
                type="text"
                value={commentInput}
                onChange={handleCommentTextChange} // Use the new handler
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onPaste={handlePaste}
                placeholder={
                  replyingToComment
                    ? `Replying to @${replyingToComment.user.username}...`
                    : "Post your reply"
                }
                className="max-h-[140px] w-full resize-none overflow-y-auto bg-black/0 pl-3 text-base placeholder-gray-400 focus:outline-none sm:text-lg" // Added resize-none, max-height, and overflow-y-auto
                disabled={isCreatingComment}
                rows={1}
              />

              {showButton && (
                <div className="flex justify-between">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    ref={commentFileInputRef}
                    onChange={handleMainCommentMediaChange}
                  />
                  <button
                    type="button"
                    onClick={() => commentFileInputRef.current.click()}
                    className={`ml-[9px] flex-shrink-0 rounded-full text-primary transition duration-200 hover:text-primary/80`}
                    title="Add image or video to comment"
                  >
                    <BiImageAdd size={24} />
                  </button>

                  <button
                    type="submit"
                    className="md:text-md block flex-shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-bold text-white transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2"
                    disabled={isCreatingComment || (!commentInput.trim() && !commentPreviewImage)}
                  >
                    Reply
                  </button>
                </div>
              )}
              {/* Mention Suggestions Dropdown */}
              {showMentionSuggestions && debouncedMentionSearchTerm.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-accent bg-base-200 shadow-lg">
                  {isLoadingSuggestedUsers ? (
                    <div className="p-2 text-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : suggestedUsers.length > 0 ? (
                    suggestedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex cursor-pointer items-center gap-2 p-2 hover:bg-secondary"
                        onClick={() => handleSelectMention(user.username)}
                      >
                        <div className="avatar">
                          <div className="w-8 rounded-full">
                            <img
                              src={user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                              alt={user.username}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{user.fullName}</p>
                          <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-2 text-gray-400">No users found.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {commentPreviewImage && (
            <div className="relative ml-12 mt-2 size-40 self-start">
              {commentSelectedFile.type.startsWith("image/") ? (
                <img
                  src={commentPreviewImage}
                  alt="Comment preview"
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <video
                  controls
                  src={commentPreviewImage}
                  className="h-full w-full rounded-lg object-contain"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              )}
              <button
                type="button"
                onClick={handleRemoveMainCommentMedia}
                className="absolute -right-2 -top-2 rounded-full bg-slate-500 p-1 text-xs text-white transition duration-200 hover:bg-slate-600"
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
          <div className="flex h-full flex-col gap-4 p-2 md:gap-14 md:p-4">
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
                  comment={comment}
                  postId={displayPost._id}
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
                  {isFetchingNextCommentsPage ? <LoadingSpinner size="sm" /> : "Load more comments"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 p-4 text-center text-gray-400">
            No comments yet. Be the first to add one!
          </p>
        )}
      </div>
    </div>
  )
}

export default PostPage
