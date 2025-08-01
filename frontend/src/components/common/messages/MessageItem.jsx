import React, { useState, useRef, useCallback, useEffect } from "react"
import { FaCircle } from "react-icons/fa"
import { BsCheck2, BsCheck2All } from "react-icons/bs"
import { Link } from "react-router-dom"

import EmojiPickerPopover from "../EmojiPickerPopover"
import { useDeleteMessage } from "../../../hooks/messagesHooks/useDeleteMessage"
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { useAppStore } from "../../../store/appStore"
import { formatTime } from "../../../utils/date"
import { useEmojiPickerPopover } from "../../../hooks/useEmojiPickerPopover"
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

// const lastMessageDateRef = useRef(null);
// const MOUSE_LEAVE_DELAY = 100;

const MessageItem = ({
  message,
  privateChatInputRef,
  currentUser,
  isTypingOtherUser,
  onReactionAdded,
  handleLoadImage,
}) => {
  const openImageModal = useAppStore((state) => state.openImageModal)

  const mouseLeaveTimeoutRef = useRef(null)

  const {
    selectedConversation,
    setReplyingToMessage,
    setEditingMessage,
    setActiveMessageModalId,
    activeMessageModalId,
  } = usePrivateChatStore()

  const [isHovered, setIsHovered] = useState(false)

  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const { deleteMessage } = useDeleteMessage()
  const { reactToMessage } = useReactToMessage(selectedConversation._id)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const isMobile = useIsMobile()

  const isSentByCurrentUser = message?.sender._id === currentUser._id
  const isEditable = isSentByCurrentUser

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

  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,
    )
  }, [])

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

  const showModal = activeMessageModalId === message._id

  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    acc[reaction.emoji] = acc[reaction.emoji] || {
      count: 0,
      users: [],
      userIds: [],
    }
    acc[reaction.emoji].count++

    const reactorId = reaction.user?._id?.toString() || reaction.user?.toString()
    if (reactorId) {
      acc[reaction.emoji].userIds.push(reactorId)
    }
    return acc
  }, {})

  const hasAnyReactions = Object.keys(groupedReactions || {}).length > 0

  const bubbleClasses = getMessageBubbleClasses(message, isSentByCurrentUser)

  const handleMouseEnter = (messageId) => {
    if (!isTouchDevice) {
      //   if (mouseLeaveTimeoutRef.current) {
      //     clearTimeout(mouseLeaveTimeoutRef.current);
      //     mouseLeaveTimeoutRef.current = null;
      //   }
      setActiveMessageModalId(messageId)
    }
  }

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      //   mouseLeaveTimeoutRef.current = setTimeout(() => {
      setActiveMessageModalId(null)
    }
  }

  const handleMessageTap = (messageId) => {
    if (isTouchDevice) {
      setActiveMessageModalId((prevId) => (prevId === messageId ? null : messageId))
    }
  }

  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e, setShowMoreActionsModal)
  }

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false)
  }, [setShowMoreActionsModal])

  const handleImageClick = (imageUrl) => {
    openImageModal(imageUrl)
  }

  const handleClickOutsideMessage = useCallback(
    (e) => {
      if (activeMessageModalId) {
        const messageItemContainer = document.getElementById(`message-${activeMessageModalId}`)
        const messageModalElement = document.getElementById(`message-modal-${activeMessageModalId}`)
        if (
          messageItemContainer &&
          !messageItemContainer.contains(e.target) &&
          messageModalElement &&
          !messageModalElement.contains(e.target)
        ) {
          setActiveMessageModalId(null)
        }
      }
    },
    [activeMessageModalId],
  )

  useEffect(() => {
    if (activeMessageModalId) {
      document.addEventListener("click", handleClickOutsideMessage)
    }

    return () => {
      document.removeEventListener("click", handleClickOutsideMessage)
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current)
      }
    }
  }, [activeMessageModalId, handleClickOutsideMessage])

  const isMessageHighlighted = isHovered || showModal
  const messageContentStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {}

  const handleJumpToOriginalMessage = (originalMessageId) => {
    const originalMessageElement = document.getElementById(`message-${originalMessageId}`)
    if (originalMessageElement) {
      originalMessageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      originalMessageElement.classList.add("highlight-message")
      setTimeout(() => {
        originalMessageElement.classList.remove("highlight-message")
      }, 1500)
    }
  }

  // const handleTouchStart = (e) => {
  //   e.stopPropagation()
  //   pressTimer.current = setTimeout(() => {
  //     handleMessageTap(message._id)
  //   }, LONG_PRESS_DURATION)
  // }

  // const handleTouchEnd = (e) => {
  //   e.stopPropagation()
  //   clearTimeout(pressTimer.current)
  // }

  // const handleTouchMove = (e) => {
  //   if (pressTimer.current) {
  //     clearTimeout(pressTimer.current)
  //   }
  // }

  const handleDeleteOwnMessage = () => {
    deleteMessage({
      messageId: message._id,
      conversationId: message.conversationId,
    })
  }

  const handleReactionClick = (messageId, emoji) => {
    reactToMessage({ messageId, emoji })
    setActiveMessageModalId(null)
  }

  const handleEmojiSelect = (emojiObject) => {
    handleReactionClick(message._id, emojiObject.emoji)
    handleCloseEmojiPickerPopover()
    onReactionAdded()
  }

  const handleReplyClick = () => {
    privateChatInputRef.current.focus()
    setReplyingToMessage(message)
    setShowMoreActionsModal(false)
    handleMessageTap(null)
  }

  const handleEditClick = () => {
    setEditingMessage(message)
    setShowMoreActionsModal(false)
    handleMessageTap(null)
  }

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text)
    setShowMoreActionsModal(false)
    handleMessageTap(null)
  }

  if (isTypingOtherUser) {
    return (
      <div className="message-item-container ml-10 flex justify-start rounded-lg p-1">
        <div className="flex max-w-[70%] flex-col rounded-3xl rounded-bl-[4px] bg-[#2F3336] p-3 text-white">
          <span className="flex items-center gap-0.5">
            <span className="pulsing-dot pulsing-dot-1 inline-block">
              <FaCircle size={6} />
            </span>
            <span className="pulsing-dot pulsing-dot-2 inline-block">
              <FaCircle size={6} />
            </span>
            <span className="pulsing-dot pulsing-dot-3 inline-block">
              <FaCircle size={6} />
            </span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        id={`message-${message._id}`}
        className={`relative mb-0 rounded-lg p-[1px] ${
          isMessageHighlighted ? "bg-secondary" : ""
        } ${isSentByCurrentUser ? "justify-end" : "justify-start"} ${message.isFirstInGroup ? "mt-2" : ""} `}
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchCancel={handleTouchCancel}
      >
        {/* Main Reaction Picker and Action Modal */}

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
            message={message}
            onCloseMoreActionsModal={handleCloseMoreActionsModal}
            moreActionsModalPosition={moreActionsModalPosition}
            onReplyClick={handleReplyClick}
            onEditClick={handleEditClick}
            onCopyMessage={handleCopyMessage}
            onDeleteOwnMessage={handleDeleteOwnMessage}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
          />
        )}

        <MessageContentLayout
          isSentByCurrentUser={isSentByCurrentUser}
          messageContentStyle={messageContentStyle}
          message={message}
        >
          {!isSentByCurrentUser && !message.isFirstInGroup && <div className="mr-1 h-8 w-8"></div>}

          {isMessageHighlighted && !isSentByCurrentUser && (
            <div className="absolute left-1.5 top-1/2 z-0 mr-2 -translate-y-1/2 whitespace-nowrap text-xs text-gray-400">
              {formatTime(message.createdAt)}
            </div>
          )}
          {isMessageHighlighted && isSentByCurrentUser && (
            <div className="absolute left-1.5 top-1/2 z-0 mr-2 -translate-y-1/2 whitespace-nowrap text-xs text-gray-400">
              {formatTime(message.createdAt)}
            </div>
          )}
          <div
            className={`flex flex-col ${isSentByCurrentUser ? "items-end" : "items-start"} w-fit max-w-[75%]`}
          >
            {message.isFirstInGroup && (
              <div className={`mb-0.5 flex items-center text-sm`}>
                {!isSentByCurrentUser && (
                  <Link
                    to={`/profile/${message.senderUsername}`}
                    className="mr-1 cursor-pointer font-semibold"
                  >
                    {message.senderUsername}
                  </Link>
                )}
                <span className="mr-5 text-xs text-gray-500">{formatTime(message.createdAt)}</span>
              </div>
            )}

            {/* Edited Status */}
            {message.isEdited && message.text && (
              <span
                className={`mr-5 text-xs italic text-gray-500 ${isSentByCurrentUser ? "self-end" : "self-start"}`}
              >
                (Edited)
              </span>
            )}
            <div className="flex">
              {/* Chat Bubble Container */}
              <MessageBubble
                message={message}
                messageText={message.text}
                isSentByCurrentUser={isSentByCurrentUser}
                bubbleClasses={bubbleClasses}
                onLoadImage={handleLoadImage}
                onImageClick={handleImageClick}
                messageContentStyle={messageContentStyle}
                onJumpToOriginalMessage={handleJumpToOriginalMessage}
              />
              {isSentByCurrentUser && (
                <span className="ml-1 flex-shrink-0 self-end text-sm">
                  {message?.seen ? (
                    <BsCheck2All size={16} className="text-primary" />
                  ) : (
                    <BsCheck2 size={16} className="text-gray-500" />
                  )}
                </span>
              )}
            </div>
            {/* Grouped Reactions Display */}
            {hasAnyReactions && (
              <MessageReactions
                groupedReactions={groupedReactions}
                currentUser={currentUser}
                isSentByCurrentUser={isSentByCurrentUser}
                messageContentStyle={messageContentStyle}
                addReactionButtonRef={addReactionButtonRef}
                openEmojiPickerWithModalClose={openEmojiPickerWithModalClose}
                message={message}
                onReactionClick={handleReactionClick}
              />
            )}
          </div>
        </MessageContentLayout>

        {/* Emoji Picker Popover */}
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
    </>
  )
}

export default React.memo(MessageItem)
