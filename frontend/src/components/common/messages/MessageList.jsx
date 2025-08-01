import React, { forwardRef } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../../ui/LoadingSpinner";

import MessageItem from "./MessageItem";
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages";


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
        messagesToRender.length > 0 && (
          <div className="flex justify-center text-gray-500 text-sm my-2">
            <p>This is the start of your conversation</p>
          </div>
        )}

      {!isNewChat &&
        processedMessages.length > 0 && 
        processedMessages.map((message) => {
          return (
            <MessageItem
              key={message._id}
              message={message}
              currentUser={currentUser}
              privateChatInputRef={privateChatInputRef} 
              onReactionAdded={onReactionAdded}
              handleLoadImage={handleLoadImage}
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
