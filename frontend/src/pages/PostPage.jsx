import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa6"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useDebounce } from "../hooks/customHooks/useDebounce"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../hooks/customHooks/usePasteHandler"
import LoadingSpinner from "../components/common/LoadingSpinner"
import Post from "../features/posts/Post"
import { BiImageAdd } from "react-icons/bi"
import { IoClose } from "react-icons/io5"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import HeroPost from "../features/posts/HeroPost"
import { useSearchUsers } from "../features/users/usersHooks/useUserMutations"
import { useGetPost, useGetPostThread, useGetReplies } from "../features/posts/postsHooks/usePostsQueries"
import { useCreateReply } from "../features/posts/postsHooks/usePostsMutations"

const PostPage = () => {
  const { pid } = useParams()
  const navigate = useNavigate()
  const { authUser } = useAuthUser()

  const [replyInput, setReplyInput] = useState("")
  const [replyPreviewImage, setReplyPreviewImage] = useState(null)
  const [replySelectedFile, setReplySelectedFile] = useState(null)
  const replyFileInputRef = useRef(null)
  const replyInputRef = useRef(null)
  const observerTarget = useRef(null)
  const heroRef = useRef(null)

  const [showButton, setShowButton] = useState(false)
  const [mentionSearchTerm, setMentionSearchTerm] = useState("")
  const debouncedMentionSearchTerm = useDebounce(mentionSearchTerm, 300)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)

  const isMobile = useIsMobile()

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

  const displayPost = post?.repostedFrom || post

  const adjustTextareaHeight = useCallback(() => {
    const textarea = replyInputRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  // useEffect(() => {
  //   if (heroRef.current && !isLoading ) {
  //     heroRef.current.scrollIntoView({ behavior: "instant", block: "start" })
  //   }
  // }, [isLoading, isLoadingThread, isLoadingReplies])

  // useEffect(() => {

  //   if (!isLoading && heroRef.current) {
  //     heroRef.current.scrollIntoView({ behavior: "instant", block: "start" })
  //   }
  // }, [isLoading, pid])

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

  // useEffect(() => {
  //   if (pid) {
  //     refetchPost()
  //     refetchReplies()
  //   }
  // }, [pid, refetchPost, refetchReplies])

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

  const handleReplyTextChange = (e) => {
    const newText = e.target.value
    setReplyInput(newText)
    const lastAtIndex = newText.lastIndexOf("@")
    if (lastAtIndex !== -1) {
      const potential = newText.substring(lastAtIndex + 1)
      if (potential.length > 0 && !/\s/.test(potential)) {
        setMentionSearchTerm(potential)
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
      const text = replyInput
      const lastAt = text.lastIndexOf("@")
      if (lastAt === -1) return
      const fromAt = text.substring(lastAt)
      const match = fromAt.match(/^@([a-zA-Z0-9_]*)/)
      const partialLen = match?.[1]?.length ?? 0
      const newText =
        text.substring(0, lastAt) + `@${username} ` + text.substring(lastAt + 1 + partialLen)
      setReplyInput(newText)
      setMentionSearchTerm("")
      setShowMentionSuggestions(false)
      setTimeout(() => {
        const input = replyInputRef.current
        if (input) {
          const pos = lastAt + username.length + 2
          input.setSelectionRange(pos, pos)
          input.focus()
        }
      }, 0)
    },
    [replyInput],
  )

  const handleSubmitReply = useCallback(
    async (e) => {
      e.preventDefault()
      if (!replyInput.trim() && !replySelectedFile) return
      if (isCreatingReply) return

      const payload = { text: replyInput }

      const submit = async (finalPayload) => {
        await createReply(finalPayload)
        setReplyInput("")
        setReplyPreviewImage(null)
        setReplySelectedFile(null)
        if (replyFileInputRef.current) replyFileInputRef.current.value = ""
        setMentionSearchTerm("")
        setShowMentionSuggestions(false)
      }

      if (replySelectedFile) {
        const reader = new FileReader()
        reader.onloadend = async () => {
          if (replySelectedFile.type.startsWith("image/")) {
            payload.img = reader.result
          } else if (replySelectedFile.type.startsWith("video/")) {
            payload.video = reader.result
          }
          await submit(payload)
        }
        reader.readAsDataURL(replySelectedFile)
      } else {
        await submit(payload)
      }
    },
    [replyInput, replySelectedFile, isCreatingReply, createReply],
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        if (showMentionSuggestions && suggestedUsers.length > 0) {
          e.preventDefault()
          handleSelectMention(suggestedUsers[0].username)
        } else if (isMobile) {
          e.preventDefault()
          const input = replyInputRef.current
          if (!input) return
          const { selectionStart: s, selectionEnd: end } = input
          setReplyInput(replyInput.substring(0, s) + "\n" + replyInput.substring(end))
          setTimeout(() => input.setSelectionRange(s + 1, s + 1), 0)
        } else if (e.shiftKey) {
          e.preventDefault()
          const input = replyInputRef.current
          if (!input) return
          const { selectionStart: s, selectionEnd: end } = input
          setReplyInput(replyInput.substring(0, s) + "\n" + replyInput.substring(end))
          setTimeout(() => input.setSelectionRange(s + 1, s + 1), 0)
        } else {
          if (!isCreatingReply) {
            e.preventDefault()
            handleSubmitReply(e)
          }
        }
      }
    },
    [
      isMobile,
      replyInput,
      showMentionSuggestions,
      suggestedUsers,
      handleSelectMention,
      isCreatingReply,
      handleSubmitReply,
    ],
  )

  // if (isLoading || isLoadingThread) {
  //   return (
  //     <div className="flex h-screen w-full flex-1 items-center justify-center">
  //       <LoadingSpinner size="lg" />
  //     </div>
  //   )
  // }

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
    <div className="template mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl lg:max-w-4xl">
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
                    post.isAnonymous && post.user._id === authUser._id
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
                placeholder="Post your reply"
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
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current.click()}
                    className="ml-[9px] flex-shrink-0 rounded-full text-primary transition duration-200 hover:text-primary/80"
                  >
                    <BiImageAdd size={24} />
                  </button>
                  <button
                    type="submit"
                    className="md:text-md block flex-shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-bold text-white transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2"
                    disabled={isCreatingReply || (!replyInput.trim() && !replyPreviewImage)}
                  >
                    {isCreatingReply ? <LoadingSpinner size="xs" /> : "Reply"}
                  </button>
                </div>
              )}

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
                              src={getOptimizedImageUrl(
                                user.profileImg?.imageUrl || "/avatar-placeholder.png",
                                "avatar",
                              )}
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
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="absolute -right-2 -top-2 rounded-full bg-slate-500 p-1 text-xs text-white hover:bg-slate-600"
              >
                <IoClose size={15} />
              </button>
            </div>
          )}
        </form>
      )}

      <div className="flex flex-col">
        {isLoadingReplies ? (
          <div className="flex h-full flex-col items-center gap-4 p-2 md:gap-14 md:p-4">
            <LoadingSpinner size="md" />
          </div>
        ) : replies.length > 0 ? (
          <>
            {replies.map((reply) => (
              <div key={reply._id}>
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
    </div>
  )
}

export default PostPage
