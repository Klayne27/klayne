import { Link } from "react-router-dom"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { TbCalendarClock } from "react-icons/tb"
import { MentionSuggestions } from "./MentionSuggestions"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import MentionSuggestionsDropdown from "../../../components/common/MentionSuggestionsDropdown"

export const PostModalTextarea = ({
  input,
  scheduledAt,
  isAnonymous,
  feedType,
  showPollInputs,
  inputRef,
  onTextChange,
  onPaste,
  onSubmit,
  showMentionSuggestions,
  suggestedUsers,
  isLoadingSuggestedUsers,
  focusedMentionIndex, // NEW
  onMentionSelect,
  onMentionKeyDown, // NEW
  onScheduleClick,
}) => {
  const { authUser } = useAuthUser()
  const isMobile = useIsMobile()

  const handleKeyDown = (e) => {
    onMentionKeyDown?.(e) // runs first
    if (e.defaultPrevented) return // mention consumed the key

    if (isMobile) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  const getPlaceholder = () => {
    if (feedType === "venting") return "Let it out"
    if (feedType === "ic") return "Share your studies"
    if (scheduledAt) return "What is happening?"
    if (showPollInputs) return "Ask a question"
    return "What is happening?"
  }

  return (
    <div className="flex flex-grow items-start gap-3">
      {isAnonymous && feedType === "venting" ? (
        <div className="avatar">
          <div className="w-10 rounded-full">
            <img src="/avatar-placeholder.png" alt="Anonymous Avatar" />
          </div>
        </div>
      ) : (
        <Link to={`/profile/${authUser.username}`}>
          <div className={`avatar ${scheduledAt ? "mt-1" : ""}`}>
            <div className="w-10 rounded-full">
              <img
                src={getOptimizedImageUrl(
                  authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                  "avatar",
                )}
              />
            </div>
          </div>
        </Link>
      )}

      <div className={`relative flex w-full ${scheduledAt ? "mt-1" : ""}`}>
        <div className="relative w-full">
          {scheduledAt && (
            <div
              className="absolute -left-8 -top-4 flex items-center justify-between"
              onClick={onScheduleClick}
            >
              <p className="flex cursor-pointer items-center gap-3 text-xs text-slate-500 hover:underline">
                <TbCalendarClock size={16} />
                Will send on{" "}
                {new Date(scheduledAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          )}

          <textarea
            className="max-h-[2600px] w-full resize-none overflow-y-auto border-none bg-inherit p-0 pb-2 text-xl focus:outline-none"
            placeholder={getPlaceholder()}
            value={input}
            onChange={onTextChange}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            ref={inputRef}
            rows={4}
          />

          {showMentionSuggestions && !showPollInputs && (
            <div
              className="absolute z-50 w-full"
              style={{ top: inputRef.current?.scrollHeight || 0, left: 0 }}
            >
              <MentionSuggestionsDropdown
                users={suggestedUsers}
                isLoading={isLoadingSuggestedUsers}
                query={input}
                onSelect={onMentionSelect}
                focusedIndex={focusedMentionIndex}
                direction="down" // ← opens downward below the reply input area
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
