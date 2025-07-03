// src/components/common/messages/MessageList.jsx
import React, { useCallback, forwardRef, useState, useEffect, useRef } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
// import { truncateText } from "../../../utils/truncateText"; // No longer needed directly here
// import { FaReply } from "react-icons/fa"; // No longer needed directly here
// import { FiTrash } from "react-icons/fi"; // No longer needed directly here
// import { renderClickableText } from "../../../utils/textUtils"; // No longer needed directly here
// import { BsCheck2All } from "react-icons/bs"; // No longer needed directly here
import LoadingSpinner from "../LoadingSpinner";
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage";

import MessageItem from "./MessageItem"; // Import the new component!

// Utility function to detect touch device (simple check, generally reliable enough)
const isTouchDevice = () => {
  if (typeof window === "undefined") return false; // Server-side rendering check
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
    selectedConversation,
    openImageModal,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();

  const { mutate: reactToMessage, isLoading: isReacting } = useReactToMessage(); // Keep here to pass down

  // State to manage which message's modal is active
  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  // Ref for long press timer
  const longPressTimerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const LONG_PRESS_DURATION = 500; // milliseconds

  // --- Effect to detect touch device on mount ---
  useEffect(() => {
    setIsCurrentlyTouchDevice(isTouchDevice());

    const handlePointerTypeChange = () => {
      setIsCurrentlyTouchDevice(isTouchDevice());
    };
    window.addEventListener("pointerdown", handlePointerTypeChange);
    return () => {
      window.removeEventListener("pointerdown", handlePointerTypeChange);
    };
  }, []);

  const handleDeleteClick = useCallback(
    (messageId) => {
      deleteMessage(messageId);
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
      setActiveMessageModalId(null);
    },
    [setReplyingToMessage, messageInputRef]
  );

  const handleImageClick = useCallback(
    // Memoize this too
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
        behavior: "instant",
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

  // --- PC Hover Handlers ---
  const handleMouseEnter = useCallback(
    (messageId) => {
      if (!isCurrentlyTouchDevice) {
        setActiveMessageModalId(messageId);
      }
    },
    [isCurrentlyTouchDevice]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(null);
    }
  }, [isCurrentlyTouchDevice]);

  // --- Mobile Long Press Handlers ---
  const handleTouchStart = useCallback(
    (e, messageId) => {
      if (isCurrentlyTouchDevice) {
        longPressTimerRef.current = setTimeout(() => {
          setActiveMessageModalId(messageId);
        }, LONG_PRESS_DURATION);
        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
      }
    },
    [isCurrentlyTouchDevice]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (isCurrentlyTouchDevice && longPressTimerRef.current) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = Math.abs(currentX - touchStartXRef.current);
        const deltaY = Math.abs(currentY - touchStartYRef.current);
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    },
    [isCurrentlyTouchDevice]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (isCurrentlyTouchDevice) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    },
    [isCurrentlyTouchDevice]
  );

  const handleClickOutsideMessage = useCallback(
    (e) => {
      if (isCurrentlyTouchDevice && activeMessageModalId) {
        const modalElement = document.getElementById(
          `message-modal-${activeMessageModalId}`
        );
        if (
          modalElement &&
          !modalElement.contains(e.target) &&
          !e.target.closest(".message-item-container")
        ) {
          setActiveMessageModalId(null);
        }
      }
    },
    [isCurrentlyTouchDevice, activeMessageModalId]
  );

  useEffect(() => {
    document.addEventListener("click", handleClickOutsideMessage);
    return () => {
      document.removeEventListener("click", handleClickOutsideMessage);
    };
  }, [handleClickOutsideMessage]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar pt-20"
    >
      {isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full">
          <LoadingSpinner size="md" />
        </div>
      )}
      {error && !isNewChat && !isLoadingInitialMessages && (
        <div className="flex justify-center items-center h-full text-red-500">
          <p>Error loading messages: {error.message}</p>
        </div>
      )}
      {isFetchingOlderMessages && (
        <div className="flex justify-center py-2">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!hasNextPage &&
        !isLoadingInitialMessages &&
        !isFetchingOlderMessages &&
        messagesToRender.length > 0 && (
          <div className="flex justify-center text-gray-500 text-sm my-2">
            <p>No more messages</p>
          </div>
        )}
      {!isNewChat &&
        messagesToRender.length > 0 &&
        messagesToRender.map((msg) => (
          <MessageItem
            key={msg._id} // Crucial for React's reconciliation
            msg={msg}
            isCurrentlyTouchDevice={isCurrentlyTouchDevice}
            activeMessageModalId={activeMessageModalId}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            handleTouchStart={handleTouchStart}
            handleTouchMove={handleTouchMove}
            handleTouchEnd={handleTouchEnd}
            handleDeleteClick={handleDeleteClick}
            handleReplyClick={handleReplyClick}
            handleImageClick={handleImageClick}
            handleJumpToOriginalMessage={handleJumpToOriginalMessage}
            handleReactionClick={handleReactionClick}
            isDeletingMessage={isDeletingMessage}
            currentUser={currentUser} // Pass current user
            // isReacting={isReacting} // Pass loading state if needed by MessageItem
          />
        ))}
    </div>
  );
});

export default React.memo(MessageList);
