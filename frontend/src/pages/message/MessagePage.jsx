import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import ConversationsList from "../../components/common/messages/ConversationsList";
import ChatWindow from "../../components/common/messages/ChatWindow";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import { useFetchFollowedUsersForMessaging } from "../../hooks/messagesHooks/useFetchFollowedUsersForMessaging";
import { useDeleteConversation } from "../../hooks/messagesHooks/useDeleteConversation";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const MessagePage = ({
  openImageModal,
  setIsChatWindowOpen,
  setIsMobileMessagesListScrollingDown,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const location = useLocation();
  const { conversationId: urlConversationId } = useParams();
  const navigate = useNavigate();

  const { targetUserId } = location.state || {};

  const {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  } = useFetchConversations();
  const { followedUsers, isLoadingFollowedUsers, errorFollowedUsers } =
    useFetchFollowedUsersForMessaging();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const initialLoadAttempted = useRef(false);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [conversationToDeleteId, setConversationToDeleteId] = useState(null);

  const { deleteConversation, isDeleting } = useDeleteConversation();
  // Determine if a specific conversation is open based on URL param
  const isConversationOpen = urlConversationId !== undefined;
  const isMobile = window.innerWidth < 768;

  // Determine if a conversation ID is present in the URL
  const hasConversationIdInUrl = !!urlConversationId;
  const showConversationListPanel = !isMobile || !isConversationOpen;
  const showChatWindowPanel = !isMobile || isConversationOpen;

  // --- Core Logic for Chat Window Visibility and Sidebar Control ---
  // Effect to manage setIsChatWindowOpen based on the presence of conversationId in the URL
  useEffect(() => {
    // setIsChatWindowOpen is true if a specific conversation ID is in the URL
    // This tells the parent (App.jsx) that a chat window is open, so the sidebar should hide.
    setIsChatWindowOpen(hasConversationIdInUrl);

    // Cleanup function: Set to false when component unmounts or path changes away from messages/:id
    return () => {
      setIsChatWindowOpen(false);
    };
  }, [hasConversationIdInUrl, setIsChatWindowOpen]);
  // --- End Core Logic ---

  useEffect(() => {
    // If we're still loading data or don't have a current user, just return.
    if (isLoadingConversations || isLoadingFollowedUsers || !currentUser) {
      return;
    }

    // Prevent re-selection if already loaded and no new explicit target or URL change
    if (
      initialLoadAttempted.current &&
      !urlConversationId &&
      !targetUserId &&
      selectedConversation
    ) {
      return;
    }

    let desiredConversation = null;

    // Priority 1: Handle initial navigation to a new chat with a specific user (from profile, etc.)
    if (targetUserId) {
      const existingConv = conversations.find((conv) =>
        conv.participants.some((p) => p?._id.toString() === targetUserId)
      );

      if (existingConv) {
        // If a conversation already exists, navigate to it directly
        navigate(`/messages/${existingConv._id}`, { replace: true });
        return; // Exit to let the urlConversationId logic handle the selection
      } else {
        // If no existing conversation, create a "pseudo" conversation for a new chat
        const targetUser = followedUsers.find(
          (user) => user._id.toString() === targetUserId
        );
        if (targetUser) {
          desiredConversation = {
            _id: `new-${targetUser._id}`, // Temporary ID for new chats
            participants: [
              targetUser,
              {
                _id: currentUser._id,
                username: currentUser.username,
                fullName: currentUser.fullName,
                profileImg: currentUser.profileImg,
              },
            ],
            isNewChat: true,
            lastMessage: { text: "Start a new message", seen: true, img: "" },
            updatedAt: new Date(),
          };
        } else {
          console.warn("MessagesPage: Target user for new chat not found:", targetUserId);
        }
      }
    }

    // Priority 2: Handle conversation ID from URL
    if (urlConversationId && !desiredConversation) {
      desiredConversation = conversations.find((conv) => conv._id === urlConversationId);

      if (!desiredConversation) {
        console.warn(
          "MessagesPage: Conversation ID from URL not found in current conversations list. This might mean it's loading, or it's an invalid ID."
        );
        // Optionally, you could redirect to /messages if the URL ID is truly invalid after load
      }
    }

    setSelectedConversation(desiredConversation);
    initialLoadAttempted.current = true;

    // Clean up targetUserId from location state after processing
    if (location.state?.targetUserId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    urlConversationId,
    targetUserId,
    conversations,
    followedUsers,
    isLoadingConversations,
    isLoadingFollowedUsers,
    currentUser,
    navigate,
    location.state,
  ]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    // Update URL when a conversation is selected, but only for existing conversations
    // New chats (`isNewChat`) don't have a server-assigned ID yet.
    if (conversation && !conversation.isNewChat) {
      navigate(`/messages/${conversation._id}`);
    } else if (conversation?.isNewChat) {
      // For new chats, ensure the targetUserId is in state if navigating via link
      navigate("/messages", {
        state: {
          targetUserId: conversation.participants.find((p) => p?._id !== currentUser._id)
            ?._id,
        },
      });
    } else {
      // If no conversation is selected (e.g., clearing selection), go to base /messages
      navigate("/messages");
    }
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    navigate("/messages");
  };

  const handleDeleteInitiate = (id) => {
    setConversationToDeleteId(id);
    setShowConfirmDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDeleteId) {
      await deleteConversation(conversationToDeleteId);
      // After deletion, if the deleted conversation was selected, clear selection and navigate back.
      if (selectedConversation?._id === conversationToDeleteId) {
        setSelectedConversation(null);
        navigate("/messages", { replace: true });
      }
      // If it was a 'new chat' pseudo-conversation that was deleted (which shouldn't happen, but as a safeguard)
      if (
        selectedConversation?.isNewChat &&
        selectedConversation.participants.some((p) => p._id === conversationToDeleteId)
      ) {
        setSelectedConversation(null);
        navigate("/messages", { replace: true });
      }
    }
    setShowConfirmDeleteDialog(false);
    setConversationToDeleteId(null);
    refetchConversations(); // Refetch conversations to update the list
  };

  const handleCancelDelete = () => {
    setShowConfirmDeleteDialog(false);
    setConversationToDeleteId(null);
  };

  // Callback functions for ConversationsList scroll
  const handleConversationsListScrollDown = () => {
    setIsMobileMessagesListScrollingDown(true);
  };

  const handleConversationsListScrollUp = () => {
    setIsMobileMessagesListScrollingDown(false);
  };

  // Show loading state for initial data fetch
  if (isLoadingConversations || isLoadingFollowedUsers) {
    return (
      <div className="flex items-center justify-center gap-2 h-screen ">
        <LoadingSpinner size="md" />
        Loading inbox...
      </div>
    );
  }

  // Show error state if data fetching fails
  if (errorConversations || errorFollowedUsers) {
    return (
      <div className="flex min-h-screen text-red-500 items-center justify-center">
        Error loading messages:{" "}
        {errorConversations?.message || errorFollowedUsers?.message}
      </div>
    );
  }

  // `showChatWindow` determines if the ChatWindow should be visible.
  // It's true if there's a URL conversation ID, or if a conversation is locally selected (e.g., a new chat).
  const showChatWindow = !!urlConversationId || !!selectedConversation;

  return (
    <>
      <div className="flex min-h-screen overflow-hidden w-full">
        {/* Conversations List Panel */}
        {showConversationListPanel && (
          <div
            className={`
            w-full md:w-[430px] md:flex-shrink-0 md:border-r md:border-gray-700
            flex flex-col h-screen
          `}
          >
            <ConversationsList
              onSelectConversation={handleSelectConversation}
              selectedConversation={selectedConversation}
              onDeleteInitiate={handleDeleteInitiate}
              onScrollDown={handleConversationsListScrollDown}
              onScrollUp={handleConversationsListScrollUp}
            />
          </div>
        )}

        {/* Chat Window Panel */}
        {showChatWindowPanel && (
          <div
            className={`
            w-full md:flex-1
            flex flex-col h-screen
          `}
          >
            {selectedConversation ? (
              <ChatWindow
                selectedConversation={selectedConversation}
                openImageModal={openImageModal}
                onBackToConversations={handleBackToConversations}
                onNewConversationCreated={(newConversation) => {
                  refetchConversations(); // Ensure list updates with new real convo
                  setSelectedConversation(newConversation);
                  navigate(`/messages/${newConversation._id}`, { replace: true });
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <p className="text-xl font-bold mb-2">Select a message</p>
                <p className="text-sm">
                  Choose an existing conversation or start a new one.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showConfirmDeleteDialog}
        message="Are you sure you want to delete this conversation for yourself? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </>
  );
};

export default MessagePage;
