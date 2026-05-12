import { PiMicrophoneStageFill } from "react-icons/pi"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import { truncateText } from "../../../../utils/truncateText"
import { FaReply } from "react-icons/fa"
import { resolveDisplayName } from "../../../../utils/nicknameUtils"

const ReplyPreview = ({
  message,
  isSentByCurrentUser,
  currentUser,
  isReplyToMessageDeleted,
  onJumpToOriginalMessage,
  onLoadImage,
  nicknameMap = {},
  isGroup = false,
}) => {
  if (!message.repliedTo) return null

  const resolveName = (user, fallbackUsername) => {
    if (!user && !fallbackUsername) return "Unknown"
    const username = user?.username ?? fallbackUsername
    if (username === currentUser?.username) return "You"
    if (isGroup) return resolveDisplayName(user, nicknameMap) || username
    return username
  }

  const repliedToName = resolveName(message.repliedTo.sender, message.repliedTo.sender?.username)
  const replyerName = resolveName(message.sender, message.senderUsername)

  return (
    <>
      <span className="mb-1 flex items-center gap-2 text-[10px] font-semibold">
        <FaReply /> {replyerName} replied to {repliedToName}
      </span>

      <div
        onClick={(e) => {
          e.stopPropagation()
          onJumpToOriginalMessage(message.repliedTo._id)
        }}
        className={`cursor-pointer pb-6 transition-opacity hover:opacity-80 active:opacity-60 ${
          isSentByCurrentUser
            ? "self-end rounded-bl-2xl rounded-tl-2xl rounded-tr-2xl bg-primary/30 pl-3 pr-3 pt-2"
            : "self-start rounded-br-2xl rounded-tl-2xl rounded-tr-2xl bg-[#2F3336]/30 pl-3 pr-3 pt-2"
        } max-w-[220px]`}
      >
        {/* "Replied to" label inside the ghost bubble */}

        {isReplyToMessageDeleted ? (
          <span className="text-xs italic text-gray-500">Message deleted</span>
        ) : (
          <div className="flex flex-col gap-1">
            {message.repliedTo.voiceMessageId && (
              <span className="flex items-center gap-1.5 text-xs">
                <PiMicrophoneStageFill size={12} />
                Voice message
              </span>
            )}
            {message.repliedTo.img && (
              <img
                src={getOptimizedImageUrl(message.repliedTo.img, "post")}
                onLoad={onLoadImage}
                onError={onLoadImage}
                alt="original attachment"
                className="h-14 w-14 rounded-xl object-cover opacity-70"
              />
            )}
            {message.repliedTo.text && (
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                {truncateText(message.repliedTo.text, 80)}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default ReplyPreview
