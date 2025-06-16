import { useState } from "react";
import ConversationsList from "../../components/common/ConversationsList";
import ChatWindow from "../../components/common/ChatWindow";

const MessagesPage = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <div
        className={`md:w-[430px] w-full flex-shrink-0 border-r border-gray-700
        ${selectedConversation ? "hidden md:flex" : "flex"} flex-col h-screen`}
      >
        <ConversationsList
          onSelectConversation={handleSelectConversation}
          selectedConversation={selectedConversation}
        />
      </div>

      <div
        className={`flex-1 w-[626px]  ${
          selectedConversation ? "flex" : "hidden md:flex"
        } flex-col h-screen`}
      >
        <ChatWindow
          selectedConversation={selectedConversation}
          onBackToConversations={handleBackToConversations}
        />
      </div>
    </div>
  );
};

export default MessagesPage;
