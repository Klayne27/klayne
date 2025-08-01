import { useRef, useEffect, useCallback, useMemo } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useSocket } from "../../../context/SocketContext";
import PublicChatHeader from "./PublicChatHeader";
import LoadingSpinner from "../../ui/LoadingSpinner";
import PublicChatMessage from "./PublicChatMessage";
import PublicChatMessageInput from "./PublicChatMessageInput";

import { FaCaretDown } from "react-icons/fa";
import { usePublicMessages } from "../../../hooks/publicChatHooks/usePublicMessages";
import { usePublicChatStore } from "../../../store/usePublicChatStore";
import { usePublicChatSocketEvents } from "../../../hooks/usePublicChatSocketEvents";
import { useMessageScroll } from "../../../hooks/customHooks/useMessageScroll";
import { MESSAGE_GROUP_TIME_THRESHOLD_MS } from "../../../constants/numberConstants";
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages";

const PublicChatWindow = () => {
  const { authUser: currentUser } = useAuthUser();
  const { socket } = useSocket();

  const { setIsCurrentlyTouchDevice, showNewMessageButton, setShowNewMessageButton } =
    usePublicChatStore();

  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    isMessagesError,
    messagesError,
  } = usePublicMessages();

  const {
    handleLoadImage,
    handleReactionAdded,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage,
  } = useMessageScroll({
    setShowNewMessageButton,
    messages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoadingMessages,
  });

  const { typingUsers } = usePublicChatSocketEvents();
  const publicChatInputRef = useRef(null);
  const isCurrentUserBanned = currentUser?.isBannedInPublicChat;

  const handleSenderMessageSent = useCallback(() => {
    if (triggerScrollOnSenderMessage) {
      triggerScrollOnSenderMessage();
    }
  }, []);

  useEffect(() => {
    const checkTouch = () =>
      setIsCurrentlyTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    checkTouch();
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, [setIsCurrentlyTouchDevice]); // Add setIsCurrentlyTouchDevice to dependencies

  const sendTypingEvent = useCallback(
    (isTyping, isEditing) => {
      if (socket) {
        if (isTyping) {
          socket.emit("public_typing", { isEditing });
        } else {
          socket.emit("public_stop_typing");
        }
      }
    },
    [socket]
  );

  const processedMessages = useProcessedMessage(messages);

  if (isLoadingMessages && processedMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isMessagesError && processedMessages.length === 0 && !isLoadingMessages) {
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        <p>Error loading messages: {messagesError?.message || "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative md:border-r border-accent ">
      <PublicChatHeader />
      {isCurrentUserBanned ? (
        <div className="flex flex-grow items-center justify-center">
          <div className="bg-base-100 p-6 rounded-2xl border-accent text-center mx-auto my-5 max-w-sm shadow-lg animate-fade-in">
            <p className="mb-3 font-bold text-lg">
              You are currently banned from the public chat.
            </p>
            <p className="text-base">You cannot view messages or send new ones.</p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="flex-grow overflow-y-auto p-4 pb-7 min-h-0"
            ref={messageListRef}
          >
            {isFetchingNextPage && (
              <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
                <LoadingSpinner size="sm" />
              </div>
            )}
            <div className="mx-auto w-full max-w-3xl md:max-w-[968px] mt-16">
              {!hasNextPage &&
                !isLoadingMessages && // Use isLoadingMessages instead of isLoadingInitialMessages
                !isFetchingNextPage &&
                processedMessages.length > 0 && ( // Use processedMessages for length check
                  <div className="flex justify-center text-gray-500 text-sm my-2">
                    <p>This is the start of your conversation</p>
                  </div>
                )}

              {processedMessages.map((message) => (
                <PublicChatMessage
                  key={message._id}
                  message={message} // Pass the fully processed message object
                  currentUser={currentUser}
                  onLoadImage={handleLoadImage} // Renamed to `onLoadImage` for consistency
                  onReactionAdded={handleReactionAdded}
                  publicChatInputRef={publicChatInputRef}
                />
              ))}
            </div>

            {showNewMessageButton && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={handleNewMessageButtonClick}
                  className="bg-primary text-sm px-3 py-1 text-white rounded-full shadow-lg flex items-center space-x-2 animate-bounce"
                >
                  <span>New Message</span>
                  <FaCaretDown />
                </button>
              </div>
            )}
          </div>

          <PublicChatMessageInput
            isCurrentUserBanned={isCurrentUserBanned}
            publicChatInputRef={publicChatInputRef}
            sendTypingEvent={sendTypingEvent}
            typingUsers={typingUsers}
            onSenderMessageSent={handleSenderMessageSent}
          />
        </>
      )}
    </div>
  );
};

export default PublicChatWindow;
