import { useState, useEffect, useRef } from "react"; // Import useRef
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

  const { targetUserId } = location.state || {};

  const {
    conversations,
    isLoadingConversations,
    errorConversations,
    refetchConversations,
  } = useFetchConversations(); // Get refetchConversations
  const { followedUsers, isLoadingFollowedUsers, errorFollowedUsers } =
    useFetchFollowedUsersForMessaging();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const initialLoadHandled = useRef(false); // To prevent multiple initial navigations

  useEffect(() => {
    if (isLoadingConversations || isLoadingFollowedUsers || !currentUser) {
      return;
    }

    let desiredConversation = null;

    // --- Priority 1: Handle conversationId from URL params ---
    if (urlConversationId) {
      desiredConversation = conversations.find((conv) => conv._id === urlConversationId);

      if (!desiredConversation) {
        // SCENARIO: URL has a real ID, but conversations hasn't loaded it yet (e.g., first message sent)
        // OR: It's an invalid ID (but that's less likely if it just came from a successful send)
        console.warn(
          "MessagesPage: Conversation ID from URL not found in current conversations list. Attempting to create placeholder if user found:",
          urlConversationId
        );

        // Try to find the recipient user based on the conversation participants if possible.
        // This is a bit of a guess, but better than nothing for a temporary display.
        // The real conversation from `useFetchConversations` will eventually override this.
        const allUsersInConversations = conversations.flatMap((conv) =>
          conv.participants.filter(
            (p) => p?._id.toString() !== currentUser._id.toString()
          )
        );
        const uniqueOtherUsers = Array.from(
          new Map(allUsersInConversations.map((user) => [user?._id, user])).values()
        ).filter(Boolean);

        // Try to find a user among followedUsers or existing conversations' participants
        // This part is heuristic and might need fine-tuning if your user base is very complex.
        const potentialOtherUser =
          uniqueOtherUsers.find(
            (user) => user && urlConversationId.includes(user._id.toString()) // Simplistic check if ID contains other user's ID
          ) ||
          followedUsers.find(
            (user) => user && urlConversationId.includes(user._id.toString())
          );

        if (potentialOtherUser) {
          // Create a temporary pseudo-conversation object to display in ChatWindow
          desiredConversation = {
            _id: urlConversationId, // Use the real ID, but mark it as temporarily missing
            participants: [
              potentialOtherUser,
              {
                _id: currentUser._id,
                username: currentUser.username,
                fullName: currentUser.fullName,
                profileImg: currentUser.profileImg,
              },
            ],
            lastMessage: { text: "Loading messages...", seen: true, img: "" },
            isTemporary: true, // Custom flag to indicate it's a temporary placeholder
            updatedAt: new Date(),
          };
        } else {
          // If we can't even guess the other user, then it might genuinely be an invalid ID.
          // In this case, redirect to base messages.
          console.warn(
            "MessagesPage: Could not find potential other user for URL conversation ID. Redirecting."
          );
          if (!initialLoadHandled.current) {
            // Prevent multiple redirects on first load
            navigate("/messages", { replace: true });
            initialLoadHandled.current = true;
          }
          return;
        }
      }
    }

    // --- Priority 2: Handle "new chat" request from profile via location.state.targetUserId ---
    if (!desiredConversation && targetUserId) {
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
          console.warn("MessagesPage: Target user for new chat not found:", targetUserId);
        }
      }
    }

    // --- Priority 3: Default to the first conversation ---
    if (!desiredConversation && conversations.length > 0) {
      desiredConversation = conversations[0];
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

    // After initial processing, mark as handled
    if (!initialLoadHandled.current) {
      initialLoadHandled.current = true;
    }

    // Clear the location state after processing
    if (location.state?.targetUserId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [
    urlConversationId,
    targetUserId,
    conversations, // This dependency is key for re-running when conversations update
    followedUsers,
    isLoadingConversations,
    isLoadingFollowedUsers,
    currentUser,
    navigate,
    location.state,
  ]);

  // Handler for when a conversation is selected from the list
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

  if (isLoadingConversations || isLoadingFollowedUsers) {
    return (
      <div className="flex min-h-screen bg-black text-white items-center justify-center">
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
        className={`flex-1 w-[626px] ${
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

export default MessagePage;
