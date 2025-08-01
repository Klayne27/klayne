import { BsThreeDots } from "react-icons/bs";
import { HiOutlineReply } from "react-icons/hi";
import { PiSmileyFill } from "react-icons/pi";

function MessageActionsModal({
  message,
  isSentByCurrentUser,
  showModal,
  messageContentStyle,
  onReactionClick,
  onReactionAdded,
  moreEmojisButtonRef,
  openEmojiPickerWithModalClose,
  onReplyClick,
  moreActionsButtonRef,
  onOpenMoreActionsModal,
}) {
  const allowedEmojis = ["❤️", "👍", "😂"];

  return (
    <div
      id={`message-reaction-modal-${message._id}`}
      className={`absolute -top-5 bg-base-100 gray-shadow rounded-xl px-2 flex items-center gap-1 transition-opacity z-10
              ${
                isSentByCurrentUser
                  ? "-left-24 translate-x-1/2"
                  : "-right-24 -translate-x-1/2"
              }
              ${
                showModal
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              } `}
      style={messageContentStyle}
    >
      {allowedEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onReactionClick(message._id, emoji);
            onReactionAdded();
          }}
          className={`text-xl hover:scale-125 py-1 transition duration-100`}
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <div className="w-px h-6 bg-slate-500 mx-1"></div>
      <button
        ref={moreEmojisButtonRef}
        onClick={(e) => openEmojiPickerWithModalClose(e, moreEmojisButtonRef)}
        className=" text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg duration-100 transtion"
        title="More Emojis"
      >
        <PiSmileyFill size={27} className="group-hover:scale-110 p-[3px]" />
      </button>
      <button
        onClick={onReplyClick}
        className="p-1 text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg transition duration-100"
        title="Reply to message"
      >
        <HiOutlineReply size={18} className="group-hover:scale-110" />
      </button>
      <button
        ref={moreActionsButtonRef}
        onClick={onOpenMoreActionsModal}
        className="text-slate-500 group hover:text-slate-400 hover:bg-secondary rounded-lg p-1 transition duration-100"
        title="More actions"
      >
        <BsThreeDots size={18} className="group-hover:scale-110" />
      </button>
    </div>
  );
}

export default MessageActionsModal;
