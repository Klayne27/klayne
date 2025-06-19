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

      // --- Priority 3: Default to the first conversation if nothing specific is selected ---
      // if (!desiredConversation && conversations.length > 0) {
      //   desiredConversation = conversations[0];
      //   // If we default, update the URL to reflect the selected conversation
      //   if (
      //     !urlConversationId &&
      //     !targetUserId &&
      //     desiredConversation &&
      //     !desiredConversation.isNewChat
      //   ) {
      //     navigate(`/messages/${desiredConversation._id}`, { replace: true });
      //   }
      // }

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

  // Handler for back button on mobile view
  const handleBackToConversations = () => {
    setSelectedConversation(null);
    navigate("/messages"); // Go to base messages URL, clearing URL param
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

  const showChatWindow = !!urlConversationId || !!selectedConversation;

  return (
    <div
      className="flex min-h-screen bg-black text-white overflow-hidden      
        w-full  // Default: let content/flex determine width (or add a max-w-*)
        lg:w-auto // From LG up: revert to default (no explicit w-full)
        xl:w-auto // From XL up: revert to default (no explicit w-full)"
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
    </div>
  );
};

export default MessagePage;
