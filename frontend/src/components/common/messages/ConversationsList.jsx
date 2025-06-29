import { useState } from "react";
import { useSocket } from "../../../context/SocketContext";
import { IoSearch, IoSettingsOutline } from "react-icons/io5";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useFetchConversations } from "../../../hooks/messagesHooks/useFetchConversations";
import { useFetchFollowedUsersForMessaging } from "../../../hooks/messagesHooks/useFetchFollowedUsersForMessaging";
import ConversationItem from "./ConversationItem";
import LoadingSpinner from "../LoadingSpinner";

const ConversationsList = ({
  onSelectConversation,
  selectedConversation,
  onDeleteInitiate,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const { onlineUsers } = useSocket();
  const [searchTerm, setSearchTerm] = useState("");

  const { conversations, isLoadingConversations, errorConversations } =
    useFetchConversations();
  const { followedUsers, isLoadingFollowedUsers, errorFollowedUsers } =
    useFetchFollowedUsersForMessaging();

  const activeConversations =
    conversations?.filter((conv) => {
      const isDeletedForMe =
        conv.deletedFor &&
        conv.deletedFor.some(
          (entry) => entry.user.toString() === currentUser._id.toString()
        );
      return !isDeletedForMe;
    }) || [];

  const conversationParticipantsSet = new Set();
  activeConversations.forEach((conv) => {
    conv.participants.forEach((p) => {
      if (p && p._id) {
        conversationParticipantsSet.add(p._id.toString());
      }
    });
  });

  const newChatUsers = followedUsers.filter((followedUser) => {
    if (followedUser._id.toString() === currentUser._id.toString()) {
      return false;
    }
    return !conversationParticipantsSet.has(followedUser._id.toString());
  });

  const pseudoConversations = newChatUsers.map((user) => ({
    _id: `new-${user._id}`,
    participants: [
      user,
      {
        _id: currentUser._id,
        username: currentUser.username,
        fullName: currentUser.fullName,
        profileImg: currentUser.profileImg,
      },
    ],
    isNewChat: true,
    lastMessage: { text: "Start a new message", seen: true, img: "" },
    updatedAt: new Date(0),
  }));

  const allConversations = [...activeConversations, ...pseudoConversations].sort(
    (a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    }
  );

  const filteredConversations = allConversations.filter((conv) => {
    const otherUserForFilter = conv.participants.find(
      (p) => p?._id.toString() !== currentUser._id.toString()
    );

    return (
      otherUserForFilter &&
      otherUserForFilter.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoadingConversations || isLoadingFollowedUsers) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <LoadingSpinner size="md" />
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

  return (
    <div className="flex flex-col h-full bg-black border-gray-700">
      <div className="sticky top-0 bg-black bg-opacity-90 backdrop-blur-sm z-10 p-4 border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-200 ">Messages</h2>
        <div className="flex ">
          <div className="rounded-full hover:bg-gray-800 p-1.5 cursor-pointer">
            <IoSettingsOutline className="w-4" />
          </div>
        </div>
      </div>

      <div className="px-3 py-2 relative flex items-center">
        <IoSearch className="absolute w-4 h-4 text-gray-500 cursor-pointer mx-3" />
        <input
          type="text"
          placeholder="Search Direct Messages"
          className="text-sm w-full p-2 px-3 rounded-full bg-black text-white placeholder-white border-gray-600 border focus:border-primary focus:outline-none pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-on-hover">
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
        {filteredConversations.map((conv) => (
          <ConversationItem
            key={conv._id}
            conv={conv}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            selectedConversation={selectedConversation}
            onSelectConversation={onSelectConversation}
            onDeleteInitiate={onDeleteInitiate}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationsList;
