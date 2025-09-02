import { Link } from "react-router-dom";

function MessageContentLayout({
  isSentByCurrentUser,
  messageContentStyle,
  message,
  onUsernameClick,
  children,
}) {
  return (
    <div
      className={`relative flex items-start gap-2 ${
        isSentByCurrentUser ? "justify-end" : "justify-start"
      }`}
      style={messageContentStyle}
    >
      {!isSentByCurrentUser && message.isFirstInGroup && (
        <div className="flex-shrink-0">
          <div >
            <img
              alt="User Avatar"
              src={message.sender.profileImg?.imageUrl || "/avatar-placeholder.png"}
              className="mt-0.5 size-9 cursor-pointer rounded-full object-cover"
              onClick={(e) => onUsernameClick(message.sender, e)}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export default MessageContentLayout;
