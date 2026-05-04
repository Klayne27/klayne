import { Link, useNavigate } from "react-router-dom"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import UserAvatar from "../../../../components/common/UserAvatar"

function MessageContentLayout({
  isSentByCurrentUser,
  messageContentStyle,
  message,
  onUsernameClick,
  children,
}) {
  const navigate = useNavigate()

  
  return (
    <div
      className={`relative flex min-w-0 max-w-full items-start gap-2 ${
        isSentByCurrentUser ? "justify-end" : "justify-start"
      }`}
      style={messageContentStyle}
    >
      {!isSentByCurrentUser && message.isFirstInGroup && (
        <div className="flex-shrink-0">
          <div>
            <Link to={`/profile/${message.sender?.username}`}>
              {/* <img
                alt="User Avatar"
                src={getOptimizedImageUrl(
                  message?.sender?.profileImg?.imageUrl || "/avatar-placeholder.png",
                  "avatar",
                )}
                className="mt-0.5 size-9 cursor-pointer rounded-full object-cover"
                onClick={(e) => onUsernameClick(message.sender, e)}
              /> */}
              <UserAvatar
                size={"sm"}
                user={message?.sender}
              />
            </Link>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export default MessageContentLayout
