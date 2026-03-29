import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"

export const MentionSuggestions = ({
  show,
  suggestions,
  isLoading,
  showPollInputs,
  inputRef,
  suggestionBoxRef,
  onSelect,
}) => {
  if (!show || suggestions?.length === 0 || showPollInputs) return null

  return (
    <div
      ref={suggestionBoxRef}
      className="absolute z-50 max-h-60 w-full overflow-y-auto rounded-md border border-accent bg-base-100 shadow-lg"
      style={{
        top: inputRef.current?.scrollHeight || 0,
        left: 0,
      }}
    >
      {isLoading ? (
        <p className="p-2 text-gray-400">Loading suggestions...</p>
      ) : suggestions.length === 0 ? (
        <p className="p-2 text-slate-500">No users found.</p>
      ) : (
        suggestions.map((user) => (
          <div
            key={user._id}
            className="flex cursor-pointer items-center gap-2 p-2 hover:bg-secondary"
            onClick={() => onSelect(user.username)}
          >
            <div className="avatar">
              <div className="w-8 rounded-full">
                <img
                  src={getOptimizedImageUrl(user.profileImg?.imageUrl || "/avatar-placeholder.png", "avatar")}
                  alt="profile"
                />
              </div>
            </div>
            <div>
              <p className="font-semibold">{user.fullName}</p>
              <p className="text-sm text-slate-500">@{user.username}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
