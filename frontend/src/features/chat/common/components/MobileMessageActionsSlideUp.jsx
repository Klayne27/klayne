import { HiOutlineReply } from "react-icons/hi"
import SlideUpMenu, { SlideUpMenuContent } from "../../../../components/common/SlideUpMenu"
import { MdEdit } from "react-icons/md"
import { IoCopy } from "react-icons/io5"
import { FaTrashCan } from "react-icons/fa6"
import { PiSmileyFill } from "react-icons/pi"
import { RiPushpinFill } from "react-icons/ri"
import { useLocation } from "react-router-dom"

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
  onPinMessage,
  onDeleteOwnMessage,
  moreEmojisButtonRef,
  handleOpenEmojiPickerPopover,
  onOpenSlideUpReactionsMenu,
}) => {
  const quickReactions = ["❤️", "👍", "👎", "😂", "😭", "🫂"]
  const hasReactions = message.reactions?.length > 0

  const { pathname } = useLocation()

  const handleAction = (action) => {
    action()
    onClose()
  }

  return (
    <SlideUpMenu isOpen={isOpen} onClose={onClose}>
      <SlideUpMenuContent className="mb-2 flex w-full flex-col gap-5 px-4">
        <div className="mt-2 flex items-center justify-between">
          {quickReactions.map((emoji) => (
            <div key={emoji} className="rounded-full bg-secondary">
              <button
                onClick={() => handleAction(() => onReactionClick(message._id, emoji))}
                // Use a consistent size for the button and font
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
              // Use a consistent size and align the icon correctly
              className="flex size-10 transform items-center justify-center text-slate-500 transition-transform hover:scale-110"
            >
              {/* Set the icon size directly */}
              <PiSmileyFill className="size-6" />
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
          {!pathname.includes("/public-chat") && (
            <>
              <div className="h-[1px] bg-accent"></div>
              <button
                onClick={() => handleAction(onPinMessage)}
                className="flex w-full items-center gap-2 text-left font-semibold transition duration-200"
              >
                <RiPushpinFill /> <span>Pin Message</span>
              </button>{" "}
            </>
          )}
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
        {isSentByCurrentUser && (
          <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
            <button
              onClick={() => handleAction(onDeleteOwnMessage)}
              className="flex w-full items-center gap-2 text-left font-semibold text-red-500 transition duration-200"
            >
              <FaTrashCan /> <span>Delete Message</span>
            </button>
          </div>
        )}
      </SlideUpMenuContent>
    </SlideUpMenu>
  )
}

export default MobileMessageActionsSlideUp
