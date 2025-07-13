import { Link } from "react-router-dom";
import { formatPostDate } from "../../../utils/date";
import { MdImage } from "react-icons/md";
import React, { useEffect } from "react";
import { FiTrash } from "react-icons/fi";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../../context/SocketContext";

function ConversationItem({
  conv,
  currentUser,
  onlineUsers,
  selectedConversation,
  onSelectConversation,
  onDeleteInitiate,
}) {
  const queryClient = useQueryClient();
  const {socket} = useSocket()

  const otherUser = conv.participants.find(
    (p) => p?._id.toString() !== currentUser._id.toString()
  );

  const isOnline = onlineUsers.includes(otherUser._id);
  const isSelected =
    selectedConversation &&
    (selectedConversation._id === conv._id ||
      (selectedConversation.isNewChat &&
        selectedConversation.participants[0]?._id === otherUser._id));

  const isLastMessageFromOtherUser =
    conv.lastMessage?.sender?.toString() === otherUser._id.toString();
  const isLastMessageUnread = isLastMessageFromOtherUser && !conv.lastMessage?.seen;

  // // We want to mark the conversation as seen *when it becomes selected*.
  // // // Use an useEffect that watches `isSelected` and `isLastMessageUnread`.
  // useEffect(() => {
  //   if (isSelected && isLastMessageUnread) {
  //     queryClient.setQueryData(["conversations"], (oldConversations) => {
  //       if (!oldConversations) return oldConversations;

  //       const updatedConversations = oldConversations.map((convItem) => {
  //         if (
  //           convItem._id === conv._id && // Match the current conversation item
  //           convItem.lastMessage &&
  //           convItem.lastMessage.sender.toString() !== currentUser._id.toString() &&
  //           !convItem.lastMessage.seen
  //         ) {
  //           return {
  //             ...convItem,
  //             lastMessage: {
  //               ...convItem.lastMessage,
  //               seen: true,
  //             },
  //           };
  //         }
  //         return convItem;
  //       });
  //       return updatedConversations;
  //     });
  //   }
  // }, [ isSelected, isLastMessageUnread, conv._id, currentUser._id, queryClient]); // Add queryClient to dependencies

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

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteInitiate(conv._id);
  };

  if (!otherUser) {
    console.warn("Conversation without a valid other participant found:", conv);
    return null;
  }

  return (
    <div
      key={conv._id}
      className={`flex items-center gap-1 p-3 cursor-pointer border-gray-700 hover:bg-secondary hover:bg-opacity-60 duration-300 transition
        ${isSelected ? "bg-secondary border-r-2 border-r-accent" : ""}
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
        {/* {isOnline && (
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2F3336]"></span>
        )} */}
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 items-center">
            <span className="font-bold ">{otherUser.fullName}</span>
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
              isLastMessageUnread ? " font-semibold" : "text-gray-400"
            }`}
          >
            {isLastMessageUnread && <span className="mr-1 text-blue-500">●</span>}
            {truncatedLastMessage}
          </p>
        </div>
      </div>
      {!conv.isNewChat && (
        <div
          className="group p-2 rounded-full hover:bg-red-600 hover:text-red-500 hover:bg-opacity-15 duration-200 transition"
          onClick={handleDeleteClick}
        >
          <FiTrash
            className="text-gray-500 group-hover:text-red-500 cursor-pointer transition duration-200"
            size={18}
          />
        </div>
      )}
    </div>
  );
}

export default React.memo(ConversationItem);
