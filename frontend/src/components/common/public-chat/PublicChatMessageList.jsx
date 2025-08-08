import React, { useRef, useState } from "react"

import EmojiPickerPopover from "../EmojiPickerPopover"
import { useDeleteOwnPublicMessage } from "../../../hooks/publicChatHooks/useDeleteOwnPublicMessage"
import { useDeletePublicMessage } from "../../../hooks/publicChatHooks/useDeletePublicMessage"
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
import PublicChatFirstMessageInGroup from "../PublicChatFirstMessageInGroup"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import ShowMessageTimeOnHover from "../../ui/ShowMessageTimeOnHover"
import { useChatHandlers } from "../../../hooks/customHooks/useChatHandlers"
import { usePublicChatAdminHandlers } from "../../../hooks/customHooks/usePublicChatAdminHandlers"
import ConfirmationModal from "../../ui/ConfirmationModal"
import { PUBLIC_CHAT_MODAL_CONFIGS } from "../../../constants/publicChatModalConfigs"

const PublicChatMessageList = React.memo(function PublicChatMessageList({
  message,
  currentUser,
  publicChatInputRef,
  handleLoadImage,
  messageListRef,
  onReactionAdded,
}) {
  const { activeMessageModalId, setActiveMessageModalId } = usePublicChatStore()

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const { banUser } = useBanUserFromPublicChat()
  const { unbanUser } = useUnbanUserFromPublicChat()
  const { adminDeletePublicMessage } = useDeletePublicMessage()
  const { deleteOwnMessage } = useDeleteOwnPublicMessage()
  const { addReaction } = useAddPublicMessageReaction({ onReactionAdded })

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

  const {
    handleJumpToOriginalMessage,
    handleReactionClick,
    handleEditClick,
    handleEmojiSelect,
    handleCopyMessage,
    handleReplyClick,
    handleImageClick,
    handleCloseMoreActionsModal,
  } = useChatHandlers({
    message,
    setShowMoreActionsModal,
    isMobile,
    handleCloseEmojiPickerPopover,
    addReaction,
    chatStore: usePublicChatStore,
    chatInputRef: publicChatInputRef,
    messageListRef,
  })

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

  const [modalConfig, setModalConfig] = useState(null)

  // Use the refactored, simplified admin actions hook
  const { handleAdminDeleteMessage, handleBanUser, handleUnbanUser } = usePublicChatAdminHandlers({
    message,
    banUser,
    unbanUser,
    adminDeletePublicMessage,
  })

  const openConfirmationModal = (modalType) => {
    setShowMoreActionsModal(false)

    const config = PUBLIC_CHAT_MODAL_CONFIGS(message, {
      handleAdminDeleteMessage,
      handleBanUser,
      handleUnbanUser,
    })[modalType]

    if (config) {
      setModalConfig({
        ...config,
        onConfirm: () => {
          config.onConfirm()
          setModalConfig(null)
        },
      })
    }
  }

  const handleDeleteOwnMessage = () => {
    deleteOwnMessage(message._id)
    setShowMoreActionsModal(false)
  }

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
          moreEmojisButtonRef={moreEmojisButtonRef}
          handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
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
            onOpenConfirmationModal={openConfirmationModal}
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
              onJumpToOriginalMessage={handleJumpToOriginalMessage}
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
                handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
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

        {modalConfig && (
          <ConfirmationModal
            isOpen={true}
            message={modalConfig.message}
            onConfirm={modalConfig.onConfirm}
            modalTitle={modalConfig.modalTitle}
            confirmButtonText={modalConfig.confirmButtonText}
            onClose={() => setModalConfig(null)}
            danger={!isSenderBanned} // Or other logic
          />
        )}
      </div>
    </>
  )
})

export default PublicChatMessageList
