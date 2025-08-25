import { Link } from "react-router-dom"
import { formatTime } from "../../../utils/date"

function PrivateChatFirstMessageInGroup({ message, isSentByCurrentUser }) {
  return (
    <>
      {message.isFirstInGroup && (
        <div className={`mb-0.5 flex items-center text-sm`}>
          {!isSentByCurrentUser && (
            <Link
              to={`/profile/${message.senderUsername}`}
              className="mr-1 cursor-pointer font-semibold"
            >
              {message.senderUsername}
            </Link>
          )}
          <span className="mr-5 text-xs text-gray-500">{formatTime(message.createdAt)}</span>
        </div>
      )}
    </>
  )
}

export default PrivateChatFirstMessageInGroup
