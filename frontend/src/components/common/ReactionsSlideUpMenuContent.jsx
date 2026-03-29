import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

const ReactionsSlideUpMenuContent = ({ reactions, onClose }) => {
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction.userId)
    return acc
  }, {})

  const uniqueEmojis = Object.keys(groupedReactions)
  const [selectedEmoji, setSelectedEmoji] = useState(uniqueEmojis[0])

  const usersForSelectedEmoji = groupedReactions[selectedEmoji] || []

  useEffect(() => {
    if (uniqueEmojis.length > 0) {
      setSelectedEmoji(uniqueEmojis[0])
    }
  }, [reactions])

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex w-full gap-2 overflow-x-auto border-b border-accent p-2">
        {uniqueEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedEmoji(emoji)
            }}
            className={`flex items-center justify-start whitespace-nowrap rounded-lg px-2 py-1 transition-colors duration-200 ${
              selectedEmoji === emoji ? "bg-accent" : ""
            }`}
          >
            <span className="text-xl">{emoji}</span>
            <span className="ml-2 text-sm text-gray-400">{groupedReactions[emoji].length}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {usersForSelectedEmoji.map((user, index) => (
          <div
            key={`${user?._id}-${index}`}
            className="flex items-center gap-3 border-gray-800 py-2"
          >
            <Link to={`/profile/${user?.username}`} onClick={onClose}>
              <img
                src={getOptimizedImageUrl(user?.profileImg?.imageUrl || "/avatar-placeholder.png", "avatar")}
                alt={user?.username}
                className="size-7 rounded-full object-cover"
              />
            </Link>
            <Link to={`/profile/${user?.username}`} onClick={onClose}>
              <span className="font-semibold hover:underline">{user?.fullName}</span>
            </Link>
            <span className="text-gray-400">@{user?.username}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReactionsSlideUpMenuContent
