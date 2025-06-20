import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import ConversationsList from "../../components/common/ConversationsList";
import ChatWindow from "../../components/common/ChatWindow";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import { useFetchFollowedUsersForMessaging } from "../../hooks/messagesHooks/useFetchFollowedUsersForMessaging";
import { useDeleteConversation } from "../../hooks/messagesHooks/useDeleteConversation";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";

const MessagePage = ({ openImageModal }) => {
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

  // --- NEW STATE FOR DELETION CONFIRMATION ---
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [conversationToDeleteId, setConversationToDeleteId] = useState(null);
  // --- END NEW STATE ---

  // --- NEW HOOK INVOCATION ---
  const { deleteConversation, isDeleting } = useDeleteConversation();
  // --- END NEW HOOK ---

  useEffect(
    () => {
      if (isLoadingConversations || isLoadingFollowedUsers || !currentUser) {
        return;
      }

      if (
        initialLoadAttempted.current &&
        !urlConversationId &&
        !targetUserId &&
        selectedConversation
      ) {
        return;
      }

      let desiredConversation = null;

      if (targetUserId) {
        const existingConv = conversations.find((conv) =>
          conv.participants.some((p) => p?._id.toString() === targetUserId)
        );

        if (existingConv) {
          navigate(`/messages/${existingConv._id}`, { replace: true });
          return;
        } else {
          const targetUser = followedUsers.find(
            (user) => user._id.toString() === targetUserId
          );
          if (targetUser) {
            desiredConversation = {
              _id: `new-${targetUser._id}`,
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
            console.warn(
              "MessagesPage: Target user for new chat not found:",
              targetUserId
            );
          }
        }
      }

      if (urlConversationId) {
        desiredConversation = conversations.find(
          (conv) => conv._id === urlConversationId
        );

        if (!desiredConversation) {
          console.warn(
            "MessagesPage: Conversation ID from URL not found in current conversations list. Waiting for refetch or handling as invalid."
          );
        }
      }

      setSelectedConversation(desiredConversation);
      initialLoadAttempted.current = true;

      if (location.state?.targetUserId) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      urlConversationId,
      targetUserId,
      conversations,
      followedUsers,
      isLoadingConversations,
      isLoadingFollowedUsers,
      currentUser,
      navigate,
      location.state,
    ]
  );

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    if (conversation && !conversation.isNewChat) {
      navigate(`/messages/${conversation._id}`);
    } else if (conversation?.isNewChat) {
      navigate("/messages", {
        state: {
          targetUserId: conversation.participants.find((p) => p?._id !== currentUser._id)
            ?._id,
        },
      });
    } else {
      navigate("/messages");
    }
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    navigate("/messages");
  };

  // --- NEW HANDLERS FOR DELETE CONFIRMATION ---
  const handleDeleteInitiate = (id) => {
    setConversationToDeleteId(id);
    setShowConfirmDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDeleteId) {
      await deleteConversation(conversationToDeleteId);
      // After deletion, if the currently selected conversation was the one deleted,
      // navigate back to the main messages list and unselect it.
      if (selectedConversation?._id === conversationToDeleteId) {
        // <--- This check
        setSelectedConversation(null);
        navigate("/messages", { replace: true });
      }
      // Also, if a new chat with the deleted user was 'selected', unselect it.
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
    console.log("Selected Conversation ID:", selectedConversation?._id);
    console.log("Conversation To Delete ID:", conversationToDeleteId);
  };

  const handleCancelDelete = () => {
    setShowConfirmDeleteDialog(false);
    setConversationToDeleteId(null);
  };
  // --- END NEW HANDLERS ---

  if (errorConversations || errorFollowedUsers) {
    return (
      <div className="flex min-h-screen bg-black text-red-500 items-center justify-center">
        Error loading messages:{" "}
        {errorConversations?.message || errorFollowedUsers?.message}
      </div>
    );
  }

  const showChatWindow = !!urlConversationId || !!selectedConversation;

  return (
    <div
      className="flex min-h-screen bg-black text-white overflow-hidden      
        w-full
        lg:w-auto
        xl:w-auto"
    >
      <div
        className={`
          w-full /* Always full width on mobile */
          md:w-[430px] md:flex-shrink-0 md:border-r md:border-gray-700 /* Desktop specific styles */
          ${
            showChatWindow ? "hidden" : "flex"
          } /* Hide on mobile if chat window is active */
          md:flex 
          flex-col h-screen
        `}
      >
        <ConversationsList
          onSelectConversation={handleSelectConversation}
          selectedConversation={selectedConversation}
          onDeleteInitiate={handleDeleteInitiate}
        />
      </div>

      <div
        className={`
          w-full
          md:w-[626px] md:flex-1 
          ${
            showChatWindow ? "flex" : "hidden"
          } /* Show on mobile if chat window is active */
          md:flex 
          flex-col h-screen
        `}
      >
        {selectedConversation ? (
          <ChatWindow
            selectedConversation={selectedConversation}
            openImageModal={openImageModal}
            onBackToConversations={handleBackToConversations}
            onNewConversationCreated={(newConversationId) => {
              refetchConversations();
              if (urlConversationId !== newConversationId) {
                navigate(`/messages/${newConversationId}`, { replace: true });
              }
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-black text-gray-400">
            <p className="text-xl font-bold mb-2">Select a message</p>
            <p className="text-sm">Choose an existing conversation or start a new one.</p>
          </div>
        )}
      </div>
      {/* --- NEW CONFIRMATION DIALOG --- */}
      <ConfirmationDialog
        isOpen={showConfirmDeleteDialog}
        message="Are you sure you want to delete this conversation for yourself? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      {/* --- END NEW CONFIRMATION DIALOG --- */}
    </div>
  );
};

export default MessagePage;
