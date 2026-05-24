import React, { useCallback, useRef, useState } from "react"
import { FaCircle, FaReply } from "react-icons/fa"
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
import { buildNicknameMap } from "../../../../utils/nicknameUtils"
import { useMemo } from "react"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import { renderClickableText } from "../../../../utils/textUtils"
import { truncateText } from "../../../../utils/truncateText"
import ReplyPreview from "../../common/components/ReplyPreview"

const PrivateChatMessageItem = ({
  message,
  privateChatInputRef,
  currentUser,
  isTypingOtherUser,
  onLoadImage,
  onReactionAdded,
  messageListRef,
  onUsernameClick,
  seenByUsers = [],
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

  const nicknameMap = useMemo(() => buildNicknameMap(selectedConversation), [selectedConversation])

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

  const isRepliedTo = message.repliedTo?.sender._id === currentUser._id

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

  const onPreviewLoad = useCallback(() => {
    const listEl = messageListRef?.current // only if you thread this ref down
    if (!listEl) return
    const isAtBottom = listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + 500
    if (isAtBottom) listEl.scrollTop = listEl.scrollHeight
  }, [])

  const messageDeleted = <span className="text-sm italic text-gray-600">[Message Deleted]</span>

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        id={`message-${message._id}`}
        className={`relative mb-0 rounded-lg p-[1px] ${
          isMessageHighlighted
            ? "bg-secondary/20"
            : isMentioned || isRepliedTo
              ? "border-r-2 border-yellow-400 bg-yellow-400/10"
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
          {!isSentByCurrentUser && !message.isFirstInGroup && <div className="w-8"></div>}

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
              nicknameMap={nicknameMap}
            />

            {isMessageEdited && (
              <span
                className={`mr-5 text-xs italic text-gray-500 ${
                  isSentByCurrentUser ? "self-end" : "self-start"
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
                nicknameMap={nicknameMap} // ← add this
                isGroup={selectedConversation?.isGroup} // ← add this
              />
            )}

            <div className={`flex ${message.repliedTo ? "relative z-10 -mt-5" : ""}`}>
              <MessageBubble
                message={message}
                messageText={message.text}
                isSentByCurrentUser={isSentByCurrentUser}
                bubbleClasses={bubbleClasses}
                onLoadImage={onLoadImage}
                onPreviewLoad={onPreviewLoad}
                messageContentStyle={messageContentStyle}
                onJumpToOriginalMessage={handleJumpToOriginalMessage}
                isReplyToMessageDeleted={isReplyToMessageDeleted}
                hasReply={!!message.repliedTo}
              />
            </div>

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
        {selectedConversation?.isGroup && seenByUsers.length > 0 && (
          <div className={`flex gap-0.5 justify-self-end`}>
            {seenByUsers
              .filter((u) => (u._id ?? u).toString() !== currentUser._id.toString())
              .slice(0, 6) // cap at 6 avatars before showing +N
              .map((user) => {
                const imgUrl = user?.profileImg?.imageUrl || "/avatar-placeholder.png"
                return (
                  <div className="mt-1">
                    <img
                      key={(user._id ?? user).toString()}
                      src={imgUrl}
                      alt={user?.username ?? ""}
                      title={`Seen by @${user?.username ?? ""}`}
                      className="h-4 w-4 rounded-full object-cover ring-1 ring-base-100"
                    />
                  </div>
                )
              })}
            {seenByUsers.filter((u) => (u._id ?? u).toString() !== currentUser._id.toString())
              .length > 6 && (
              <span className="text-[10px] leading-4 text-slate-500">
                +
                {seenByUsers.filter((u) => (u._id ?? u).toString() !== currentUser._id.toString())
                  .length - 6}
              </span>
            )}
          </div>
        )}
        {!selectedConversation?.isGroup &&
          isSentByCurrentUser &&
          (() => {
            if (seenByUsers.length > 0) {
              const otherParticipant = selectedConversation.participants?.find(
                (p) => p._id.toString() !== currentUser._id.toString(),
              )
              const imgUrl = otherParticipant?.profileImg?.imageUrl || "/avatar-placeholder.png"
              return (
                <div className="flex gap-0.5 justify-self-end">
                  <div className="mt-1">
                    <img
                      src={imgUrl}
                      alt={otherParticipant?.username ?? ""}
                      title={`Seen by @${otherParticipant?.username ?? ""}`}
                      className="h-4 w-4 rounded-full object-cover ring-1 ring-base-100"
                    />
                  </div>
                </div>
              )
            }
            return null
          })()}
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
