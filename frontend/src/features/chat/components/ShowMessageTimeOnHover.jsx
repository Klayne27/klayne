import { formatTime } from "../../../utils/date"

function ShowMessageTimeOnHover({ message, isSentByCurrentUser, isMessageHighlighted }) {
  return (
    <>
      {isMessageHighlighted && !isSentByCurrentUser && !message.isFirstInGroup && (
        <div className="absolute left-1.5 top-1/2 z-0 mr-2 -translate-y-1/2 whitespace-nowrap text-[10px] text-gray-400">
          {formatTime(message.createdAt)}
        </div>
      )}
      {isMessageHighlighted && isSentByCurrentUser && !message.isFirstInGroup && (
        <div className="absolute left-1.5 top-1/2 z-0 mr-2 -translate-y-1/2 whitespace-nowrap text-[10px] text-gray-400">
          {formatTime(message.createdAt)}
        </div>
      )}
    </>
  )
}

export default ShowMessageTimeOnHover
