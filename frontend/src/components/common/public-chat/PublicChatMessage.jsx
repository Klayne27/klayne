import React, { useState, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { MdAdminPanelSettings } from "react-icons/md"
import { FaBan } from "react-icons/fa"

import EmojiPickerPopover from "../EmojiPickerPopover"
import { useDeleteOwnPublicMessage } from "../../../hooks/publicChatHooks/useDeleteOwnPublicMessage"
import { useDeletePublicMessage } from "../../../hooks/publicChatHooks/useDeletePublicMessage"
import { useAppStore } from "../../../store/appStore"
import { formatTime } from "../../../utils/date"
import { useEmojiPickerPopover } from "../../../hooks/useEmojiPickerPopover"
import { useBanUserFromPublicChat } from "../../../hooks/publicChatHooks/useBanUserFromPublicChat"
import { useUnbanUserFromPublicChat } from "../../../hooks/publicChatHooks/useUnbanUserFromPublicChat"
import { usePublicChatStore } from "../../../store/usePublicChatStore"
import { useAddPublicMessageReaction } from "../../../hooks/publicChatHooks/useAddPublicMessageReaction"
import { getMessageBubbleClasses } from "../../../utils/getMessageBubbleClasses"
import { useIsMobile } from "../../../hooks/useIsMobile"
import DateSeparator from "../../ui/DateSeperator"
import MessageReactions from "../../ui/MessageReactions"
import MessageBubble from "../../ui/MessageBubble"
import MessageContentLayout from "../../ui/MessageContentLayout"
import { useOpenMoreActionsModal } from "../../../hooks/useOpenMoreActionsModal"
import MoreMessageActionsModal from "../../ui/MoreMessageActionsModal"
import MessageActionsModal from "../../ui/MessageActionsModal"
import { useLongPress } from "../../../hooks/useLongPress"

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
  const { deleteOwnMessage, isDeletingOwnMessage } = useDeleteOwnPublicMessage()
  const { adminDeletePublicMessage, isPending: isAdminDeleting } = useDeletePublicMessage()
  const [isHovered, setIsHovered] = useState(false)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)
  const moreActionsButtonRef = useRef(null) // Ref for the new More Actions button

  const pressTimer = useRef(null)
  const LONG_PRESS_DURATION = 500 // milliseconds

  const { banUser } = useBanUserFromPublicChat()
  const { unbanUser } = useUnbanUserFromPublicChat()
  const { addReaction } = useAddPublicMessageReaction()

  const isMobile = useIsMobile()

  const isSentByCurrentUser = message.sender?._id === currentUser?._id

  const isEditable = isSentByCurrentUser && !message.isDeletedByAdmin && !message.isDeletedByUser

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

  const handleLongPress = useCallback(() => {
    if (isMobile) {
      setActiveMessageModalId((prevId) => (prevId === message._id ? null : message._id))
    }
  }, [isMobile, message._id, setActiveMessageModalId])

  const { handleTouchCancel, handleTouchEnd, handleTouchMove, handleTouchStart } = useLongPress(
    handleLongPress,
    500,
    isMobile,
  )

  const isSenderAdmin = message.sender.isAdmin
  const isAuthUserAdmin = currentUser.isAdmin
  const isSenderBanned = message.sender.isBannedInPublicChat
  const isMessageDeleted = message.isDeletedByAdmin || message.isDeletedByUser
  const isReplyToMessageDeleted =
    message.repliedTo?.isDeletedByAdmin || message.repliedTo?.isDeletedByUser
  const isSenderVerified = message.sender.isVerified
  const isSenderGoldVerified = message.sender.isGoldVerified
  const isMessageEdited = message.isEdited

  const showModal = activeMessageModalId === message._id

  const shouldShowTimeOnHover = isHovered || showModal
  const isMessageHighlighted = isHovered || showModal

  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    const reactorId = reaction.userId?._id?.toString() || reaction.userId?.toString()
    const reactorUsername = reaction?.userId?.username || "Unknown"
    const reactorProfileImg = reaction.userId?.profileImg || "/avatar-placeholder.png"

    if (!reactorId) return acc

    acc[reaction.emoji] = acc[reaction.emoji] || {
      count: 0,
      users: [],
      userIds: [],
    }

    acc[reaction.emoji].count++

    if (!acc[reaction.emoji].userIds.includes(reactorId)) {
      acc[reaction.emoji].users.push({
        _id: reactorId,
        username: reactorUsername,
        profileImg: reactorProfileImg,
        fullName: reaction?.userId?.fullName,
      })
      acc[reaction.emoji].userIds.push(reactorId)
    }

    return acc
  }, {})

  const hasAnyReactions = Object.keys(groupedReactions || {}).length > 0
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
    addReaction({ messageId, emoji }) // `addReaction` should be memoized or from a stable hook
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
    handleMessageTap(null) // Close main reaction modal
    setShowMoreActionsModal(false) // Close this modal
  }

  // --- Message hover/tap handlers (now update Zustand state) ---
  const handleMouseEnter = (messageId) => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(messageId)
    }
  }

  const handleMouseLeave = () => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(null)
    }
  }

  const handleMessageTap = (messageId) => {
    if (isCurrentlyTouchDevice) {
      setActiveMessageModalId(activeMessageModalId === messageId ? null : messageId)
    }
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

  // NEW: Mobile Touch Handlers
  // const handleTouchStart = (e) => {
  //   e.stopPropagation()
  //   pressTimer.current = setTimeout(() => {
  //     handleMessageTap(message._id) // Show modal after long press
  //   }, LONG_PRESS_DURATION)
  // }

  // const handleTouchEnd = (e) => {
  //   e.stopPropagation()
  //   clearTimeout(pressTimer.current) // Clear timer if finger lifted before long press
  // }

  // const handleTouchMove = (e) => {
  //   if (pressTimer.current) {
  //     clearTimeout(pressTimer.current)
  //   }
  // }

  const handleEditClick = () => {
    publicChatInputRef.current.focus()
    setEditingMessage(message)
    handleMessageTap(null) // Close main reaction modal
    setShowMoreActionsModal(false)
  }

  const handleReplyClick = () => {
    publicChatInputRef.current.focus()
    setReplyingToMessage(message)
    handleMessageTap(null) // Close main reaction modal
    setShowMoreActionsModal(false)
  }

  const handleImageClick = (imageUrl) => {
    openImageModal(imageUrl)
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
  }

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false)
  }, [setShowMoreActionsModal])

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
        onMouseEnter={() => {
          if (!isMobile) {
            handleMouseEnter(message._id)
            setIsHovered(true)
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            handleMouseLeave()
            setIsHovered(false)
          }
        }}
        onClick={(e) => {
          if (isMobile) {
            if (showModal) {
              handleMessageTap(null)
            }
            e.stopPropagation()
          } else {
            const modalElement = document.getElementById(`message-modal-${message._id}`)
            if (modalElement && modalElement.contains(e.target)) {
              return
            }
            handleMessageTap(message._id)
          }
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
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
          {!isSentByCurrentUser && !message.isFirstInGroup && <div className="w-9 flex-shrink-0" />}

          {shouldShowTimeOnHover && !isSentByCurrentUser && !message.isFirstInGroup && (
            <div className="absolute left-1.5 top-1/2 z-0 mr-2 -translate-y-1/2 whitespace-nowrap text-xs text-gray-400">
              {formatTime(message.createdAt)}
            </div>
          )}
          {shouldShowTimeOnHover && isSentByCurrentUser && !message.isFirstInGroup && (
            <div className="absolute -left-[58px] top-1/2 z-0 mr-2 -translate-y-1/2 whitespace-nowrap text-xs text-gray-400">
              {formatTime(message.createdAt)}
            </div>
          )}
          <div
            className={`flex flex-col ${
              isSentByCurrentUser ? "items-end" : "items-start"
            } w-fit max-w-[75%]`}
          >
            {message.isFirstInGroup && (
              <div className={`mb-0.5 flex items-center text-sm`}>
                {!isSentByCurrentUser && (
                  <Link
                    to={`/profile/${message.sender.username}`}
                    className={`mr-1 font-semibold ${
                      isSenderVerified
                        ? "text-[#1D9BF0]"
                        : isSenderGoldVerified
                          ? "text-[#E3B812]"
                          : "text-white"
                    }`}
                  >
                    {message.sender.username}
                  </Link>
                )}
                {isSenderVerified && !isSentByCurrentUser && (
                  <img src="/verified.png" className="mr-1 size-[17px]" />
                )}
                {isSenderGoldVerified && !isSentByCurrentUser && (
                  <img src="/gold-verified.png" className="mr-1 size-[17px]" />
                )}

                {isSenderAdmin && !isSentByCurrentUser && (
                  <span>
                    <MdAdminPanelSettings size={20} className="mb-[1px] fill-green-500" />
                  </span>
                )}
                {isSenderBanned && !isSentByCurrentUser && (
                  <span>
                    <FaBan size={15} className="mr-1 fill-red-500" />
                  </span>
                )}

                <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
              </div>
            )}

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

            {/* Grouped Reactions Display */}
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
            )}
          </div>
        </MessageContentLayout>
      </div>
    </>
  )
})

export default PublicChatMessage
