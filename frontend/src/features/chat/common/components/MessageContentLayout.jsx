import { Link } from "react-router-dom"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"

function MessageContentLayout({
  isSentByCurrentUser,
  messageContentStyle,
  message,
  onUsernameClick,
  children,
}) {
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
            <div>
              <img
                alt="User Avatar"
                src={getOptimizedImageUrl(
                  message?.sender?.profileImg?.imageUrl || "/avatar-placeholder.png",
                  "avatar",
                )}
                className="mt-0.5 size-9 cursor-pointer rounded-full object-cover"
                onClick={(e) => onUsernameClick(message.sender, e)}
              />
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export default MessageContentLayout
