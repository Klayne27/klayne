import React, { forwardRef } from "react"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import PrivateChatMessageItem from "./PrivateChatMessageItem"
import { useProcessedMessage } from "../../../hooks/customHooks/useProcessedMessages"
import { formatDate, formatTime } from "../../../utils/date"
import { RiPushpinFill } from "react-icons/ri"
import { useState } from "react"
import ProfileInfoModal from "../../../components/common/ProfileInfoModal"
import { useGetUserProfile } from "../../users/usersHooks/useGetUserProfile" // Keep the import
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { useChatViewStore } from "../../../store/useChatViewStore"

const PriveChatMessageList = forwardRef(function PriveChatMessageList(
  {
    isNewChat,
    messagesToRender,
    privateChatInputRef,
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
  const { setMessageIdToJumpTo } = useChatViewStore()

  const [modalState, setModalState] = useState({
    isOpen: false,
    username: null,
    position: { top: 0, left: 0 },
  })

  // Remove the call to useGetUserProfile here

  const handleJumpToOriginalMessage = (messageId) => {
    setMessageIdToJumpTo(messageId)
  }

  const handleUsernameClick = (user, event) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    const modalHeight = 280
    const spaceBelow = window.innerHeight - rect.bottom
    let newTop

    if (spaceBelow > modalHeight) {
      newTop = rect.bottom + window.scrollY + 5
    } else {
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

  return (
    <div ref={ref} className="relative flex flex-1 flex-col overflow-y-auto p-4 pt-20">
      {!isNewChat &&
        processedMessages.length > 0 &&
        processedMessages.map((message) => {
          if (message.isSystemMessage) {
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
                      {message.sender.username}
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

      {modalState.isOpen && (
        <ProfileModalContainer modalState={modalState} handleCloseModal={handleCloseModal} />
      )}
    </div>
  )
})

export default React.memo(PriveChatMessageList)

// Create a new component for the modal to encapsulate the logic
const ProfileModalContainer = ({ modalState, handleCloseModal }) => {
  const { userProfile, isLoading } = useGetUserProfile(modalState.username)

  if (!modalState.isOpen) return null

  return (
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
            user={userProfile}
            onClose={handleCloseModal}
            position={modalState.position}
          />
        </div>
      )}
    </>
  )
}
