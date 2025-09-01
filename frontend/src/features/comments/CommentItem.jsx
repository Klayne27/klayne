import React, { useState, useRef, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { formatPostDate } from "../../utils/date"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { FaTrashCan } from "react-icons/fa6"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { useLikeComment } from "./commentHooks/useLikeComment"
import { useDeleteComment } from "./commentHooks/useDeleteComment"
import { useCreateComment } from "./commentHooks/useCreateComment"
import { useGetComments } from "./commentHooks/useGetComments"
import { renderClickableText } from "../../utils/textUtils"
import { BiImageAdd } from "react-icons/bi"
import { IoClose } from "react-icons/io5"
import { useDebounce } from "../../hooks/customHooks/useDebounce"
import { useSearchUsers } from "../users/usersHooks/userSearchUsers"
import RepliesSkeleton from "../../components/skeletons/RepliesSkeleton"
import useFollow from "../users/usersHooks/useFollow"
import { useBlockUnblockUser } from "../users/usersHooks/useBlockUnblockUser"
import { MdBlock } from "react-icons/md"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../../hooks/customHooks/usePasteHandler"
import CommentItemButtons from "../../components/common/CommentItemButtons"
import useDropdownMenu from "../../hooks/customHooks/useDropdownMenu"
import DropdownMenu from "../../components/common/DropdownMenu"
import { TbUserMinus, TbUserPlus } from "react-icons/tb"
import { getDisplayUsername } from "../../utils/truncateText"
import { getBadgeIcon } from "../../utils/renderBadges"

const CommentItem = ({ comment, postId, isPostOwner, isProfileImgAnonymous }) => {
  const { authUser } = useAuthUser()
  const isCommentOwner = authUser && authUser._id === comment.user._id
  const isFollowingCommentOwner = authUser?.following.includes(comment.user._id)

  const navigate = useNavigate()

  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyInput, setReplyInput] = useState("")
  const [replyPreviewImage, setReplyPreviewImage] = useState(null)
  const [replySelectedFile, setReplySelectedFile] = useState(null)
  const replyFileInputRef = useRef(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showButton, setShowButton] = useState(false)

  const [replyMentionSearchTerm, setReplyMentionSearchTerm] = useState("")
  const debouncedReplyMentionSearchTerm = useDebounce(replyMentionSearchTerm, 300)
  const [showReplyMentionSuggestions, setShowReplyMentionSuggestions] = useState(false)
  const replyInputRef = useRef(null) // Ref for reply input
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(
    debouncedReplyMentionSearchTerm,
  )

  const { likeComment, isLikingComment } = useLikeComment()
  const { deleteComment, isDeletingComment } = useDeleteComment()
  const { createComment, isCreatingComment } = useCreateComment(postId, comment._id)

  const [showRepliesSection, setShowRepliesSection] = useState(false) // Controls rendering of the entire replies section

  const {
    comments: replies,
    isLoading: isLoadingReplies,
    isFetchingNextPage: isFetchingNextRepliesPage,
    hasNextPage: hasNextRepliesPage,
    fetchNextPage: fetchNextRepliesPage,
  } = useGetComments(postId, comment._id, showRepliesSection) // Pass showRepliesSection to enable fetching

  const observerTarget = useRef(null)

  const { follow, isPending: isFollowingOrUnfollowing } = useFollow()
  const { blockUnblockUser, isBlocking } = useBlockUnblockUser()

  const { setShowMenu } = useDropdownMenu()

  const isBlockedByAuthUser = authUser?.blockedUsers?.includes(comment.user._id)

  const isMobile = useIsMobile()

  const adjustTextareaHeight = useCallback(() => {
    const textarea = replyInputRef.current // Use the new ref
    if (textarea) {
      textarea.style.height = "auto" // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [replyInput, adjustTextareaHeight])

  const handleFocus = () => {
    setShowButton(true)
  }

  useEffect(() => {
    if (
      !observerTarget.current ||
      !hasNextRepliesPage ||
      isFetchingNextRepliesPage ||
      !showRepliesSection
    )
      return // Only observe if replies section is open

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextRepliesPage && !isFetchingNextRepliesPage) {
          fetchNextRepliesPage()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(observerTarget.current)

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [
    hasNextRepliesPage,
    isFetchingNextRepliesPage,
    fetchNextRepliesPage,
    comment._id,
    showRepliesSection,
  ])

  const handleLikeCommentClick = (e) => {
    e.stopPropagation()
    setIsAnimating(true)
    if (isLikingComment) return
    likeComment({
      commentId: comment._id,
      postId: postId,
      parentCommentId: comment.parentComment?._id || null,
    })
  }

  const handleDeleteCommentClick = (e) => {
    e.stopPropagation()
    if (isDeletingComment) return
    deleteComment({
      commentId: comment._id,
      postId: postId,
      parentCommentId: comment.parentComment?._id || null,
    })
  }

  // --- NEW: Handle pasting an image into the input field ---
  const handlePaste = usePasteHandler({
    inputRef: replyInputRef,
    input: replyInput,
    setInput: setReplyInput,
    setSelectedFile: setReplySelectedFile,
    setPreviewImage: setReplyPreviewImage,
    fileInputRef: replyFileInputRef,
  })

  // --- HANDLER FOR OPENING/CLOSING REPLY INPUT ---
  const handleToggleReplyInput = useCallback((e) => {
    e.stopPropagation()
    setShowReplyInput((prev) => !prev)
    // Clear previous reply state when toggling
    // setReplyInput("");
    setReplyPreviewImage(null)
    setReplySelectedFile(null)
    setReplyMentionSearchTerm("")
    setShowReplyMentionSuggestions(false)
  }, [])

  // --- HANDLER FOR TOGGLING REPLIES SECTION VISIBILITY ---
  const handleToggleRepliesVisibility = useCallback((e) => {
    e.stopPropagation()
    setShowRepliesSection((prev) => !prev)
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReplySelectedFile(file)
      setReplyPreviewImage(URL.createObjectURL(file))
    } else {
      setReplySelectedFile(null)
      setReplyPreviewImage(null)
    }
  }

  const handleRemoveImage = () => {
    setReplySelectedFile(null)
    setReplyPreviewImage(null)
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = ""
    }
  }

  const handleReplyTextChange = (e) => {
    const newText = e.target.value
    setReplyInput(newText)

    const lastAtIndex = newText.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const potentialMention = newText.substring(lastAtIndex + 1)
      if (potentialMention.length > 0 && !/\s/.test(potentialMention)) {
        setReplyMentionSearchTerm(potentialMention)
        setShowReplyMentionSuggestions(true)
      } else {
        setReplyMentionSearchTerm("")
        setShowReplyMentionSuggestions(false)
      }
    } else {
      setReplyMentionSearchTerm("")
      setShowReplyMentionSuggestions(false)
    }
  }

  const handleSelectReplyMention = useCallback(
    (username) => {
      const currentText = replyInput
      const lastAtIndex = currentText.lastIndexOf("@")

      if (lastAtIndex !== -1) {
        const textFromAt = currentText.substring(lastAtIndex)
        const match = textFromAt.match(/^@([a-zA-Z0-9_]*)/)

        let partialMentionLength = 0
        if (match && match[1]) {
          partialMentionLength = match[1].length
        }

        const replaceStartIndex = lastAtIndex
        const replaceEndIndex = lastAtIndex + 1 + partialMentionLength

        const newText =
          currentText.substring(0, replaceStartIndex) +
          `@${username} ` +
          currentText.substring(replaceEndIndex)

        setReplyInput(newText)
        setReplyMentionSearchTerm("")
        setShowReplyMentionSuggestions(false)

        setTimeout(() => {
          const input = replyInputRef.current
          if (input) {
            const newCursorPos =
              currentText.substring(0, replaceStartIndex).length + `@${username} `.length
            input.setSelectionRange(newCursorPos, newCursorPos)
            input.focus()
          }
        }, 0)
      }
    },
    [replyInput],
  )

  const handleSendReply = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()

      if (!replyInput.trim() && !replySelectedFile) {
        return
      }
      if (isCreatingComment) return

      let imgDataToSend = null
      if (replySelectedFile) {
        imgDataToSend = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(replySelectedFile)
        })
      }

      // Pass the Base64 string to createComment, NOT the File object or blob URL
      await createComment({ text: replyInput, img: imgDataToSend })

      setReplyInput("")
      setReplyPreviewImage(null) // Clear Base64 preview
      setReplySelectedFile(null) // Clear selected File
      if (replyFileInputRef.current) {
        replyFileInputRef.current.value = ""
      }
      // ... rest of your clearing logic
      setShowReplyInput(false)
      setReplyMentionSearchTerm("")
      setShowReplyMentionSuggestions(false)
      setShowRepliesSection(true)
    },
    [createComment, isCreatingComment, replyInput, replySelectedFile],
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (showReplyMentionSuggestions && suggestedUsers.length > 0) {
          e.preventDefault()
          // Automatically select the first suggestion on Enter
          handleSelectReplyMention(suggestedUsers[0].username)
        } else if (isMobile) {
          e.preventDefault() // Prevent default form submission
          const { current: input } = replyInputRef
          if (input) {
            const start = input.selectionStart
            const end = input.selectionEnd
            const newValue = replyInput.substring(0, start) + "\n" + replyInput.substring(end)
            setReplyInput(newValue)
            setTimeout(() => {
              input.selectionStart = input.selectionEnd = start + 1
            }, 0)
          }
        } else {
          // Desktop logic
          if (e.shiftKey) {
            e.preventDefault() // Prevent default form submission
            const { current: input } = replyInputRef
            if (input) {
              const start = input.selectionStart
              const end = input.selectionEnd
              const newValue = replyInput.substring(0, start) + "\n" + replyInput.substring(end)
              setReplyInput(newValue)
              setTimeout(() => {
                input.selectionStart = input.selectionEnd = start + 1
              }, 0)
            }
          } else {
            // On desktop, Enter sends the message (and not pending)
            if (!isCreatingComment) {
              e.preventDefault() // Prevent default new line behavior for Enter
              handleSendReply(e)
            }
          }
        }
      }
    },
    [
      isMobile,
      replyInputRef,
      replyInput,
      setReplyInput,
      showReplyMentionSuggestions,
      suggestedUsers,
      handleSelectReplyMention,
      isCreatingComment,
      handleSendReply,
    ],
  )

  // New: Handle follow/unfollow
  const handleFollowClick = (e) => {
    e.stopPropagation()
    if (!authUser || isFollowingOrUnfollowing) return
    follow(comment.user._id)
    setShowMenu(false) // Close menu after clicking
  }

  // New: Handle block/unblock
  const handleBlockClick = (e) => {
    e.stopPropagation()
    if (!authUser || isBlocking) return
    blockUnblockUser(comment.user._id)
    setShowMenu(false) // Close menu after clicking
  }

  // Reset animation state after it completes
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isAnimating])

  console.log(comment)

  if (!comment || !comment.user) {
    console.warn("Comment or comment user not populated:", comment)
    return null
  }

  return (
    <div className="relative flex flex-col gap-0 border-accent p-2 md:gap-2 md:p-4">
      <div className="flex items-start gap-1 md:gap-3">
        <div
          to={`/profile/${comment.user.username}`}
          className={`flex-shrink-0 ${!comment.isAnonymous && "cursor-pointer"}`}
          onClick={(e) => {
            !comment.isAnonymous ? navigate(`/profile/${comment.user.username}`) : ""
          }}
        >
          <div className="avatar">
            <div className="w-8 rounded-full md:w-9">
              <img
                src={comment.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                alt={`${comment.user.username}'s profile`}
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-grow flex-col">
          <div className="relative flex flex-wrap items-center gap-1">
            <div className="flex flex-wrap items-center gap-1">
              <div
                to={`/profile/${comment.user.username}`}
                className={`flex-shrink-0 text-sm font-semibold ${!comment.isAnonymous && "cursor-pointer hover:underline"}`}
                onClick={(e) => {
                  !comment.isAnonymous ? navigate(`/profile/${comment.user.username}`) : ""
                }}
              >
                {comment.user.fullName}
              </div>
              <span className="flex items-center">
                {comment.user.isVerified && (
                  <img src="/verified2.png" className="size-[17px] flex-shrink-0" alt="Verified" />
                )}
                {comment.user.isGoldVerified && (
                  <img
                    src="/gold-verified2.png"
                    className="size-[17px] flex-shrink-0"
                    alt="Verified"
                  />
                )}
                {comment.user.preferredBadge && (
                  <div className="ml-1 size-[17px] flex-shrink-0">
                    {getBadgeIcon(comment.user.preferredBadge)}
                  </div>
                )}
              </span>
              <div
                to={`/profile/${comment.user.username}`}
                className={`min-w-0 flex-grow truncate text-sm text-gray-500 ${!comment.isAnonymous && "cursor-pointer"}`}
                onClick={(e) => {
                  !comment.isAnonymous ? navigate(`/profile/${comment.user.username}`) : ""
                }}
              >
                @{getDisplayUsername(comment.user.username, isMobile)}
              </div>
              {comment.createdAt && (
                <span className="ml-auto flex flex-shrink-0 items-center justify-center gap-1 text-center text-xs text-gray-500">
                  <span className="text-[7px]">●</span>
                  {formatPostDate(comment.createdAt)}
                </span>
              )}
            </div>

            <DropdownMenu>
              {/* Scenario 1 & 4: Current user is the comment owner (and potentially also post owner) */}
              {isCommentOwner && (
                <>
                  {/* If the current user is the comment owner AND the post owner, only show delete */}
                  {isPostOwner ? (
                    <button
                      className="duration transition-200 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 hover:bg-gray-700/30"
                      onClick={handleDeleteCommentClick}
                      disabled={isDeletingComment}
                    >
                      <span className="flex items-center justify-center gap-3 font-semibold">
                        <FaTrashCan /> Delete Reply
                      </span>
                    </button>
                  ) : (
                    // If the current user is the comment owner but NOT the post owner, only show delete
                    <button
                      className="duration transition-200 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 hover:bg-gray-700/30"
                      onClick={handleDeleteCommentClick}
                      disabled={isDeletingComment}
                    >
                      <span className="flex items-center justify-center gap-3 font-semibold">
                        <FaTrashCan /> Delete Reply
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* Scenario 2 & 3: Current user is NOT the comment owner */}
              {!isCommentOwner && (
                <>
                  {/* Follow/Unfollow button (always shown if not comment owner) */}
                  <button
                    className="flex w-full items-center gap-2 px-4 py-1 text-left text-white transition duration-200 hover:bg-gray-700/30"
                    onClick={handleFollowClick}
                    disabled={isFollowingOrUnfollowing}
                  >
                    {isFollowingCommentOwner ? ( // Assuming this variable tracks if current user follows the comment owner
                      <span className="flex items-center justify-center gap-3 font-semibold">
                        <TbUserMinus strokeWidth={2} /> Unfollow
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3 font-semibold">
                        <TbUserPlus strokeWidth={2} /> Follow @{comment.user.username}
                      </span>
                    )}
                  </button>

                  {/* Block/Unblock button (always shown if not comment owner) */}
                  <button
                    className="flex w-full items-center gap-2 px-4 py-1 text-left text-red-500 transition duration-200 hover:bg-gray-700/30"
                    onClick={handleBlockClick}
                    disabled={isBlocking}
                  >
                    {isBlockedByAuthUser ? ( // Assuming this variable tracks if current user blocked the comment owner
                      "Unblock"
                    ) : (
                      <span className="flex items-center justify-center gap-3 font-semibold">
                        <MdBlock /> Block @{comment.user.username}
                      </span>
                    )}
                  </button>

                  {/* Scenario 3: Post owner interacting with another user's comment */}
                  {isPostOwner ||
                    (authUser.isAdmin && (
                      <button
                        className="duration transition-200 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold text-red-500 hover:bg-gray-700/30"
                        onClick={handleDeleteCommentClick}
                        disabled={isDeletingComment}
                      >
                        <span className="flex items-center justify-center gap-3 font-semibold">
                          <FaTrashCan /> Delete Reply
                        </span>
                      </button>
                    ))}
                </>
              )}
            </DropdownMenu>
          </div>
          {comment.parentComment && comment.parentComment.user && (
            <div className="mb-2 mt-1 text-xs text-gray-500">
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
          <p className="whitespace-pre-wrap break-words text-sm">
            {renderClickableText(comment.text)}
          </p>
          <div className="inline-flex max-w-full justify-center">
            {comment.image?._id && (
              <Link to={`/images/${comment.image?._id}`}>
                <img
                  src={comment.image.imageUrl}
                  alt="Comment attachment"
                  className="block h-auto max-h-80 cursor-pointer rounded-2xl border border-accent object-contain"
                />
              </Link>
            )}
          </div>

          <div className="mt-0 flex items-center gap-4 md:mt-2">
            <CommentItemButtons
              onLikeCommentClick={handleLikeCommentClick}
              isLikingComment={isLikingComment}
              comment={comment}
              isAnimating={isAnimating}
              onToggleReplyInput={handleToggleReplyInput}
              showReplyInput={showReplyInput}
              onToggleRepliesVisibility={handleToggleRepliesVisibility}
              showRepliesSection={showRepliesSection}
            />
          </div>

          {showReplyInput && authUser && (
            <form onSubmit={handleSendReply} className="relative mt-4 flex flex-col gap-2">
              <div className="flex items-start md:gap-2">
                <div className="avatar flex-shrink-0">
                  <div className="w-7 rounded-full">
                    <img
                      src={
                        isProfileImgAnonymous
                          ? "/avatar-placeholder.png"
                          : authUser.profileImg?.imageUrl || "/avatar-placeholder.png"
                      }
                      alt="Your profile"
                    />
                  </div>
                </div>
                <div className="relative flex-1">
                  <textarea
                    ref={replyInputRef}
                    type="text"
                    value={replyInput}
                    onChange={handleReplyTextChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={handleFocus}
                    rows={1}
                    placeholder={`Replying to @${comment.user.username}...`}
                    className="max-h-[140px] w-full resize-none overflow-y-auto bg-black/0 pl-3 text-sm placeholder-gray-400 focus:outline-none" // Added resize-none, max-height, and overflow-y-auto
                    disabled={isCreatingComment}
                  />
                  {showReplyMentionSuggestions && debouncedReplyMentionSearchTerm.length > 0 && (
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
                            onClick={() => handleSelectReplyMention(user.username)}
                          >
                            <div className="avatar">
                              <div className="w-7 rounded-full">
                                <img
                                  src={user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                                  alt={user.username}
                                />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{user.fullName}</p>
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
              {replyPreviewImage && (
                <div className="relative mt-2 size-40 self-start">
                  <img
                    src={replyPreviewImage}
                    alt="Reply preview"
                    className="h-full w-full rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -right-2 -top-2 rounded-full bg-gray-500 p-1 text-xs text-white transition duration-200 hover:bg-gray-600"
                    title="Remove image"
                  >
                    <IoClose size={15} />
                  </button>
                </div>
              )}
              {showButton && (
                <div className="flex justify-between">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={replyFileInputRef}
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current.click()}
                    className="ml-[33px] self-start rounded-full p-1 text-primary transition duration-200 hover:text-primary/80"
                    title="Add image"
                    disabled={isCreatingComment}
                  >
                    <BiImageAdd size={24} />
                  </button>
                  <button
                    type="submit"
                    className="block rounded-full bg-primary px-3 py-1 text-sm font-bold text-white transition duration-300 hover:bg-primary/80 disabled:bg-gray-500 disabled:text-black"
                    disabled={isCreatingComment || (!replyInput.trim() && !replySelectedFile)}
                  >
                    Reply
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center">
        {isCreatingComment && <LoadingSpinner />}
      </div>
      {/* Conditional rendering for replies section, based on showRepliesSection */}
      {comment.repliesCount > 0 && showRepliesSection && (
        <div className="mt-2 border-l border-accent">
          {isLoadingReplies ? (
            <div className="flex flex-col justify-center px-4 py-2 md:px-5 md:py-4">
              <RepliesSkeleton />
            </div>
          ) : (
            <>
              {replies.map((reply) => (
                <div key={reply._id} className="ml-2">
                  <CommentItem
                    comment={reply}
                    postId={postId}
                    // onReplyClick={onReplyClick}
                    isPostOwner={isPostOwner}
                    // openImageModal={openImageModal}
                  />
                </div>
              ))}
              {hasNextRepliesPage && (
                <div className="flex justify-center py-2" ref={observerTarget}>
                  <button
                    onClick={() => fetchNextRepliesPage()}
                    disabled={isFetchingNextRepliesPage}
                    className="text-sm text-primary hover:underline"
                  >
                    {isFetchingNextRepliesPage ? <LoadingSpinner size="sm" /> : "Load more replies"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default React.memo(CommentItem)
