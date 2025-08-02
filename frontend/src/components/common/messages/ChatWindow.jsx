// components/ChatWindow.jsx
import { useEffect, useRef, useCallback, useLayoutEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../../context/SocketContext" // Still needed for setActiveConversationId
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser"
import { useFetchMessages } from "../../../hooks/messagesHooks/useFetchMessages"
import MessageInput from "./MessageInput"
import MessageList from "./MessageList"
import ChatHeader from "./ChatHeader"
import { IoChatbubblesOutline } from "react-icons/io5"
import { useMessageScroll } from "../../../hooks/customHooks/useMessageScroll"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { usePrivateChatSocketEvents } from "../../../hooks/socketEventHooks/usePrivateChatSocketEvents"

const ChatWindow = () => {
  const { authUser: currentUser } = useAuthUser()
  const { setActiveConversationId, socket } = useSocket()
  const queryClient = useQueryClient()
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)

  const otherUser = selectedConversation?.participants.find((p) => p?._id !== currentUser?._id)

  const conversationId = selectedConversation?._id

  const { isTypingOtherUser, setIsTypingOtherUser, setShowNewMessageButton } = usePrivateChatStore()

  const {
    messages,
    isLoading: isLoadingMessages,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFetchMessages(conversationId)

  const {
    handleLoadImage,
    handleReactionAdded,
    messageListRef,
    handleNewMessageButtonClick,
    triggerScrollOnSenderMessage,
  } = useMessageScroll({
    setShowNewMessageButton,
    messages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    isTypingOtherUser,
  })
  usePrivateChatSocketEvents(conversationId, setIsTypingOtherUser, otherUser)
  const privateChatInputRef = useRef(null)
  const currentOptimisticIdRef = useRef(null)
  
  const handleSenderMessageSent = useCallback(() => {
    if (triggerScrollOnSenderMessage) {
      triggerScrollOnSenderMessage()
    }
  }, [triggerScrollOnSenderMessage])

  useEffect(() => {
    setActiveConversationId(conversationId)

    if (socket && conversationId && currentUser?._id) {
      socket.emit("markMessagesAsSeen", { conversationId: conversationId })
    }

    return () => {
      setActiveConversationId(null)
    }
  }, [conversationId, setActiveConversationId, socket, currentUser?._id, queryClient])

  const isChatEmpty = !messages?.length && !isLoadingMessages

  return (
    <div className="relative flex h-full flex-col border-accent md:border-r">
      <ChatHeader otherUser={otherUser} />
      {isChatEmpty && (
        <div className="flex h-full flex-col items-center justify-end p-4 text-center">
          <IoChatbubblesOutline className="mb-4 text-6xl text-gray-300" />
          <p className="mb-2 text-xl font-semibold">
            You're starting a new chat with @{otherUser?.username}!
          </p>
          <p className="max-w-sm text-base italic text-gray-500">
            Say hello and send your first message to begin your conversation.
          </p>
        </div>
      )}
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col md:max-w-[585px]">
        <MessageList
          ref={messageListRef}
          isNewChat={isChatEmpty}
          error={error}
          messagesToRender={messages}
          privateChatInputRef={privateChatInputRef}
          messages={messages}
          isLoadingInitialMessages={isLoadingMessages && !isFetchingNextPage}
          isFetchingOlderMessages={isFetchingNextPage}
          hasNextPage={hasNextPage}
          isTypingOtherUser={isTypingOtherUser}
          onReactionAdded={handleReactionAdded}
          handleLoadImage={handleLoadImage}
        />

        <MessageInput
          otherUser={otherUser}
          actualConversationId={conversationId}
          currentOptimisticIdRef={currentOptimisticIdRef}
          privateChatInputRef={privateChatInputRef}
          onSenderMessageSent={handleSenderMessageSent}
          socket={socket}
          onNewMessageButtonClick={handleNewMessageButtonClick}
        />
      </div>
    </div>
  )
}

export default ChatWindow
