import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import LoadingSpinner from "./LoadingSpinner"
import UserAvatar from "./UserAvatar"
import UserFullName from "./UserFullname"

const MentionSuggestionsDropdown = ({ users, isLoading, query, onSelect }) => {
  if (!query) return null

  return (
    <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-52 overflow-y-auto rounded-xl border border-accent bg-base-200 shadow-lg">
      {isLoading ? (
        <div className="flex justify-center p-3">
          <LoadingSpinner size="sm" />
        </div>
      ) : users.length > 0 ? (
        users.map((user) => (
          <div
            key={user._id}
            className="flex cursor-pointer items-center gap-2 p-2 hover:bg-secondary"
            onMouseDown={(e) => {
              // onMouseDown instead of onClick so it fires before textarea blur
              e.preventDefault()
              onSelect(user.username)
            }}
          >
            <div className="pt-2">
              <UserAvatar user={user} size={"sm"} />
            </div>
            <div>
                <UserFullName
                  user={user}
                  className={`text-sm font-semibold`}
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
