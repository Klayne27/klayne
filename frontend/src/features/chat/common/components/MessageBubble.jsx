import { FaReply } from "react-icons/fa6"
import { PiMicrophoneStageFill } from "react-icons/pi"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { truncateText } from "../../../../utils/truncateText"
import { renderClickableText } from "../../../../utils/textUtils"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"

const MessageBubble = ({
  message,
  isSentByCurrentUser,
  bubbleClasses,
  onLoadImage,
  messageContentStyle,
  isReplyToMessageDeleted,
  onJumpToOriginalMessage,
  isMessageDeleted,
  isSenderBanned,
  onImageClick,
}) => {
  const messageDeleted = <span className="text-sm italic text-gray-600">[Message Deleted]</span>
  const { authUser } = useAuthUser()
  const finalIsDeleted = isMessageDeleted || isSenderBanned || message.isDeletedByAdmin

  return (
    <div
      className={`flex items-end gap-2 ${isSentByCurrentUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex w-full flex-col overflow-hidden p-3 py-2 ${bubbleClasses}`}
        style={messageContentStyle}
      >
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
              className={`flex items-center gap-1 ${isSentByCurrentUser ? "text-gray-600" : "text-gray-300"}`}
            >
              <FaReply /> {isSentByCurrentUser ? "You" : message.sender?.username} replied to
              <span className="font-normal">
                {message.repliedTo.sender?.username === authUser.username
                  ? "you"
                  : message.repliedTo.sender?.username}
              </span>
            </span>
            {isReplyToMessageDeleted
              ? messageDeleted
              : message.repliedTo.text && (
                  <span
                    className={` ${
                      isSentByCurrentUser ? "text-gray-600" : "text-gray-300"
                    } mt-1 italic`}
                  >
                    {renderClickableText(truncateText(message.repliedTo.text, 70))}
                  </span>
                )}
            {message.repliedTo.img && (
              <img
                src={getOptimizedImageUrl(message.repliedTo.img, "post")}
                onLoad={onLoadImage}
                onError={onLoadImage}
                alt="replied message attachment"
                className="mt-1 h-auto max-w-[100px] rounded-md object-cover"
              />
            )}
            {message.repliedTo.voiceMessageId && (
              <p className="flex items-center gap-1 text-xs italic text-gray-600">
                Voice Message
                <PiMicrophoneStageFill />
              </p>
            )}
          </div>
        )}
        {finalIsDeleted ? (
          messageDeleted
        ) : (
          <>
            {message.voiceMessageId && message.voiceMessageId?.imageUrl && (
              <audio
                controls
                src={message.voiceMessageId?.imageUrl}
                className="h-9 max-w-[100%]"
                onError={(e) => {
                  console.error("Error loading audio:", e)
                }}
              />
            )}
            {message.image?._id && (
              <div className="mb-2 h-auto w-[200px] cursor-pointer overflow-hidden rounded-lg border border-gray-600 shadow-md">
                <img
                  src={getOptimizedImageUrl(message.image.imageUrl, "post")}
                  alt="Chat image"
                  className="h-full w-full object-cover"
                  onClick={onImageClick}
                />
              </div>
            )}
            {message.text && (
              <p
                className="whitespace-pre-wrap break-words text-sm"
                style={{
                  wordBreak: "break-word",
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
}

export default MessageBubble
