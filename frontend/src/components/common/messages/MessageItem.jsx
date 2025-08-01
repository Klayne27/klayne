import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaCircle } from "react-icons/fa";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import { Link } from "react-router-dom";

import EmojiPickerPopover from "../EmojiPickerPopover";
import { useDeleteMessage } from "../../../hooks/messagesHooks/useDeleteMessage";
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage";
import { usePrivateChatStore } from "../../../store/usePrivateChatStore";
import { useAppStore } from "../../../store/appStore";
import { formatTime } from "../../../utils/date";
import { useEmojiPickerPopover } from "../../../hooks/useEmojiPickerPopover";
import { getMessageBubbleClasses } from "../../../utils/getMessageBubbleClasses";
import { useIsMobile } from "../../../hooks/useIsMobile";
import DateSeparator from "../../ui/DateSeperator";
import MessageReactions from "../../ui/MessageReactions";
import MessageBubble from "../../ui/MessageBubble";
import MessageContentLayout from "../../ui/MessageContentLayout";
import { useOpenMoreActionsModal } from "../../../hooks/useOpenMoreActionsModal";
import MoreMessageActionsModal from "../../ui/MoreMessageActionsModal";
import MessageActionsModal from "../../ui/MessageActionsModal";

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
  const openImageModal = useAppStore((state) => state.openImageModal);

  const mouseLeaveTimeoutRef = useRef(null);

  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation);
  const setReplyingToMessage = usePrivateChatStore((state) => state.setReplyingToMessage);
  const setEditingMessage = usePrivateChatStore((state) => state.setEditingMessage);

  const [isHovered, setIsHovered] = useState(false);

  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  const { deleteMessage } = useDeleteMessage();
  const { reactToMessage } = useReactToMessage(selectedConversation._id);

  const moreEmojisButtonRef = useRef(null);
  const addReactionButtonRef = useRef(null);
  const moreButtonRef = useRef(null);

  const isMobile = useIsMobile();

  const pressTimer = useRef(null);
  const LONG_PRESS_DURATION = 500;

  const isSentByCurrentUser = message?.sender._id === currentUser._id;
  const isEditable = isSentByCurrentUser;

  const isTouchDevice = () => {
    if (typeof window === "undefined") return false;
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  };

  useEffect(() => {
    setIsCurrentlyTouchDevice(isTouchDevice());
  }, []);

  const {
    showEmojiPickerPopover,
    setShowEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover();

  const {
    moreActionsModalPosition,
    handleOpenMoreActionsModal,
    setShowMoreActionsModal,
    showMoreActionsModal,
  } = useOpenMoreActionsModal({ setShowEmojiPickerPopover, isEditable });


  const showModal = activeMessageModalId === message._id;

  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    acc[reaction.emoji] = acc[reaction.emoji] || {
      count: 0,
      users: [],
      userIds: [],
    };
    acc[reaction.emoji].count++;

    const reactorId = reaction.user?._id?.toString() || reaction.user?.toString();
    if (reactorId) {
      acc[reaction.emoji].userIds.push(reactorId);
    }
    return acc;
  }, {});

  const hasAnyReactions = Object.keys(groupedReactions || {}).length > 0;

  const bubbleClasses = getMessageBubbleClasses(message, isSentByCurrentUser);

  const handleMouseEnter = (messageId) => {
    if (!isCurrentlyTouchDevice) {
      //   if (mouseLeaveTimeoutRef.current) {
      //     clearTimeout(mouseLeaveTimeoutRef.current);
      //     mouseLeaveTimeoutRef.current = null;
      //   }
      setActiveMessageModalId(messageId);
    }
  };

  const handleMouseLeave = () => {
    if (!isCurrentlyTouchDevice) {
      //   mouseLeaveTimeoutRef.current = setTimeout(() => {
      setActiveMessageModalId(null);
    }
  };

  const handleMessageTap = (messageId) => {
    if (isCurrentlyTouchDevice) {
      setActiveMessageModalId((prevId) => (prevId === messageId ? null : messageId));
    }
  };

  
  const openEmojiPickerWithModalClose = (e) => {
    handleOpenEmojiPickerPopover(e, setShowMoreActionsModal);
  };

  const handleCloseMoreActionsModal = useCallback(() => {
    setShowMoreActionsModal(false);
  }, [setShowMoreActionsModal]);

  const handleImageClick = (imageUrl) => {
    openImageModal(imageUrl);
  };

  const handleClickOutsideMessage = useCallback(
    (e) => {
      if (activeMessageModalId) {
        const messageItemContainer = document.getElementById(
          `message-${activeMessageModalId}`
        );
        const messageModalElement = document.getElementById(
          `message-modal-${activeMessageModalId}`
        );
        if (
          messageItemContainer &&
          !messageItemContainer.contains(e.target) &&
          messageModalElement &&
          !messageModalElement.contains(e.target)
        ) {
          setActiveMessageModalId(null);
        }
      }
    },
    [activeMessageModalId]
  );

  // useEffect(() => {
  //   if (activeMessageModalId) {
  //     document.addEventListener("click", handleClickOutsideMessage);
  //   }

  //   return () => {
  //     document.removeEventListener("click", handleClickOutsideMessage);
  //     if (mouseLeaveTimeoutRef.current) {
  //       clearTimeout(mouseLeaveTimeoutRef.current);
  //     }
  //   };
  // }, [activeMessageModalId, handleClickOutsideMessage]);

  const shouldShowTimeOnHover = isHovered || showModal;
  const isMessageHighlighted = isHovered || showModal;
  const messageContentStyle = isMobile
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "manipulation",
      }
    : {};

  const handleJumpToOriginalMessage = (originalMessageId) => {
    const originalMessageElement = document.getElementById(
      `message-${originalMessageId}`
    );
    if (originalMessageElement) {
      originalMessageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      originalMessageElement.classList.add("highlight-message");
      setTimeout(() => {
        originalMessageElement.classList.remove("highlight-message");
      }, 1500);
    }
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    pressTimer.current = setTimeout(() => {
      handleMessageTap(message._id);
    }, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    clearTimeout(pressTimer.current);
  };

  const handleTouchMove = (e) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleDeleteOwnMessage = () => {
    deleteMessage({ messageId: message._id, conversationId: message.conversationId });
  };

  const handleReactionClick = (messageId, emoji) => {
    reactToMessage({ messageId, emoji });
    setActiveMessageModalId(null);
  };

  const handleEmojiSelect = (emojiObject) => {
    handleReactionClick(message._id, emojiObject.emoji);
    handleCloseEmojiPickerPopover();
    onReactionAdded();
  };

  const handleReplyClick = () => {
    privateChatInputRef.current.focus();
    setReplyingToMessage(message);
    setShowMoreActionsModal(false);
    handleMessageTap(null);
  };

  const handleEditClick = () => {
    setEditingMessage(message);
    setShowMoreActionsModal(false);
    handleMessageTap(null);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.text);
    setShowMoreActionsModal(false);
    handleMessageTap(null);
  };

  if (isTypingOtherUser) {
    return (
      <div className="flex justify-start p-1 rounded-lg message-item-container ml-10">
        <div className="flex flex-col max-w-[70%] p-3 rounded-3xl bg-[#2F3336] text-white rounded-bl-[4px]">
          <span className="flex items-center gap-0.5">
            <span className="inline-block pulsing-dot pulsing-dot-1">
              <FaCircle size={6} />
            </span>
            <span className="inline-block pulsing-dot pulsing-dot-2">
              <FaCircle size={6} />
            </span>
            <span className="inline-block pulsing-dot pulsing-dot-3">
              <FaCircle size={6} />
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {message.isNewDay && <DateSeparator date={message.createdAt} />}

      <div
        id={`message-${message._id}`}
        className={`relative mb-0 p-[1px] rounded-lg ${
          isMessageHighlighted ? "bg-secondary" : ""
        } ${isSentByCurrentUser ? "justify-end" : "justify-start"} ${
          message.isFirstInGroup ? "mt-2" : ""
        } `}
        style={messageContentStyle}
        onMouseEnter={() => {
          if (!isMobile) {
            handleMouseEnter(message._id);
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            handleMouseLeave();
            setIsHovered(false);
          }
        }}
        onClick={(e) => {
          if (isMobile) {
            if (showModal) {
              handleMessageTap(null);
            }
            e.stopPropagation();
          } else {
            const modalElement = document.getElementById(`message-modal-${message._id}`);
            if (modalElement && modalElement.contains(e.target)) {
              return;
            }
            handleMessageTap(message._id);
          }
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
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
          moreActionsButtonRef={moreActionsModalPosition}
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
          {!isSentByCurrentUser && !message.isFirstInGroup && (
            <div className="w-8 h-8 mr-1"></div>
          )}

          {shouldShowTimeOnHover && !isSentByCurrentUser && (
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatTime(message.createdAt)}
            </div>
          )}
          {shouldShowTimeOnHover && isSentByCurrentUser && (
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 mr-2 z-0 whitespace-nowrap">
              {formatTime(message.createdAt)}
            </div>
          )}
          <div
            className={`flex flex-col ${
              isSentByCurrentUser ? "items-end" : "items-start"
            } w-fit max-w-[75%]`}
          >
            {message.isFirstInGroup && (
              <div className={`flex items-center text-sm mb-0.5`}>
                {!isSentByCurrentUser && (
                  <Link
                    to={`/profile/${message.senderUsername}`}
                    className="font-semibold cursor-pointer mr-1"
                  >
                    {message.senderUsername}
                  </Link>
                )}
                <span className="text-xs text-gray-500 mr-5">
                  {formatTime(message.createdAt)}
                </span>
              </div>
            )}

            {/* Edited Status */}
            {message.isEdited && message.text && (
              <span
                className={`text-xs italic text-gray-500 mr-5 ${
                  isSentByCurrentUser ? "self-end" : "self-start"
                }`}
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
                <span className="text-sm self-end ml-1 flex-shrink-0">
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
  );
};

export default React.memo(MessageItem);
