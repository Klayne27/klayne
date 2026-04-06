import { useRef, useState, useEffect, useLayoutEffect } from "react"
import { FaTrashCan } from "react-icons/fa6"
import { Link } from "react-router-dom"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useBoardStore } from "../../../store/useBoardStore"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import MessageActionsModal from "../../chat/common/components/MessageActionsModal"
import MessageReactions from "../../chat/common/components/MessageReactions"
import MoreMessageActionsModal from "../../chat/common/components/MoreMessageActionsModal"
import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
import ViewReactionsModal from "../../../components/common/ViewReactionsModal"
import { useEditBoardComment } from "../boardHooks/boardMutations"

const toMessageShape = (comment) => ({
  ...comment,
  sender: comment.user,
  text: comment.content,
  isDeletedByAdmin: comment.isDeletedByAdmin || false,
  isDeletedByUser: comment.isDeletedByUser || false,
})

const BoardCommentItem = ({ comment, post, boardPostId, onReact, onDelete, onJumpToComment }) => {
  const { authUser } = useAuthUser()
  const setReplyingToComment = useBoardStore((s) => s.setReplyingToComment)
  const activeCommentModalId = useBoardStore((s) => s.activeCommentModalId)
  const setActiveCommentModalId = useBoardStore((s) => s.setActiveCommentModalId)

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)

  // ── Inline edit state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(comment.content)
  const editTextareaRef = useRef(null)
  const { editComment, isEditingComment } = useEditBoardComment(boardPostId)

  // 1. Auto-resize logic (The same as we did for Post Detail)
  useLayoutEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.style.height = "inherit"
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`
    }
  }, [editValue, isEditing])

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus()
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length,
      )
    }
  }, [isEditing])

  const handleOpenEdit = () => {
    setEditValue(comment.content)
    setIsEditing(true)
    setShowMoreActionsModal(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditValue(comment.content)
  }

  const handleSaveEdit = () => {
    if (!editValue.trim() || editValue.trim() === comment.content) {
      handleCancelEdit()
      return
    }
    editComment(
      { commentId: comment._id, content: editValue },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  const messageShape = toMessageShape(comment)

  const { isSentByCurrentUser, isEditable, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(messageShape, authUser)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const isBoardPostOwner = post?.user._id === authUser._id

  const {
    showEmojiPickerPopover,
    popoverPosition,
    setShowEmojiPickerPopover,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable, comment })

  const { handleMouseEnter, handleMouseLeave, showModal } = useMessageModalInteractions(
    comment._id,
    setActiveCommentModalId,
    activeCommentModalId,
    null,
  )

  const handleReactionClick = (commentId, emoji) => {
    onReact({ commentId, emoji })
  }

  const handleEmojiPickerSelect = (emojiData) => {
    onReact({ commentId: comment._id, emoji: emojiData.emoji })
    handleCloseEmojiPickerPopover()
  }

  const handleReplyClick = (comment) => {
    setReplyingToComment(comment)
    setShowMoreActionsModal(false)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(comment.content)
    setShowMoreActionsModal(false)
  }

  const handleDeleteOwnMessage = () => {
    onDelete(comment._id)
    setShowMoreActionsModal(false)
  }

  const handleOpenViewReactionsModal = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowViewReactionsModal(true)
  }

  return (
    <div
      className="group relative my-2 border-accent px-4 py-2 transition hover:bg-gray-700/10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {comment.parentComment && (
        <div
          className="mb-1 flex cursor-pointer items-center gap-1 pl-10 text-xs text-slate-500 hover:text-primary"
          onClick={() => onJumpToComment?.(comment.parentComment._id)} // ADD onClick
        >
          <span>↩</span>
          <span className="font-semibold text-primary">
            @{comment.parentComment?.user?.username}
          </span>
          {comment.parentComment.isDeletedByUser || comment.parentComment.isDeletedByAdmin ? (
            <span className="italic text-slate-600">(deleted)</span>
          ) : (
            <span className="max-w-[120px] truncate italic">"{comment.parentComment.content}"</span>
          )}
        </div>
      )}

      <div className="flex min-w-0 items-start gap-2">
        {" "}
        {/* Added min-w-0 */}
        <Link to={`/profile/${comment.user?.username}`} className="flex-shrink-0">
          <img
            src={getOptimizedImageUrl(comment.user?.profileImg?.imageUrl, "avatar")}
            className="mt-0.5 h-8 w-8 rounded-full object-cover"
            alt={comment.user?.username}
          />
        </Link>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            {" "}
            <Link
              to={`/profile/${comment.user?.username}`}
              className="truncate text-sm font-bold hover:underline" // Added truncate
            >
              {comment.user?.fullName}
            </Link>
            <span className="flex-shrink-0 text-xs text-slate-500">
              · {formatPostDate(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="flex-shrink-0 text-xs italic text-slate-600">(edited)</span>
            )}
          </div>

          {/* ── Content or inline edit ─────────────────────────────────── */}
          {comment.isDeletedByAdmin || comment.isDeletedByUser ? (
            <p className="mt-0.5 text-sm italic text-slate-600">
              {comment.isDeletedByAdmin ? "Deleted by admin." : "Message deleted."}
            </p>
          ) : isEditing ? (
            <div className="mt-1">
              <textarea
                ref={editTextareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                // Removed static rows={3}, added overflow-hidden and break-words
                className="w-full resize-none overflow-hidden break-words rounded-lg border border-primary/40 bg-base-200 px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isEditingComment}
              />
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                <span>
                  escape to{" "}
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-primary hover:underline"
                  >
                    cancel
                  </button>
                  {" · "}enter to{" "}
                  <button
                    type="button"
                    onClick={handleSaveEdit}
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
              {/* Added break-words and min-w-0 to prevent UI pushing */}
              <p className="mt-0.5 min-w-0 max-w-full overflow-hidden whitespace-pre-wrap break-words">
                {comment.content}
              </p>{" "}
              {comment.image?.imageUrl && (
                <img
                  src={comment.image.imageUrl}
                  className="mt-2 max-h-48 rounded-xl border border-accent object-contain"
                  alt="comment"
                />
              )}
            </>
          )}
          {hasAnyReactions && (
            <div className="min-w-0">
              {" "}
              {/* Wrapper for reactions */}
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
      </div>

      {/* Hide action modal while inline editing */}
      {!isEditing && (
        <MessageActionsModal
          message={messageShape}
          isSentByCurrentUser={false}
          showModal={showModal}
          messageContentStyle={{}}
          onReactionClick={handleReactionClick}
          moreEmojisButtonRef={moreEmojisButtonRef}
          handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
          onReplyClick={() => handleReplyClick(comment)}
          onOpenMoreActionsModal={handleOpenMoreActionsModal}
        />
      )}

      {showMoreActionsModal && (
        <MoreMessageActionsModal
          message={messageShape}
          onCloseMoreActionsModal={() => setShowMoreActionsModal(false)}
          moreActionsModalPosition={moreActionsModalPosition}
          onReplyClick={() => handleReplyClick(comment)}
          onEditClick={handleOpenEdit} // ← opens inline edit
          onCopyMessage={handleCopyMessage}
          onDeleteOwnMessage={handleDeleteOwnMessage}
          reactToComment={onReact}
          isEditable={isEditable}
          isSentByCurrentUser={isSentByCurrentUser}
          onOpenViewReactionsModal={handleOpenViewReactionsModal}
          isBoardPostOwner={isBoardPostOwner}
          commentId={comment._id}
        />
      )}

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
          onClose={() => setShowViewReactionsModal(false)}
          reactions={comment.reactions ?? []}
        />
      )}
    </div>
  )
}

export default BoardCommentItem
