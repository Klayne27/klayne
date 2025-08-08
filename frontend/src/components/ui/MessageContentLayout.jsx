import { Link } from "react-router-dom";

function MessageContentLayout({
  isSentByCurrentUser,
  messageContentStyle,
  message,
  children,
}) {
  return (
    <div
      className={`relative flex gap-2 items-start  ${
        isSentByCurrentUser ? "justify-end" : "justify-start"
      }`}
      style={messageContentStyle}
    >
      {!isSentByCurrentUser && message.isFirstInGroup && (
        <div className="flex-shrink-0">
          <Link to={`/profile/${message.sender.username}`}>
            <img
              alt="User Avatar"
              src={message.sender.profileImg?.imageUrl || "/avatar-placeholder.png"}
              className="size-9 rounded-full object-cover mt-0.5"
            />
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}

export default MessageContentLayout;
