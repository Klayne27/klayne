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
    <span className="text-gray-500 italic text-sm">[Message Deleted]</span>
  );


  return (
    <div
      className={`flex items-end gap-2 ${
        isSentByCurrentUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`p-3 py-2 flex flex-col w-full overflow-hidden ${bubbleClasses}`}
        style={messageContentStyle}
      >
        {/* Reply Block */}
        {message.repliedTo && (
          <div
            className={`
                    mb-2 p-2 rounded-md text-xs border
                    ${
                      isSentByCurrentUser
                        ? "border-gray-600 bg-blue-300 bg-opacity-30 border-l-4"
                        : "border-blue-300 bg-gray-950 bg-opacity-30 border-r-4"
                    }
                    flex flex-col cursor-pointer transition-colors duration-200 ease-in-out
                    hover:border-blue-400 hover:bg-opacity-40
                  `}
            onClick={(e) => {
              e.stopPropagation();
              onJumpToOriginalMessage(message.repliedTo._id);
            }}
          >
            <span
              className={`font-bold ${
                isSentByCurrentUser ? "text-gray-600" : "text-gray-300"
              }`}
            >
              Replying to:{" "}
              <span className="font-normal">
                @{message.repliedTo.sender?.username || "Unknown User"}
              </span>
            </span>
            {isReplyToMessageDeleted ? (
              messageDeleted
            ) : (
              message.repliedTo.text && (
                <span
                  className={`font-bold truncate ${
                    isSentByCurrentUser ? "text-gray-600" : "text-gray-300"
                  } mt-1 italic`}
                >
                  {renderClickableText(truncateText(message.repliedTo.text, 20))}
                </span>
              )
            )}
            {message.repliedTo.img && (
              <img
                src={message.repliedTo.img}
                onLoad={onLoadImage}
                onError={onLoadImage}
                alt="replied message attachment"
                className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
              />
            )}

          </div>
        )}
        {isMessageDeleted || isSenderBanned ? (
          messageDeleted
        ) : (
          <>
            {message.img && (
              <div className="mb-2 max-w-[200px] h-auto rounded-lg overflow-hidden shadow-md border border-gray-600 cursor-pointer">
                <img
                  src={message.img}
                  onLoad={onLoadImage}
                  onError={onLoadImage}
                  alt="Chat image"
                  className="w-full h-full object-cover"
                  onClick={onImageClick}
                />
              </div>
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
  );
};

export default MessageBubble;
