import { useEffect, useRef, useCallback } from "react"
import { useSocket } from "../../../../context/SocketContext"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"
import { useMessageScroll } from "../../../../hooks/customHooks/useMessageScroll"
import { usePrivateChatSocketEvents } from "../../common/hooks/usePrivateChatSocketEvents"
import PrivateChatMessageList from "./PrivateChatMessageList"
import LoadingSpinner from "../../../../components/common/LoadingSpinner"
import { IoChatbubblesOutline } from "react-icons/io5"
import PrivateChatHeader from "./PrivateChatHeader"
import PrivateChatInput from "./PrivateChatInput"
import { FaCaretDown } from "react-icons/fa6"
import { useState } from "react"
import PinnedMessagesModal from "./PinnedMessageModal"
import { useChatViewStore } from "../../../../store/useChatViewStore"
import { showAppToast } from "../../../../utils/showAppToast"
import { useGroupChatSocketEvents } from "../../common/hooks/useGroupChatSocketEvents"
import { useGetMessages, useGetPinnedMessages } from "../privateChatHooks/usePrivateChatQueries"

const PrivateChatWindow = () => {
  const { authUser: currentUser } = useAuthUser()
  const { socket } = useSocket()
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation)
  const { messageIdToJumpTo, clearJumpRequest } = useChatViewStore()

  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false)

  const otherUser = selectedConversation?.participants?.find((p) => p?._id !== currentUser?._id)
  const conversationId = selectedConversation?._id

  const { isTypingOtherUser, setIsTypingOtherUser, setShowNewMessageButton, showNewMessageButton } =
    usePrivateChatStore()

  const { messages, isLoadingMessages, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetMessages(conversationId)

  const { pinnedMessages } = useGetPinnedMessages(conversationId)

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
  useGroupChatSocketEvents(socket)

  const privateChatInputRef = useRef(null)
  const currentOptimisticIdRef = useRef(null)

  const handleSenderMessageSent = useCallback(() => {
    if (triggerScrollOnSenderMessage) {
      triggerScrollOnSenderMessage()
    }
  }, [triggerScrollOnSenderMessage])

  const handleOpenPinnedModal = () => setIsPinnedModalOpen(true)
  const handleClosePinnedModal = () => setIsPinnedModalOpen(false)

  useEffect(() => {
    const hasUnreadMessages = messages?.some(
      (msg) => msg.sender?._id !== currentUser?._id && !msg.seen,
    )

    if (socket && conversationId && !isLoadingMessages && hasUnreadMessages) {
      socket.emit("markMessagesAsSeen", { conversationId })
    }
  }, [messages, conversationId, isLoadingMessages, socket, currentUser?._id]) // Dependencies for the effect

  useEffect(() => {
    if (!messageIdToJumpTo || isFetchingNextPage) return

    const messageIsLoaded = messages?.some((msg) => msg._id === messageIdToJumpTo)

    if (messageIsLoaded) {
      // Use a timeout to ensure the DOM has updated before we try to scroll.
      // A delay of 0 is enough to push this to the next event loop tick.
      setTimeout(() => {
        const element = document.getElementById(`message-${messageIdToJumpTo}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })

          element.classList.add("highlight-message")
          setTimeout(() => element.classList.remove("highlight-message"), 2500)
        }
      }, 0)

      clearJumpRequest()
    } else if (hasNextPage) {
      fetchNextPage()
    } else {
      // Only show the toast if the message is not found after checking all pages.
      if (!messageIsLoaded) {
        showAppToast("Could not find the message. It may have been deleted.", "error")
      }
      clearJumpRequest()
    }
  }, [
    messageIdToJumpTo,
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    clearJumpRequest,
  ])

  const isChatEmpty = !messages?.length
  const isGroup = selectedConversation.isGroup

  return (
    <div className="relative flex h-full flex-col border-accent md:border-r">
      <PrivateChatHeader
        selectedConversation={selectedConversation}
        otherUser={otherUser}
        onOpenPinnedModal={handleOpenPinnedModal}
      />
      {isChatEmpty && !isLoadingMessages && (
        <div className="flex h-[60%] flex-col items-center justify-end p-4 text-center">
          <IoChatbubblesOutline className="mb-4 text-6xl text-gray-300" />
          {isGroup ? (
            <p className="mb-2 text-xl font-semibold">
              You're starting a new chat on {selectedConversation.name}!
            </p>
          ) : (
            <p className="mb-2 text-xl font-semibold">
              You're starting a new chat with @{otherUser?.username}!
            </p>
          )}
          <p className="max-w-sm text-base italic text-gray-500">
            Say hello and send your first message to begin your conversation.
          </p>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden ">
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
            pinnedMessagesInfo={pinnedMessages || []}
            privateChatInputRef={privateChatInputRef}
            isLoadingInitialMessages={isLoadingMessages && !isFetchingNextPage}
            isFetchingOlderMessages={isFetchingNextPage}
            hasNextPage={hasNextPage}
            handleLoadImage={handleLoadImage}
            onReactionAdded={handleReactionAdded}
            messageListRef={messageListRef}
            onOpenPinnedModal={handleOpenPinnedModal}
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
          isTypingOtherUser={isTypingOtherUser}
        />
      </div>
      <PinnedMessagesModal isOpen={isPinnedModalOpen} onClose={handleClosePinnedModal} />
    </div>
  )
}

export default PrivateChatWindow
