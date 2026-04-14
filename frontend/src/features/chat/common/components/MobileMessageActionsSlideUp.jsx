import { HiOutlineReply } from "react-icons/hi"
import SlideUpMenu, { SlideUpMenuContent } from "../../../../components/common/SlideUpMenu"
import { MdDeleteForever, MdEdit } from "react-icons/md"
import { IoCopy } from "react-icons/io5"
import { FaTrashCan, FaUserCheck, FaUserSlash } from "react-icons/fa6"
import { PiSmileyFill } from "react-icons/pi"
import { RiPushpinFill } from "react-icons/ri"
import { useLocation } from "react-router-dom"

const MobileMessageActionsSlideUp = ({
  isOpen,
  onClose,
  message,
  isEditable,
  isSentByCurrentUser,
  // --- New / Replicated Props ---
  isAuthUserAdmin = false,
  isMessageDeleted = false,
  isSenderBanned = false,

  isAuthUserAdminOrOwner = false,

  isBoardPostOwner = false,
  postId,
  commentId,
  onAdminDeleteMessage,
  onOpenConfirmationModal,
  // ------------------------------
  onReactionClick,
  onReplyClick,
  onEditClick,
  onCopyMessage,
  onPinMessage,
  onDeleteOwnMessage,
  moreEmojisButtonRef,
  handleOpenEmojiPickerPopover,
  onOpenSlideUpReactionsMenu,
}) => {
  const { pathname } = useLocation()
  const isBoard = pathname.includes("/board")
  const hasReactions = message?.reactions?.length > 0
  const quickReactions = ["😭", "😆", "🫂", "❤️"]


  const handleAction = (action) => {
    action()
    onClose()
  }

  // Helper for dynamic labels (Post vs Comment vs Message)
  const getContentLabel = () => {
    if (isBoard && commentId) return "Comment"
    if (isBoard && postId && !commentId) return "Post"
    return "Message"
  }

  return (
    <SlideUpMenu isOpen={isOpen} onClose={onClose}>
      <SlideUpMenuContent className="mb-2 flex w-full flex-col gap-5 px-4">
        {/* Quick Reactions Row */}
        <div className="mt-2 flex items-center justify-between">
          {quickReactions.map((emoji) => (
            <div key={emoji} className="rounded-full bg-secondary">
              <button
                onClick={() => handleAction(() => onReactionClick(message._id, emoji))}
                className="flex size-10 transform items-center justify-center text-xl transition-transform hover:scale-110"
              >
                {emoji}
              </button>
            </div>
          ))}
          <div className="rounded-full bg-secondary">
            <button
              ref={moreEmojisButtonRef}
              onClick={(e) => handleOpenEmojiPickerPopover(e)}
              className="flex size-10 transform items-center justify-center text-slate-500 transition-transform hover:scale-110"
            >
              <PiSmileyFill className="size-6" />
            </button>
          </div>
        </div>

        {/* Primary Actions: Reply & Edit */}
        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
          <button
            onClick={() => handleAction(onReplyClick)}
            className="flex w-full items-center justify-between text-left font-semibold transition duration-200"
          >
            <div className="flex items-center gap-2">
              <HiOutlineReply /> <span>Reply</span>
            </div>
          </button>

          {isEditable && !isMessageDeleted && (
            <>
              <div className="h-[1px] bg-accent"></div>
              <button
                onClick={() => handleAction(onEditClick)}
                className="flex w-full items-center justify-between text-left font-semibold transition duration-200"
              >
                <div className="flex items-center gap-2">
                  <MdEdit /> <span>Edit {getContentLabel()}</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Secondary Actions: Copy, Pin, View Reactions */}
        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
          {message?.text && (
            <button
              onClick={() => handleAction(onCopyMessage)}
              className="flex w-full items-center justify-between text-left font-semibold transition duration-200"
            >
              <div className="flex items-center gap-2">
                <IoCopy /> <span>Copy Text</span>
              </div>
            </button>
          )}

          {/* Pin Logic: Only show if not public chat and not a board */}
          {!pathname.includes("/public-chat") && !isBoard && (
            <>
              <div className="h-[1px] bg-accent"></div>
              <button
                onClick={() => handleAction(onPinMessage)}
                className="flex w-full items-center justify-between text-left font-semibold transition duration-200"
              >
                <div className="flex items-center gap-2">
                  <RiPushpinFill /> <span>Pin Message</span>
                </div>
              </button>
            </>
          )}

          {hasReactions && (
            <>
              <div className="h-[1px] bg-accent"></div>
              <button
                onClick={() => handleAction(onOpenSlideUpReactionsMenu)}
                className="flex w-full items-center justify-between text-left font-semibold transition duration-200"
              >
                <div className="flex items-center gap-2">
                  <PiSmileyFill size={20} /> <span>View Reactions</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Destructive Actions: Delete (Owner & Board Owner) */}
        {isSentByCurrentUser && !isMessageDeleted && !isBoard && (
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              onClick={() => handleAction(onDeleteOwnMessage)}
              className="flex w-full items-center justify-between text-left font-semibold text-red-500 transition duration-200"
            >
              <div className="flex items-center gap-2">
                <FaTrashCan /> <span>Delete {getContentLabel()}</span>
              </div>
            </button>
          </div>
        )}

        {isBoardPostOwner && isBoard && (
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              onClick={() => handleAction(onDeleteOwnMessage)}
              className="flex w-full items-center justify-between text-left font-semibold text-red-500 transition duration-200"
            >
              <div className="flex items-center gap-2">
                <FaTrashCan /> <span>Delete {getContentLabel()}</span>
              </div>
            </button>
          </div>
        )}

        {isSentByCurrentUser && !isBoardPostOwner && isBoard && (
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              onClick={() => handleAction(onDeleteOwnMessage)}
              className="flex w-full items-center justify-between text-left font-semibold text-red-500 transition duration-200"
            >
              <div className="flex items-center gap-2">
                <FaTrashCan /> <span>Delete {getContentLabel()}</span>
              </div>
            </button>
          </div>
        )}

        {/* Admin Section */}
        {(isAuthUserAdmin || isAuthUserAdminOrOwner) && (
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            {/* Admin Delete */}
            {isAuthUserAdminOrOwner && !isMessageDeleted && (
              <button
                onClick={() => handleAction(onAdminDeleteMessage)}
                className="flex w-full items-center justify-between text-left font-semibold text-red-500 transition duration-200"
              >
                <div className="flex items-center gap-2">
                  <FaTrashCan /> <span>Delete (Admin)</span>
                </div>
              </button>
            )}

            {/* Admin Confirmation Delete & Ban Logic */}
            {isAuthUserAdmin && !isSentByCurrentUser && (
              <>
                {!isMessageDeleted && (
                  <button
                    onClick={() => handleAction(() => onOpenConfirmationModal("delete"))}
                    className="flex w-full items-center justify-between text-left font-semibold text-red-500 transition duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <MdDeleteForever /> <span>Forever Delete</span>
                    </div>
                  </button>
                )}
                <div className="h-[1px] bg-accent"></div>
                {isSenderBanned ? (
                  <button
                    onClick={() => handleAction(() => onOpenConfirmationModal("unban"))}
                    className="flex w-full items-center justify-between text-left font-semibold text-green-500 transition duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <FaUserCheck /> <span>Unban User</span>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction(() => onOpenConfirmationModal("ban"))}
                    className="flex w-full items-center justify-between text-left font-semibold text-red-500 transition duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <FaUserSlash /> <span>Ban User</span>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </SlideUpMenuContent>
    </SlideUpMenu>
  )
}

export default MobileMessageActionsSlideUp
