import { Link } from "react-router-dom";
import { formatPostDate } from "../../utils/date";
import { MdImage } from "react-icons/md";

function ConversationItem({
  conv,
  currentUser,
  onlineUsers,
  selectedConversation,
  onSelectConversation,
}) {
  const otherUser = conv.participants.find(
    (p) => p?._id.toString() !== currentUser._id.toString()
  );

  if (!otherUser) {
    console.warn("Conversation without a valid other participant found:", conv);
    return null;
  }

  const isOnline = onlineUsers.includes(otherUser._id);

  const isSelected =
    selectedConversation &&
    (selectedConversation._id === conv._id ||
      (selectedConversation.isNewChat &&
        selectedConversation.participants[0]._id === otherUser._id));

  let lastMessageDisplayContent;
  let isLastMessageUnread = false;

  if (conv.isNewChat) {
    lastMessageDisplayContent = "Start a new message";
  } else if (conv.lastMessage?.img) {
    lastMessageDisplayContent = (
      <span className="flex items-center gap-1">
        <MdImage
        className="inline-block text-lg" /> Image
      </span>
    );
  } else {
    lastMessageDisplayContent = conv.lastMessage?.text || "";
  }

  if (conv.lastMessage && conv.lastMessage.sender) {
    if (
      conv.lastMessage.sender.toString() === otherUser._id.toString() &&
      !conv.lastMessage.seen
    ) {
      isLastMessageUnread = true;
    }
  }

  const finalLastMessageText =
    typeof lastMessageDisplayContent === "string" && lastMessageDisplayContent.length > 35
      ? lastMessageDisplayContent.slice(0, 35) + "..."
      : lastMessageDisplayContent;

  const conversationToSelect = conv.isNewChat
    ? {
        _id: null,
        participants: [otherUser],
        isNewChat: true,
      }
    : conv;

  return (
    <div
      key={conv._id}
      className={`flex items-center gap-1 p-3 cursor-pointer border-gray-700 hover:bg-stone-900 hover:bg-opacity-70 duration-300 transition
        ${isSelected ? "bg-gray-800 bg-opacity-80 border-r-2 border-r-primary" : ""}
        transition-colors duration-200`}
      onClick={() => onSelectConversation(conversationToSelect)}
    >
      <div className="relative p-1">
        <Link to={`/profile/${otherUser.username}`} onClick={(e) => e.stopPropagation()}>
          <img
            src={otherUser?.profilePic || "/avatar-placeholder.png"}
            alt={otherUser.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        </Link>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></span>
        )}
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center">
            <span className="font-bold text-white">{otherUser.fullName}</span>
            <img src="verified.png" className="size-[17px]" alt="Verified badge" />
            <span className="text-gray-400 ">@{otherUser?.username}</span>
            {conv.isNewChat ? "" : <span className="text-[7px] text-gray-400">●</span>}
            <span className=" text-gray-400">
              {conv.isNewChat ? "" : formatPostDate(conv.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p
            className={`text-sm flex ${
              isLastMessageUnread ? "text-white font-semibold" : "text-gray-400"
            }`}
          >
            {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}
            {finalLastMessageText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConversationItem;
