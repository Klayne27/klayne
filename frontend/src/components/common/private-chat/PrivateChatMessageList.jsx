import React, { forwardRef } from "react"
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser"
import LoadingSpinner from "../../ui/LoadingSpinner"

import PrivateChatMessageItem from "./PrivateChatMessageItem"
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages"

const PriveChatMessageList = forwardRef(function PriveChatMessageList(
  {
    isNewChat,
    error,
    messagesToRender,
    privateChatInputRef,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
    isTypingOtherUser,
    handleLoadImage,
    onReactionAdded,
    messageListRef,
  },
  ref,
) {
  const { authUser: currentUser } = useAuthUser()
  const processedMessages = useProcessedMessage(messagesToRender)

  return (
    <div
      ref={ref}
      style={{ overscrollBehaviorY: "contain" }}
      className="relative flex flex-1 flex-col overflow-y-auto p-4 pt-20"
    >
      {error && !isNewChat && !isLoadingInitialMessages && (
        <div className="flex h-full items-center justify-center text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      {isFetchingOlderMessages && (
        <div className="absolute left-1/2 top-24 -translate-x-1/2 -translate-y-1/2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!hasNextPage &&
        !isLoadingInitialMessages &&
        !isFetchingOlderMessages &&
        messagesToRender.length > 0 && (
          <div className="my-2 flex justify-center text-sm text-gray-500">
            <p>This is the start of your conversation</p>
          </div>
        )}

      {!isNewChat &&
        processedMessages.length > 0 &&
        processedMessages.map((message) => {
          return (
            <PrivateChatMessageItem
              key={message._id}
              message={message}
              currentUser={currentUser}
              privateChatInputRef={privateChatInputRef}
              handleLoadImage={handleLoadImage}
              onReactionAdded={onReactionAdded}
              messageListRef={messageListRef}
            />
          )
        })}

      {isTypingOtherUser && (
        <PrivateChatMessageItem
          key="typing-indicator"
          isTypingOtherUser={isTypingOtherUser}
          message={{ sender: { _id: "dummy" }, text: "", img: "" }}
          currentUser={currentUser}
        />
      )}
    </div>
  )
})

export default React.memo(PriveChatMessageList)
