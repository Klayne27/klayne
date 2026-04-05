import { useState, useRef, useEffect } from "react"
import { FaTrashCan } from "react-icons/fa6"
import { IoChatbubbleSharp, IoClose } from "react-icons/io5"
import { Link } from "react-router-dom"

import BoardCommentItem from "./BoardCommentItem"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useBoardStore } from "../../../store/useBoardStore"
import { useGetBoardComments, useGetBoardPost } from "../boardHooks/boardQueries"
import {
  useCreateBoardComment,
  useDeleteBoardComment,
  useDeleteBoardPost,
  useEditBoardComment,
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
  const boardInputRef = useRef(null)

  const { post, isLoading } = useGetBoardPost(postId)

  const messageShape = toMessageShape(post)

  const { isSentByCurrentUser, isEditable, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(messageShape, authUser)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
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

  const { createComment, isCreatingComment } = useCreateBoardComment(postId)
  const { deleteComment } = useDeleteBoardComment(postId)
  const { deleteBoardPost } = useDeleteBoardPost()
  const { reactToPost } = useReactToBoardPost()
  const { reactToComment } = useReactToBoardComment(postId)
  const { editComment, isEditingComment } = useEditBoardComment(postId)

  const [commentInput, setCommentInput] = useState("")
  const [editInput, setEditInput] = useState("")
  // const inputRef = useRef(null)

  useEffect(() => {
    if (editingComment) {
      setEditInput(editingComment.content)
      setTimeout(() => boardInputRef.current?.focus(), 0)
    }
  }, [editingComment, boardInputRef])

  useEffect(() => {
    if (replyingToComment) {
      setTimeout(() => boardInputRef.current?.focus(), 0)
    }
  }, [replyingToComment, boardInputRef])

  useEffect(() => {
    return () => clearReplyAndEdit()
  }, [postId, clearReplyAndEdit])

  const handleReactionClick = (id, emoji) => {
    reactToPost({ id, emoji })
  }

  const handleEmojiPickerSelect = (emojiData) => {
    reactToPost({ id: post._id, emoji: emojiData.emoji })
    handleCloseEmojiPickerPopover()
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
    } else {
      if (!commentInput.trim()) return
      createComment(
        {
          content: commentInput,
          parentCommentId: replyingToComment?._id || null,
        },
        {
          onSuccess: () => {
            setCommentInput("")
            clearReplyAndEdit()
          },
        },
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!post) return null

  const isOwner = authUser?._id === post.user?._id || authUser?._id === post.user

  return (
    <div className="relative flex h-full flex-col bg-base-100">
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="mt-6 flex items-center gap-3 px-4 py-3">
          <h2 className="mb-4 flex flex-col gap-4 break-words text-4xl font-semibold leading-tight">
            <span>
              <IoChatbubbleSharp size={44} className="text-primary" />
            </span>
            {post.title}
          </h2>
          {(isOwner || authUser?.isAdmin) && (
            <button
              onClick={() => {
                deleteBoardPost(postId)
                onClose()
              }}
              className="ml-auto rounded-full p-2 text-red-500 transition hover:bg-red-500/10"
            >
              <FaTrashCan size={18} />
            </button>
          )}
        </div>
        {/* Post body */}
        <div
          className="group relative mb-2 border-accent transition hover:bg-gray-700/10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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

            {post.content && (
              <p className="whitespace-pre-wrap leading-relaxed">
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
          </section>

          {/* MessageActionsModal — appears on hover exactly like chat */}
          <MessageActionsModal
            message={messageShape}
            isSentByCurrentUser={false}
            showModal={showModal}
            messageContentStyle={{}}
            onReactionClick={handleReactionClick}
            moreEmojisButtonRef={moreEmojisButtonRef}
            handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
            onReplyClick={() => setReplyingToComment(post)}
            onOpenMoreActionsModal={() => {
              if (isEditable) setEditingComment(post)
            }}
          />
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

        {/* Comments list */}
        <div className="flex flex-col">
          {isLoadingComments ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-gray-500">
              No comments yet. Start the conversation!
            </p>
          ) : (
            comments.map((comment) => (
              <BoardCommentItem
                key={comment._id}
                comment={comment}
                boardPostId={postId}
                onReact={reactToComment}
                onDelete={deleteComment}
              />
            ))
          )}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="py-6 text-center text-sm text-primary hover:underline"
            >
              {isFetchingNextPage ? <LoadingSpinner size="sm" /> : "Load more comments"}
            </button>
          )}
        </div>
      </div>

      {/* FLOATING INPUT BAR */}
      {authUser && (
        <div className="absolute bottom-2 left-0 right-0 px-2 md:bottom-4 md:px-4">
          {" "}
          {/* Container for the "Float" effect */}
          <form
            onSubmit={handleSubmitComment}
            className="mx-auto max-w-4xl rounded-2xl border border-accent bg-base-100/80 p-3 shadow-2xl backdrop-blur-lg"
          >
            {/* Context banner: replying or editing */}
            {(replyingToComment || editingComment) && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-primary/20 px-3 py-1.5 text-xs text-primary">
                <span className="font-medium">
                  {editingComment
                    ? "Editing your comment"
                    : `Replying to @${replyingToComment.user?.username}`}
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

            <div className="flex items-center gap-3">
              <img
                src={getOptimizedImageUrl(authUser?.profileImg?.imageUrl, "avatar")}
                className="h-9 w-9 flex-shrink-0 rounded-full border border-accent object-cover"
                alt="you"
              />
              <div className="flex flex-1 items-center rounded-full border border-transparent bg-base-200 px-4 py-1 transition-all focus-within:border-primary/50">
                <input
                  ref={boardInputRef}
                  value={editingComment ? editInput : commentInput}
                  onChange={(e) =>
                    editingComment ? setEditInput(e.target.value) : setCommentInput(e.target.value)
                  }
                  placeholder={
                    editingComment
                      ? "Edit your comment..."
                      : replyingToComment
                        ? `Reply to @${replyingToComment.user?.username}...`
                        : "Write a comment..."
                  }
                  className="w-full bg-transparent py-2 text-sm placeholder-gray-500 focus:outline-none"
                  disabled={isCreatingComment || isEditingComment}
                />
              </div>
              <button
                type="submit"
                disabled={
                  isCreatingComment ||
                  isEditingComment ||
                  !(editingComment ? editInput.trim() : commentInput.trim())
                }
                className="flex-shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isCreatingComment || isEditingComment ? (
                  <LoadingSpinner size="xs" />
                ) : editingComment ? (
                  "Save"
                ) : (
                  "Post"
                )}
              </button>
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
    </div>
  )
}

export default BoardPostDetail
