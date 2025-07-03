// src/components/common/messages/MessageList.jsx
import React, { useCallback, forwardRef, useState, useEffect, useRef } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../LoadingSpinner";
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage";

import MessageItem from "./MessageItem";

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
    selectedConversation,
    openImageModal,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();
  const { mutate: reactToMessage } = useReactToMessage(); // isReacting is not used in MessageItem

  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  const longPressTimerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const LONG_PRESS_DURATION = 500;

  // Ref to store the timeout for mouse leave
  const mouseLeaveTimeoutRef = useRef(null);
  const MOUSE_LEAVE_DELAY = 100; // Small delay (ms) before clearing active modal on mouse leave

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
        // Clear any pending mouse leave timeout
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
      // Set a timeout before clearing the active modal ID
      // This prevents the modal from flickering when moving between messages quickly
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setActiveMessageModalId(null);
      }, MOUSE_LEAVE_DELAY);
    }
  }, [isCurrentlyTouchDevice]);

  // --- Mobile Long Press Handlers ---
  const handleTouchStart = useCallback(
    (e, messageId) => {
      if (isCurrentlyTouchDevice) {
        // If a modal is already open and this is a tap on a different message, close it
        if (activeMessageModalId && activeMessageModalId !== messageId) {
          setActiveMessageModalId(null);
          clearTimeout(longPressTimerRef.current); // Clear any pending long press from previous
          longPressTimerRef.current = null;
          return; // Don't start a new timer for this tap
        }

        longPressTimerRef.current = setTimeout(() => {
          setActiveMessageModalId(messageId);
        }, LONG_PRESS_DURATION);
        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
      }
    },
    [isCurrentlyTouchDevice, activeMessageModalId] // Add activeMessageModalId to deps for better tap handling
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
          // If a long press was prevented, it means it was a tap.
          // If modal is *already* open for this message, a tap on it should close it.
          // But if it's a tap on another message, the handleTouchStart logic should close previous.
          // This handleTouchEnd primarily ensures the timer is cleared if it didn't fire.
        }
      }
    },
    [isCurrentlyTouchDevice]
  );

  const handleClickOutsideMessage = useCallback(
    (e) => {
      if (isCurrentlyTouchDevice && activeMessageModalId) {
        const messageItemContainer = document.getElementById(
          `message-${activeMessageModalId}`
        );
        // If the click target is NOT within the currently active message's container
        if (messageItemContainer && !messageItemContainer.contains(e.target)) {
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
      // Clean up any pending mouse leave timeout on unmount
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
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
            key={msg._id}
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
            currentUser={currentUser}
          />
        ))}
    </div>
  );
});

export default React.memo(MessageList);
