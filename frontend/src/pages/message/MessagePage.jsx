// src/pages/message/MessagePage.jsx

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ConversationsList from "../../components/common/messages/ConversationsList";
import ChatWindow from "../../components/common/messages/ChatWindow";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import ConversationListSkeleton from "../../components/skeletons/ConversationListSkeleton";
import ChatWindowSkeleton from "../../components/skeletons/ChatWindowSkeleton";
import { useQueryClient } from "@tanstack/react-query";

// 🗑️ REMOVED PROPS: setIsMobileMessagesListScrollingDown
const MessagePage = ({ openImageModal, setIsChatWindowOpen }) => {
  const { authUser: currentUser } = useAuthUser();
  const { conversationId: urlConversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { conversations, isLoadingConversations, errorConversations } =
    useFetchConversations();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);

  // ♻️ REFACTORED: This effect now has one job: sync the selectedConversation state
  // with the conversation ID from the URL.
  useEffect(() => {
    // Don't do anything until conversations have loaded.
    if (isLoadingConversations) return;

    if (urlConversationId) {
      const conversationFromUrl = conversations.find((c) => c._id === urlConversationId);
      setSelectedConversation(conversationFromUrl || null);
    } else {
      // If there's no ID in the URL, no conversation is selected.
      setSelectedConversation(null);
    }

    setIsChatWindowOpen(!!urlConversationId);

    // Clean up the chat window state when the component unmounts
    return () => setIsChatWindowOpen(false);
  }, [urlConversationId, conversations, isLoadingConversations, setIsChatWindowOpen]);

  const handleSelectConversation = (conversation) => {
    // ♻️ REFACTORED: Logic is now very simple. Just navigate to the conversation's URL.
    if (conversation?._id) {
      navigate(`/messages/${conversation._id}`);
    }
  };

  const handleBackToConversations = () => {
    navigate("/messages");
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const isMobile = window.innerWidth < 768;
  const showConversationList = !isMobile || !urlConversationId;
  const showChatWindow = !isMobile || !!urlConversationId;

  if (errorConversations) {
    return (
      <div className="flex-center h-screen text-red-500">
        Error: {errorConversations.message}
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen overflow-hidden w-full">
        {showConversationList && (
          <div className="w-full md:w-[430px] md:flex-shrink-0 md:border-r md:border-accent flex flex-col h-screen">
            {isLoadingConversations ? (
              <ConversationListSkeleton />
            ) : (
              <ConversationsList
                conversations={conversations}
                onSelectConversation={handleSelectConversation}
                selectedConversation={selectedConversation}
              />
            )}
          </div>
        )}

        {showChatWindow && (
          <div className="w-full md:flex-1 flex flex-col h-screen">
            {isLoadingConversations && urlConversationId ? (
              <ChatWindowSkeleton />
            ) : selectedConversation ? (
              <ChatWindow
                key={selectedConversation._id} // Add key to force re-mount on conversation change
                selectedConversation={selectedConversation}
                openImageModal={openImageModal}
                onBackToConversations={handleBackToConversations}
                // onNewMessage={handleNewMessage} // ✨ Pass this new handler
              />
            ) : (
              <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400 p-4">
                <p className="text-xl font-bold mb-2">Select a message</p>
                <p className="text-sm">
                  Choose from your existing conversations to start chatting.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MessagePage;
