import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import ConversationsList from "../../components/common/ConversationsList";
import ChatWindow from "../../components/common/ChatWindow";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useFetchConversations } from "../../hooks/messagesHooks/useFetchConversations";
import { useFetchFollowedUsersForMessaging } from "../../hooks/messagesHooks/useFetchFollowedUsersForMessaging";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const MessagePage = () => {
  const { authUser: currentUser } = useAuthUser();
  const location = useLocation();
  const { conversationId: urlConversationId } = useParams();
  const navigate = useNavigate();

  // targetUserId is still needed for initiating a NEW chat from a profile
  // It's the key to knowing who the "other user" is for a brand new conversation.
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
  const initialLoadAttempted = useRef(false); // Tracks if the initial selection logic has run once

  useEffect(
    () => {
      // Only run if all necessary data is loaded and currentUser is available
      if (isLoadingConversations || isLoadingFollowedUsers || !currentUser) {
        return;
      }

      // This ref ensures the initial selection logic runs only once after data is loaded,
      // or when URL/state dependencies truly change, preventing excessive re-runs and navigations.
      if (
        initialLoadAttempted.current &&
        !urlConversationId &&
        !targetUserId &&
        selectedConversation
      ) {
        // If we've already handled initial load and there's no specific URL/target,
        // and a conversation is already selected, don't re-run the whole logic.
        return;
      }

      let desiredConversation = null;

      // --- Priority 1: Handle "new chat" request via location.state.targetUserId ---
      // This must come first as it explicitly defines a new conversation's recipient.
      if (targetUserId) {
        const existingConv = conversations.find((conv) =>
          conv.participants.some((p) => p?._id.toString() === targetUserId)
        );

        if (existingConv) {
          // If targetUserId corresponds to an *existing* conversation, redirect to its specific URL
          navigate(`/messages/${existingConv._id}`, { replace: true });
          return; // Exit effect as we're navigating
        } else {
          // If it's truly a new chat, create a pseudo-conversation object
          const targetUser = followedUsers.find(
            (user) => user._id.toString() === targetUserId
          );
          if (targetUser) {
            desiredConversation = {
              _id: `new-${targetUser._id}`, // Pseudo ID for a truly new chat
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

      // --- Priority 2: Use conversationId from URL params (for existing or just-created chats) ---
      // This runs if no specific new chat target was identified, or if a new chat target was found
      // but the URL already points to a conversation ID.
      if (urlConversationId) {
        desiredConversation = conversations.find(
          (conv) => conv._id === urlConversationId
        );

        if (!desiredConversation) {
          // SCENARIO: URL has a real ID (e.g., after first message), but conversations hasn't updated yet.
          // Or it's an invalid ID.
          console.warn(
            "MessagesPage: Conversation ID from URL not found in current conversations list. Waiting for refetch or handling as invalid."
          );
          // We DO NOT try to build a placeholder here with a "guessed" other user from URL_ID.
          // That was the source of the "Could not find potential other user" warning.
          // Instead, we just wait for `conversations` to update, which will trigger this effect again.
          // If after a short delay it's still not found (meaning it's genuinely invalid or unauthorized),
          // the `initialLoadAttempted` ref combined with the lack of selection might trigger the redirect later.

          // To avoid showing an empty chat window briefly for a new conversation that's about to load,
          // we can try to find the other user from the `targetUserId` if it was just cleared from location.state.
          // This is a subtle point, but if the flow is:
          // Profile -> MessagesPage (targetUserId pseudo) -> ChatWindow Send (new conv ID) -> navigate('/messages/:newConvId')
          // Then `targetUserId` will be cleared from location.state, but we *still* know the other user.
          // However, relying on `conversations` to refetch is usually sufficient.
        }
      }

      // --- Priority 3: Default to the first conversation if nothing specific is selected ---
      if (!desiredConversation && conversations.length > 0) {
        desiredConversation = conversations[0];
        // If we default, update the URL to reflect the selected conversation
        if (
          !urlConversationId &&
          !targetUserId &&
          desiredConversation &&
          !desiredConversation.isNewChat
        ) {
          navigate(`/messages/${desiredConversation._id}`, { replace: true });
        }
      }

      setSelectedConversation(desiredConversation);
      initialLoadAttempted.current = true; // Mark initial load logic as attempted

      // Clear the location state after processing to prevent re-triggering new chat logic
      // on subsequent renders or if user navigates back and forth within messages.
      if (location.state?.targetUserId) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      urlConversationId, // Reacts to changes in URL param
      targetUserId, // Reacts to changes in navigation state (crucial for new chat)
      conversations, // Reacts when conversations data updates (e.g., after refetch)
      followedUsers,
      isLoadingConversations,
      isLoadingFollowedUsers,
      currentUser,
      navigate,
      location.state, // To track changes to location.state itself
    ]
  );

  // Handler for when a conversation is selected from the list
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    if (conversation && !conversation.isNewChat) {
      navigate(`/messages/${conversation._id}`); // Navigate to specific URL for existing
    } else if (conversation?.isNewChat) {
      // For new chats initiated from the ConversationsList (e.g., from "New Message" button),
      // we navigate to the base with state.
      navigate("/messages", {
        state: {
          targetUserId: conversation.participants.find((p) => p?._id !== currentUser._id)
            ?._id,
        },
      });
    } else {
      navigate("/messages"); // Fallback to general inbox
    }
  };

  // Handler for back button on mobile view
  const handleBackToConversations = () => {
    setSelectedConversation(null);
    navigate("/messages"); // Go to base messages URL
  };

  if (isLoadingConversations || isLoadingFollowedUsers) {
    return (
      <div className="flex min-h-screen bg-black text-white items-center justify-center absolute w-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (errorConversations || errorFollowedUsers) {
    return (
      <div className="flex min-h-screen bg-black text-red-500 items-center justify-center">
        Error loading messages:{" "}
        {errorConversations?.message || errorFollowedUsers?.message}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <div
        className={`md:w-[430px] w-full flex-shrink-0 border-r border-gray-700
                ${selectedConversation ? "hidden md:flex" : "flex"} flex-col h-screen`}
      >
        <ConversationsList
          onSelectConversation={handleSelectConversation}
          selectedConversation={selectedConversation}
          urlConversationId={urlConversationId}
        />
      </div>

      <div
        className={`flex-1 md:w-[626px] ${
          selectedConversation ? "flex" : "hidden md:flex"
        } flex-col h-screen`}
      >
        <ChatWindow
          selectedConversation={selectedConversation}
          onBackToConversations={handleBackToConversations}
          onNewConversationCreated={(newConversationId) => {
            refetchConversations();
            if (urlConversationId !== newConversationId) {
              navigate(`/messages/${newConversationId}`, { replace: true });
            }
          }}
        />
      </div>
    </div>
  );
};

export default MessagePage;
