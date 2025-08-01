import { PiSmileyFill } from "react-icons/pi";

const MessageReactions = ({
  groupedReactions,
  currentUser,
  isSentByCurrentUser,
  messageContentStyle,
  addReactionButtonRef,
  openEmojiPickerWithModalClose,
  message,
  onReactionClick
}) => (
  <div
    className={`flex gap-1 flex-wrap items-center pt-0.5 rounded-full text-xs font-semibold
                                 ${isSentByCurrentUser ? "justify-end" : "justify-start"}
                                 relative`}
    style={messageContentStyle}
  >
    {/* Render "Add Reaction" button BEFORE reactions if sent by current user */}
    {isSentByCurrentUser && (
      <button
        ref={addReactionButtonRef}
        onClick={(e) => openEmojiPickerWithModalClose(e, addReactionButtonRef)}
        className={`text-gray-400 hover:text-gray-200 size-[30px] rounded-lg flex items-center justify-center transition-colors duration-200 ease-in-out hover:bg-gray-700 bg-gray-800`}
        style={messageContentStyle}
        title="Add reaction"
      >
        <PiSmileyFill className="size-5" />
      </button>
    )}

    {Object.entries(groupedReactions).map(([emoji, data]) => {
      const hasCurrentUserReactedToThisEmoji = data.userIds.some(
        (userId) => userId === currentUser._id?.toString()
      );

      const reactionUsersTitle = data.users
        .map((user) => user.username || "Unknown")
        .join(", ");

      return (
        <div
          key={emoji}
          className={`flex items-center cursor-pointer text-md rounded-lg px-1.5 py-1.5 ${
            hasCurrentUserReactedToThisEmoji
              ? "bg-violet-600/30 border-violet-600 border"
              : "bg-gray-800 border border-gray-800 hover:bg-gray-700 transition duration-200"
          }`}
          style={messageContentStyle}
          title={reactionUsersTitle ? `Reacted by: ${reactionUsersTitle}` : ""}
          onClick={(e) => {
            e.stopPropagation();
            onReactionClick(message._id, emoji);
          }}
        >
          <span className="text-[16px]">{emoji}</span>
          <span className="ml-1 font-bold">{data.count}</span>
        </div>
      );
    })}

    {/* Render "Add Reaction" button AFTER reactions if sent by other user */}
    {!isSentByCurrentUser && (
      <button
        ref={addReactionButtonRef}
        onClick={(e) => openEmojiPickerWithModalClose(e, addReactionButtonRef)}
        className={`
                                         text-gray-400 hover:text-gray-200
                                         size-[30px] rounded-lg flex items-center justify-center
                                         transition-colors duration-200 ease-in-out
                                         border border-transparent hover:bg-gray-700
                                         bg-gray-800
                                     `}
        title="Add reaction"
      >
        <PiSmileyFill className="size-5" />
      </button>
    )}
  </div>
);

export default MessageReactions;
