import React, { useState, useCallback, useRef, useEffect } from "react"

import EmojiPickerPopover from "../EmojiPickerPopover"
import { useDeleteOwnPublicMessage } from "../../../hooks/publicChatHooks/useDeleteOwnPublicMessage"
import { useDeletePublicMessage } from "../../../hooks/publicChatHooks/useDeletePublicMessage"
import { useAppStore } from "../../../store/useAppStore"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { useBanUserFromPublicChat } from "../../../hooks/publicChatHooks/useBanUserFromPublicChat"
import { useUnbanUserFromPublicChat } from "../../../hooks/publicChatHooks/useUnbanUserFromPublicChat"
import { usePublicChatStore } from "../../../store/usePublicChatStore"
import { useAddPublicMessageReaction } from "../../../hooks/publicChatHooks/useAddPublicMessageReaction"
import { getMessageBubbleClasses } from "../../../utils/getMessageBubbleClasses"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import DateSeparator from "../../ui/DateSeperator"
import MessageReactions from "../../ui/MessageReactions"
import MessageBubble from "../../ui/MessageBubble"
import MessageContentLayout from "../../ui/MessageContentLayout"
import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
import MoreMessageActionsModal from "../../ui/MoreMessageActionsModal"
import MessageActionsModal from "../../ui/MessageActionsModal"
import { useLongPress } from "../../../hooks/customHooks/useLongPress"
import PublicChatFirstMessageInGroup from "../PublicChatFirstMessageInGroup"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import ShowMessageTimeOnHover from "../../ui/ShowMessageTimeOnHover"

const PublicChatMessage = React.memo(function PublicChatMessage({
  message,
  currentUser,
  publicChatInputRef,
  handleLoadImage,
  onReactionAdded,
}) {
  const {
    setReplyingToMessage,
    setEditingMessage,
    activeMessageModalId,
    setActiveMessageModalId,
    isCurrentlyTouchDevice,
  } = usePublicChatStore()

  const openImageModal = useAppStore((state) => state.openImageModal)
  const { deleteOwnMessage } = useDeleteOwnPublicMessage()
  const { adminDeletePublicMessage, isPending: isAdminDeleting } = useDeletePublicMessage()
  // const [isHovered, setIsHovered] = useState(false)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const { banUser } = useBanUserFromPublicChat()
  const { unbanUser } = useUnbanUserFromPublicChat()
  const { addReaction } = useAddPublicMessageReaction()

  const isMobile = useIsMobile()

  const {
    isSenderBanned,
    isSentByCurrentUser,
    isEditable,
    isAuthUserAdmin,
    isMessageDeleted,
    isReplyToMessageDeleted,
    isMessageEdited,
    groupedReactions,
    hasAnyReactions,
  } = useMessagingMetaData(message, currentUser)

  // 3. Modal Interactions
  const {
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel,
    showModal,
    isMessageHighlighted,
  } = useMessageModalInteractions(message._id, setActiveMessageModalId, activeMessageModalId)

  const {
    showEmojiPickerPopover,
    setShowEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable })

  const messageContentStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {}

  const bubbleClasses = getMessageBubbleClasses(message, isSentByCurrentUser)

  const handleReactionClick = (messageId, emoji) => {
    addReaction({ messageId, emoji })
    setActiveMessageModalId(null)
  }

  const handleEmojiSelect = (emojiObject) => {
    handleReactionClick(message._id, emojiObject.emoji)
    handleCloseEmojiPickerPopover()
    onReactionAdded()
  }

  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e, setShowMoreActionsModal)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text)
    setShowMoreActionsModal(false)
  }

  const handleJumpToMessage = (messageId) => {
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

  const handleEditClick = () => {
    publicChatInputRef.current.focus()
    setEditingMessage(message)
    setShowMoreActionsModal(false)
  }

  const handleReplyClick = () => {
    publicChatInputRef.current.focus()
    setReplyingToMessage(message)
    setShowMoreActionsModal(false)
  }

  const handleImageClick = (imageUrl) => {
    openImageModal(message.img)
  }

  const handleAdminDeleteMessage = () => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      adminDeletePublicMessage(message._id)
    }
  }

  const handleBanUser = () => {
    if (window.confirm(`Are you sure you want to ban this user from public chat?`)) {
      banUser(message.sender._id)
    }
  }

  const handleUnbanUser = () => {
    if (window.confirm(`Are you sure you want to unban this user from public chat?`)) {
      unbanUser(message.sender._id)
    }
  }

  const handleDeleteOwnMessage = () => {
    deleteOwnMessage(message._id)
    setShowMoreActionsModal(false)
  }

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false)
  }, [setShowMoreActionsModal])

  // Close actions modal on outside click for mobile
  useEffect(() => {
    const handleClickOutsideMessage = (e) => {
      if (activeMessageModalId && isMobile) {
        const messageModalElement = document.getElementById(`message-reaction-modal-${message._id}`)
        if (messageModalElement && !messageModalElement.contains(e.target)) {
          setActiveMessageModalId(null)
        }
      }
    }

    if (activeMessageModalId) {
      document.addEventListener("click", handleClickOutsideMessage)
    }

    return () => {
      document.removeEventListener("click", handleClickOutsideMessage)
    }
  }, [activeMessageModalId, isMobile, setActiveMessageModalId, message._id])

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        key={message._id}
        id={`message-${message._id}`}
        className={`relative mb-0 rounded-lg p-[1px] ${
          isMessageHighlighted ? "bg-secondary" : ""
        } ${isSentByCurrentUser ? "justify-end" : "justify-start"} ${
          message.isFirstInGroup ? "mt-4" : ""
        }`}
        style={messageContentStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchCancel}
      >
        <MessageActionsModal
          message={message}
          isSentByCurrentUser={isSentByCurrentUser}
          showModal={showModal}
          messageContentStyle={messageContentStyle}
          onReactionClick={handleReactionClick}
          onReactionAdded={onReactionAdded}
          moreEmojisButtonRef={moreEmojisButtonRef}
          openEmojiPickerWithModalClose={openEmojiPickerWithModalClose}
          onReplyClick={handleReplyClick}
          onOpenMoreActionsModal={handleOpenMoreActionsModal}
        />

        {showMoreActionsModal && (
          <MoreMessageActionsModal
            onCloseMoreActionsModal={handleCloseMoreActionsModal}
            moreActionsModalPosition={moreActionsModalPosition}
            onReplyClick={handleReplyClick}
            onEditClick={handleEditClick}
            onCopyMessage={handleCopyMessage}
            onDeleteOwnMessage={handleDeleteOwnMessage}
            onAdminDeleteMessage={handleAdminDeleteMessage}
            onBanUser={handleBanUser}
            onUnbanUser={handleUnbanUser}
            message={message}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
            isAuthUserAdmin={isAuthUserAdmin}
            isMessageDeleted={isMessageDeleted}
            isSenderBanned={isSenderBanned}
            isAdminDeleting={isAdminDeleting}
          />
        )}

        <MessageContentLayout isSentByCurrentUser={isSentByCurrentUser} message={message}>
          {/* Indent messages not first in group */}
          {!isSentByCurrentUser && !message.isFirstInGroup && <div className="w-9 flex-shrink-0" />}

          <ShowMessageTimeOnHover
            message={message}
            isSentByCurrentUser={isSentByCurrentUser}
            isMessageHighlighted={isMessageHighlighted}
          />

          <div
            className={`flex flex-col ${
              isSentByCurrentUser ? "items-end" : "items-start"
            } w-fit max-w-[75%]`}
          >
            <PublicChatFirstMessageInGroup
              message={message}
              isSentByCurrentUser={isSentByCurrentUser}
              isSenderBanned={isSenderBanned}
            />

            {/* Edited message indicator */}
            {isMessageEdited && message.text && (
              <span
                className={`ml-1 text-xs italic text-gray-500 ${
                  isSentByCurrentUser ? "mr-1 self-end" : "self-start"
                }`}
              >
                (Edited)
              </span>
            )}
            <MessageBubble
              message={message}
              isSentByCurrentUser={isSentByCurrentUser}
              bubbleClasses={bubbleClasses}
              onLoadImage={handleLoadImage}
              onImageClick={handleImageClick}
              messageContentStyle={messageContentStyle}
              isReplyToMessageDeleted={isReplyToMessageDeleted}
              onJumpToOriginalMessage={handleJumpToMessage}
              isMessageDeleted={isMessageDeleted}
              isSenderBanned={isSenderBanned}
            />

            {/* Grouped reactions display */}
            {hasAnyReactions && (
              <MessageReactions
                groupedReactions={groupedReactions}
                currentUser={currentUser}
                isSentByCurrentUser={isSentByCurrentUser}
                messageContentStyle={messageContentStyle}
                message={message}
                addReactionButtonRef={addReactionButtonRef}
                openEmojiPickerWithModalClose={openEmojiPickerWithModalClose}
                onReactionClick={handleReactionClick}
              />
            )}
            {showEmojiPickerPopover && (
              <>
                <div
                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                  onClick={handleCloseEmojiPickerPopover}
                ></div>
                <EmojiPickerPopover
                  position={popoverPosition}
                  onClose={handleCloseEmojiPickerPopover}
                  onEmojiClick={handleEmojiSelect}
                  triggerRef={
                    addReactionButtonRef.current && showEmojiPickerPopover
                      ? addReactionButtonRef
                      : moreEmojisButtonRef
                  }
                />
              </>
            )}
          </div>
        </MessageContentLayout>
      </div>
    </>
  )
})

export default PublicChatMessage
