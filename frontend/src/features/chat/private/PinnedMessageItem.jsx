import { format } from "date-fns"
import { RiUnpinFill } from "react-icons/ri"
import { Link } from "react-router-dom"

const PinnedMessageItem = ({ pinnedMessage, onUnpinMessage }) => {
  // Extract the actual message from the pinned message structure
  const message = pinnedMessage.message
  const pinnedBy = pinnedMessage.pinnedBy
  const pinnedAt = pinnedMessage.pinnedAt

  // Safety checks
  if (!message || !message.sender) {
    console.warn("Invalid message structure:", pinnedMessage)
    return null
  }

  const imageUrl = message.img || message.image?.imageUrl
  const messageText = message.text

  return (
    <div className="mb-3 flex w-full items-start gap-4 rounded-lg border border-accent p-4">
      <img
        src={message.sender?.profileImg?.imageUrl || "/avatar-placeholder.png"}
        alt={message.sender?.username}
        className="size-10 rounded-full object-cover"
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white">
            {message.sender?.fullName || message.sender?.username}
          </p>
          <span className="text-xs text-slate-400">
            {message.createdAt
              ? format(new Date(message.createdAt), "MMM d, yyyy h:mm a")
              : "Unknown date"}
          </span>
        </div>

        {/* Show who pinned it and when */}
        <div className="mb-2 text-xs text-slate-500">
          Pinned by {pinnedBy?.fullName || pinnedBy?.username} on{" "}
          {pinnedAt ? format(new Date(pinnedAt), "MMM d, yyyy h:mm a") : "Unknown date"}
        </div>

        <div className="mt-1 break-words text-sm text-slate-300">
          {/* Render the text if it exists */}
          {messageText && <p className="mb-2">{messageText}</p>}

          {/* Render the image if it exists */}
          {imageUrl && (
            <div className="max-w-full">
              {message.image?._id ? (
                <Link to={`/images/${message.image._id}`}>
                  <img
                    src={imageUrl}
                    className="block h-auto max-h-80 rounded-2xl border border-accent object-contain"
                    alt="message image"
                    loading="lazy"
                  />
                </Link>
              ) : (
                <img
                  src={imageUrl}
                  className="block h-auto max-h-80 rounded-2xl border border-accent object-contain"
                  alt="message image"
                  loading="lazy"
                />
              )}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => onUnpinMessage(message._id)}
        className="flex-shrink-0 text-red-500 hover:text-red-400"
        title="Unpin Message"
      >
        <RiUnpinFill size={20} />
      </button>
    </div>
  )
}

export default PinnedMessageItem
