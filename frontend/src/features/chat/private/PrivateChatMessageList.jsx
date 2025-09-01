import React, { forwardRef } from "react"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import LoadingSpinner from "../../../components/common/LoadingSpinner"

import PrivateChatMessageItem from "./PrivateChatMessageItem"
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages"
import { formatDate, formatTime } from "../../../utils/date"
import { RiPushpinFill } from "react-icons/ri"
import { useState } from "react"
import ProfileInfoModal from "../../../components/common/ProfileInfoModal"
import { useGetUserProfile } from "../../users/usersHooks/useGetUserProfile"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"

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
    onOpenPinnedModal,
    pinnedMessagesInfo,
  },
  ref,
) {
  const { authUser: currentUser } = useAuthUser()
  const processedMessages = useProcessedMessage(messagesToRender, pinnedMessagesInfo)
  const { selectedConversation } = usePrivateChatStore()

  const otherParticipant = selectedConversation.participants.find(
    (participant) => participant._id !== currentUser._id,
  )

  // Get the username from the found object
  const otherUsername = otherParticipant ? otherParticipant.username : null

  const [modalState, setModalState] = useState({
    isOpen: false,
    username: null,
    position: { top: 0, left: 0 },
  })

  const { userProfile, isLoading } = useGetUserProfile(otherUsername)

  const handleUsernameClick = (user, event) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    const modalHeight = 280 // Approximate modal height in pixels
    const spaceBelow = window.innerHeight - rect.bottom

    let newTop

    if (spaceBelow > modalHeight) {
      // If there is, open the modal at the bottom
      newTop = rect.bottom + window.scrollY + 5
    } else {
      // If not, open the modal on top
      newTop = rect.top + window.scrollY - modalHeight - 5
    }

    setModalState({
      isOpen: true,
      username: user.username,
      position: { top: newTop, left: rect.left + window.scrollX },
    })
  }

  const handleCloseModal = () => {
    setModalState({ isOpen: false, username: null, position: { top: 0, left: 0 } })
  }

  const handleJumpToOriginalMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })

      messageElement.classList.add("highlight-message")

      setTimeout(() => {
        messageElement.classList.remove("highlight-message")
      }, 1500)
    }
  }

  return (
    <div ref={ref} className="relative flex flex-1 flex-col overflow-y-auto p-4 pt-20">
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
          if (message.isSystemMessage) {
            const userName = message.text.split(" pinned a message")[0]
            console.log("message", message)
            return (
              <div key={message._id} className="flex items-center gap-2">
                <div className="ml-2">
                  <RiPushpinFill size={20} />
                </div>
                <div className="my-2 text-center text-sm text-slate-500">
                  <span className="break-words">
                    <button
                      className="font-semibold text-base-content hover:underline"
                      onClick={(e) => handleUsernameClick(message.sender, e)}
                    >
                      {userName}
                    </button>
                    <span> pinned a </span>
                  </span>
                  <button
                    className="font-semibold text-base-content hover:underline"
                    onClick={() => handleJumpToOriginalMessage(message.pinnedMessageId._id)}
                  >
                    message
                  </button>
                  <span className="ml-1 break-words"> to this conversation.</span>
                  <span className="ml-1">
                    {formatDate(message.pinnedAt)} at {formatTime(message.pinnedAt)}
                  </span>
                  <button
                    className="ml-1 font-semibold text-base-content hover:underline"
                    onClick={onOpenPinnedModal}
                  >
                    See all pinned messages
                  </button>
                </div>
              </div>
            )
          }

          return (
            <PrivateChatMessageItem
              key={message._id}
              message={message}
              currentUser={currentUser}
              privateChatInputRef={privateChatInputRef}
              handleLoadImage={handleLoadImage}
              onReactionAdded={onReactionAdded}
              messageListRef={messageListRef}
              onUsernameClick={handleUsernameClick}
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
      {modalState.isOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-transparent" onClick={handleCloseModal}></div>
          {isLoading ? (
            <div
              className="absolute z-50 flex h-48 w-72 items-center justify-center rounded-xl border border-accent bg-base-200 shadow-lg"
              style={{
                top: modalState.position.top,
                left: modalState.position.left,
              }}
            >
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="fixed inset-0 z-50 bg-transparent" onClick={handleCloseModal}>
              <ProfileInfoModal
                user={userProfile} // Pass the userProfile from the hook
                onClose={handleCloseModal}
                position={modalState.position}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default React.memo(PriveChatMessageList)
