// components/ui/ViewReactionsModal.jsx
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"

const ViewReactionsModal = ({ isOpen, onClose, reactions }) => {
  // Group reactions by emoji and count users
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction.userId)
    return acc
  }, {})

  // Get a list of unique emojis
  const uniqueEmojis = Object.keys(groupedReactions)
  const [selectedEmoji, setSelectedEmoji] = useState(uniqueEmojis[0])

  const usersForSelectedEmoji = groupedReactions[selectedEmoji] || []

  useEffect(() => {
    setSelectedEmoji(uniqueEmojis[0])
  }, [reactions])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-700/40"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div className="mx-4 flex w-full max-w-lg overflow-hidden rounded-2xl bg-base-100 shadow-lg">
        <div className="flex h-[50vh] w-[18%] flex-col gap-2 overflow-y-auto bg-base-200 p-2">
          {uniqueEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedEmoji(emoji)
              }}
              className={`flex items-center justify-start rounded-md px-2 py-1 transition-colors duration-200 ${
                selectedEmoji === emoji ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <span className="text-xl">{emoji}</span>
              <span className="ml-2 text-sm text-gray-400">{groupedReactions[emoji].length}</span>
            </button>
          ))}
        </div>

        {/* Right Panel: Users List */}
        <div className="flex-1 px-3">
          <div className="h-[50vh] overflow-y-auto py-1">
            {usersForSelectedEmoji.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 border-b border-gray-800 py-2 last:border-b-0"
              >
                <Link to={`/profile/${user.username}`} onClick={onClose}>
                  <img
                    src={user?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                    alt={user.username}
                    className="size-7 rounded-full object-cover"
                  />
                </Link>
                <Link to={`/profile/${user.username}`} onClick={onClose}>
                  <span className="font-semibold text-white hover:underline">{user.fullName}</span>
                </Link>
                <span className="text-gray-400">@{user.username}</span>
              </div>
            ))}
            {usersForSelectedEmoji.length === 0 && (
              <p className="text-center text-gray-400">
                No users have reacted with this emoji yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewReactionsModal
