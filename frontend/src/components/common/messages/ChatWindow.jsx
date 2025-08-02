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
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()
  const currentUserId = currentUser?._id
  const { setActiveConversationId, socket } = useSocket() // Only need setActiveConversationId from useSocket here

  const isTypingOtherUser = usePrivateChatStore((state) => state.isTypingOtherUser)
  const setIsTypingOtherUser = usePrivateChatStore((state) => state.setIsTypingOtherUser)
  const setShowNewMessageButton = usePrivateChatStore((state) => state.setShowNewMessageButton)
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)

  const conversationId = selectedConversation?._id

  const privateChatInputRef = useRef(null)
  const currentOptimisticIdRef = useRef(null)
  // const messageListRef = useRef(null)
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 })

  const didMessageJustLanded = useRef(false)

  const resizeObserverRef = useRef(null)
  const prevScrollHeightRef = useRef(0)

  const shouldScrollOnFirstFullLoad = useRef(true)
  const prevActualConversationIdRef = useRef(conversationId)

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
    scrollToBottom,
  } = useMessageScroll({
    setShowNewMessageButton,
    messages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoadingMessages,
  })

  const otherUser = selectedConversation?.participants.find((p) => p?._id !== currentUser?._id)

  const handleSenderMessageSent = useCallback(() => {
    if (triggerScrollOnSenderMessage) {
      triggerScrollOnSenderMessage()
    }
  }, [triggerScrollOnSenderMessage])

  useEffect(() => {
    if (isTypingOtherUser) {
      const listEl = messageListRef.current
      if (listEl) {
        const scrollThreshold = 100
        const isUserAtBottom =
          listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold

        if (isUserAtBottom) {
          const timeoutId = setTimeout(() => {
            scrollToBottom()
          }, 1)
          return () => clearTimeout(timeoutId)
        }
      }
    }
  }, [isTypingOtherUser, scrollToBottom, messageListRef])

  // --- Only this useEffect remains for conversation activation/deactivation ---
  // This one controls the global `activeConversationId`
  // and emits "userActiveInChat" and "markMessagesAsSeen" *once* when conversation changes
  useEffect(() => {
    setActiveConversationId(conversationId)
    // It's usually good to mark messages as seen when the user enters the chat
    // This could also be inside the new `usePrivateChatSocketEvents` or a mutation
    // For now, keeping it here for clarity, but consider where its side-effect truly belongs.
    // If it's *only* when the user *opens* the chat, this is okay.
    // If it's on *any new message received*, the socket handler in the new hook is better.
    if (socket && conversationId && currentUserId) {
      socket.emit("markMessagesAsSeen", { conversationId: conversationId })
    }
    // queryClient.invalidateQueries({ queryKey: ["conversations"] }) // Update sidebar if seen status changes

    return () => {
      setActiveConversationId(null)
      // Only emit `userActiveInChat` with null here if this component controls the
      // "global" active status, otherwise, the `usePrivateChatSocketEvents` cleanup might be enough.
      // If this `userActiveInChat` is for a UI indicator (like a global "user is chatting" status), keep it.
    }
  }, [conversationId, setActiveConversationId, socket, currentUserId, queryClient])

  // --- Call the new socket events hook here ---
  // We pass the refs and setters it needs to interact with the DOM and Zustand store.
  usePrivateChatSocketEvents(
    conversationId,

    setIsTypingOtherUser,
    otherUser,
  )


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
          didMessageJustLanded={didMessageJustLanded}
          onSenderMessageSent={handleSenderMessageSent}
          socket={socket}
          onNewMessageButtonClick={handleNewMessageButtonClick}
        />
      </div>
    </div>
  )
}

export default ChatWindow
