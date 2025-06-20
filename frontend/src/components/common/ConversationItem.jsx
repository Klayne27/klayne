import { Link } from "react-router-dom";
import { formatPostDate } from "../../utils/date";
import { MdImage } from "react-icons/md";
import React from "react";

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
        selectedConversation.participants[0]?._id === otherUser._id)); 

  const isLastMessageFromOtherUser =
    conv.lastMessage?.sender?.toString() === otherUser._id.toString();
  const isLastMessageUnread = isLastMessageFromOtherUser && !conv.lastMessage?.seen;

  let lastMessageContent;
  if (conv.isNewChat) {
    lastMessageContent = <span className="italic">Start a new message</span>;
  } else if (conv.lastMessage?.img) {
    lastMessageContent = (
      <span className="flex items-center gap-1">
        <MdImage className="inline-block text-lg" /> Image
      </span>
    );
  } else {
    lastMessageContent = conv.lastMessage?.text || "";
  }

  const truncatedLastMessage =
    typeof lastMessageContent === "string" && lastMessageContent.length > 35
      ? lastMessageContent.slice(0, 35) + "..."
      : lastMessageContent;

  const conversationToSelect = conv.isNewChat
    ? { _id: null, participants: [otherUser], isNewChat: true }
    : conv;

  return (
    <div
      key={conv._id}
      className={`flex items-center gap-1 p-3 cursor-pointer border-gray-700 hover:bg-stone-900 hover:bg-opacity-70 duration-300 transition
        ${isSelected ? "bg-[#2F3336] bg-opacity-80 border-r-2 border-r-primary" : ""}
        transition-colors duration-200`}
      onClick={() => onSelectConversation(conversationToSelect)}
    >
      <div className="relative p-1">
        <Link to={`/profile/${otherUser.username}`} onClick={(e) => e.stopPropagation()}>
          <img
            src={otherUser?.profileImg || "/avatar-placeholder.png"}
            alt={otherUser.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        </Link>
        {isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2F3336]"></span>
        )}
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center">
            <span className="font-bold text-white">{otherUser.fullName}</span>
            {conv.participants[0].isVerified && (
              <img src="/verified.png" className="size-[17px]" alt="Verified badge" />
            )}
            <span className="text-gray-400 ">@{otherUser?.username}</span>
            {!conv.isNewChat && (
              <>
                <span className="text-[7px] text-gray-400">●</span>
                <span className=" text-gray-400">{formatPostDate(conv.updatedAt)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p
            className={`text-sm flex ${
              isLastMessageUnread ? "text-white font-semibold" : "text-gray-400"
            }`}
          >
            {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}
            {truncatedLastMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ConversationItem);
