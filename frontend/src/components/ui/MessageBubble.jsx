import { renderClickableText } from "../../utils/textUtils";
import { truncateText } from "../../utils/truncateText";

const MessageBubble = ({
  message,
  messageText,
  isSentByCurrentUser,
  bubbleClasses,
  onLoadImage,
  onImageClick,
  messageContentStyle,
  onJumpToOriginalMessage,
}) => (
    <div
      className={`flex items-end gap-2 ${
        isSentByCurrentUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`p-3 flex flex-col w-full overflow-hidden ${bubbleClasses}`}
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
              Replying to:
            </span>
            {message.repliedTo.text && (
              <span
                className={`font-bold truncate ${
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
                className="mt-1 rounded-md max-w-[100px] max-h-[100px] object-cover"
              />
            )}
          </div>
        )}
        {/* Image */}
        {message.img && (
          <img
            src={message.img}
            onLoad={onLoadImage}
            onError={onLoadImage}
            alt="message attachment"
            className="mt-2 rounded-lg max-w-[200px] w-full h-auto object-cover cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(message.img, e);
            }}
          />
        )}
        {/* Message Text */}
        {messageText && (
          <p
            className={`whitespace-pre-wrap text-sm ${
              isSentByCurrentUser ? "text-white" : ""
            }`}
            style={{
              wordBreak: "break-word",
              // overflowWrap: "break-word",
            }}
          >
            {renderClickableText(messageText, isSentByCurrentUser)}
          </p>
        )}
      </div>
    </div>
);

export default MessageBubble;
