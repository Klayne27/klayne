import { Link } from "react-router-dom";
import { renderClickableText } from "../../utils/textUtils";
import { truncateText } from "../../utils/truncateText";

const MessageBubble = ({
  message,
  isSentByCurrentUser,
  bubbleClasses,
  onLoadImage,
  onImageClick,
  messageContentStyle,
  isReplyToMessageDeleted,
  onJumpToOriginalMessage,
  isMessageDeleted,
  isSenderBanned
}) => {
  const messageDeleted = (
    <span className="text-gray-600 italic text-sm">[Message Deleted]</span>
  );

  return (
    <div
      className={`flex items-end gap-2 ${isSentByCurrentUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex w-full flex-col overflow-hidden p-3 py-2 ${bubbleClasses}`}
        style={messageContentStyle}
      >
        {/* Reply Block */}
        {message.repliedTo && (
          <div
            className={`mb-2 rounded-md border p-2 text-xs ${
              isSentByCurrentUser
                ? "border-l-4 border-gray-600 bg-blue-300 bg-opacity-30"
                : "border-r-4 border-blue-300 bg-gray-950 bg-opacity-30"
            } flex cursor-pointer flex-col transition-colors duration-200 ease-in-out hover:border-blue-400 hover:bg-opacity-40`}
            onClick={(e) => {
              e.stopPropagation()
              onJumpToOriginalMessage(message.repliedTo._id)
            }}
          >
            <span
              className={`font-bold ${isSentByCurrentUser ? "text-gray-600" : "text-gray-300"}`}
            >
              Replying to:{" "}
              <span className="font-normal">
                @{message.repliedTo.sender?.username || "Unknown User"}
              </span>
            </span>
            {isReplyToMessageDeleted
              ? messageDeleted
              : message.repliedTo.text && (
                  <span
                    className={`truncate font-bold ${
                      isSentByCurrentUser ? "text-gray-600" : "text-gray-300"
                    } mt-1 italic`}
                  >
                    {renderClickableText(truncateText(message.repliedTo.text, 20))}
                  </span>
                )}
            {message.repliedTo.img && (
              <img
                src={message.repliedTo.img}
                onLoad={onLoadImage}
                onError={onLoadImage}
                alt="replied message attachment"
                className="mt-1 h-auto max-w-[100px] rounded-md object-cover"
              />
            )}
          </div>
        )}
        {isMessageDeleted || isSenderBanned ? (
          messageDeleted
        ) : (
          <>
            {message.image?._id && (
              <Link to={`/images/${message.image?._id}`}>
                <div className="mb-2 max-w-[300px] h-auto cursor-pointer overflow-hidden rounded-lg border border-gray-600 shadow-md">
                  <img src={message.image.imageUrl} alt="Chat image" className="h-full w-full object-cover" />
                </div>
              </Link>
            )}
            {message.text && (
              <p
                className="whitespace-pre-wrap break-words text-sm"
                style={{
                  wordBreak: "break-word",
                  // overflowWrap: "break-word",
                }}
              >
                {renderClickableText(message.text)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
};

export default MessageBubble;
