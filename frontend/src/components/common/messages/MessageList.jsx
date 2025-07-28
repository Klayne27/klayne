import React, { useCallback, forwardRef, useState, useEffect, useRef } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../LoadingSpinner";
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage";

import MessageItem from "./MessageItem";

const MESSAGE_GROUP_TIME_THRESHOLD_MS = 5 * 60 * 1000; // 1 minute

const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

const MessageList = forwardRef(function MessageList(
  {
    error,
    isNewChat,
    messagesToRender,
    setReplyingToMessage,
    deleteMessage,
    messageInputRef,
    isDeletingMessage,
    openImageModal,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
    selectedConversationId,
    setEditingMessage,
    isTypingOtherUser,
    onReactionAdded,
    handleLoadImage,
    selectedConversation,
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();
  const { mutate: reactToMessage } = useReactToMessage(selectedConversationId);

  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  const mouseLeaveTimeoutRef = useRef(null);
  const MOUSE_LEAVE_DELAY = 100;

  useEffect(() => {
    setIsCurrentlyTouchDevice(isTouchDevice());
  }, []);

  const handleDeleteClick = useCallback(
    ({ messageId, conversationId }) => {
      deleteMessage({ messageId, conversationId });
      setActiveMessageModalId(null);
    },
    [deleteMessage]
  );

  const handleReplyClick = useCallback(
    (message) => {
      setReplyingToMessage(message);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    },
    [setReplyingToMessage, messageInputRef]
  );

  const handleImageClick = useCallback(
    (imageUrl, event) => {
      event.stopPropagation();
      if (openImageModal) {
        openImageModal(imageUrl);
      } else {
        console.warn(
          "openImageModal prop is undefined in Message component. Image modal will not open."
        );
      }
    },
    [openImageModal]
  );

  const handleJumpToOriginalMessage = useCallback((originalMessageId) => {
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
  }, []);

  const handleReactionClick = useCallback(
    (messageId, emoji) => {
      reactToMessage({ messageId, emoji });
      setActiveMessageModalId(null);
    },
    [reactToMessage]
  );

  const handleMouseEnter = useCallback(
    (messageId) => {
      if (!isCurrentlyTouchDevice) {
        if (mouseLeaveTimeoutRef.current) {
          clearTimeout(mouseLeaveTimeoutRef.current);
          mouseLeaveTimeoutRef.current = null;
        }
        setActiveMessageModalId(messageId);
      }
    },
    [isCurrentlyTouchDevice]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isCurrentlyTouchDevice) {
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setActiveMessageModalId(null);
      }, MOUSE_LEAVE_DELAY);
    }
  }, [isCurrentlyTouchDevice]);

  const handleMessageTap = useCallback(
    (messageId) => {
      if (isCurrentlyTouchDevice) {
        setActiveMessageModalId((prevId) => (prevId === messageId ? null : messageId));
      }
    },
    [isCurrentlyTouchDevice]
  );

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

  useEffect(() => {
    if (activeMessageModalId) {
      document.addEventListener("click", handleClickOutsideMessage);
    }

    return () => {
      document.removeEventListener("click", handleClickOutsideMessage);
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
    };
  }, [activeMessageModalId, handleClickOutsideMessage]);

  const enhancedMessagesToRender = messagesToRender.map((msg, index) => {
    const previousMessage = messagesToRender[index - 1];
    const nextMessage = messagesToRender[index + 1];

    // Helper to get sender ID, handling both object and string formats
    const getSenderId = (message) => {
      if (!message || !message.sender) return null;
      return typeof message.sender === "object" ? message.sender._id : message.sender;
    };

    const currentSenderId = getSenderId(msg);
    const prevSenderId = getSenderId(previousMessage);
    const nextSenderId = getSenderId(nextMessage);

    const isSentByCurrentUser = currentSenderId === currentUser._id;

    let showHeaderInfo = false;
    let isFirstInGroup = false;
    let isLastInGroup = false;

    // Determine if the current message starts a new "visual" group
    if (!previousMessage) {
      // Always show header for the very first message
      showHeaderInfo = true;
      isFirstInGroup = true;
    } else {
      const prevDate = new Date(previousMessage.createdAt);
      const currDate = new Date(msg.createdAt);

      const timeDifference = currDate.getTime() - prevDate.getTime();
      const isTimeThresholdExceeded = timeDifference > MESSAGE_GROUP_TIME_THRESHOLD_MS;

      const isNewDay =
        prevDate.getDate() !== currDate.getDate() ||
        prevDate.getMonth() !== currDate.getMonth() ||
        prevDate.getFullYear() !== currDate.getFullYear();

      if (currentSenderId !== prevSenderId || isNewDay || isTimeThresholdExceeded) {
        showHeaderInfo = true;
        isFirstInGroup = true;
      }
    }

    // Determine if the current message is the last in its "visual" group
    if (!nextMessage) {
      // Always the last if there's no next message
      isLastInGroup = true;
    } else {
      const currDate = new Date(msg.createdAt);
      const nextDate = new Date(nextMessage.createdAt);

      const timeDifference = nextDate.getTime() - currDate.getTime();
      const isTimeThresholdExceeded = timeDifference > MESSAGE_GROUP_TIME_THRESHOLD_MS;

      const isNextNewDay =
        currDate.getDate() !== nextDate.getDate() ||
        currDate.getMonth() !== nextDate.getMonth() ||
        currDate.getFullYear() !== nextDate.getFullYear();

      if (currentSenderId !== nextSenderId || isNextNewDay || isTimeThresholdExceeded) {
        isLastInGroup = true;
      }
    }

    return {
      ...msg,
      showHeaderInfo,
      isFirstInGroup,
      isLastInGroup,
      senderProfileImg: msg.sender?.profileImg || "/public/avatar-placeholder.png",
      senderUsername: typeof msg.sender === "object" ? msg.sender?.username : undefined,
    };
  });

  // --- END NEW LOGIC ---

  // --- END NEW LOGIC ---

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-4 flex flex-col pt-20 relative">
      {isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full ">
          <LoadingSpinner size="md" />
        </div>
      )}
      {error && !isNewChat && !isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      {isFetchingOlderMessages && (
        <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!hasNextPage &&
        !isLoadingInitialMessages &&
        !isFetchingOlderMessages &&
        messagesToRender.length > 0 && (
          <div className="flex justify-center text-gray-500 text-sm my-2">
            <p>This is the start of your conversation</p>
          </div>
        )}
      {!isNewChat &&
        enhancedMessagesToRender.length > 0 &&
        enhancedMessagesToRender.map((msg) => (
          <MessageItem
            handleLoadImage={handleLoadImage}
            key={msg._id}
            msg={msg}
            isCurrentlyTouchDevice={isCurrentlyTouchDevice}
            activeMessageModalId={activeMessageModalId}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            handleMessageTap={handleMessageTap}
            handleDeleteClick={handleDeleteClick}
            handleReplyClick={handleReplyClick}
            handleImageClick={handleImageClick}
            handleJumpToOriginalMessage={handleJumpToOriginalMessage}
            handleReactionClick={handleReactionClick}
            isDeletingMessage={isDeletingMessage}
            currentUser={currentUser}
            setEditingMessage={setEditingMessage}
            onReactionAdded={onReactionAdded}
            setReplyingToMessage={setReplyingToMessage}
            showHeaderInfo={msg.showHeaderInfo}
            senderProfileImg={msg.senderProfileImg}
            senderUsername={msg.senderUsername}
            isFirstInGroup={msg.isFirstInGroup} // Pass new prop
            isLastInGroup={msg.isLastInGroup} // Pass new prop
            // onOpenFullEmojiPicker={handleOpenFullEmojiPicker}
          />
        ))}

      {isTypingOtherUser && (
        <MessageItem
          key="typing-indicator"
          isTypingOtherUser={true}
          msg={{ sender: { _id: "dummy" }, text: "", img: "" }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
});

export default React.memo(MessageList);
