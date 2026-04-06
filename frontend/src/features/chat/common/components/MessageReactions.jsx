import { PiSmileyFill } from "react-icons/pi"
import AnimatedCount from "../../../../components/common/AnimatedCount"

const MessageReactions = ({
  groupedReactions,
  currentUser,
  isSentByCurrentUser,
  messageContentStyle,
  addReactionButtonRef,
  handleOpenEmojiPickerPopover,
  message,
  onReactionClick,
  hideAddButton,
}) => (
  <div
    className={`flex flex-wrap items-center gap-1 rounded-full pt-0.5 text-xs font-semibold ${isSentByCurrentUser ? "justify-end" : "justify-start"} relative`}
    style={messageContentStyle}
  >
    {isSentByCurrentUser && !hideAddButton && (
      <button
        ref={addReactionButtonRef}
        onClick={(e) => handleOpenEmojiPickerPopover(e)}
        className={`flex size-[30px] items-center justify-center rounded-lg bg-gray-800 text-gray-400 transition-colors duration-200 ease-in-out hover:bg-gray-700 hover:text-gray-200`}
        style={messageContentStyle}
        title="Add reaction"
      >
        <PiSmileyFill className="size-5" />
      </button>
    )}

    {Object.entries(groupedReactions).map(([emoji, data]) => {
      const hasCurrentUserReactedToThisEmoji = data.userIds.some(
        (userId) => userId === currentUser._id?.toString(),
      )

      const reactionUsersTitle = data.users.map((user) => user.username || "Unknown").join(", ")

      return (
        <div
          key={emoji}
          className={`text-md flex cursor-pointer items-center rounded-lg px-1.5 py-1.5 ${
            hasCurrentUserReactedToThisEmoji
              ? "border border-violet-600 bg-violet-600/30"
              : "border border-gray-800 bg-gray-800 transition duration-200 hover:bg-gray-700"
          }`}
          style={messageContentStyle}
          title={reactionUsersTitle ? `Reacted by: ${reactionUsersTitle}` : ""}
          onClick={(e) => {
            e.stopPropagation()
            onReactionClick(message._id, emoji)
          }}
        >
          <span className="mr-1 text-[16px] md:mr-0.5">{emoji}</span>
          <AnimatedCount count={data.count} className="absolute top-[1px] font-bold text-white" />
          {/* <span className="ml-1 font-bold text-white">{data.count}</span> */}
        </div>
      )
    })}

    {!isSentByCurrentUser && !hideAddButton && (
      <button
        ref={addReactionButtonRef}
        onClick={(e) => handleOpenEmojiPickerPopover(e, addReactionButtonRef)}
        className={`flex size-[34px] items-center justify-center rounded-lg border border-transparent bg-gray-800 text-gray-400 transition-colors duration-200 ease-in-out hover:bg-gray-700 hover:text-gray-200`}
        title="Add reaction"
      >
        <PiSmileyFill className="size-5" />
      </button>
    )}
  </div>
)

export default MessageReactions
