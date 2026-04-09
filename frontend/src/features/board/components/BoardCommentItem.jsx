import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useBoardStore } from "../../../store/useBoardStore"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { formatPostDate } from "../../../utils/date"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import MessageActionsModal from "../../chat/common/components/MessageActionsModal"
import MessageReactions from "../../chat/common/components/MessageReactions"
import MoreMessageActionsModal from "../../chat/common/components/MoreMessageActionsModal"
import ViewReactionsModal from "../../../components/common/ViewReactionsModal"
import MobileMessageActionsSlideUp from "../../chat/common/components/MobileMessageActionsSlideUp"
import { useEditBoardComment } from "../boardHooks/boardMutations"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import SlideUpMenu, { SlideUpMenuContent } from "../../../components/common/SlideUpMenu"
import ReactionsSlideUpMenuContent from "../../../components/common/ReactionsSlideUpMenuContent"
import { PiSmiley } from "react-icons/pi"

const toMessageShape = (comment) => ({
  ...comment,
  sender: comment.user,
  text: comment.content,
  isDeletedByAdmin: comment.isDeletedByAdmin || false,
  isDeletedByUser: comment.isDeletedByUser || false,
})

const BoardCommentItem = ({
  comment,
  post,
  boardPostId,
  onReact,
  onDelete,
  onJumpToComment,
  onJumpToPost,
}) => {
  const { authUser } = useAuthUser()
  const isMobile = useIsMobile()
  const setReplyingToComment = useBoardStore((s) => s.setReplyingToComment)
  const activeCommentModalId = useBoardStore((s) => s.activeCommentModalId)
  const setActiveCommentModalId = useBoardStore((s) => s.setActiveCommentModalId)
  const isSlideMenuOpen = useBoardStore((s) => s.isSlideMenuOpen)
  const commentForSlideMenu = useBoardStore((s) => s.commentForSlideMenu)
  const openSlideMenu = useBoardStore((s) => s.openSlideMenu)
  const closeSlideMenu = useBoardStore((s) => s.closeSlideMenu)

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)
  const [showSlideUpReactionsMenu, setShowSlideUpReactionsMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(comment.content)
  const editTextareaRef = useRef(null)
  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)
  const { editComment, isEditingComment } = useEditBoardComment(boardPostId)

  const editEmojiButtonRef = useRef(null)

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
    handleCloseEditPicker() // same as BoardPostDetail's handleCancelEditPost
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
    if (e.key === "Escape") handleCancelEdit()
  }

  const messageShape = toMessageShape(comment)
  const { isSentByCurrentUser, isEditable, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(messageShape, authUser)

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
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable, message: comment })

  const {
    showEmojiPickerPopover: showEditPicker,
    popoverPosition: editPickerPosition,
    handleOpenEmojiPickerPopover: handleOpenEditPicker,
    handleCloseEmojiPickerPopover: handleCloseEditPicker,
  } = useEmojiPickerPopover()

  // Reusing the same hook as PrivateChatMessageItem
  const {
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
    showModal,
  } = useMessageModalInteractions(
    comment._id,
    setActiveCommentModalId,
    activeCommentModalId,
    () => openSlideMenu(comment), // long press opens slide menu
  )

  const handleReactionClick = (commentId, emoji) => onReact({ commentId, emoji })

  // Add the cursor-aware emoji insert handler
  const handleEditEmojiSelect = useCallback(
    (emojiData) => {
      const textarea = editTextareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = editValue.slice(0, start)
      const after = editValue.slice(end)
      const newContent = before + emojiData.emoji + after

      setEditValue(newContent)

      requestAnimationFrame(() => {
        const newCursor = start + emojiData.emoji.length
        textarea.focus()
        textarea.setSelectionRange(newCursor, newCursor)
      })

      handleCloseEditPicker()
    },
    [editValue, handleCloseEditPicker],
  )

  const handleEmojiPickerSelect = (emojiData) => {
    onReact({ commentId: comment._id, emoji: emojiData.emoji })
    handleCloseEmojiPickerPopover()
  }

  const handleReplyClick = () => {
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

  const handleOpenSlideUpReactionsMenu = (e) => {
    // e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowSlideUpReactionsMenu(true)
    closeSlideMenu()
  }

  const handleCloseSlideUpReactionsMenu = () => {
    setShowSlideUpReactionsMenu(false)
  }

  const handleCloseViewReactionsModal = () => {
    setShowViewReactionsModal(false)
  }

  return (
    <div
      className="group relative my-2 border-accent px-4 py-2 transition hover:bg-gray-700/10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchCancel={handleTouchCancel}
    >
      {
        comment.parentComment ? (
          // Replying to another comment — jump to it
          <div
            className="mb-1 flex cursor-pointer items-center gap-1 pl-10 text-xs text-slate-500 hover:text-primary"
            onClick={() => onJumpToComment?.(comment.parentComment._id)}
          >
            <span>↩</span>
            <span className="font-semibold text-primary">
              @{comment.parentComment?.user?.username}
            </span>
            {comment.parentComment.isDeletedByUser || comment.parentComment.isDeletedByAdmin ? (
              <span className="italic text-slate-600">(deleted)</span>
            ) : (
              <span className="max-w-[200px] truncate italic">
                "{comment.parentComment.content}"
              </span>
            )}
          </div>
        ) : comment.isReplyToPost ? (
          // Replying to the board post itself — jump to top
          <div
            className="mb-1 flex cursor-pointer items-center gap-1 pl-10 text-xs text-slate-500 hover:text-primary"
            onClick={() => onJumpToPost?.()}
          >
            <span>↩</span>
            <span className="font-semibold text-primary">@{comment.boardPost?.user?.username}</span>
            <span className="max-w-[200px] truncate italic">"{comment.boardPost?.title}"</span>
          </div>
        ) : null /* Regular top-level comment — no indicator */
      }

      <div className="flex w-full items-start gap-2">
        <Link to={`/profile/${comment.user?.username}`} className="flex-shrink-0">
          <img
            src={getOptimizedImageUrl(comment.user?.profileImg?.imageUrl, "avatar")}
            className="mt-0.5 h-8 w-8 rounded-full object-cover"
            alt={comment.user?.username}
          />
        </Link>
        <div className="flex w-full flex-col items-start gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1">
              <Link
                to={`/profile/${comment.user?.username}`}
                className="truncate text-sm font-bold hover:underline"
              >
                {comment.user?.fullName}
              </Link>
              {comment.user?.isVerified && (
                <img src="/verified2.png" className="size-[17px]" alt="Verified" />
              )}
              {comment.user?.isGoldVerified && (
                <img src="/gold-verified2.png" className="size-[17px]" alt="Gold Verified" />
              )}
              <span className="flex-shrink-0 text-xs text-slate-500">
                · {formatPostDate(comment.createdAt)}
              </span>
            </div>
            {comment.isEdited && (
              <span className="flex-shrink-0 text-xs italic text-slate-600">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1 w-full">
              {/* relative wrapper — same as BoardPostDetail */}
              <div className="relative w-full">
                <textarea
                  ref={editTextareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-full resize-none overflow-hidden break-words rounded-lg border border-primary/40 bg-base-200 py-2 pl-3 pr-10 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isEditingComment}
                />

                {/* Edit-mode emoji button */}
                {!isMobile && (
                  <div className="absolute right-2 top-2">
                    <button
                      ref={editEmojiButtonRef}
                      type="button"
                      onClick={handleOpenEditPicker}
                      className="text-slate-500 transition-colors hover:text-primary"
                    >
                      <PiSmiley size={22} />
                    </button>
                  </div>
                )}
              </div>

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
              <p className="mt-0.5 min-w-0 max-w-full overflow-hidden whitespace-pre-wrap break-words">
                {comment.content}
              </p>
              {comment.image?.imageUrl && (
                <Link to={`/images/${comment.image?._id}`}>
                  <img
                    src={getOptimizedImageUrl(comment.image.imageUrl, "post")}
                    className="mt-2 max-h-48 rounded-xl border border-accent object-contain"
                    alt="comment"
                  />
                </Link>
              )}
            </>
          )}

          {hasAnyReactions && (
            <div className="min-w-0">
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

      {!isEditing && (
        <MessageActionsModal
          message={messageShape}
          isSentByCurrentUser={false}
          showModal={showModal}
          messageContentStyle={{}}
          onReactionClick={handleReactionClick}
          moreEmojisButtonRef={moreEmojisButtonRef}
          handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
          onReplyClick={handleReplyClick}
          onOpenMoreActionsModal={handleOpenMoreActionsModal}
        />
      )}

      {showMoreActionsModal && (
        <MoreMessageActionsModal
          message={messageShape}
          onCloseMoreActionsModal={() => setShowMoreActionsModal(false)}
          moreActionsModalPosition={moreActionsModalPosition}
          onReplyClick={handleReplyClick}
          onEditClick={handleOpenEdit}
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

      {showEmojiPickerPopover  && (
        <EmojiPickerPopover
          position={popoverPosition}
          onClose={handleCloseEmojiPickerPopover}
          onEmojiClick={handleEmojiPickerSelect}
          triggerRef={moreEmojisButtonRef}
        />
      )}

      {/* Edit picker portal — new */}
      {showEditPicker  && (
        <EmojiPickerPopover
          position={editPickerPosition}
          onClose={handleCloseEditPicker}
          onEmojiClick={handleEditEmojiSelect}
          triggerRef={editEmojiButtonRef}
        />
      )}

      {
        <SlideUpMenu isOpen={showSlideUpReactionsMenu} onClose={handleCloseSlideUpReactionsMenu}>
          <SlideUpMenuContent
            className="flex h-[50vh] w-full flex-col overflow-y-auto"
            disablePullToRefresh={true}
          >
            <ReactionsSlideUpMenuContent
              reactions={comment.reactions ? comment.reactions : []}
              onClose={handleCloseViewReactionsModal}
            />
          </SlideUpMenuContent>
        </SlideUpMenu>
      }

      {showViewReactionsModal && (
        <ViewReactionsModal
          isOpen={showViewReactionsModal}
          onClose={() => setShowViewReactionsModal(false)}
          reactions={comment.reactions ?? []}
        />
      )}

      {/* Mobile slide-up menu — same pattern as PrivateChatMessageItem */}
      {isMobile && (
        <MobileMessageActionsSlideUp
          isOpen={isSlideMenuOpen && commentForSlideMenu?._id === comment._id}
          onClose={closeSlideMenu}
          message={messageShape}
          isEditable={isEditable}
          isBoardPostOwner={isBoardPostOwner}
          isSentByCurrentUser={isSentByCurrentUser}
          onReactionClick={handleReactionClick}
          onReplyClick={handleReplyClick}
          onEditClick={handleOpenEdit}
          onCopyMessage={handleCopyMessage}
          onDeleteOwnMessage={handleDeleteOwnMessage}
          handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
          moreEmojisButtonRef={moreEmojisButtonRef}
          onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
          showModal={showModal}
          messageContentStyle={{}}
          onOpenMoreActionsModal={handleOpenMoreActionsModal}
          commentId={comment._id}
        />
      )}
    </div>
  )
}

export default BoardCommentItem
