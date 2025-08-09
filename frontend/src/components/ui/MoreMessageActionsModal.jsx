import { HiOutlineReply } from "react-icons/hi"
import { FiTrash } from "react-icons/fi"
import { MdDeleteForever, MdEdit } from "react-icons/md"
import { IoCopy } from "react-icons/io5"
import { FaUserCheck, FaUserSlash } from "react-icons/fa"
import { usePrivateChatStore } from "../../store/usePrivateChatStore"
import { useReactToMessage } from "../../hooks/messagesHooks/useReactToMessage"
import { PiSmiley, PiSmileyFill } from "react-icons/pi"

function MoreMessageActionsModal({
  onCloseMoreActionsModal,
  moreActionsModalPosition,
  onReplyClick,
  onEditClick,
  onCopyMessage,
  onDeleteOwnMessage,
  message,
  isEditable,
  isSentByCurrentUser,
  isAuthUserAdmin = false,
  isMessageDeleted = false,
  isSenderBanned,
  handleAdminDeleteMessageClick,
  handleBanUserClick,
  handleUnbanUserClick,
  onOpenConfirmationModal,
  onOpenViewReactionsModal,
  onReactionAdded,
  reactToMessage,
}) {
  // const { selectedConversation } = usePrivateChatStore()
  // const { reactToMessage } = useReactToMessage({
  //   selectedConversationId: selectedConversation._id,
  //   onReactionAdded,
  // })

  const hasReactions = message.reactions.length > 0
  const topReactions = ["😭", "😆", "🫂", "😡"] // Your desired default emojis

  const handleQuickReaction = (messageId, emoji) => {
    reactToMessage({ messageId: messageId, emoji })
    onCloseMoreActionsModal()
  }

  return (
    <div className="fixed inset-0 z-20" onClick={onCloseMoreActionsModal}>
      <div
        className={`gray-shadow absolute z-30 rounded-xl bg-base-100 p-2`}
        style={{
          top: moreActionsModalPosition.top,
          left: moreActionsModalPosition.left,
          minWidth: "180px",
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex cursor-pointer items-center justify-around gap-1">
          {topReactions.map((emoji) => (
            <div
              key={emoji}
              className="hover mb-2 flex size-9 w-full items-center justify-around rounded-md bg-gray-800 text-xl transition duration-200 hover:bg-gray-700"
              onClick={() => handleQuickReaction(message?._id, emoji)}
            >
              {emoji}
            </div>
          ))}
        </div>
        {hasReactions && <button
          onClick={onOpenViewReactionsModal}
          className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-slate-300 transition duration-200 hover:bg-secondary"
        >
          View Reactions
          <PiSmileyFill size={20} className="text-slate-400" />
        </button>}
        <button
          onClick={onReplyClick}
          className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-slate-300 transition duration-200 hover:bg-secondary"
        >
          Reply
          <HiOutlineReply size={18} className="text-slate-400" />
        </button>
        {message.text && (
          <button
            onClick={onCopyMessage}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-slate-300 transition duration-200 hover:bg-secondary"
          >
            Copy Text
            <IoCopy size={18} className="text-slate-400" />
          </button>
        )}
        {isEditable && !isMessageDeleted && (
          <button
            onClick={onEditClick}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-slate-300 transition duration-200 hover:bg-secondary"
          >
            Edit Message
            <MdEdit size={16} className="text-slate-400" />
          </button>
        )}
        {isSentByCurrentUser && !isMessageDeleted && (
          <button
            onClick={onDeleteOwnMessage}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-red-400 transition duration-200 hover:bg-red-400/10"
          >
            Delete Message
            <FiTrash size={16} />
          </button>
        )}

        {isAuthUserAdmin && !isSentByCurrentUser && (
          <>
            {!isMessageDeleted && (
              <button
                onClick={() => onOpenConfirmationModal("delete")}
                // disabled={isAdminDeleting}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-red-400 transition duration-200 hover:bg-red-400/10"
              >
                Delete (Admin)
                <MdDeleteForever size={18} />
              </button>
            )}
            {isSenderBanned ? (
              <button
                onClick={() => onOpenConfirmationModal("unban")}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-green-400 transition duration-200 hover:bg-green-400/10"
              >
                Unban User
                <FaUserCheck size={16} />
              </button>
            ) : (
              <button
                onClick={() => onOpenConfirmationModal("ban")}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-red-400 transition duration-200 hover:bg-red-400/10"
              >
                Ban User
                <FaUserSlash size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MoreMessageActionsModal
