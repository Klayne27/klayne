
import { RiPushpinFill } from "react-icons/ri"
import { formatDate, formatTime } from "../../../../utils/date"

const SystemMessageItem = ({
  message,
  onUsernameClick,
  onJumpToOriginalMessage,
  onOpenPinnedModal,
}) => {
  const userName = message.text.split(" pinned a message")[0]

  return (
    <div className="flex items-center gap-2">
      <div className="ml-2">
        <RiPushpinFill size={20} />
      </div>
      <div key={message._id} className="my-2 text-center text-sm text-slate-500">
        <span className="break-words">
          <button
            className="font-semibold text-base-content hover:underline"
            onClick={(e) => onUsernameClick(message.sender, e)}
          >
            {message.sender.username}
          </button>
          <span> pinned a </span>
        </span>
        <button
          className="font-semibold text-base-content hover:underline"
          onClick={() => onJumpToOriginalMessage(message.pinnedMessageId)}
        >
          message
        </button>
        <span className="ml-1 break-words">to this conversation.</span>
        <span className="ml-1">
          {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
        </span>
        <button
          className="ml-1 font-semibold text-base-content hover:underline"
          onClick={onOpenPinnedModal}
        >
          See all pinned messages
        </button>
      </div>
    </div>
  )
}

export default SystemMessageItem
