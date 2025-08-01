import React, { forwardRef, useMemo } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../../ui/LoadingSpinner";

import MessageItem from "./MessageItem";
import { MESSAGE_GROUP_TIME_THRESHOLD_MS } from "../../../constants/numberConstants";
import { useProcessedMessage } from "../../../hooks/useProcessedMessages";


const MessageList = forwardRef(function MessageList(
  {
    error,
    isNewChat,
    messagesToRender,
    privateChatInputRef,
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

  // const processedMessages = useMemo(() => {
  //   if (!messagesToRender || messagesToRender.length === 0) {
  //     return [];
  //   }

  //   const messagesWithParsedDates = messagesToRender.map((message) => ({
  //     ...message,
  //     parsedCreatedAt: new Date(message.createdAt),
  //     normalizedSenderId: typeof message.sender === "object" ? message.sender._id : message.sender,
  //   }));

  //   return messagesWithParsedDates.map((message, index) => {
  //     const previousMessage = messagesWithParsedDates[index - 1];
  //     const nextMessage = messagesWithParsedDates[index + 1];

  //     const currentSenderId = message.normalizedSenderId;
  //     const prevSenderId = previousMessage ? previousMessage.normalizedSenderId : null;
  //     const nextSenderId = nextMessage ? nextMessage.normalizedSenderId : null;

  //     const isSentByCurrentUser = currentSenderId === currentUser._id;

  //     let isFirstInGroup = false;
  //     let isLastInGroup = false;
  //     let isNewDay = false; // This will track new day for the current message relative to previous

  //     // Determine isNewDay for current message relative to previous
  //     if (previousMessage) {
  //       const prevDate = previousMessage.parsedCreatedAt;
  //       const currDate = message.parsedCreatedAt;
  //       isNewDay =
  //         currDate.getDate() !== prevDate.getDate() ||
  //         currDate.getMonth() !== prevDate.getMonth() ||
  //         currDate.getFullYear() !== prevDate.getFullYear();
  //     } else {
  //       isNewDay = true; // First message in the list always considered a "new day" for separation
  //     }

  //     // Determine if the current message starts a new "visual" group
  //     if (!previousMessage) {
  //       isFirstInGroup = true;
  //     } else {
  //       const timeDifference =
  //         message.parsedCreatedAt.getTime() - previousMessage.parsedCreatedAt.getTime();
  //       const isTimeThresholdExceeded = timeDifference > MESSAGE_GROUP_TIME_THRESHOLD_MS;

  //       if (currentSenderId !== prevSenderId || isNewDay || isTimeThresholdExceeded) {
  //         isFirstInGroup = true;
  //       }
  //     }

  //     // Determine if the current message is the last in its "visual" group
  //     if (!nextMessage) {
  //       isLastInGroup = true;
  //     } else {
  //       const timeDifference =
  //         nextMessage.parsedCreatedAt.getTime() - message.parsedCreatedAt.getTime();
  //       const isTimeThresholdExceeded = timeDifference > MESSAGE_GROUP_TIME_THRESHOLD_MS;

  //       const isNextNewDay = // Check if the *next* message starts a new day
  //         message.parsedCreatedAt.getDate() !== nextMessage.parsedCreatedAt.getDate() ||
  //         message.parsedCreatedAt.getMonth() !== nextMessage.parsedCreatedAt.getMonth() ||
  //         message.parsedCreatedAt.getFullYear() !== nextMessage.parsedCreatedAt.getFullYear();

  //       if (currentSenderId !== nextSenderId || isNextNewDay || isTimeThresholdExceeded) {
  //         isLastInGroup = true;
  //       }
  //     }

  //     return {
  //       ...message, // Include all original message properties
  //       isNewDay, // New property for date separators
  //       isFirstInGroup,
  //       isLastInGroup,
  //       senderProfileImg: message.sender?.profileImg || "/public/avatar-placeholder.png",
  //       senderUsername: typeof message.sender === "object" ? message.sender?.username : undefined,
  //     };
  //   });
  // }, [messagesToRender, currentUser._id]); // Recalculate only when dependencies change
 
  const processedMessages = useProcessedMessage(messagesToRender)

  return (
    <div ref={ref} className="flex overflow-y-auto p-4 flex-1 flex-col pt-20 relative">
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
        messagesToRender.length > 0 && ( // Use messagesToRender for this check, as processedMessages might be empty
          <div className="flex justify-center text-gray-500 text-sm my-2">
            <p>This is the start of your conversation</p>
          </div>
        )}

      {!isNewChat &&
        processedMessages.length > 0 && // Iterate over processedMessages
        processedMessages.map((message) => {
          // All calculated properties are now directly on the `message` object
          return (
            <MessageItem
              key={message._id}
              message={message} // Pass the enhanced message object
              currentUser={currentUser} // Still likely needed for 'is my message' logic
              privateChatInputRef={privateChatInputRef} // Still needed if MessageItem focuses input
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
          message={{ sender: { _id: "dummy" }, text: "", img: "" }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
});

export default React.memo(MessageList);
