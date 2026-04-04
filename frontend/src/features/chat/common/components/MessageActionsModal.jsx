import { BsThreeDots } from "react-icons/bs";
import { HiOutlineReply } from "react-icons/hi";
import { PiSmileyFill } from "react-icons/pi";

function MessageActionsModal({
  message,
  isSentByCurrentUser,
  showModal,
  messageContentStyle,
  onReactionClick,
  moreEmojisButtonRef,
  handleOpenEmojiPickerPopover,
  onReplyClick,
  onOpenMoreActionsModal,
}) {
  const allowedEmojis = ["❤️", "👍", "😂"]

  return (
    <div
      id={`message-reaction-modal-${message._id}`}
      className={`gray-shadow absolute -top-5 z-10 flex items-center gap-1 rounded-xl bg-base-100 px-2 ${
        isSentByCurrentUser ? "-left-24 translate-x-1/2" : "-right-24 -translate-x-1/2"
      } ${showModal ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} `}
      style={messageContentStyle}
    >
      {allowedEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation()
            onReactionClick(message._id, emoji)
          }}
          className={`py-1 text-xl transition duration-100 hover:scale-125`}
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <div className="mx-1 h-6 w-px bg-slate-500"></div>
      <button
        ref={moreEmojisButtonRef}
        onClick={(e) => handleOpenEmojiPickerPopover(e)}
        className="transtion group rounded-lg text-slate-500 duration-100 hover:bg-secondary hover:text-slate-400"
        title="More Emojis"
      >
        <PiSmileyFill size={27} className="p-[3px] group-hover:scale-110" />
      </button>
      <button
        onClick={onReplyClick}
        className="group rounded-lg p-1 text-slate-500 transition duration-100 hover:bg-secondary hover:text-slate-400"
        title="Reply to message"
      >
        <HiOutlineReply size={18} className="group-hover:scale-110" />
      </button>
      <button
        onClick={onOpenMoreActionsModal}
        className="group rounded-lg p-1 text-slate-500 transition duration-100 hover:bg-secondary hover:text-slate-400"
        title="More actions"
      >
        <BsThreeDots size={18} className="group-hover:scale-110" />
      </button>
    </div>
  )
}

export default MessageActionsModal;
