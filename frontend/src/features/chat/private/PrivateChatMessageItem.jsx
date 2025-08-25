import React, { useRef, useState } from "react"
import { FaCircle } from "react-icons/fa"
import { BsCheck2, BsCheck2All } from "react-icons/bs"
import { usePrivateChatStore } from "../../../store/usePrivateChatStore"
import { useDeleteMessage } from "./privateChatHooks/useDeleteMessage"
import { useReactToMessage } from "./privateChatHooks/useReactToMessage"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { useMessagingMetaData } from "../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../hooks/customHooks/useMessageModalInteractions"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import { useOpenMoreActionsModal } from "../../../hooks/customHooks/useOpenMoreActionsModal"
import { useChatHandlers } from "../../../hooks/customHooks/useChatHandlers"
import { getMessageBubbleClasses } from "../../../utils/getMessageBubbleClasses"
import MessageActionsModal from "../../../components/ui/MessageActionsModal"
import DateSeparator from "../../../components/ui/DateSeperator"
import MoreMessageActionsModal from "../../../components/ui/MoreMessageActionsModal"
import MessageContentLayout from "../../../components/ui/MessageContentLayout"
import ShowMessageTimeOnHover from "../../../components/ui/ShowMessageTimeOnHover"
import PrivateChatFirstMessageInGroup from "./PrivateChatFirstMessageInGroup"
import MessageBubble from "../../../components/ui/MessageBubble"
import MessageReactions from "../../../components/ui/MessageReactions"
import SlideUpMenu, { SlideUpMenuContent } from "../../../components/common/SlideUpMenu"
import ReactionsSlideUpMenuContent from "../../../components/common/ReactionsSlideUpMenuContent"
import ViewReactionsModal from "../../../components/common/ViewReactionsModal"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"


const PrivateChatMessageItem = ({
  message,
  privateChatInputRef,
  currentUser,
  isTypingOtherUser,
  handleLoadImage,
  onReactionAdded,
  messageListRef,
}) => {
  const { selectedConversation, setActiveMessageModalId, activeMessageModalId } =
    usePrivateChatStore()

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)
  const [showSlideUpReactionsMenu, setShowSlideUpReactionsMenu] = useState(false)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const { deleteMessage } = useDeleteMessage()
  const { reactToMessage } = useReactToMessage({
    selectedConversationId: selectedConversation._id,
    onReactionAdded,
  })

  const isMobile = useIsMobile()

  const { isSentByCurrentUser, isEditable, isMessageEdited, groupedReactions, hasAnyReactions } =
    useMessagingMetaData(message, currentUser)

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
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable, message })

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
    addReaction: reactToMessage,
    chatStore: usePrivateChatStore,
    chatInputRef: privateChatInputRef,
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

  const handleOpenViewReactionsModal = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowViewReactionsModal(true)
  }
  const handleOpenSlideUpReactionsMenu = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowSlideUpReactionsMenu(true)
  }

  const handleCloseViewReactionsModal = () => {
    setShowViewReactionsModal(false)
  }

  const handleCloseSlideUpReactionsMenu = () => {
    setShowSlideUpReactionsMenu(false)
  }

  const handleDeleteOwnMessage = () => {
    deleteMessage({
      messageId: message._id,
      conversationId: message.conversationId,
    })
    setShowMoreActionsModal(false)
  }

  if (isTypingOtherUser) {
    return (
      <div className="message-item-container ml-10 flex justify-start rounded-lg p-1">
        <div className="flex max-w-[70%] flex-col rounded-full bg-[#2F3336] p-3 text-white">
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
            message={message}
            onCloseMoreActionsModal={handleCloseMoreActionsModal}
            moreActionsModalPosition={moreActionsModalPosition}
            onReplyClick={handleReplyClick}
            onEditClick={handleEditClick}
            onCopyMessage={handleCopyMessage}
            onDeleteOwnMessage={handleDeleteOwnMessage}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
            onOpenViewReactionsModal={handleOpenViewReactionsModal}
            onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
            onReactionAdded={onReactionAdded}
            reactToMessage={reactToMessage}
          />
        )}

        <MessageContentLayout
          isSentByCurrentUser={isSentByCurrentUser}
          messageContentStyle={messageContentStyle}
          message={message}
        >
          {/* Indent messages not first in group */}
          {!isSentByCurrentUser && !message.isFirstInGroup && <div className="mr-1 h-8 w-8"></div>}

          <ShowMessageTimeOnHover
            message={message}
            isSentByCurrentUser={isSentByCurrentUser}
            isMessageHighlighted={isMessageHighlighted}
          />

          <div
            className={`flex flex-col ${isSentByCurrentUser ? "items-end" : "items-start"} w-fit max-w-[75%]`}
          >
            <PrivateChatFirstMessageInGroup
              message={message}
              isSentByCurrentUser={isSentByCurrentUser}
            />

            {/* Edited Status */}
            {isMessageEdited && (
              <span
                className={`mr-5 text-xs italic text-gray-500 ${isSentByCurrentUser ? "self-end" : "self-start"}`}
              >
                (Edited)
              </span>
            )}
            <div className="flex">
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
                handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
                message={message}
                onReactionClick={handleReactionClick}
              />
            )}
          </div>
        </MessageContentLayout>

        <SlideUpMenu isOpen={showSlideUpReactionsMenu} onClose={handleCloseSlideUpReactionsMenu}>
          <SlideUpMenuContent
            className="flex h-[50vh] w-full flex-col overflow-y-auto"
            disablePullToRefresh={true} // <-- Add this prop
          >
            <ReactionsSlideUpMenuContent
              reactions={message.reactions ? message.reactions : []}
              onClose={handleCloseViewReactionsModal}
            />
          </SlideUpMenuContent>
        </SlideUpMenu>

        {showViewReactionsModal && (
          <ViewReactionsModal
            isOpen={showViewReactionsModal}
            onClose={handleCloseViewReactionsModal}
            reactions={message.reactions ? message.reactions : []}
          />
        )}

        {/* Emoji Picker Popover */}
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
    </>
  )
}

export default React.memo(PrivateChatMessageItem)
