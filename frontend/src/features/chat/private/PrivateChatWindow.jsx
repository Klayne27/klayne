import { useEffect, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "../../../context/SocketContext"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { useMessageScroll } from "../../../hooks/customHooks/useMessageScroll"
import { useGetMessages } from "./privateChatHooks/useGetMessages"
import { usePrivateChatSocketEvents } from "../../../hooks/socketEventHooks/usePrivateChatSocketEvents"
import PrivateChatMessageList from "./PrivateChatMessageList"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { IoChatbubblesOutline } from "react-icons/io5"
import PrivateChatHeader from "./PrivateChatHeader"
import PrivateChatInput from "./PrivateChatInput"
import { FaCaretDown } from "react-icons/fa6"

const PrivateChatWindow = () => {
  const { authUser: currentUser } = useAuthUser()
  const { setActiveConversationId, socket } = useSocket()
  const queryClient = useQueryClient()
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)

  const otherUser = selectedConversation?.participants?.find((p) => p?._id !== currentUser?._id)
  const conversationId = selectedConversation?._id

  const { isTypingOtherUser, setIsTypingOtherUser, setShowNewMessageButton, showNewMessageButton } =
    usePrivateChatStore()

  const { messages, isLoadingMessages, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetMessages(conversationId)

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

  usePrivateChatSocketEvents(conversationId, setIsTypingOtherUser, otherUser, handleReactionAdded)

  const privateChatInputRef = useRef(null)
  const currentOptimisticIdRef = useRef(null)

  const handleSenderMessageSent = useCallback(() => {
    if (triggerScrollOnSenderMessage) {
      triggerScrollOnSenderMessage()
    }
  }, [triggerScrollOnSenderMessage])

  useEffect(() => {
    const hasUnreadMessages = messages?.some(
      (msg) => msg.sender?._id !== currentUser?._id && !msg.seen,
    )

    if (socket && conversationId && !isLoadingMessages && hasUnreadMessages) {
      socket.emit("markMessagesAsSeen", { conversationId })
    }
  }, [messages, conversationId, isLoadingMessages, socket, currentUser?._id]) // Dependencies for the effect

  const isChatEmpty = !messages?.length

  return (
    <div className="relative flex h-full flex-col border-accent md:border-r">
      <PrivateChatHeader otherUser={otherUser} />
      {isChatEmpty && !isLoadingMessages && (
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
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <PrivateChatMessageList
            ref={messageListRef}
            isNewChat={isChatEmpty}
            error={error}
            messagesToRender={messages}
            privateChatInputRef={privateChatInputRef}
            isLoadingInitialMessages={isLoadingMessages && !isFetchingNextPage}
            isFetchingOlderMessages={isFetchingNextPage}
            hasNextPage={hasNextPage}
            isTypingOtherUser={isTypingOtherUser}
            handleLoadImage={handleLoadImage}
            onReactionAdded={handleReactionAdded}
            messageListRef={messageListRef}
          />
        )}
        {showNewMessageButton && (
          <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
            <button
              onClick={handleNewMessageButtonClick}
              className="flex animate-bounce items-center space-x-2 rounded-full bg-primary px-3 py-1 text-sm text-white shadow-lg"
            >
              <span>New Message</span>
              <FaCaretDown />
            </button>
          </div>
        )}

        <PrivateChatInput
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

export default PrivateChatWindow
