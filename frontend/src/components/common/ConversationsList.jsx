// src/components/messages/ConversationsList.jsx

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { IoSearch, IoSettingsOutline } from "react-icons/io5";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { Link } from "react-router-dom";
import { formatPostDate } from "../../utils/date/index";
import { LuMailPlus } from "react-icons/lu";

// --- API Functions ---
const fetchConversations = async () => {
  const res = await fetch("/api/messages/conversations");
  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return res.json();
};

const fetchFollowedUsersForMessaging = async () => {
  const res = await fetch("/api/messages/followed-users-for-messaging"); // NEW endpoint
  if (!res.ok) {
    throw new Error("Failed to fetch followed users for messaging");
  }
  return res.json();
};

// --- Component ---
const ConversationsList = ({ onSelectConversation, selectedConversation }) => {
  const { authUser: currentUser } = useAuthUser();
  const { onlineUsers } = useSocket();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch existing conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: errorConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  // Fetch users the current user follows
  const {
    data: followedUsers = [],
    isLoading: isLoadingFollowedUsers,
    error: errorFollowedUsers,
  } = useQuery({
    queryKey: ["followedUsersForMessaging"],
    queryFn: fetchFollowedUsersForMessaging,
  });

  if (isLoadingConversations || isLoadingFollowedUsers) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading inbox...
      </div>
    );
  }

  if (errorConversations || errorFollowedUsers) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error: {errorConversations?.message || errorFollowedUsers?.message}
      </div>
    );
  }

  // --- Logic to combine and prepare conversations for display ---
  const conversationParticipants = new Set(
    conversations.flatMap((conv) => conv.participants.map((p) => p?._id.toString()))
  );

  // Filter out followed users who already have an existing conversation
  const newChatUsers = followedUsers.filter((followedUser) => {
    // Ensure we don't list ourselves
    if (followedUser._id.toString() === currentUser._id.toString()) {
      return false;
    }
    // Check if a conversation already exists with this followed user
    return !conversations.some((conv) =>
      conv.participants.some((p) => p?._id.toString() === followedUser._id.toString())
    );
  });

  // Map new chat users to a "pseudo-conversation" format
  const pseudoConversations = newChatUsers.map((user) => ({
    _id: `new-${user._id}`, // Unique ID for new chat items
    participants: [user], // The 'other' user
    isNewChat: true, // Flag to identify it as a new chat
    lastMessage: { text: "Start a new message", seen: true }, // Placeholder
    updatedAt: new Date(), // For sorting
  }));

  // Combine existing conversations with pseudo-conversations and sort
  // Sort by last message date (or creation date if new chat)
  const allConversations = [...conversations, ...pseudoConversations].sort((a, b) => {
    const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt);
    const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt);
    return dateB.getTime() - dateA.getTime(); // Newest first
  });

  const filteredConversations = allConversations.filter((conv) => {
    return conv.participants[0]?.fullName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-black border-gray-700">
      {/* Header with "Messages" title and icons */}
      <div className="sticky top-0 bg-black bg-opacity-90 backdrop-blur-sm z-10 p-4 border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-200 ">Messages</h2>
        <div className="flex ">
          <div className="rounded-full hover:bg-gray-800 p-1.5  cursor-pointer">
            <IoSettingsOutline className="w-4" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 relative flex items-center">
        <IoSearch className="absolute w-4 h-4 text-gray-500 cursor-pointer mx-3" />
        <input
          type="text"
          placeholder="Search Direct Messages"
          className="text-sm w-full p-2 px-3 rounded-full bg-black text-white placeholder-white border-gray-600 border focus:border-blue-500 focus:outline-none pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredConversations.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <p className="text-lg font-bold mb-2">Welcome to your inbox!</p>
            <p>
              Drop a line, share posts and more with private conversations between you and
              others on X.
            </p>
            <p className="mt-4">
              Start by following someone or selecting a user you follow.
            </p>
          </div>
        )}
        {filteredConversations.map((conv) => {
          // Determine the 'other' user for display
          console.log(conv);
          const otherUser = conv.participants.find(
            (p) => p?._id.toString() !== currentUser._id.toString()
          );
          if (!otherUser) return null; // Should not happen with robust filtering

          const isOnline = onlineUsers.includes(otherUser._id);
          // Highlight based on conversation ID OR the pseudo-ID for new chats
          const isSelected =
            selectedConversation &&
            (selectedConversation._id === conv._id ||
              (selectedConversation.isNewChat &&
                selectedConversation.participants[0]._id === otherUser._id));

          // Determine last message and its seen status
          let lastMessageText =
            conv.lastMessage?.text || (conv.lastMessage?.img ? "Photo" : "");
          let isLastMessageUnread = false;

          if (conv.lastMessage && conv.lastMessage.sender) {
            // If last message is from other user and not seen by current user
            if (
              conv.lastMessage.sender.toString() === otherUser._id.toString() &&
              !conv.lastMessage.seen
            ) {
              isLastMessageUnread = true;
            }
          }
          if (conv.isNewChat) {
            // Placeholder for new chats
            lastMessageText = "Start a new message";
            isLastMessageUnread = false;
          }

          return (
            <div
              key={conv._id} // Use conv._id (real or pseudo) as key
              className={`flex items-center gap-1 p-3 cursor-pointer border-b border-gray-800 hover:bg-gray-900
                          ${
                            isSelected
                              ? "bg-gray-900 border-r-2 border-r-primary"
                              : "hover:bg-gray-900"
                          }
                          transition-colors duration-200`}
              // Pass the full conversation object (or pseudo-object) to the parent
              onClick={() =>
                onSelectConversation(
                  conv.isNewChat
                    ? {
                        // Create consistent object for new chats
                        _id: null, // No _id yet for new chats
                        participants: [otherUser],
                        isNewChat: true,
                        // Add any other necessary properties for ChatWindow
                      }
                    : conv
                )
              }
            >
              <div className="relative p-1">
                <Link to={`/profile/${otherUser.username}`}>
                  <img
                    src={otherUser.profilePic || "/avatar-placeholder.png"}
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
                  <div className="flex gap-1">
                    <span className="font-bold text-white text-xs">
                      {otherUser.fullName}
                    </span>
                    <img src="verified.png" className="size-[17px]" />
                    <span className="text-gray-400 text-xs">@{otherUser?.username}</span>
                    {conv.isNewChat ? (
                      ""
                    ) : (
                      <span className="text-[10px] text-gray-400">●</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {conv.isNewChat ? "" : formatPostDate(conv.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs ${
                      isLastMessageUnread ? "text-white font-semibold" : "text-gray-400"
                    }`}
                  >
                    {isLastMessageUnread && (
                      <span className="mr-1 text-blue-500">●</span> // Unread indicator
                    )}
                    {lastMessageText.length > 35
                      ? lastMessageText.slice(0, 35) + "..."
                      : lastMessageText}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationsList;
