import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa6"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useDebounce } from "../hooks/customHooks/useDebounce"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../hooks/customHooks/usePasteHandler"
import LoadingSpinner from "../components/common/LoadingSpinner"
import Post from "../features/posts/components/Post"
import { BiImageAdd } from "react-icons/bi"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import HeroPost from "../features/posts/components/HeroPost"
import { useSearchUsers } from "../features/users/usersHooks/useUserMutations"
import {
  useGetPost,
  useGetPostThread,
  useGetReplies,
} from "../features/posts/postsHooks/usePostsQueries"
import { useCreateReply } from "../features/posts/postsHooks/usePostsMutations"
import ImagePreviewCloseButton from "../components/common/ImagePreviewCloseButton"
import { useEmojiPickerPopover } from "../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../components/common/EmojiPickerPopover"
import { PiSmiley } from "react-icons/pi"
import { shouldTextBeWhite } from "../utils/shouldTextBeWhite"
import { useTheme } from "../context/ThemeContext"
import MentionSuggestionsDropdown from "../components/common/MentionSuggestionsDropdown"
import { useMentionSuggestions } from "../hooks/customHooks/useMentionSuggestions"

const PostPage = () => {
  const { pid } = useParams()
  const navigate = useNavigate()
  const { authUser } = useAuthUser()

  const [isAnonymousReply, setIsAnonymousReply] = useState(false)
  const [replyInput, setReplyInput] = useState("")
  const [replyPreviewImage, setReplyPreviewImage] = useState(null)
  const [replySelectedFile, setReplySelectedFile] = useState(null)
  const replyFileInputRef = useRef(null)
  const replyInputRef = useRef(null)
  const observerTarget = useRef(null)
  const heroRef = useRef(null)
  const emojiButtonRef = useRef(null)

  const [showButton, setShowButton] = useState(false)
  // const [mentionSearchTerm, setMentionSearchTerm] = useState("")
  // const debouncedMentionSearchTerm = useDebounce(mentionSearchTerm, 300)
  // const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  // const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)

  const isMobile = useIsMobile()
  const { theme } = useTheme()

  const { post, isLoading, refetch: refetchPost } = useGetPost(pid)
  const { ancestors, isLoading: isLoadingThread } = useGetPostThread(pid)

  const {
    replies,
    isLoading: isLoadingReplies,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchReplies,
  } = useGetReplies(pid)

  const { createReply, isCreatingReply } = useCreateReply(pid)

  const {
    debouncedMentionSearchTerm,
    showMentionSuggestions,
    suggestedUsers,
    isLoadingSuggestedUsers,
    focusedMentionIndex,
    handleMentionTextChange,
    handleMentionKeyDown,
    handleSelectMention,
    closeMentionSuggestions,
  } = useMentionSuggestions({
    textInput: replyInput,
    setTextInput: setReplyInput,
    inputRef: replyInputRef,
    authUser
  })

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const handleEmojiSelect = useCallback(
    (emojiData) => {
      const textarea = replyInputRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = replyInput.slice(0, start)
      const after = replyInput.slice(end)
      const newText = before + emojiData.emoji + after

      setReplyInput(newText)

      requestAnimationFrame(() => {
        const newCursor = start + emojiData.emoji.length
        textarea.focus()
        textarea.setSelectionRange(newCursor, newCursor)
      })

      handleCloseEmojiPickerPopover()
    },
    [replyInput, handleCloseEmojiPickerPopover],
  )

  const displayPost = post?.repostedFrom || post

  const adjustTextareaHeight = useCallback(() => {
    const textarea = replyInputRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    const isMainContentReady = !isLoading && !isLoadingThread

    if (isMainContentReady && heroRef.current) {
      // Small delay to ensure the DOM has finished painting the ancestors
      const timeout = setTimeout(() => {
        heroRef.current?.scrollIntoView({ behavior: "instant", block: "start" })
      }, 0)

      return () => clearTimeout(timeout)
    }
  }, [isLoading, isLoadingThread, pid])

  useEffect(() => {
    adjustTextareaHeight()
  }, [replyInput, adjustTextareaHeight])

  useEffect(() => {
    const el = observerTarget.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, pid])

  const handlePaste = usePasteHandler({
    inputRef: replyInputRef,
    input: replyInput,
    setInput: setReplyInput,
    setSelectedFile: setReplySelectedFile,
    setPreviewImage: setReplyPreviewImage,
    fileInputRef: replyFileInputRef,
  })

  const handleMediaChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReplySelectedFile(file)
      setReplyPreviewImage(URL.createObjectURL(file))
    } else {
      setReplySelectedFile(null)
      setReplyPreviewImage(null)
    }
  }

  const handleRemoveMedia = () => {
    setReplySelectedFile(null)
    setReplyPreviewImage(null)
    if (replyFileInputRef.current) replyFileInputRef.current.value = ""
  }

  const handleReplyTextChange = useCallback(
    (e) => {
      setReplyInput(e.target.value)
      handleMentionTextChange(e)
    },
    [handleMentionTextChange],
  )


  // Auto-default to anonymous when navigating to an anonymous post:
  // Auto-default: anonymous posts stay anonymous, vent posts let the user choose
  useEffect(() => {
    if (displayPost?.isAnonymous) {
      setIsAnonymousReply(true)
    } else {
      setIsAnonymousReply(false) // vent-but-not-anonymous posts default to false
    }
  }, [displayPost?.isAnonymous, pid])

  // In handleSubmitReply, add isAnonymous to the payload:
  const handleSubmitReply = useCallback(
    async (e) => {
      e.preventDefault()
      if (!replyInput.trim() && !replySelectedFile) return
      if (isCreatingReply) return

      const payload = {
        text: replyInput,
        isAnonymous: isAnonymousReply, // ADD
      }
      const submit = async (finalPayload) => {
        await createReply(finalPayload)
        setReplyInput("")
        setReplyPreviewImage(null)
        setReplySelectedFile(null)
        if (replyFileInputRef.current) replyFileInputRef.current.value = ""
        closeMentionSuggestions() // replaces the two manual clears
      }

      if (replySelectedFile) {
        const reader = new FileReader()
        reader.onloadend = async () => {
          if (replySelectedFile.type.startsWith("image/")) payload.img = reader.result
          else if (replySelectedFile.type.startsWith("video/")) payload.video = reader.result
          await submit(payload)
        }
        reader.readAsDataURL(replySelectedFile)
      } else {
        await submit(payload)
      }
    },
    [replyInput, replySelectedFile, isCreatingReply, createReply, isAnonymousReply], // ADD isAnonymousReply
  )

const handleKeyDown = useCallback(
  (e) => {
    handleMentionKeyDown(e)
    if (e.defaultPrevented) return // mention consumed Enter

    if (e.key === "Enter") {
      if (isMobile || e.shiftKey) {
        e.preventDefault()
        const input = replyInputRef.current
        if (!input) return
        const { selectionStart: s, selectionEnd: end } = input
        setReplyInput((prev) => prev.substring(0, s) + "\n" + prev.substring(end))
        setTimeout(() => input.setSelectionRange(s + 1, s + 1), 0)
      } else if (!isCreatingReply) {
        e.preventDefault()
        handleSubmitReply(e)
      }
    }
  },
  [handleMentionKeyDown, isMobile, isCreatingReply, handleSubmitReply],
)

  if (isLoading && !post) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!displayPost) {
    return (
      <div className="flex h-screen w-full flex-1 flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-center text-2xl font-bold">Post Not Found</h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 rounded-full px-4 py-2 hover:bg-secondary"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="template mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl lg:max-w-4xl md:border-x">
      <div className="flex items-center gap-2 border-b border-accent px-3 py-2 md:gap-4 md:px-4 md:py-3.5">
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
        >
          <FaArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold md:text-xl">Post</h1>
      </div>

      {ancestors.length > 0 && (
        <div>
          {ancestors.map((ancestor, index) => (
            <Post
              key={ancestor._id}
              post={ancestor}
              hasLineBelow={true}
              hasLineAbove={true}
              index={index}
            />
          ))}
          <HeroPost ref={heroRef} post={displayPost} hasLineAbove={true} />
        </div>
      )}

      {ancestors.length === 0 && <HeroPost ref={heroRef} post={displayPost} />}

      {authUser && (
        <form
          onSubmit={handleSubmitReply}
          className="relative flex flex-col gap-2 border-b border-accent px-2 py-3 md:p-4"
        >
          <div className="flex items-start md:gap-4">
            <div className="avatar flex-shrink-0">
              <div className="w-8 rounded-full md:w-9">
                <img
                  src={
                    isAnonymousReply
                      ? "/avatar-placeholder.png"
                      : getOptimizedImageUrl(
                          authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                          "avatar",
                        )
                  }
                  alt="Your profile"
                />
              </div>
            </div>
            <div className="relative flex-1">
              <textarea
                ref={replyInputRef}
                value={replyInput}
                onChange={handleReplyTextChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowButton(true)}
                onPaste={handlePaste}
                placeholder={isAnonymousReply ? "Reply anonymously..." : "Post your reply"}
                className="max-h-[140px] w-full resize-none overflow-y-auto bg-black/0 pl-3 text-base placeholder-gray-400 focus:outline-none sm:text-lg"
                disabled={isCreatingReply}
                rows={1}
              />

              {showButton && (
                <div className="flex justify-between">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    ref={replyFileInputRef}
                    onChange={handleMediaChange}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current.click()}
                      className="ml-[9px] flex-shrink-0 rounded-full text-primary transition duration-200 hover:text-primary/80"
                    >
                      <BiImageAdd size={24} />
                    </button>
                    <button
                      ref={emojiButtonRef}
                      type="button"
                      onClick={handleOpenEmojiPickerPopover}
                      className="flex-shrink-0 rounded-full p-1 text-primary transition duration-200 hover:text-primary/80"
                    >
                      <PiSmiley size={22} />
                    </button>

                    {/* Anonymous toggle — only shown when parent post is anonymous */}

                    {displayPost?.isVent && (
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 md:text-sm">
                        <input
                          type="checkbox"
                          className="checkbox-primary checkbox checkbox-xs"
                          checked={isAnonymousReply}
                          onChange={(e) => setIsAnonymousReply(e.target.checked)}
                        />
                        Reply Anonymously
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    className={`md:text-md block flex-shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-bold transition duration-300 hover:bg-primary/80 disabled:cursor-default ${shouldTextBeWhite(theme)} disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2`}
                    disabled={isCreatingReply || (!replyInput.trim() && !replyPreviewImage)}
                  >
                    {isCreatingReply ? <LoadingSpinner size="xs" /> : "Reply"}
                  </button>
                </div>
              )}

              <div className="relative">
                {showMentionSuggestions && (
                  <MentionSuggestionsDropdown
                    users={suggestedUsers}
                    isLoading={isLoadingSuggestedUsers}
                    query={debouncedMentionSearchTerm}
                    onSelect={handleSelectMention}
                    focusedIndex={focusedMentionIndex}
                    direction="down" // ← opens downward below the reply input area
                  />
                )}
              </div>
            </div>
          </div>

          {replyPreviewImage && (
            <div className="relative ml-12 mt-2 size-40 self-start">
              {replySelectedFile.type.startsWith("image/") ? (
                <img
                  src={replyPreviewImage}
                  alt="Reply preview"
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <video
                  controls
                  src={replyPreviewImage}
                  className="h-full w-full rounded-lg object-contain"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              )}
              <ImagePreviewCloseButton onClick={handleRemoveMedia} />
            </div>
          )}
        </form>
      )}

      <div className="flex min-w-0 flex-col">
        {isLoadingReplies ? (
          <div className="flex h-full flex-col items-center gap-4 p-2 md:gap-14 md:p-4">
            <LoadingSpinner size="md" />
          </div>
        ) : replies.length > 0 ? (
          <>
            {replies.map((reply) => (
              <div key={reply._id} className="min-w-0">
                <Post post={reply} hasLineBelow={!!reply.firstChildReply} index={0} />

                {reply.firstChildReply && (
                  <Post post={reply.firstChildReply} hasLineAbove={true} index={1} />
                )}
              </div>
            ))}

            {hasNextPage && (
              <div className="flex justify-center py-4" ref={observerTarget}>
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-primary hover:underline"
                >
                  {isFetchingNextPage ? <LoadingSpinner size="sm" /> : "Load more replies"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-4 p-4 text-center text-gray-400">
            No replies yet. Be the first to reply!
          </p>
        )}
      </div>
      {showEmojiPickerPopover && (
        <EmojiPickerPopover
          position={popoverPosition}
          onClose={handleCloseEmojiPickerPopover}
          onEmojiClick={handleEmojiSelect}
          triggerRef={emojiButtonRef}
        />
      )}
    </div>
  )
}

export default PostPage
