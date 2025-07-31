import React, { useCallback, forwardRef, useMemo } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../../ui/LoadingSpinner";

import MessageItem from "./MessageItem";

const MESSAGE_GROUP_TIME_THRESHOLD_MS = 5 * 60 * 1000; // 1 minute

const MessageList = forwardRef(function MessageList(
  {
    error,
    isNewChat,
    messagesToRender,
    messageInputRef,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
    isTypingOtherUser,
    onReactionAdded,
    handleLoadImage,
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();

  // --- OPTIMIZED MESSAGE ENHANCEMENT LOGIC ---
  const enhancedMessages = useMemo(() => {
    if (!messagesToRender || messagesToRender.length === 0) {
      return [];
    }

    // Pre-process dates to avoid creating new Date objects repeatedly inside the loop
    const messagesWithParsedDates = messagesToRender.map((msg) => ({
      ...msg,
      parsedCreatedAt: new Date(msg.createdAt),
      // Normalize sender ID if it can be an object or string
      normalizedSenderId: typeof msg.sender === "object" ? msg.sender._id : msg.sender,
    }));

    return messagesWithParsedDates.map((msg, index) => {
      const previousMessage = messagesWithParsedDates[index - 1];
      const nextMessage = messagesWithParsedDates[index + 1];

      const currentSenderId = msg.normalizedSenderId;
      const prevSenderId = previousMessage ? previousMessage.normalizedSenderId : null;
      const nextSenderId = nextMessage ? nextMessage.normalizedSenderId : null;

      const isSentByCurrentUser = currentSenderId === currentUser._id;

      let showHeaderInfo = false;
      let isFirstInGroup = false;
      let isLastInGroup = false;
      let isNewDay = false; // This will track new day for the current message relative to previous

      // Determine isNewDay for current message relative to previous
      if (previousMessage) {
        const prevDate = previousMessage.parsedCreatedAt;
        const currDate = msg.parsedCreatedAt;
        isNewDay =
          currDate.getDate() !== prevDate.getDate() ||
          currDate.getMonth() !== prevDate.getMonth() ||
          currDate.getFullYear() !== prevDate.getFullYear();
      } else {
        isNewDay = true; // First message in the list always considered a "new day" for separation
      }

      // Determine if the current message starts a new "visual" group
      if (!previousMessage) {
        showHeaderInfo = true;
        isFirstInGroup = true;
      } else {
        const timeDifference =
          msg.parsedCreatedAt.getTime() - previousMessage.parsedCreatedAt.getTime();
        const isTimeThresholdExceeded = timeDifference > MESSAGE_GROUP_TIME_THRESHOLD_MS;

        if (currentSenderId !== prevSenderId || isNewDay || isTimeThresholdExceeded) {
          showHeaderInfo = true;
          isFirstInGroup = true;
        }
      }

      // Determine if the current message is the last in its "visual" group
      if (!nextMessage) {
        isLastInGroup = true;
      } else {
        const timeDifference =
          nextMessage.parsedCreatedAt.getTime() - msg.parsedCreatedAt.getTime();
        const isTimeThresholdExceeded = timeDifference > MESSAGE_GROUP_TIME_THRESHOLD_MS;

        const isNextNewDay = // Check if the *next* message starts a new day
          msg.parsedCreatedAt.getDate() !== nextMessage.parsedCreatedAt.getDate() ||
          msg.parsedCreatedAt.getMonth() !== nextMessage.parsedCreatedAt.getMonth() ||
          msg.parsedCreatedAt.getFullYear() !== nextMessage.parsedCreatedAt.getFullYear();

        if (currentSenderId !== nextSenderId || isNextNewDay || isTimeThresholdExceeded) {
          isLastInGroup = true;
        }
      }

      return {
        ...msg, // Include all original message properties
        isNewDay, // New property for date separators
        showHeaderInfo,
        isFirstInGroup,
        isLastInGroup,
        // Use optional chaining and fallback for safety
        senderProfileImg: msg.sender?.profileImg || "/public/avatar-placeholder.png",
        senderUsername: typeof msg.sender === "object" ? msg.sender?.username : undefined,
      };
    });
  }, [messagesToRender, currentUser._id]); // Recalculate only when dependencies change
  // --- END OPTIMIZED MESSAGE ENHANCEMENT LOGIC ---

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-4 flex flex-col pt-20 relative">
      {isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full ">
          <LoadingSpinner size="md" />
        </div>
      )}
      {error && !isNewChat && !isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      {isFetchingOlderMessages && (
        <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!hasNextPage &&
        !isLoadingInitialMessages &&
        !isFetchingOlderMessages &&
        messagesToRender.length > 0 && ( // Use messagesToRender for this check, as enhancedMessages might be empty
          <div className="flex justify-center text-gray-500 text-sm my-2">
            <p>This is the start of your conversation</p>
          </div>
        )}

      {!isNewChat &&
        enhancedMessages.length > 0 && // Iterate over enhancedMessages
        enhancedMessages.map((msg) => {
          // All calculated properties are now directly on the `msg` object
          return (
            <MessageItem
              key={msg._id}
              msg={msg} // Pass the enhanced message object
              currentUser={currentUser} // Still likely needed for 'is my message' logic
              messageInputRef={messageInputRef} // Still needed if MessageItem focuses input
              onReactionAdded={onReactionAdded} // If this is a ChatWindow concern
              handleLoadImage={handleLoadImage} // If this is a ChatWindow concern
              // No need to pass these anymore:
              // isCurrentlyTouchDevice={isCurrentlyTouchDevice} // -> MessageItem can get from Zustand or local state
              // activeMessageModalId={activeMessageModalId} // -> MessageItem can get from Zustand
              // handleReplyClick={handleReplyClick} // -> MessageItem calls Zustand
              // handleImageClick={handleImageClick} // -> MessageItem calls Zustand
              // handleJumpToOriginalMessage={handleJumpToOriginalMessage} // -> MessageItem calls Zustand or local
              // handleReactionClick={handleReactionClick} // -> MessageItem calls Zustand or local
            />
          );
        })}

      {isTypingOtherUser && (
        <MessageItem
          key="typing-indicator"
          isTypingOtherUser={true}
          msg={{ sender: { _id: "dummy" }, text: "", img: "" }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
});

export default React.memo(MessageList);
