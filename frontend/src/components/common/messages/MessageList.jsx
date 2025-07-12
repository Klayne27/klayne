import React, { useCallback, forwardRef, useState, useEffect, useRef } from "react";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import LoadingSpinner from "../LoadingSpinner";
import { useReactToMessage } from "../../../hooks/messagesHooks/useReactToMessage";

import MessageItem from "./MessageItem";

// Keep this to differentiate behavior if needed, though we'll simplify its use.
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
  },
  ref
) {
  const { authUser: currentUser } = useAuthUser();
  const { mutate: reactToMessage } = useReactToMessage();

  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false); 

  const mouseLeaveTimeoutRef = useRef(null);
  const MOUSE_LEAVE_DELAY = 100;

  useEffect(() => {
    // Detect touch device once on mount
    setIsCurrentlyTouchDevice(isTouchDevice());
  }, []); // Only runs once

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
      event.stopPropagation(); // Keep this to prevent image click from closing modal
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
      setActiveMessageModalId(null); // Close modal after action
    },
    [reactToMessage]
  );

  // Desktop hover logic
  const handleMouseEnter = useCallback(
    (messageId) => {
      if (!isCurrentlyTouchDevice) {
        // Only for non-touch devices
        if (mouseLeaveTimeoutRef.current) {
          clearTimeout(mouseLeaveTimeoutRef.current);
          mouseLeaveTimeoutRef.current = null;
        }
        setActiveMessageModalId(messageId);
      }
    },
    [isCurrentlyTouchDevice] // Depend on this to ensure correct behavior
  );

  const handleMouseLeave = useCallback(() => {
    if (!isCurrentlyTouchDevice) {
      // Only for non-touch devices
      mouseLeaveTimeoutRef.current = setTimeout(() => {
        setActiveMessageModalId(null);
      }, MOUSE_LEAVE_DELAY);
    }
  }, [isCurrentlyTouchDevice]); // Depend on this

  // NEW: Simple tap handler for mobile to show/hide modal
  const handleMessageTap = useCallback(
    (messageId) => {
      if (isCurrentlyTouchDevice) {
        setActiveMessageModalId((prevId) => (prevId === messageId ? null : messageId));
      }
    },
    [isCurrentlyTouchDevice]
  );

  // The handleClickOutsideMessage logic is crucial.
  // It needs to correctly distinguish clicks inside the modal vs. outside.
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
    // Attach document click listener only when a modal is active.
    // This avoids conflicts when no modal is expected to be open.
    if (activeMessageModalId) {
      document.addEventListener("click", handleClickOutsideMessage);
      // Consider adding 'touchend' listener for outside clicks on mobile if 'click' isn't sufficient
      // document.addEventListener("touchend", handleClickOutsideMessage);
    }

    return () => {
      document.removeEventListener("click", handleClickOutsideMessage);
      // document.removeEventListener("touchend", handleClickOutsideMessage);
      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
      }
    };
  }, [activeMessageModalId, handleClickOutsideMessage]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pt-20"
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
            isCurrentlyTouchDevice={isCurrentlyTouchDevice} // Pass this prop
            activeMessageModalId={activeMessageModalId}
            handleMouseEnter={handleMouseEnter}
            handleMouseLeave={handleMouseLeave}
            handleMessageTap={handleMessageTap} // Pass the new tap handler
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
