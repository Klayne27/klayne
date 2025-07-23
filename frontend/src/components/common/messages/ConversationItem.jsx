// src/components/common/messages/ConversationItem.jsx

import { Link } from "react-router-dom";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { formatPostDate } from "../../../utils/date";
import { MdImage } from "react-icons/md";
import { FiTrash } from "react-icons/fi";
import React from "react";
import { useToggleConversationVisibility } from "../../../hooks/messagesHooks/useToggleConversationVisibility";
import { CiCircleMinus } from "react-icons/ci";

// 🗑️ REMOVED PROPS: onlineUsers (can be re-added if needed, but simplifying for now)
// ✅ The component is simpler as it doesn't need to check for "isNewChat".
function ConversationItem({
  conv,
  selectedConversation,
  onSelectConversation,
  onToggleVisibility,
}) {
  const { authUser: currentUser } = useAuthUser();

  const { toggleVisibility, isPending } = useToggleConversationVisibility();

  const otherUser = conv.participants.find(
    (p) => p?._id.toString() !== currentUser._id.toString()
  );

  // ♻️ REFACTORED: Selection logic is simpler without `isNewChat`.
  const isSelected = selectedConversation?._id === conv._id;

  const isLastMessageUnread =
    conv.lastMessage?.sender?.toString() === otherUser?._id.toString() &&
    !conv.lastMessage?.seen;

  // ♻️ REFACTORED: Last message content logic is simpler.
  let lastMessageContent = "No messages yet...";
  if (conv.lastMessage?.img) {
    lastMessageContent = (
      <span className="flex items-center gap-1">
        <MdImage className="inline-block text-lg" /> Image
      </span>
    );
  } else if (conv.lastMessage?.text) {
    lastMessageContent = conv.lastMessage.text;
  }

  const truncatedLastMessage =
    typeof lastMessageContent === "string" && lastMessageContent.length > 35
      ? lastMessageContent.slice(0, 35) + "..."
      : lastMessageContent;

  const handleToggleHide = (e) => {
    e.stopPropagation();
    toggleVisibility({ conversationId: conv._id, isHiding: true });
  };

  // This should rarely happen now with the new backend logic
  if (!otherUser) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1 p-3 cursor-pointer hover:bg-secondary/60 duration-300 transition-colors
        ${isSelected ? "bg-secondary border-r-2 border-r-primary" : ""}
      `}
      onClick={() => onSelectConversation(conv)} // ✨ Simplified handler
    >
      <Link
        to={`/profile/${otherUser.username}`}
        onClick={(e) => e.stopPropagation()}
        className="relative p-1"
      >
        <img
          src={otherUser.profileImg || "/avatar-placeholder.png"}
          alt={otherUser.username}
          className="w-8 h-8 rounded-full object-cover"
        />
      </Link>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center truncate">
            <span className="font-bold">{otherUser.fullName}</span>
            {otherUser.isVerified && (
              <img src="/verified.png" className="size-[17px]" alt="Verified" />
            )}
            {otherUser.isGoldVerified && (
              <img src="/gold-verified.png" className="size-[17px]" alt="Gold Verified" />
            )}
            <span className="text-gray-400">@{otherUser.username}</span>
            <span className="text-gray-400 text-xs mx-1">·</span>
            <span className="text-gray-400 text-xs shrink-0">
              {formatPostDate(conv.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-start">
          <p
            className={`text-sm truncate ${
              isLastMessageUnread ? "font-semibold" : "text-gray-400"
            }`}
          >
            {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}

            {lastMessageContent === "No messages yet..." ? (
              <span className="italic">{lastMessageContent}</span>
            ) : (
              truncatedLastMessage
            )}
          </p>
        </div>
      </div>
      {/* <div
        className="group p-2 rounded-full hover:bg-red-600/15"
        onClick={handleToggleHide}
      >
        <CiCircleMinus
          className="text-slate-500 group-hover:text-red-500 cursor-pointer transition-colors duration-200"
          size={22}
          strokeWidth={1}
        />
      </div> */}
    </div>
  );
}

export default React.memo(ConversationItem);
