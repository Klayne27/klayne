// src/features/chat/common/components/MessageBubble.jsx
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { extractPreviewableUrl, renderClickableText } from "../../../../utils/textUtils"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import { useLightboxStore } from "../../../../store/useLightboxStore"
import LinkPreviewCard from "../../../../components/common/LinkPreviewCard"

const MessageBubble = ({
  message,
  isSentByCurrentUser,
  bubbleClasses,
  onLoadImage,
  messageContentStyle,
  isMessageDeleted,
  isSenderBanned,
  hasReply,
  onPreviewLoad,
}) => {
  const { authUser } = useAuthUser()
  const finalIsDeleted = isMessageDeleted || isSenderBanned || message.isDeletedByAdmin
  const openLightbox = useLightboxStore((s) => s.openLightbox)

  const replyCornerClass = hasReply
    ? isSentByCurrentUser
      ? "!rounded-tr-sm"
      : "!rounded-tl-sm"
    : ""

  // Resolve the image to display — prefer the new Image object, fall back to legacy img string
  const imageUrl = message.image?.imageUrl || message.img || null

  return (
    <div
      className={`flex items-end gap-2 ${isSentByCurrentUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex w-full flex-col overflow-hidden p-3 py-2 ${bubbleClasses}`}
        style={messageContentStyle}
      >
        {finalIsDeleted ? (
          <span className="text-sm italic text-gray-600">[Message Deleted]</span>
        ) : (
          <>
            {message.voiceMessageId?.imageUrl && (
              <audio
                controls
                src={message.voiceMessageId.imageUrl}
                className="h-9 max-w-full"
                onError={(e) => console.error("Audio error:", e)}
              />
            )}
            {imageUrl && (
              <div
                className={`mb-2 inline-flex max-w-full ${
                  isSentByCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                <img
                  src={getOptimizedImageUrl(imageUrl, "post")}
                  onClick={() => openLightbox({ images: [{ imageUrl }], index: 0 })}
                  alt="Chat attachment"
                  className="block h-auto max-h-80 max-w-full cursor-pointer rounded-2xl border border-gray-600 object-contain shadow-sm"
                  onLoad={onLoadImage}
                  loading="lazy"
                />
              </div>
            )}
            {message.text && (
              <p
                className="whitespace-pre-wrap break-words text-sm"
                style={{ wordBreak: "break-word" }}
              >
                {renderClickableText(message.text)}
              </p>
            )}
            {message.text &&
              (() => {
                const previewable = extractPreviewableUrl(message.text)
                return previewable ? (
                  <LinkPreviewCard
                    url={previewable.url}
                    platform={previewable.platform}
                    onLoad={onLoadImage}
                    onPreviewLoad={onPreviewLoad}
                    // onLoad intentionally omitted — link previews load async and would
                    // re-snap scroll to bottom every time the preview renders/resizes
                  />
                ) : null
              })()}
          </>
        )}
      </div>
    </div>
  )
}

export default MessageBubble
