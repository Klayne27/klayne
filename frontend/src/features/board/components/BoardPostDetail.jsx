import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { FaTrashCan } from "react-icons/fa6"
import { IoChatbubbleSharp, IoClose } from "react-icons/io5"
import { Link } from "react-router-dom"
import { useInView } from "react-intersection-observer"

import BoardCommentItem from "./BoardCommentItem"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useBoardStore } from "../../../store/useBoardStore"
import { useGetBoardComments, useGetBoardPost } from "../boardHooks/boardQueries"
import {
  useCreateBoardComment,
  useDeleteBoardComment,
  useDeleteBoardPost,
  useEditBoardComment,
  useEditBoardPost,
  useReactToBoardComment,
  useReactToBoardPost,
} from "../boardHooks/boardMutations"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"
import { renderClickableText } from "../../../utils/textUtils"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import MessageActionsModal from "../../chat/common/components/MessageActionsModal"
import MessageReactions from "../../chat/common/components/MessageReactions"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import MoreMessageActionsModal from "../../chat/common/components/MoreMessageActionsModal"
import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
import ViewReactionsModal from "../../../components/common/ViewReactionsModal"
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages"
import { MdSend } from "react-icons/md"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"

const formatDateSeparator = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const toMessageShape = (post) => ({
  ...post,
  sender: post?.user, // useMessagingMetaData reads .sender
  text: post?.content, // cosmetic alias
  isDeletedByAdmin: post?.isDeletedByAdmin || false,
  isDeletedByUser: post?.isDeletedByUser || false,
})

const BoardPostDetail = ({ postId, onClose }) => {
  const { authUser } = useAuthUser()
  const setReplyingToComment = useBoardStore((s) => s.setReplyingToComment)
  const setEditingComment = useBoardStore((s) => s.setEditingComment)
  const replyingToComment = useBoardStore((s) => s.replyingToComment)
  const editingComment = useBoardStore((s) => s.editingComment)
  const activeCommentModalId = useBoardStore((s) => s.activeCommentModalId)
  const setActiveCommentModalId = useBoardStore((s) => s.setActiveCommentModalId)
  const replyingToPost = useBoardStore((s) => s.replyingToPost)
  const setReplyingToPost = useBoardStore((s) => s.setReplyingToPost)
  const editingPost = useBoardStore((s) => s.editingPost)
  const setEditingPost = useBoardStore((s) => s.setEditingPost)

  const boardInputRef = useRef(null)
  const inlineTextareaRef = useRef(null) // New ref for the content textarea

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)
  const [editPostContent, setEditPostContent] = useState("")
  const [isEditingPostInline, setIsEditingPostInline] = useState(false)
  const [inlinePostContent, setInlinePostContent] = useState("")

  const { post, isLoading } = useGetBoardPost(postId)
  const { editBoardPost, isEditingPost } = useEditBoardPost()

  const messageShape = toMessageShape(post)

  const { isSentByCurrentUser, isEditable, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(messageShape, authUser)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)
  const commentRefs = useRef({}) // { [commentId]: domNode }
  const scrollContainerRef = useRef(null)
  const isMobile = useIsMobile()

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
    setShowEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const { handleMouseEnter, handleMouseLeave, showModal } = useMessageModalInteractions(
    post?._id,
    setActiveCommentModalId,
    activeCommentModalId,
    null, // no mobile long press handler yet
  )

  const isAdmin = authUser?.isAdmin
  const clearReplyAndEdit = useBoardStore((s) => s.clearReplyAndEdit)

  const {
    comments,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetBoardComments(postId)

  const {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable, post })

  const { createComment, isCreatingComment } = useCreateBoardComment(postId)
  const { deleteComment } = useDeleteBoardComment(postId)
  const { deleteBoardPost } = useDeleteBoardPost()
  const { reactToPost } = useReactToBoardPost()
  const { reactToComment } = useReactToBoardComment(postId)
  const { editComment, isEditingComment } = useEditBoardComment(postId)

  const [commentInput, setCommentInput] = useState("")
  const [editInput, setEditInput] = useState("")
  // const inputRef = useRef(null)

  // Auto-resize logic
  useLayoutEffect(() => {
    if (isEditingPostInline && inlineTextareaRef.current) {
      inlineTextareaRef.current.style.height = "auto"
      inlineTextareaRef.current.style.height = `${inlineTextareaRef.current.scrollHeight}px`
    }
  }, [inlinePostContent, isEditingPostInline])

  useEffect(() => {
    if (replyingToComment) {
      setTimeout(() => inlineTextareaRef.current?.focus(), 0)
    }
  }, [replyingToComment, inlineTextareaRef])

  useEffect(() => {
    if (isEditingPostInline && inlineTextareaRef.current) {
      const el = inlineTextareaRef.current

      el.focus()

      const length = el.value.length
      el.setSelectionRange(length, length)
    }
  }, [isEditingPostInline]) // Only run when the inline mode toggle changes

  const handleJumpToComment = useCallback((commentId) => {
    const node = commentRefs.current[commentId]
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "center" })
    // Flash highlight
    node.classList.add("bg-primary/10")
    setTimeout(() => node.classList.remove("bg-primary/10"), 1500)
  }, [])

  const mappedForProcessing = comments.map((c) => ({ ...c, sender: c.user }))
  const processedComments = useProcessedMessage(mappedForProcessing, null)

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const resetForm = () => {
    // if (postFileInputRef.current) {
    //   postFileInputRef.current.value = null
    // }
    setCommentInput("")
    clearReplyAndEdit()
    if (inlineTextareaRef.current) {
      inlineTextareaRef.current.style.height = "auto"
    }
  }

  const handleReactionClick = (id, emoji) => {
    reactToPost({ id: id, emoji })
  }

  const handleCloseMoreActionsModal = () => {
    setShowMoreActionsModal(false)
  }

  const handleEmojiPickerSelect = (emojiData) => {
    reactToPost({ id: post._id, emoji: emojiData.emoji })
    handleCloseEmojiPickerPopover()
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(post.content)
    setShowMoreActionsModal(false)
  }

  const handleDeleteOwnMessage = () => {
    deleteBoardPost(post._id)
    setShowMoreActionsModal(false)
  }

  const handleOpenViewReactionsModal = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowViewReactionsModal(true)
  }

  const handleCloseViewReactionsModal = () => {
    setShowViewReactionsModal(false)
  }

  const handleOpenEditPost = () => {
    // setInlinePostTitle(post.title)
    setInlinePostContent(post.content)
    setIsEditingPostInline(true)
    setShowMoreActionsModal(false)
  }

  const handleCancelEditPost = () => {
    setIsEditingPostInline(false)
  }

  const handleSaveEditPost = () => {
    if (!inlinePostContent.trim() || inlinePostContent.trim() === post.content) {
      handleCancelEditPost()
      return
    }
    editBoardPost(
      { id: postId, content: inlinePostContent },
      { onSuccess: () => setIsEditingPostInline(false) },
    )
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSaveEditPost()
    }
    if (e.key === "Escape") {
      handleCancelEditPost()
    }
  }

  const handleSubmitComment = (e) => {
    e.preventDefault()

    if (editingComment) {
      if (!editInput.trim()) return
      editComment(
        { commentId: editingComment._id, content: editInput },
        {
          onSuccess: () => {
            setEditInput("")
            clearReplyAndEdit()
          },
        },
      )
      return
    }

    if (!commentInput.trim()) return
    createComment(
      {
        content: commentInput,
        parentCommentId: replyingToComment?._id || null,
      },
      {
        onSuccess: () => {
          resetForm()
        },
      },
    )
  }
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!post) return null

  const isBoardPostOwner = authUser?._id === post.user?._id || authUser?._id === post.user

  return (
    <div className="group relative flex h-full min-w-0 flex-col bg-base-100">
      {" "}
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="mt-6 flex items-center gap-3 px-4 py-3">
          <h2 className="mb-4 flex flex-col gap-4 break-words text-4xl font-semibold leading-tight">
            <span>
              <IoChatbubbleSharp size={44} className="text-primary" />
            </span>
            {post.title}
            {post.isEdited && (
              <span className="text-sm font-normal italic text-slate-500">(edited)</span>
            )}
          </h2>
        </div>

        {/* Post body */}
        <div
          className="group relative mb-2 border-accent transition hover:bg-gray-700/10"
          onMouseEnter={!isEditingPostInline ? handleMouseEnter : undefined}
          onMouseLeave={!isEditingPostInline ? handleMouseLeave : undefined}
        >
          <section className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Link to={`/profile/${post.user?.username}`}>
                <img
                  src={getOptimizedImageUrl(post.user?.profileImg?.imageUrl, "avatar")}
                  className="h-9 w-9 rounded-full object-cover"
                  alt={post.user?.username}
                />
              </Link>
              <div>
                <Link to={`/profile/${post.user?.username}`} className="font-bold hover:underline">
                  {post.user?.fullName}
                </Link>
                <p className="text-xs text-slate-500">
                  @{post.user?.username} · {formatPostDate(post.createdAt)}
                </p>
              </div>
            </div>

            {/* Content — editable inline when editing */}
            {isEditingPostInline ? (
              <div>
                <textarea
                  ref={inlineTextareaRef}
                  value={inlinePostContent}
                  onChange={(e) => setInlinePostContent(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  placeholder="Content"
                  className="w-full resize-none overflow-hidden break-words rounded-lg border border-primary/40 bg-base-200 px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isEditingPost}
                  // style={{ minHeight: "100px" }}
                />

                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                  <span>
                    escape to{" "}
                    <button
                      type="button"
                      onClick={handleCancelEditPost}
                      className="text-primary hover:underline"
                    >
                      cancel
                    </button>
                    {" · "}enter to{" "}
                    <button
                      type="button"
                      onClick={handleSaveEditPost}
                      disabled={isEditingComment}
                      className="text-primary hover:underline disabled:opacity-50"
                    >
                      save
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <>
                {post.content && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {renderClickableText(post.content)}
                  </p>
                )}
                {post.image?.imageUrl && (
                  <Link to={`/images/${post.image._id}`}>
                    <img
                      src={post.image.imageUrl}
                      alt="post"
                      className="mt-3 max-h-80 w-full rounded-2xl border border-accent object-contain"
                    />
                  </Link>
                )}
                {post.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Hide action bar while editing inline */}
          {!isEditingPostInline && (
            <>
              <MessageActionsModal
                message={messageShape}
                isSentByCurrentUser={false}
                showModal={showModal}
                messageContentStyle={{}}
                onReactionClick={handleReactionClick}
                moreEmojisButtonRef={moreEmojisButtonRef}
                handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
                onReplyClick={() => setReplyingToPost(true)}
                onOpenMoreActionsModal={handleOpenMoreActionsModal}
              />

              {showMoreActionsModal && (
                <MoreMessageActionsModal
                  message={messageShape}
                  onCloseMoreActionsModal={handleCloseMoreActionsModal}
                  moreActionsModalPosition={moreActionsModalPosition}
                  onReplyClick={() => setReplyingToPost(true)}
                  onEditClick={handleOpenEditPost} // ← opens inline edit
                  onCopyMessage={handleCopyMessage}
                  onDeleteOwnMessage={handleDeleteOwnMessage}
                  reactToComment={reactToPost}
                  isEditable={isEditable}
                  isSentByCurrentUser={isSentByCurrentUser}
                  onOpenViewReactionsModal={handleOpenViewReactionsModal}
                  isBoardPostOwner={isBoardPostOwner}
                  postId={postId}
                />
              )}
            </>
          )}
        </div>
        <div className="border-b-8 border-t border-accent">
          {/* Reactions row */}
          {hasAnyReactions && (
            <div className="p-2">
              <MessageReactions
                groupedReactions={groupedReactions}
                currentUser={authUser}
                isSentByCurrentUser={false}
                messageContentStyle={{}}
                addReactionButtonRef={addReactionButtonRef}
                handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
                message={messageShape}
                onReactionClick={handleReactionClick}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {isLoadingComments ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : processedComments.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-gray-500">
              No comments yet. Start the conversation!
            </p>
          ) : (
            <>
              {processedComments.map((comment) => (
                <div
                  key={comment._id}
                  ref={(el) => {
                    commentRefs.current[comment._id] = el
                  }}
                  className="transition-colors duration-500"
                >
                  {/* Date separator */}
                  {comment.isNewDay && (
                    <div className="relative my-4 flex items-center px-4">
                      <div className="flex-1 border-t border-accent" />
                      <span className="mx-3 flex-shrink-0 text-xs font-semibold text-slate-500">
                        {formatDateSeparator(comment.createdAt)}
                      </span>
                      <div className="flex-1 border-t border-accent" />
                    </div>
                  )}
                  <BoardCommentItem
                    comment={comment}
                    boardPostId={postId}
                    post={post}
                    onReact={reactToComment}
                    onDelete={deleteComment}
                    onJumpToComment={handleJumpToComment}
                  />
                </div>
              ))}

              {/* Auto-load sentinel — replaces the "Load more" button */}
              <div ref={loadMoreRef} className="py-2 text-center">
                {isFetchingNextPage && <LoadingSpinner size="sm" />}
              </div>
            </>
          )}
        </div>
      </div>
      {/* FLOATING INPUT BAR */}
      {authUser && (
        <div className="absolute bottom-2 left-0 right-0 px-2 md:bottom-4 md:px-4">
          <form
            onSubmit={handleSubmitComment}
            className="mx-auto max-w-4xl rounded-2xl border border-accent bg-base-100/80 p-3 shadow-2xl backdrop-blur-lg"
          >
            {/* Context banner */}
            {(replyingToComment || replyingToPost || editingComment) && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/20 px-3 py-1.5 text-xs text-primary">
                <span className="truncate font-medium">
                  {editingComment
                    ? "Editing your comment"
                    : replyingToPost
                      ? `Replying to post by @${post.user?.username}`
                      : `Replying to @${replyingToComment?.user?.username}`}
                </span>
                <button
                  type="button"
                  onClick={clearReplyAndEdit}
                  className="ml-2 rounded-full p-0.5 hover:bg-primary/20"
                >
                  <IoClose size={14} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-3">
              <img
                src={getOptimizedImageUrl(authUser?.profileImg?.imageUrl, "avatar")}
                className="mb-1 h-9 w-9 flex-shrink-0 rounded-full border border-accent object-cover"
                alt="you"
              />

              {/* min-w-0 is CRITICAL here to allow the flex item to shrink on small screens */}
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-transparent bg-base-200 px-3 transition-all focus-within:border-primary/50">
                <textarea
                  ref={inlineTextareaRef}
                  rows={1}
                  value={editingComment ? editInput : commentInput}
                  onChange={(e) => {
                    const val = e.target.value
                    editingComment ? setEditInput(val) : setCommentInput(val)

                    // Auto-grow height logic
                    e.target.style.height = "auto"
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onKeyDown={(e) => {
                    // Submit on Enter (but allow Shift+Enter for new lines)
                    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                      e.preventDefault()
                      handleSubmitComment(e)
                    }
                  }}
                  placeholder={
                    editingComment
                      ? "Edit your comment..."
                      : replyingToPost
                        ? `Reply to @${post.user?.username}...`
                        : "Write a comment..."
                  }
                  className="max-h-32 w-full resize-none bg-transparent py-2.5 text-sm placeholder-gray-500 focus:outline-none"
                  disabled={isCreatingComment || isEditingComment}
                />
              </div>

              {isMobile && (
                <button
                  type="submit"
                  disabled={
                    isCreatingComment ||
                    isEditingComment ||
                    !(editingComment ? editInput.trim() : commentInput.trim())
                  }
                  className="mb-0.5 flex-shrink-0 rounded-full bg-primary p-2.5 text-white transition hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isCreatingComment ? <LoadingSpinner size="xs" /> : <MdSend size={18} />}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {/* Emoji picker portal */}
      {showEmojiPickerPopover && (
        <EmojiPickerPopover
          position={popoverPosition}
          onClose={handleCloseEmojiPickerPopover}
          onEmojiClick={handleEmojiPickerSelect}
          triggerRef={moreEmojisButtonRef}
        />
      )}
      {showViewReactionsModal && (
        <ViewReactionsModal
          isOpen={showViewReactionsModal}
          onClose={handleCloseViewReactionsModal}
          reactions={post.reactions ? post.reactions : []}
        />
      )}
    </div>
  )
}

export default BoardPostDetail
