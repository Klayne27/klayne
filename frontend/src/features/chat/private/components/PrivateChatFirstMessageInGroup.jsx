import { Link } from "react-router-dom"
import UserFullName from "../../../../components/common/UserFullname"
import { formatTime } from "../../../../utils/date"
import { resolveDisplayName } from "../../../../utils/nicknameUtils"

function PrivateChatFirstMessageInGroup({
  message,
  isSentByCurrentUser,
  onUsernameClick,
  selectedConversation,
  nicknameMap,
}) {
  const groupParticipants = selectedConversation.participants
  const senderId = message.sender._id

  const isUserAMember = groupParticipants.includes(senderId)


  const displayName = resolveDisplayName(message.sender, nicknameMap)

  return (
    <>
      {message.isFirstInGroup && (
        <div className={`mb-0.5 flex items-center text-sm`}>
          {!isSentByCurrentUser && (
            <Link to={`/profile/${message.sender?.username}`}>
              <UserFullName
                user={message.sender}
                nickname={displayName}
                className={`mr-1 cursor-pointer font-semibold`}
                style={message.sender.nameColor ? { color: message.sender.nameColor } : undefined}
                
              />
            </Link>
          )}
          <span className="mr-5 text-xs text-gray-500">{formatTime(message.createdAt)}</span>
        </div>
      )}
    </>
  )
}

export default PrivateChatFirstMessageInGroup
