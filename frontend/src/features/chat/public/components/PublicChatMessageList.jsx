import React, { useCallback, useRef, useState } from "react"
import { usePublicChatStore } from "../../../../store/usePublicChatStore"
import { useIsMobile } from "../../../../hooks/customHooks/useIsMobile"
import { useMessagingMetaData } from "../../../../hooks/customHooks/useMessagingMetaData"
import { useMessageModalInteractions } from "../../../../hooks/customHooks/useMessageModalInteractions"
import { useEmojiPickerPopover } from "../../../../hooks/customHooks/useEmojiPickerPopover"
import { useOpenMoreActionsModal } from "../../../../hooks/customHooks/useOpenMoreActionsModal"
import { useChatHandlers } from "../../../../hooks/customHooks/useChatHandlers"
import { getMessageBubbleClasses } from "../../../../utils/getMessageBubbleClasses"
import { usePublicChatAdminHandlers } from "../../../../hooks/customHooks/usePublicChatAdminHandlers"
import { PUBLIC_CHAT_MODAL_CONFIGS } from "../../../../constants/publicChatModalConfigs"
import DateSeparator from "../../../../components/common/DateSeperator"
import MessageActionsModal from "../../common/components/MessageActionsModal"
import MoreMessageActionsModal from "../../common/components/MoreMessageActionsModal"
import MessageContentLayout from "../../common/components/MessageContentLayout"
import ShowMessageTimeOnHover from "../../common/components/ShowMessageTimeOnHover"
import MessageReactions from "../../common/components/MessageReactions"
import EmojiPickerPopover from "../../../../components/common/EmojiPickerPopover"
import SlideUpMenu, { SlideUpMenuContent } from "../../../../components/common/SlideUpMenu"
import ReactionsSlideUpMenuContent from "../../../../components/common/ReactionsSlideUpMenuContent"
import ViewReactionsModal from "../../../../components/common/ViewReactionsModal"
import ConfirmationModal from "../../../../components/common/ConfirmationModal"
import PublicChatFirstMessageInGroup from "./PublicChatFirstMessageInGroup"
import MobileMessageActionsSlideUp from "../../common/components/MobileMessageActionsSlideUp"
import {
  useAddPublicMessageReaction,
  useBanUserFromPublicChat,
  useDeleteOwnPublicMessage,
  useDeletePublicMessage,
  useUnbanUserFromPublicChat,
} from "../publicChatHooks/usePublicChatMutations"
import MessageBubble from "../../common/components/MessageBubble"
import { useTheme } from "../../../../context/ThemeContext"
import { renderClickableText } from "../../../../utils/textUtils"
import { truncateText } from "../../../../utils/truncateText"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import { FaReply } from "react-icons/fa"
import ReplyPreview from "../../common/components/ReplyPreview"

const PublicChatMessageList = React.memo(function PublicChatMessageList({
  message,
  currentUser,
  publicChatInputRef,
  onLoadImage,
  messageListRef,
  onReactionAdded,
}) {
  const {
    activeMessageModalId,
    setActiveMessageModalId,
    isSlideMenuOpen,
    closeSlideMenu,
    openSlideMenu,
    messageForSlideMenu,
  } = usePublicChatStore()

  const [showViewReactionsModal, setShowViewReactionsModal] = useState(false)
  const [showSlideUpReactionsMenu, setShowSlideUpReactionsMenu] = useState(false)

  const [modalConfig, setModalConfig] = useState(null)

  const moreEmojisButtonRef = useRef(null)
  const addReactionButtonRef = useRef(null)

  const { banUser } = useBanUserFromPublicChat()
  const { unbanUser } = useUnbanUserFromPublicChat()
  const { adminDeletePublicMessage } = useDeletePublicMessage()
  const { deleteOwnMessage } = useDeleteOwnPublicMessage()
  const { addReaction } = useAddPublicMessageReaction({ onReactionAdded })

  const isMobile = useIsMobile()
  const { theme } = useTheme()

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

  const bubbleClasses = getMessageBubbleClasses(message, isSentByCurrentUser, theme)
  const isMentioned =
    !!currentUser?.username &&
    new RegExp(`@${currentUser.username}(?:\\s|$|[^a-zA-Z0-9_])`).test(message.text ?? "")

  const isRepliedTo = message.repliedTo?.sender._id === currentUser._id

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

  const handleOpenViewReactionsModal = (e) => {
    e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowViewReactionsModal(true)
  }

  const handleOpenSlideUpReactionsMenu = (e) => {
    // e.stopPropagation()
    setShowMoreActionsModal(false)
    setShowSlideUpReactionsMenu(true)
    closeSlideMenu()
  }

  const handleCloseViewReactionsModal = () => {
    setShowViewReactionsModal(false)
  }

  const handleCloseSlideUpReactionsMenu = () => {
    setShowSlideUpReactionsMenu(false)
  }

  const handleDeleteOwnMessage = () => {
    deleteOwnMessage(message._id)
    setShowMoreActionsModal(false)
  }

  const onPreviewLoad = useCallback(() => {
    const listEl = messageListRef?.current // only if you thread this ref down
    if (!listEl) return
    const isAtBottom = listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + 80
    if (isAtBottom) listEl.scrollTop = listEl.scrollHeight
  }, [])

  const messageDeleted = <span className="text-sm italic text-gray-600">[Message Deleted]</span>

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        key={message._id}
        id={`message-${message._id}`}
        className={`relative mb-0 rounded-lg p-[1px] ${
          isMessageHighlighted
            ? "bg-secondary/20"
            : isMentioned || isRepliedTo
              ? "border-r-2 border-yellow-400 bg-yellow-400/10"
              : ""
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
            onBanUser={handleBanUser}
            onUnbanUser={handleUnbanUser}
            message={message}
            isEditable={isEditable}
            isSentByCurrentUser={isSentByCurrentUser}
            onAdminDeleteMessage={handleAdminDeleteMessage}
            isAuthUserAdmin={isAuthUserAdmin}
            isMessageDeleted={isMessageDeleted}
            isSenderBanned={isSenderBanned}
            onOpenConfirmationModal={openConfirmationModal}
            onOpenViewReactionsModal={handleOpenViewReactionsModal}
            onOpenSlideUpReactionsMenu={handleOpenSlideUpReactionsMenu}
            onReactionAdded={onReactionAdded}
            reactToMessage={addReaction}
          />
        )}

        <MessageContentLayout isSentByCurrentUser={isSentByCurrentUser} message={message}>
          {/* Indent messages not first in group */}
          {!isSentByCurrentUser && !message.isFirstInGroup && <div className="w-8 flex-shrink-0" />}

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
            {message.repliedTo && (
              <ReplyPreview
                message={message}
                isSentByCurrentUser={isSentByCurrentUser}
                currentUser={currentUser}
                isReplyToMessageDeleted={isReplyToMessageDeleted}
                onJumpToOriginalMessage={handleJumpToOriginalMessage}
                onLoadImage={onLoadImage}
              />
            )}

            <div className={`flex ${message.repliedTo ? "relative z-10 -mt-5" : ""}`}>
              <MessageBubble
                message={message}
                isSentByCurrentUser={isSentByCurrentUser}
                bubbleClasses={bubbleClasses}
                onLoadImage={onLoadImage}
                onPreviewLoad={onPreviewLoad}
                // onImageClick={handleImageClick}
                messageContentStyle={messageContentStyle}
                isReplyToMessageDeleted={isReplyToMessageDeleted}
                onJumpToOriginalMessage={handleJumpToOriginalMessage}
                isMessageDeleted={isMessageDeleted}
                isSenderBanned={isSenderBanned}
                hasReply={!!message.repliedTo} // ← NEW
              />
            </div>

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

        {
          <SlideUpMenu isOpen={showSlideUpReactionsMenu} onClose={handleCloseSlideUpReactionsMenu}>
            <SlideUpMenuContent className="flex h-[50vh] w-full flex-col overflow-y-auto">
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

        {modalConfig && (
          <ConfirmationModal
            isOpen={true}
            message={modalConfig.message}
            onConfirm={modalConfig.onConfirm}
            modalTitle={modalConfig.modalTitle}
            confirmButtonText={modalConfig.confirmButtonText}
            onClose={() => setModalConfig(null)}
            danger={!isSenderBanned}
          />
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
            onAdminDeleteMessage={handleAdminDeleteMessage}
            isAuthUserAdmin={isAuthUserAdmin}
            isMessageDeleted={isMessageDeleted}
            isSenderBanned={isSenderBanned}
            onOpenConfirmationModal={openConfirmationModal}
          />
        )}
      </div>
    </>
  )
})

export default PublicChatMessageList
