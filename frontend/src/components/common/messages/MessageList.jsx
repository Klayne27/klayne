import React, { useCallback, forwardRef, useState, useEffect, useRef } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../LoadingSpinner";
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage";

import MessageItem from "./MessageItem"; // Keep MessageItem separate and memoized

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
    selectedConversation, // This prop isn't used in MessageList itself, but might be relevant elsewhere.
    openImageModal,
    isLoadingInitialMessages,
    isFetchingOlderMessages,
    hasNextPage,
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();
  const { mutate: reactToMessage } = useReactToMessage();

  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  // Refs for managing long press on touch devices
  const longPressTimerRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const LONG_PRESS_DURATION = 500; // milliseconds

  // Ref to store the timeout for mouse leave (for PC hover debounce)
  const mouseLeaveTimeoutRef = useRef(null);
  const MOUSE_LEAVE_DELAY = 100; // Small delay (ms) before clearing active modal on mouse leave for PC

  // Detect touch device on mount and re-evaluate on pointer type changes
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
      setActiveMessageModalId(null); // Close modal after action
    },
    [deleteMessage]
  );

  const handleReplyClick = useCallback(
    (message) => {
      setReplyingToMessage(message);
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
      setActiveMessageModalId(null); // Close modal after action
    },
    [setReplyingToMessage, messageInputRef]
  );

  const handleImageClick = useCallback(
    (imageUrl, event) => {
      event.stopPropagation(); // Prevent this click from bubbling up and closing modal if it's open
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
        behavior: "instant", // Use 'instant' for smooth scroll or 'auto'
        block: "center", // Scroll to the center of the viewport
      });
      originalMessageElement.classList.add("highlight-message");
      setTimeout(() => {
        originalMessageElement.classList.remove("highlight-message");
      }, 1500); // Remove highlight after 1.5 seconds
    }
  }, []);

  const handleReactionClick = useCallback(
    (messageId, emoji) => {
      reactToMessage({ messageId, emoji });
      setActiveMessageModalId(null); // Close modal after reaction
    },
    [reactToMessage]
  );

  // --- PC Hover Handlers (debounced mouse leave) ---
  const handleMouseEnter = useCallback(
    (messageId) => {
      if (!isCurrentlyTouchDevice) {
        // Clear any pending mouse leave timeout to prevent flickering
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
      // Set a timeout before clearing the active modal ID.
      // This allows moving between closely spaced messages without immediate modal disappearance.
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setActiveMessageModalId(null);
      }, MOUSE_LEAVE_DELAY);
    }
  }, [isCurrentlyTouchDevice]);

  // --- Mobile Long Press Handlers ---
  const handleTouchStart = useCallback(
    (e, messageId) => {
      if (isCurrentlyTouchDevice) {
        // If a modal is already open and this is a tap on a different message, close it immediately
        if (activeMessageModalId && activeMessageModalId !== messageId) {
          setActiveMessageModalId(null);
          clearTimeout(longPressTimerRef.current); // Clear any previous long press timer
          longPressTimerRef.current = null;
          return; // Don't start a new timer, just close the previous modal
        }
        // If it's a tap on the *same* message that has an active modal, close it
        if (activeMessageModalId === messageId) {
          setActiveMessageModalId(null);
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          return;
        }

        // Start timer for long press
        longPressTimerRef.current = setTimeout(() => {
          setActiveMessageModalId(messageId);
        }, LONG_PRESS_DURATION);
        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
      }
    },
    [isCurrentlyTouchDevice, activeMessageModalId] // Depend on activeMessageModalId to correctly handle tap on other message
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (isCurrentlyTouchDevice && longPressTimerRef.current) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = Math.abs(currentX - touchStartXRef.current);
        const deltaY = Math.abs(currentY - touchStartYRef.current);
        // If finger moves significantly, cancel long press
        if (deltaX > 10 || deltaY > 10) {
          // 10px tolerance
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
          // If the timer was cleared here, it means it was a short tap.
          // We do NOT set activeMessageModalId here; long press sets it.
          // This prevents a tap from opening the modal.
        }
      }
    },
    [isCurrentlyTouchDevice]
  );

  // Handle clicks outside the active message/modal to close the modal
  const handleClickOutsideMessage = useCallback(
    (e) => {
      // Only close if a modal is currently active
      if (activeMessageModalId) {
        const messageItemContainer = document.getElementById(
          `message-${activeMessageModalId}`
        );
        const messageModalElement = document.getElementById(
          `message-modal-${activeMessageModalId}`
        );

        // If the click target is NOT within the currently active message's main container
        // AND NOT within the message's modal itself, then close the modal.
        // This ensures clicking on the message content or modal actions doesn't close it.
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
    [activeMessageModalId] // Only re-create if activeMessageModalId changes
  );

  // Attach global click listener
  useEffect(() => {
    document.addEventListener("click", handleClickOutsideMessage);
    return () => {
      document.removeEventListener("click", handleClickOutsideMessage);
      // Clean up any pending mouse leave timeout on unmount
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
    };
  }, [handleClickOutsideMessage]); // Dependency on memoized callback

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
            activeMessageModalId={activeMessageModalId} // Passed down
            handleMouseEnter={handleMouseEnter} // Passed down
            handleMouseLeave={handleMouseLeave} // Passed down
            handleTouchStart={handleTouchStart} // Passed down
            handleTouchMove={handleTouchMove} // Passed down
            handleTouchEnd={handleTouchEnd} // Passed down
            handleDeleteClick={handleDeleteClick} // Passed down
            handleReplyClick={handleReplyClick} // Passed down
            handleImageClick={handleImageClick} // Passed down
            handleJumpToOriginalMessage={handleJumpToOriginalMessage} // Passed down
            handleReactionClick={handleReactionClick} // Passed down
            isDeletingMessage={isDeletingMessage} // Passed down
            currentUser={currentUser} // Passed down
            // isReacting={isReacting} // If you want to disable reaction buttons, pass this
          />
        ))}
    </div>
  );
});

export default React.memo(MessageList);
