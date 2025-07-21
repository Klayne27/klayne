import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import ConversationsList from "../../components/common/messages/ConversationsList";
import ChatWindow from "../../components/common/messages/ChatWindow";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import { useFetchFollowedUsersForMessaging } from "../../hooks/messagesHooks/useFetchFollowedUsersForMessaging";
import { useDeleteConversation } from "../../hooks/messagesHooks/useDeleteConversation";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import ConversationListSkeleton from "../../components/skeletons/ConversationListSkeleton";
import ChatWindowSkeleton from "../../components/skeletons/ChatWindowSkeleton";

const MessagePage = ({
  openImageModal,
  setIsChatWindowOpen,
  setIsMobileMessagesListScrollingDown,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const location = useLocation();
  const { conversationId: urlConversationId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const { targetUserId } = location.state || {};

  const {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  } = useFetchConversations();
  const { followedUsers, isLoadingFollowedUsers, errorFollowedUsers } =
    useFetchFollowedUsersForMessaging();

  // const [selectedConversation, setSelectedConversation] = useState(null);
  // const initialLoadAttempted = useRef(false);
  const queryClient = useQueryClient();

  // ⬇️ ADD THIS NEW USEEFFECT ⬇️
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = (newMessage) => {
      // Ignore messages sent by the current user
      if (newMessage.sender._id === currentUser._id) {
        return;
      }

      const conversationId = newMessage.conversationId;

      // --- Task 2: Update the conversations list for the sidebar ---
      queryClient.setQueryData(["conversations"], (oldConversations) => {
        if (!oldConversations) return [];

        const updatedConversations = oldConversations.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessage: {
                // update with new last message details
                text: newMessage.text,
                sender: newMessage.sender._id,
                seen: false, // It's a new message from someone else
                img: newMessage.img,
              },
              updatedAt: newMessage.createdAt,
            };
          }
          return conv;
        });

        // Sort to bring the updated conversation to the top
        return updatedConversations.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
      });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, queryClient, currentUser]);
  

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [conversationToDeleteId, setConversationToDeleteId] = useState(null);

  const { deleteConversation, isDeleting } = useDeleteConversation();
  const isConversationOpen = urlConversationId !== undefined;
  const isMobile = window.innerWidth < 768;

  const hasConversationIdInUrl = !!urlConversationId && urlConversationId !== "";
  const showConversationListPanel = !isMobile || !isConversationOpen;
  const showChatWindowPanel = !isMobile || isConversationOpen;

  const selectedConversation = useMemo(() => {
    // If the main data isn't ready, we can't select anything.
    if (isLoadingConversations || isLoadingFollowedUsers) {
      return null;
    }

    // Case 1: An existing conversation ID is in the URL.
    if (urlConversationId) {
      return conversations.find((conv) => conv._id === urlConversationId) || null;
    }

    // Case 2: We are starting a new chat with a target user.
    if (targetUserId) {
      // Check if a conversation already exists for this user.
      const existingConv = conversations.find((conv) =>
        conv.participants.some((p) => p?._id.toString() === targetUserId)
      );
      if (existingConv) return existingConv;

      // If not, create a temporary "pseudo" conversation object.
      const targetUser = followedUsers.find(
        (user) => user._id.toString() === targetUserId
      );
      if (targetUser) {
        return {
          _id: `new-${targetUser._id}`,
          participants: [targetUser, currentUser], // Simplified for clarity
          isNewChat: true,
          lastMessage: { text: "Start a new message", seen: true, img: "" },
          updatedAt: new Date(),
        };
      }
    }

    // Default case: No conversation is selected.
    return null;
  }, [
    urlConversationId,
    targetUserId,
    conversations,
    followedUsers,
    isLoadingConversations,
    isLoadingFollowedUsers,
    currentUser,
  ]);

  const isConversationActive = !!urlConversationId || !!selectedConversation;

  useEffect(() => {
    setIsChatWindowOpen(hasConversationIdInUrl);

    return () => {
      setIsChatWindowOpen(false);
    };
  }, [hasConversationIdInUrl, setIsChatWindowOpen]);
  // --- End Core Logic ---

  useEffect(() => {
    if (isLoadingConversations || isLoadingFollowedUsers || !currentUser) {
      return;
    }

    if (
      // initialLoadAttempted.current &&
      !targetUserId && // No new targetUserId trying to force a new convo
      urlConversationId === selectedConversation?._id // URL matches current selected convo (for existing chats)
    ) {
      return; // Already in the correct state, prevent unnecessary re-runs
    }

    let desiredConversation = null;

    if (targetUserId) {
      const existingConv = conversations.find((conv) =>
        conv.participants.some((p) => p?._id.toString() === targetUserId)
      );

      if (existingConv) {
        desiredConversation = existingConv;
        navigate(`/messages/${existingConv._id}`, { replace: true });
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
          navigate("/messages", { replace: true });
        }
      }
    }

    if (urlConversationId && !desiredConversation) {
      desiredConversation = conversations.find((conv) => conv._id === urlConversationId);

      if (!desiredConversation && urlConversationId !== "undefined") {
        console.warn(
          "MessagesPage: Conversation ID from URL not found in current conversations list. This might mean it's loading, or it's an invalid ID."
        );
      }
    }

    if (
      !targetUserId &&
      !urlConversationId &&
      conversations.length > 0 &&
      !selectedConversation
    ) {
      return;
    }

    // setSelectedConversation(desiredConversation);
    // initialLoadAttempted.current = true;

    if (location.state?.targetUserId && targetUserId) {
      // Only replace state if targetUserId was actually used to find/create a conversation
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
  ]);

  const handleSelectConversation = (conversation) => {
    // The only job is to change the URL. The derived state will do the rest.
    if (conversation && !conversation.isNewChat) {
      navigate(`/messages/${conversation._id}`);
    } else {
      // Handle new chats or clearing selection
      navigate("/messages");
    }
  };

  // In MessagePage
  // useEffect(() => {
  //   if (!socket || !currentUser) return; // Ensure socket and currentUser are available

  //   const handleNewMessage = (newMessage) => {
  //     // ... (existing logic for updating messages cache, if it's still here)

  //     // Update conversations cache

  //   };

  //   socket.on("newMessage", handleNewMessage);

  //   return () => {
  //     socket.off("newMessage", handleNewMessage);
  //   };
  // }, [
  //   socket,
  //   queryClient,
  //   currentUser, // Keep currentUser as a whole object.
  //   selectedConversation, // selectedConversation should be in dependencies,
  //   // but its properties accessed conditionally inside.
  // ]);

  const handleBackToConversations = () => {
    // setSelectedConversation(null);
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
        // setSelectedConversation(null);
        navigate("/messages", { replace: true });
      }
      // If it was a 'new chat' pseudo-conversation that was deleted (which shouldn't happen, but as a safeguard)
      if (
        selectedConversation?.isNewChat &&
        selectedConversation.participants.some((p) => p._id === conversationToDeleteId)
      ) {
        // setSelectedConversation(null);
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

  const handleNewConversationCreated = (newConversation) => {
    refetchConversations(); // Ensure conversations list is updated
    // setSelectedConversation(newConversation); // Set the selected conversation to the real one
    navigate(`/messages/${newConversation._id}`, { replace: true }); // Navigate to the correct URL
  };

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
            w-full md:w-[430px] md:flex-shrink-0 md:border-r md:border-accent
            flex flex-col h-screen
          `}
          >
            {isLoadingConversations || isLoadingFollowedUsers ? (
              <ConversationListSkeleton />
            ) : (
              <ConversationsList
                onSelectConversation={handleSelectConversation}
                selectedConversation={selectedConversation}
                onDeleteInitiate={handleDeleteInitiate}
                onScrollDown={handleConversationsListScrollDown}
                onScrollUp={handleConversationsListScrollUp}
                conversations={conversations}
                errorConversations={errorConversations}
                followedUsers={followedUsers}
                errorFollowedUsers={errorFollowedUsers}
              />
            )}
          </div>
        )}

        {showChatWindowPanel && (
          <div
            className={`
              w-full md:flex-1
              flex flex-col h-screen
            `}
          >
            {/* Condition for showing ChatWindowSkeleton */}
            {isLoadingConversations ||
            isLoadingFollowedUsers ||
            (isConversationActive && !selectedConversation) ? (
              // This condition covers:
              // 1. Initial page load on desktop (both sides loading)
              // 2. Mobile: When a conversation is clicked and the chat window is about to load its content
              <ChatWindowSkeleton />
            ) : selectedConversation ? (
              <ChatWindow
                selectedConversation={selectedConversation}
                openImageModal={openImageModal}
                onBackToConversations={handleBackToConversations}
                onNewConversationCreated={handleNewConversationCreated}
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
