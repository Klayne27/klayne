import { HiOutlineReply } from "react-icons/hi"
import SlideUpMenu, { SlideUpMenuContent } from "../../../components/common/SlideUpMenu"
import { MdEdit } from "react-icons/md"
import { IoCopy } from "react-icons/io5"
import { FaTrashCan } from "react-icons/fa6"
import { PiSmileyFill } from "react-icons/pi"

const MobileMessageActionsSlideUp = ({
  isOpen,
  onClose,
  message,
  isEditable,
  isSentByCurrentUser,
  onReactionClick,
  onReplyClick,
  onEditClick,
  onCopyMessage,
  onDeleteOwnMessage,
  moreEmojisButtonRef,
  handleOpenEmojiPickerPopover,
  onOpenSlideUpReactionsMenu,
}) => {
  const quickReactions = ["❤️", "👍", "😂", "😢", "😠"]
  const hasReactions = message.reactions.length > 0

  const handleAction = (action) => {
    action()
    onClose()
  }

  return (
    <SlideUpMenu isOpen={isOpen} onClose={onClose}>
      <SlideUpMenuContent className="flex w-full flex-col gap-5 px-4">
        <div className="flex items-center justify-around">
          {quickReactions.map((emoji) => (
            <div className="rounded-full bg-secondary" key={emoji}>
              <button
                onClick={() => handleAction(() => onReactionClick(message._id, emoji))}
                className="transform p-2 text-xl transition-transform hover:scale-110"
              >
                {emoji}
              </button>
            </div>
          ))}
          <div className="rounded-full bg-secondary">
            <button
              ref={moreEmojisButtonRef}
              onClick={(e) => handleOpenEmojiPickerPopover(e)}
              className="transform p-2 text-xl text-slate-500 transition-transform hover:scale-110"
            >
              <PiSmileyFill className="size-7" />
            </button>
          </div>
        </div>
        {/* Action List - Apply styles */}
        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
          <button
            onClick={() => handleAction(onReplyClick)}
            className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
          >
            <HiOutlineReply /> <span>Reply</span>
          </button>
          {isEditable && isSentByCurrentUser && (
            <>
              <div className="h-[1px] bg-accent"></div>
              <button
                onClick={() => handleAction(onEditClick)}
                className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
              >
                <MdEdit /> <span>Edit Message</span>
              </button>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
          <button
            onClick={() => handleAction(onCopyMessage)}
            className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
          >
            <IoCopy /> <span>Copy Message</span>
          </button>
          {hasReactions && (
            <>
              <div className="h-[1px] bg-accent"></div>
              <button
                onClick={onOpenSlideUpReactionsMenu}
                className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
              >
                <PiSmileyFill size={20} /> View Reactions
              </button>
            </>
          )}
        </div>
        <div className="mb-2 flex flex-col gap-3 rounded-xl bg-secondary p-3">
          {isSentByCurrentUser && (
            <button
              onClick={() => handleAction(onDeleteOwnMessage)}
              className="flex w-full items-center gap-2 text-left font-semibold text-red-500 transition duration-200"
            >
              <FaTrashCan /> <span>Delete Message</span>
            </button>
          )}
        </div>
      </SlideUpMenuContent>
    </SlideUpMenu>
  )
}

export default MobileMessageActionsSlideUp
