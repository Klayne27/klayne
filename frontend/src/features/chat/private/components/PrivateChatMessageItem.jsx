import React, { useRef, useState } from "react"
import { FaCircle } from "react-icons/fa"
import { BsCheck2, BsCheck2All } from "react-icons/bs"
import { usePrivateChatStore } from "../../../../store/usePrivateChatStore"
import { useIsMobile } from "../../../../hooks/customHooks/useIsMobile"
import { useMessagingMetaData } from "../../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../../hooks/customHooks/useMessageModalInteractions"
import { useEmojiPickerPopover } from "../../../../hooks/customHooks/useEmojiPickerPopover"
import { useOpenMoreActionsModal } from "../../../../hooks/customHooks/useOpenMoreActionsModal"
import { useChatHandlers } from "../../../../hooks/customHooks/useChatHandlers"
import { getMessageBubbleClasses } from "../../../../utils/getMessageBubbleClasses"
import MessageActionsModal from "../../common/components/MessageActionsModal"
import DateSeparator from "../../../../components/common/DateSeperator"
import MoreMessageActionsModal from "../../common/components/MoreMessageActionsModal"
import MessageContentLayout from "../../common/components/MessageContentLayout"
import ShowMessageTimeOnHover from "../../common/components/ShowMessageTimeOnHover"
import PrivateChatFirstMessageInGroup from "./PrivateChatFirstMessageInGroup"
import MessageBubble from "../../common/components/MessageBubble"
import MessageReactions from "../../common/components/MessageReactions"
import SlideUpMenu, { SlideUpMenuContent } from "../../../../components/common/SlideUpMenu"
import ReactionsSlideUpMenuContent from "../../../../components/common/ReactionsSlideUpMenuContent"
import ViewReactionsModal from "../../../../components/common/ViewReactionsModal"
import EmojiPickerPopover from "../../../../components/common/EmojiPickerPopover"
import MobileMessageActionsSlideUp from "../../common/components/MobileMessageActionsSlideUp"
import { useAdminDeleteMessage } from "../../group/groupChatHooks/useGroupMutations"
import {
  useDeleteMessage,
  usePinMessage,
  useReactToMessage,
} from "../privateChatHooks/usePrivateChatMutations"
import { useTheme } from "../../../../context/ThemeContext"

const PrivateChatMessageItem = ({
  message,
  privateChatInputRef,
  currentUser,
  isTypingOtherUser,
  handleLoadImage,
  onReactionAdded,
  messageListRef,
  onUsernameClick,
}) => {
  const {
    selectedConversation,
    setActiveMessageModalId,
    activeMessageModalId,
    isSlideMenuOpen,
    messageForSlideMenu,
    openSlideMenu,
    closeSlideMenu,
  } = usePrivateChatStore()

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)
  const [showSlideUpReactionsMenu, setShowSlideUpReactionsMenu] = useState(false)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const { deleteMessage } = useDeleteMessage()
  const { reactToMessage } = useReactToMessage({
    selectedConversationId: selectedConversation._id,
    onReactionAdded,
  })

  const { adminDeleteMessage } = useAdminDeleteMessage(selectedConversation._id)
  const { pinMessage } = usePinMessage()

  const isMobile = useIsMobile()
  const { theme } = useTheme()

  const {
    isSentByCurrentUser,
    isEditable,
    isMessageEdited,
    groupedReactions,
    hasAnyReactions,
    isReplyToMessageDeleted,
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
  } = useMessageModalInteractions(message._id, setActiveMessageModalId, activeMessageModalId, () =>
    openSlideMenu(message),
  )

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
    // handleImageClick,
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

  const isAuthUserAdminOrOwner =
    selectedConversation?.isGroup &&
    selectedConversation?.members?.some(
      (member) =>
        member.user._id.toString() === currentUser?._id.toString() &&
        (member.role === "admin" || member.role === "owner"),
    )

  const messageContentStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {}

  const bubbleClasses = getMessageBubbleClasses(message, isSentByCurrentUser, theme)
  const isMentioned =
    !!currentUser?.username &&
    new RegExp(`@${currentUser.username}(?:\\s|$|[^a-zA-Z0-9_])`).test(message.text ?? "")

  const handleOpenViewReactionsModal = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowViewReactionsModal(true)
  }

  const handleCloseViewReactionsModal = () => {
    setShowViewReactionsModal(false)
  }

  const handleOpenSlideUpReactionsMenu = (e) => {
    // e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowSlideUpReactionsMenu(true)
    closeSlideMenu()
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

  const handleAdminDeleteMessage = () => {
    adminDeleteMessage({
      groupId: selectedConversation._id,
      messageId: message._id,
    })
    setShowMoreActionsModal(false)
  }

  const handlePinMessage = () => {
    pinMessage({
      conversationId: selectedConversation._id,
      messageId: message._id,
    })
    closeSlideMenu()
    setShowMoreActionsModal(false)
  }

  // if (isTypingOtherUser) {
  //   return (
  //     <div className="message-item-container ml-10 flex justify-start rounded-lg p-1">
  //       <div className="flex max-w-[70%] flex-col rounded-full bg-[#2F3336] p-3 text-white">
  //         <span className="flex items-center gap-0.5">
  //           <span className="pulsing-dot pulsing-dot-1 inline-block">
  //             <FaCircle size={6} />
  //           </span>
  //           <span className="pulsing-dot pulsing-dot-2 inline-block">
  //             <FaCircle size={6} />
  //           </span>
  //           <span className="pulsing-dot pulsing-dot-3 inline-block">
  //             <FaCircle size={6} />
  //           </span>
  //         </span>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        id={`message-${message._id}`}
        className={`relative mb-0 rounded-lg p-[1px] ${
          isMessageHighlighted
            ? "bg-secondary"
            : isMentioned
              ? "border-l-2 border-yellow-400 bg-yellow-400/10"
              : ""
        } ${isSentByCurrentUser ? "justify-end" : "justify-start"} ${message.isFirstInGroup ? "mt-2" : ""}`}
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
            onAdminDeleteMessage={handleAdminDeleteMessage}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
            onOpenViewReactionsModal={handleOpenViewReactionsModal}
            onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
            onReactionAdded={onReactionAdded}
            reactToMessage={reactToMessage}
            onPinMessage={handlePinMessage}
            isAuthUserAdminOrOwner={isAuthUserAdminOrOwner}
          />
        )}
        <MessageContentLayout
          isSentByCurrentUser={isSentByCurrentUser}
          messageContentStyle={messageContentStyle}
          onUsernameClick={onUsernameClick}
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
              selectedConversation={selectedConversation}
              message={message}
              isSentByCurrentUser={isSentByCurrentUser}
              onUsernameClick={onUsernameClick}
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
                // onImageClick={handleImageClick}
                messageContentStyle={messageContentStyle}
                onJumpToOriginalMessage={handleJumpToOriginalMessage}
                isReplyToMessageDeleted={isReplyToMessageDeleted}
              />
              {selectedConversation.isGroup ? (
                <div></div>
              ) : (
                isSentByCurrentUser && (
                  <span className="ml-1 flex-shrink-0 self-end text-sm">
                    {message?.seen ? (
                      <BsCheck2All size={16} className="text-primary" />
                    ) : (
                      <BsCheck2 size={16} className="text-gray-500" />
                    )}
                  </span>
                )
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
        {
          <SlideUpMenu isOpen={showSlideUpReactionsMenu} onClose={handleCloseSlideUpReactionsMenu}>
            <SlideUpMenuContent
              className="flex h-[50vh] w-full flex-col overflow-y-auto"
              disablePullToRefresh={true}
            >
              <ReactionsSlideUpMenuContent
                reactions={message.reactions ? message.reactions : []}
                onClose={handleCloseViewReactionsModal}
              />
            </SlideUpMenuContent>
          </SlideUpMenu>
        }
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
        {isMobile && (
          <MobileMessageActionsSlideUp
            isOpen={isSlideMenuOpen && messageForSlideMenu?._id === message._id}
            onClose={closeSlideMenu}
            message={message}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
            onReactionClick={handleReactionClick}
            onReplyClick={handleReplyClick}
            onEditClick={handleEditClick}
            onCopyMessage={handleCopyMessage}
            onDeleteOwnMessage={handleDeleteOwnMessage}
            handleOpenEmojiPickerPopover={handleOpenEmojiPickerPopover}
            moreEmojisButtonRef={moreEmojisButtonRef}
            onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
            onPinMessage={handlePinMessage}
            onCloseMoreActionsModal={handleCloseMoreActionsModal}
            moreActionsModalPosition={moreActionsModalPosition}
            onAdminDeleteMessage={handleAdminDeleteMessage}
            onOpenViewReactionsModal={handleOpenViewReactionsModal}
            onReactionAdded={onReactionAdded}
            reactToMessage={reactToMessage}
            isAuthUserAdminOrOwner={isAuthUserAdminOrOwner}
          />
        )}
      </div>
    </>
  )
}

export default React.memo(PrivateChatMessageItem)
