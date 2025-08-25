import { useRef, useEffect, useCallback } from "react"
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser"
import { useSocket } from "../../../context/SocketContext"
import PublicChatHeader from "./PublicChatHeader"
import LoadingSpinner from "../../ui/LoadingSpinner"
import PublicChatMessageList from "./PublicChatMessageList"
import PublicChatMessageInput from "./PublicChatMessageInput"

import { FaCaretDown } from "react-icons/fa"
import { usePublicMessages } from "../../../hooks/publicChatHooks/usePublicMessages"
import { usePublicChatStore } from "../../../store/usePublicChatStore"
import { usePublicChatSocketEvents } from "../../../hooks/socketEventHooks/usePublicChatSocketEvents"
import { useMessageScroll } from "../../../hooks/customHooks/useMessageScroll"
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages"
import { useQueryClient } from "@tanstack/react-query"
import { messageKeys } from "../../../hooks/messagesHooks/messageKeys"

const PublicChatWindow = () => {
  const { authUser: currentUser } = useAuthUser()
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  const { setIsCurrentlyTouchDevice, showNewMessageButton, setShowNewMessageButton } =
    usePublicChatStore()

  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingMessages,
    isMessagesError,
    messagesError,
  } = usePublicMessages()

  const {
    handleLoadImage,
    handleNewMessageButtonClick,
    messageListRef,
    triggerScrollOnSenderMessage,
    isInitialLoadComplete,
    handleReactionAdded,
  } = useMessageScroll({
    setShowNewMessageButton,
    messages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoadingMessages,
  })

  const { typingUsers } = usePublicChatSocketEvents()
  const publicChatInputRef = useRef(null)
  const isCurrentUserBanned = currentUser?.isBannedInPublicChat

  const handleSenderMessageSent = useCallback(() => {
    if (triggerScrollOnSenderMessage) {
      triggerScrollOnSenderMessage()
    }
  }, [triggerScrollOnSenderMessage])

  useEffect(() => {
    const checkTouch = () =>
      setIsCurrentlyTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0)
    checkTouch()
    window.addEventListener("resize", checkTouch)
    return () => window.removeEventListener("resize", checkTouch)
  }, [setIsCurrentlyTouchDevice])

  useEffect(() => {
    if (socket) {
      socket.on("bannedFromPublicChat", ({ isBanned }) => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] })
        if (isBanned) {
          queryClient.setQueryData(messageKeys.publicMessages(), (oldData) => ({
            pages: [[]],
            pageParams: [undefined],
          }))
        } else {
          queryClient.invalidateQueries({ queryKey: messageKeys.publicMessages() })
        }
      })

      return () => {
        socket.off("bannedFromPublicChat")
      }
    }
  }, [socket, queryClient])


  const processedMessages = useProcessedMessage(messages)

  if (isLoadingMessages && !isInitialLoadComplete) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isMessagesError && processedMessages.length === 0 && !isLoadingMessages) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <p>Error loading messages: {messagesError?.message || "Unknown error"}</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col border-accent md:border-r">
      <PublicChatHeader />
      {isCurrentUserBanned ? (
        <div className="flex flex-grow items-center justify-center">
          <div className="animate-fade-in mx-auto my-5 max-w-sm rounded-2xl border-accent bg-base-100 p-6 text-center shadow-lg">
            <p className="mb-3 text-lg font-bold">You are currently banned from the public chat.</p>
            <p className="text-base">You cannot view messages or send new ones.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-grow overflow-y-auto p-4 pb-7" ref={messageListRef}>
            {isFetchingNextPage && (
              <div className="absolute left-1/2 top-24 -translate-x-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
            <div className="mx-auto mt-16 w-full max-w-3xl md:max-w-[968px]">
              {!hasNextPage &&
                !isLoadingMessages && // Use isLoadingMessages instead of isLoadingInitialMessages
                !isFetchingNextPage &&
                processedMessages.length > 0 && ( // Use processedMessages for length check
                  <div className="my-2 flex justify-center text-sm text-gray-500">
                    <p>This is the start of your conversation</p>
                  </div>
                )}

              {processedMessages.map((message) => (
                <PublicChatMessageList
                  key={message._id}
                  message={message} // Pass the fully processed message object
                  currentUser={currentUser}
                  onLoadImage={handleLoadImage} // Renamed to `onLoadImage` for consistency
                  publicChatInputRef={publicChatInputRef}
                  onReactionAdded={handleReactionAdded}
                  messageListRef={messageListRef}
                />
              ))}
            </div>

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
          </div>

          <PublicChatMessageInput
            publicChatInputRef={publicChatInputRef}
            socket={socket}
            typingUsers={typingUsers}
            onSenderMessageSent={handleSenderMessageSent}
          />
        </>
      )}
    </div>
  )
}

export default PublicChatWindow
