import { useRef } from "react"
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
import { useChatHandlers } from "../../../hooks/customHooks/useChatHandlers"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { showAppToast } from "../../../utils/showAppToast"

// Adapts a BoardComment to look like a Message so all the existing hooks work
const toMessageShape = (comment) => ({
  ...comment,
  sender: comment.user, // useMessagingMetaData reads .sender
  text: comment.content, // cosmetic alias
  isDeletedByAdmin: comment.isDeletedByAdmin || false,
  isDeletedByUser: comment.isDeletedByUser || false,
})

const BoardCommentItem = ({ comment, boardPostId, onReact, onDelete }) => {
  const { authUser } = useAuthUser()
  const setReplyingToComment = useBoardStore((s) => s.setReplyingToComment)
  const setEditingComment = useBoardStore((s) => s.setEditingComment)
  const activeCommentModalId = useBoardStore((s) => s.activeCommentModalId)
  const setActiveCommentModalId = useBoardStore((s) => s.setActiveCommentModalId)
  const boardInputRef = useBoardStore((s) => s.boardInputRef)

  const commentInputRef = useRef(null)

  const messageShape = toMessageShape(comment)

  const isMobile = useIsMobile()

  const { isSentByCurrentUser, isEditable, isAuthUserAdmin, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(messageShape, authUser)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

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

  const {
    handleJumpToOriginalMessage,
    // handleEditClick,
    // handleCopyMessage,
    // handleReplyClick,
    handleImageClick,
    handleCloseMoreActionsModal,
  } = useChatHandlers({
    messageShape,
    setShowMoreActionsModal,
    isMobile,
    handleCloseEmojiPickerPopover,
    addReaction: onReact,
    chatStore: useBoardStore,
    chatInputRef: boardInputRef,
    // messageListRef,
  })

  const { handleMouseEnter, handleMouseLeave, showModal } = useMessageModalInteractions(
    comment._id,
    setActiveCommentModalId,
    activeCommentModalId,
    null, // no mobile long press handler yet
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

  const handleEditClick = (comment) => {
    setEditingComment(comment)
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

  const isOwner = authUser?._id === comment.user?._id || authUser?._id === comment.user
  const isAdmin = authUser?.isAdmin

  return (
    <div
      className="group relative my-2 border-accent px-4 py-2 transition hover:bg-gray-700/10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Replying to indicator */}
      {comment.parentComment && (
        <div className="mb-1 flex items-center gap-1 pl-10 text-xs text-slate-500">
          <span>↩ Replying to</span>
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

      <div className="flex items-start gap-2">
        <Link to={`/profile/${comment.user?.username}`} className="flex-shrink-0">
          <img
            src={getOptimizedImageUrl(comment.user?.profileImg?.imageUrl, "avatar")}
            className="mt-0.5 h-8 w-8 rounded-full object-cover"
            alt={comment.user?.username}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Link
                to={`/profile/${comment.user?.username}`}
                className="text-sm font-bold hover:underline"
              >
                {comment.user?.fullName}
              </Link>
              <span className="text-xs text-slate-500">· {formatPostDate(comment.createdAt)}</span>
              {comment.isEdited && <span className="text-xs italic text-slate-600">(edited)</span>}
            </div>

            {/* {(isOwner || isAdmin) && !showModal && (
              <button
                onClick={() => onDelete(comment._id)}
                className="text-slate-500 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
              >
                <FaTrashCan size={12} />
              </button>
            )} */}
          </div>

          {comment.isDeletedByAdmin || comment.isDeletedByUser ? (
            <p className="mt-0.5 text-sm italic text-slate-600">
              {comment.isDeletedByAdmin ? "Deleted by admin." : "Message deleted."}
            </p>
          ) : (
            <>
              <p className="mt-0.5 whitespace-pre-wrap">{comment.content}</p>
              {comment.image?.imageUrl && (
                <img
                  src={comment.image.imageUrl}
                  className="mt-2 max-h-48 rounded-xl border border-accent object-contain"
                  alt="comment"
                />
              )}
            </>
          )}

          {/* Reactions row */}
          {hasAnyReactions && (
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
          )}
        </div>
      </div>

      {/* MessageActionsModal — appears on hover exactly like chat */}
      <MessageActionsModal
        message={messageShape}
        isSentByCurrentUser={false}
        showModal={showModal}
        messageContentStyle={{}}
        onReactionClick={handleReactionClick}
        moreEmojisButtonRef={moreEmojisButtonRef}
        handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
        onReplyClick={() => setReplyingToComment(comment)}
        onOpenMoreActionsModal={handleOpenMoreActionsModal}
      />

      {showMoreActionsModal && (
        <MoreMessageActionsModal
          message={messageShape}
          onCloseMoreActionsModal={handleCloseMoreActionsModal}
          moreActionsModalPosition={moreActionsModalPosition}
          onReplyClick={() => handleReplyClick(comment)}
          onEditClick={() => handleEditClick(comment)}
          onCopyMessage={handleCopyMessage}
          onDeleteOwnMessage={handleDeleteOwnMessage}
          reactToComment={onReact}
          isEditable={isEditable}
          isSentByCurrentUser={isSentByCurrentUser}
          // onAdminDeleteMessage={handleAdminDeleteMessage}
          // onOpenViewReactionsModal={handleOpenViewReactionsModal}
          // onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
          // onReactionAdded={onReactionAdded}
          // isAuthUserAdminOrOwner={isAuthUserAdmin}
        />
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

export default BoardCommentItem
