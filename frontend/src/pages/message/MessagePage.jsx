import { useEffect } from "react";
import { useParams } from "react-router-dom";
import ConversationsList from "../../components/common/messages/ConversationsList";
import ChatWindow from "../../components/common/messages/ChatWindow";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import ConversationListSkeleton from "../../components/skeletons/ConversationListSkeleton";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAppStore } from "../../store/appStore";
import { usePrivateChatStore } from "../../store/usePrivateChatStore";

const MessagePage = () => {
  const setIsChatWindowOpen = useAppStore((state) => state.setIsChatWindowOpen);
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation);
  const setSelectedConversation = usePrivateChatStore(
    (state) => state.setSelectedConversation
  );

  const { conversationId: urlConversationId } = useParams();

  const { conversations, isLoadingConversations, errorConversations } =
    useFetchConversations();

  useEffect(() => {
    if (isLoadingConversations) return;

    if (urlConversationId) {
      const conversationFromUrl = conversations.find((c) => c._id === urlConversationId);
      setSelectedConversation(conversationFromUrl || null);
    } else {
      setSelectedConversation(null);
    }

    setIsChatWindowOpen(!!urlConversationId);

    return () => setIsChatWindowOpen(false);
  }, [
    urlConversationId,
    conversations,
    isLoadingConversations,
    setIsChatWindowOpen,
    setSelectedConversation,
  ]);

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
              <ConversationsList conversations={conversations} />
            )}
          </div>
        )}

        {showChatWindow && (
          <div className="w-full md:flex-1 flex flex-col h-screen">
            {isLoadingConversations && urlConversationId ? (
              <div></div>
            ) : selectedConversation ? (
              <ChatWindow  />
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
