import LoadingSpinner from "./LoadingSpinner"
import UserAvatar from "./UserAvatar"
import UserFullName from "./UserFullname"

/**
 * direction="up"   → opens above the trigger (default — correct for chat inputs)
 * direction="down" → opens below the trigger (correct for post / reply textareas)
 */
const MentionSuggestionsDropdown = ({
  users,
  isLoading,
  query,
  onSelect,
  focusedIndex = 0,
  direction = "up",
}) => {
  if (!query) return null

  const positionClass =
    direction === "down"
      ? "top-full mt-1" // below the relative parent
      : "bottom-full mb-1" // above the relative parent (chat default)

  return (
    <div
      className={`absolute ${positionClass} left-0 right-0 z-50 max-h-52 overflow-y-auto rounded-xl border border-accent bg-base-100 shadow-lg`}
    >
      {isLoading ? (
        <div className="flex justify-center p-3">
          <LoadingSpinner size="sm" />
        </div>
      ) : users.length > 0 ? (
        users.map((user, index) => (
          <div
            key={user._id}
            className={`flex cursor-pointer items-center gap-2 p-2 ${
              index === focusedIndex ? "bg-secondary" : "hover:bg-secondary"
            }`}
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(user.username)
            }}
          >
            <div className="pt-2">
              <UserAvatar user={user} size="sm" />
            </div>
            <div>
              <UserFullName
                user={user}
                className="text-sm font-semibold"
                style={user.nameColor ? { color: user.nameColor } : undefined}
              />
              <p className="text-xs text-gray-400">@{user.username}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="p-3 text-sm text-gray-400">No users found.</p>
      )}
    </div>
  )
}

export default MentionSuggestionsDropdown
