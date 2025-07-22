// src/components/common/messages/ConversationsList.jsx

import { useEffect, useRef, useState } from "react";
import { IoSearch, IoSettingsOutline } from "react-icons/io5";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import ConversationItem from "./ConversationItem";
import React from "react";

// 🗑️ REMOVED PROPS: followedUsers, errorFollowedUsers, onScrollDown, onScrollUp
// ✅ The component is much cleaner and only needs the real conversations.
const ConversationsList = ({
  conversations,
  onSelectConversation,
  selectedConversation,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const [searchTerm, setSearchTerm] = useState("");

  // ♻️ REFACTORED: The logic for merging lists and creating pseudo-conversations is entirely removed.
  // We now just filter the real conversations that are passed in.
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = conv.participants.find(
      (p) => p?._id.toString() !== currentUser._id.toString()
    );

    // Ensure the other user exists and their name matches the search term
    return (
      otherUser && otherUser.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full border-accent">
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 flex justify-between items-center backdrop-blur-sm bg-black/0">
        <h1 className="font-bold text-xl">Messages</h1>
        <div className="rounded-full hover:bg-gray-800 p-1.5 cursor-pointer">
          <IoSettingsOutline className="w-4" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 relative flex items-center">
        <IoSearch className="absolute w-4 h-4 text-gray-500 mx-3" />
        <input
          type="text"
          placeholder="Search Direct Messages"
          className="text-sm w-full p-2 px-3 rounded-full bg-black/0 border-accent border focus:border-accent/99 focus:outline-none pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto scrollbar-on-hover">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p className="text-lg font-bold mb-2">No messages yet</p>
            <p>When you follow someone, you'll be able to message them here.</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conv={conv}
              onSelectConversation={onSelectConversation}
              selectedConversation={selectedConversation}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(ConversationsList);
