import { formatTime } from "../../../../utils/date"

function PrivateChatFirstMessageInGroup({
  message,
  isSentByCurrentUser,
  onUsernameClick,
  selectedConversation,
}) {
  const groupParticipants = selectedConversation.participants
  const senderId = message.sender._id

  const isUserAMember = groupParticipants.includes(senderId)

  return (
    <>
      {message.isFirstInGroup && (
        <div className={`mb-0.5 flex items-center text-sm`}>
          {!isSentByCurrentUser && (
            <div
              className={`mr-1 cursor-pointer font-semibold`}
              onClick={(e) => onUsernameClick(message.sender, e)}
              style={message.sender.nameColor ? { color: message.sender.nameColor } : undefined}
            >
              {message.senderUsername}
            </div>
          )}
          <span className="mr-5 text-xs text-gray-500">{formatTime(message.createdAt)}</span>
        </div>
      )}
    </>
  )
}

export default PrivateChatFirstMessageInGroup
