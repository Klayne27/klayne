import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useLayoutEffect,
  useMemo,
} from "react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useSocket } from "../../context/SocketContext";
import PublicChatHeader from "./PublicChatHeader";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import PublicChatMessage from "./PublicChatMessage"; // This will become PublicChatMessageList handling the map
import PublicMessageInput from "./PublicMessageInput";
import { useQueryClient } from "@tanstack/react-query";

import { FaCaretDown } from "react-icons/fa";
import { useSendPublicMessage } from "../../hooks/publicChatHooks/useSendPublicMessage";
// Remove useDeletePublicMessage from here, move to PublicChatMessage
// import { useDeletePublicMessage } from "../../hooks/publicChatHooks/useDeletePublicMessage";
// Remove useBanUserFromPublicChat from here, move to PublicChatMessage
// import { useBanUserFromPublicChat } from "../../hooks/publicChatHooks/useBanUserFromPublicChat";
// Remove useUnbanUserFromPublicChat from here, move to PublicChatMessage
// import { useUnbanUserFromPublicChat } from "../../hooks/publicChatHooks/useUnbanUserFromPublicChat";
// Remove useAddPublicMessageReaction from here, move to PublicChatMessage
// import { useAddPublicMessageReaction } from "../../hooks/publicChatHooks/useAddPublicMessageReaction";
import { usePublicMessages } from "../../hooks/publicChatHooks/usePublicMessages";
import { usePublicChatStore } from "../../store/usePublicChatStore";

// Consider moving this constant to a shared `constants.js` or similar
const MESSAGE_GROUP_TIME_THRESHOLD_MS = 5 * 60 * 1000;

const PublicChatWindow = () => {
  const { authUser: currentUser, refetchAuthUser } = useAuthUser();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Zustand state and actions
  const {
    replyingToMessage,
    setReplyingToMessage,
    editingMessage,
    setEditingMessage,
    activeMessageModalId,
    setActiveMessageModalId,
    isCurrentlyTouchDevice,
    setIsCurrentlyTouchDevice,
    showNewMessageButton,
    setShowNewMessageButton,
    handleJumpToMessage, // This can be a Zustand action now
    // If you have a global toast, get it from an app-wide store
    // showToast = useAppStore(state => state.showToast)
  } = usePublicChatStore();

  // React Query hooks
  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    error: messagesError,
    isSomeoneTyping,
    typingUsers,
  } = usePublicMessages();
  // Hooks for actions on individual messages/users are now moved down to PublicChatMessage
  // No need for: adminDeletePublicMessage, banUser, unbanUser, addReaction here

  // Refs for scroll management
  const messageListRef = useRef(null);
  const publicChatInputRef = useRef(null)
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });
  const shouldScrollToBottom = useRef(false);
  const isUserScrollingUp = useRef(false);
  const prevLastMessageId = useRef(
    messages?.length > 0 ? messages[messages.length - 1]._id : null
  );

  const isCurrentUserBanned = currentUser?.isBannedInPublicChat;
  // const lastMessageId = messages?.length > 0 ? messages[messages.length - 1]._id : null; // Not directly used here, removed

  // --- Touch device detection (can also live in a custom hook or global store) ---
  useEffect(() => {
    const checkTouch = () =>
      setIsCurrentlyTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    checkTouch();
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, [setIsCurrentlyTouchDevice]); // Add setIsCurrentlyTouchDevice to dependencies

  // Send typing events (should only be triggered if input is focused/blurred)
  const sendTypingEvent = useCallback(
    (isTyping, isEditing) => {
      if (socket) {
        if (isTyping) {
          socket.emit("public_typing", { isEditing });
        } else {
          socket.emit("public_stop_typing");
        }
      }
    },
    [socket]
  );

  // Scroll to bottom logic
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  // Handler for image loading - ensures scroll to bottom if at bottom
  const handleLoadImage = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 500;
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom();
        setShowNewMessageButton(false);
      }, 50);
    }
  }, [scrollToBottom, setShowNewMessageButton]); // Add setShowNewMessageButton to deps

  // --- Message hover/tap handlers (now update Zustand state) ---
  const handleMouseEnter = useCallback(
    (messageId) => {
      if (!isCurrentlyTouchDevice) {
        setActiveMessageModalId(messageId);
      }
    },
    [isCurrentlyTouchDevice, setActiveMessageModalId]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(null);
    }
  }, [isCurrentlyTouchDevice, setActiveMessageModalId]);

  const handleMessageTap = useCallback(
    (messageId) => {
      if (isCurrentlyTouchDevice) {
        setActiveMessageModalId(activeMessageModalId === messageId ? null : messageId);
      }
    },
    [isCurrentlyTouchDevice, activeMessageModalId, setActiveMessageModalId]
  );

  // --- Reaction Added Handler (now also updates Zustand state) ---
  const handleReactionAdded = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 100;
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom();
        setShowNewMessageButton(false);
      }, 1);
    }
  }, [scrollToBottom, setShowNewMessageButton]);


  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom();
    setShowNewMessageButton(false);
  }, [scrollToBottom, setShowNewMessageButton]);

  // --- Initial scroll to bottom / scroll after sending new message ---
  useLayoutEffect(() => {
    if (!messageListRef.current || isLoadingMessages) return;

    // Initial load: scroll to bottom if no user scrolling has happened
    if (
      messages.length > 0 &&
      !isUserScrollingUp.current &&
      !scrollStateBeforeFetch.current.scrollHeight
    ) {
      scrollToBottom();
      return;
    }

    // After sending a new message (optimistically or from server)
    if (shouldScrollToBottom.current) {
      scrollToBottom();
      shouldScrollToBottom.current = false;
    }
  }, [messages.length, isLoadingMessages, scrollToBottom]);

  // --- Handle scroll to fetch older messages and show/hide new message button ---
  const handleScroll = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const { scrollTop, scrollHeight, clientHeight } = listEl;
    const scrollThreshold = 50;

    // Determine if the user is scrolled up
    isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > scrollThreshold;

    // If user scrolls back down, hide the new message button
    if (!isUserScrollingUp.current) {
      setShowNewMessageButton(false);
    }

    // Fetch older messages when scrolled to top
    if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
      scrollStateBeforeFetch.current = {
        scrollTop: listEl.scrollTop,
        scrollHeight: listEl.scrollHeight,
      };
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, setShowNewMessageButton]);

  // Effect to attach/detach scroll listener
  useEffect(() => {
    const currentRef = messageListRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // --- Scroll position restoration after fetching older messages ---
  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;
    if (!isFetchingNextPage && scrollStateBeforeFetch.current.scrollHeight > 0) {
      const { scrollTop: oldScrollTop, scrollHeight: oldScrollHeight } =
        scrollStateBeforeFetch.current;
      const newScrollHeight = listEl.scrollHeight;
      const heightDifference = newScrollHeight - oldScrollHeight;
      listEl.scrollTop = oldScrollTop + heightDifference;
      scrollStateBeforeFetch.current = { scrollTop: 0, scrollHeight: 0 };
    }
  }, [isFetchingNextPage, messages]); // messages dependency ensures it runs after new messages are loaded

  // --- New message button visibility logic ---
  useEffect(() => {
    // If no messages, reset prevLastMessageId
    if (messages.length === 0) {
      prevLastMessageId.current = null;
      return;
    }

    const newLastMessage = messages[messages.length - 1];

    // Check if a truly new message was added to the end of the list
    // (This avoids showing the button when scrolling up and initial messages load)
    const isNewMessageAdded = newLastMessage._id !== prevLastMessageId.current;

    if (isNewMessageAdded) {
      // Show button ONLY if user is scrolled up AND the new message is NOT from the current user
      if (isUserScrollingUp.current && newLastMessage.sender?._id !== currentUser?._id) {
        setShowNewMessageButton(true);
      }
    }

    // Update the ref for the next comparison
    prevLastMessageId.current = newLastMessage._id;
  }, [messages, currentUser?._id, isUserScrollingUp, setShowNewMessageButton]); // Add all dependencies

  // Socket event for ban/unban (Keep this logic here, it updates React Query cache)
  useEffect(() => {
    if (socket) {
      socket.on("bannedFromPublicChat", ({ isBanned }) => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        if (isBanned) {
          // Clear public messages if banned to avoid showing old content
          queryClient.setQueryData(["publicMessages"], (oldData) => ({
            pages: [[]],
            pageParams: [undefined],
          }));
        } else {
          // Refetch messages if unbanned
          queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
        }
      });

      return () => {
        socket.off("bannedFromPublicChat");
      };
    }
  }, [socket, queryClient]); // Removed currentUser and refetchAuthUser from dependencies, as queryClient handles invalidation.

  // --- Optimized Message Grouping Logic (Pure function used in useMemo) ---
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    // Helper to get sender ID, handling both object and string formats and ensuring profileImg/username
    const getSenderInfo = (msg) => {
      const sender = msg.sender;
      const id = typeof sender === "object" ? sender._id : sender;
      const profileImg =
        typeof sender === "object" && sender?.profileImg
          ? sender.profileImg
          : "/public/avatar-placeholder.png";
      const username =
        typeof sender === "object" && sender?.username ? sender.username : undefined;
      return { id, profileImg, username };
    };

    let lastMessageDate = null; // This will correctly track date across the loop for isNewDay
    const enhanced = messages.map((message, index) => {
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];

      const currentSender = getSenderInfo(message);
      const prevSender = prevMessage ? getSenderInfo(prevMessage) : null;
      const nextSender = nextMessage ? getSenderInfo(nextMessage) : null;

      let isNewDay = false;
      if (lastMessageDate) {
        const messageDate = new Date(message.createdAt);
        const lastDate = new Date(lastMessageDate); // lastMessageDate is just a string, so parse it
        isNewDay =
          messageDate.getDate() !== lastDate.getDate() ||
          messageDate.getMonth() !== lastDate.getMonth() ||
          messageDate.getFullYear() !== lastDate.getFullYear();
      } else {
        isNewDay = true; // First message always starts a new day block
      }
      lastMessageDate = message.createdAt; // Update for the next iteration

      const isTimeThresholdExceededPrev = prevMessage
        ? new Date(message.createdAt).getTime() -
            new Date(prevMessage.createdAt).getTime() >
          MESSAGE_GROUP_TIME_THRESHOLD_MS
        : true; // If no previous message, it's a new group

      const isFirstInGroup =
        !prevMessage ||
        currentSender.id !== prevSender.id ||
        isNewDay ||
        isTimeThresholdExceededPrev;

      const isTimeThresholdExceededNext = nextMessage
        ? new Date(nextMessage.createdAt).getTime() -
            new Date(message.createdAt).getTime() >
          MESSAGE_GROUP_TIME_THRESHOLD_MS
        : true; // If no next message, it's the last in its group

      const isLastInGroup =
        !nextMessage || currentSender.id !== nextSender.id || isTimeThresholdExceededNext;

      // Determine showHeaderInfo
      // Show header if it's the first in a group or if it's a reply (to break grouping visually)
      const showHeaderInfo = isFirstInGroup || !!message.repliedTo;

      return {
        ...message, // Include all original message properties
        isNewDay, // New property for date separators
        isFirstInGroup,
        isLastInGroup,
        showHeaderInfo,
        senderProfileImg: currentSender.profileImg,
        senderUsername: currentSender.username,
      };
    });
    return enhanced;
  }, [messages, currentUser?._id]); // messages and currentUser._id are dependencies

  // Render Logic for Loading/Error states (simplified for initial load)
  if (isLoadingMessages && processedMessages.length === 0) {
    // Check processedMessages length
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error handling
  if (isMessagesError && processedMessages.length === 0 && !isLoadingMessages) {
    return (
      <div className="flex justify-center items-center h-full text-red-500">
        <p>Error loading messages: {messagesError?.message || "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative md:border-r border-accent ">
      <PublicChatHeader />
      {isCurrentUserBanned ? (
        <div className="flex flex-grow items-center justify-center">
          <div className="bg-base-100 p-6 rounded-2xl border-accent text-center mx-auto my-5 max-w-sm shadow-lg animate-fade-in">
            <p className="mb-3 font-bold text-lg">
              You are currently banned from the public chat.
            </p>
            <p className="text-base">You cannot view messages or send new ones.</p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="flex-grow overflow-y-auto p-4 pb-7 min-h-0"
            ref={messageListRef}
          >
            {isFetchingNextPage && (
              <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
                <LoadingSpinner size="sm" />
              </div>
            )}
            <div className="mx-auto w-full max-w-3xl md:max-w-[968px] mt-16">
              {!hasNextPage &&
                !isLoadingMessages && // Use isLoadingMessages instead of isLoadingInitialMessages
                !isFetchingNextPage &&
                processedMessages.length > 0 && ( // Use processedMessages for length check
                  <div className="flex justify-center text-gray-500 text-sm my-2">
                    <p>This is the start of your conversation</p>
                  </div>
                )}

              {/* Render processed messages using PublicChatMessage component */}
              {processedMessages.map((message) => (
                <PublicChatMessage
                  key={message._id}
                  message={message} // Pass the fully processed message object
                  currentUser={currentUser}
                  onLoadImage={handleLoadImage} // Renamed to `onLoadImage` for consistency
                  onReactionAdded={handleReactionAdded}
                  publicChatInputRef={publicChatInputRef}
                  // These handlers now interact with Zustand directly from PublicChatMessage
                  // No need to pass them down as props here:
                  // onDelete, onBan, onUnban, isCurrentlyTouchDevice, activeMessageModalId,
                  // handleMouseEnter, handleMouseLeave, handleMessageTap, handleReactionClick,
                  // onReply, onEdit, onJumpToMessage, setEditingMessage, setReplyingToMessage
                />
              ))}
            </div>

            {showNewMessageButton && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={handleNewMessageButtonClick}
                  className="bg-primary text-sm px-3 py-1 text-white rounded-full shadow-lg flex items-center space-x-2 animate-bounce"
                >
                  <span>New Message</span>
                  <FaCaretDown />
                </button>
              </div>
            )}
          </div>

          <PublicMessageInput
            isCurrentUserBanned={isCurrentUserBanned}
            // editingMessage={editingMessage}
            // setEditingMessage={setEditingMessage}
            // replyingToMessage={replyingToMessage}
            // setReplyingToMessage={setReplyingToMessage}
            publicChatInputRef={publicChatInputRef}
            sendTypingEvent={sendTypingEvent}
            isSomeoneTyping={isSomeoneTyping}
            typingUsers={typingUsers}
          />
        </>
      )}
    </div>
  );
};

export default PublicChatWindow;
