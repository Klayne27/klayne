// components/ChatWindow.jsx
import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../../context/SocketContext"; // Still needed for setActiveConversationId
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useFetchMessages } from "../../../hooks/messagesHooks/useFetchMessages";
// Import the new socket events hook
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import { FaCaretDown } from "react-icons/fa";
import { IoChatbubblesOutline } from "react-icons/io5";
import { usePrivateChatStore } from "../../../store/usePrivateChatStore";
import { usePrivateChatSocketEvents } from "../../../hooks/usePrivateChatSocketEvents";

const ChatWindow = () => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const currentUserId = currentUser?._id;
  const { setActiveConversationId, socket } = useSocket(); // Only need setActiveConversationId from useSocket here

  const isTypingOtherUser = usePrivateChatStore((state) => state.isTypingOtherUser);
  const setIsTypingOtherUser = usePrivateChatStore((state) => state.setIsTypingOtherUser);
  const showNewMessageButton = usePrivateChatStore((state) => state.showNewMessageButton);
  const setShowNewMessageButton = usePrivateChatStore(
    (state) => state.setShowNewMessageButton
  );
  const selectedConversation = usePrivateChatStore((state) => state.selectedConversation);

  const conversationId = selectedConversation?._id;

  const privateChatInputRef = useRef(null);
  const currentOptimisticIdRef = useRef(null);
  const messageListRef = useRef(null);
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });

  const didMessageJustLanded = useRef(false);

  const resizeObserverRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const shouldScrollOnFirstFullLoad = useRef(true);
  const prevActualConversationIdRef = useRef(conversationId);

  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  const { messages, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFetchMessages(conversationId);

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]._id : null;

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  // NEW: Function to explicitly trigger scroll-to-bottom after a reaction
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

  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    prevScrollHeightRef.current = listEl.scrollHeight;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === listEl) {
          const newScrollHeight = listEl.scrollHeight;
          const oldScrollHeight = prevScrollHeightRef.current;

          const scrollThreshold = 100;
          const isUserAtBottom =
            listEl.scrollHeight - listEl.scrollTop <=
            listEl.clientHeight + scrollThreshold;

          if (didMessageJustLanded.current) {
            setTimeout(() => {
              scrollToBottom();
              setShowNewMessageButton(false);
              didMessageJustLanded.current = false;
            }, 50);
          } else if (newScrollHeight > oldScrollHeight && isUserAtBottom) {
            scrollToBottom();
            setShowNewMessageButton(false);
          }
          prevScrollHeightRef.current = newScrollHeight;
        }
      }
    });

    resizeObserverRef.current.observe(listEl);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [scrollToBottom, conversationId, setShowNewMessageButton]);

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
  }, [scrollToBottom, setShowNewMessageButton]);

  // --- Primary scrolling logic for initial load, conversation change, and optimistic sends ---
  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 100;

    const conversationChanged = prevActualConversationIdRef.current !== conversationId;

    if (conversationChanged) {
      shouldScrollOnFirstFullLoad.current = true;
      prevActualConversationIdRef.current = conversationId;
      didMessageJustLanded.current = true;
    }

    const isAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    const isReadyForAnyScroll =
      (shouldScrollOnFirstFullLoad.current && !isLoading && messages.length > 0) ||
      didMessageJustLanded.current;

    if (isReadyForAnyScroll) {
      scrollToBottom();
      shouldScrollOnFirstFullLoad.current = false;
      didMessageJustLanded.current = false;
      setShowNewMessageButton(false);
    }

    if (isAtBottom) {
      scrollToBottom();
    }
  }, [
    messages.length,
    isLoading,
    conversationId,
    scrollToBottom,
    lastMessageId,
    setShowNewMessageButton,
  ]);

  useEffect(() => {
    if (isTypingOtherUser) {
      const listEl = messageListRef.current;
      if (listEl) {
        const scrollThreshold = 100;
        const isUserAtBottom =
          listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

        if (isUserAtBottom) {
          const timeoutId = setTimeout(() => {
            scrollToBottom();
          }, 1);
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [isTypingOtherUser, scrollToBottom]);

  // --- Existing scroll handling for fetching older messages ---
  useEffect(() => {
    const handleScroll = () => {
      const listEl = messageListRef.current;
      if (listEl) {
        const { scrollTop, scrollHeight, clientHeight } = listEl;
        const scrollThreshold = 100;

        if (scrollHeight - scrollTop <= clientHeight + scrollThreshold) {
          setShowNewMessageButton(false);
        } else {
          if (didMessageJustLanded.current) {
            didMessageJustLanded.current = false;
          }
        }

        if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
          scrollStateBeforeFetch.current = {
            scrollTop: listEl.scrollTop,
            scrollHeight: listEl.scrollHeight,
          };
          fetchNextPage();
        }
      }
    };

    const currentMessageListRef = messageListRef.current;
    if (currentMessageListRef) {
      currentMessageListRef.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (currentMessageListRef) {
        currentMessageListRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, setShowNewMessageButton]);

  // --- NEW/UPDATED: Maintain scroll position when fetching older messages ---
  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    if (isFetchingNextPage && scrollStateBeforeFetch.current.scrollHeight === 0) {
      scrollStateBeforeFetch.current = {
        scrollTop: listEl.scrollTop,
        scrollHeight: listEl.scrollHeight,
      };
    }

    if (!isFetchingNextPage && scrollStateBeforeFetch.current.scrollHeight > 0) {
      const { scrollTop: oldScrollTop, scrollHeight: oldScrollHeight } =
        scrollStateBeforeFetch.current;
      const newScrollHeight = listEl.scrollHeight;

      const heightDifference = newScrollHeight - oldScrollHeight;

      listEl.scrollTop = oldScrollTop + heightDifference;

      scrollStateBeforeFetch.current = { scrollTop: 0, scrollHeight: 0 };
    }
  }, [messages, isFetchingNextPage]);

  // --- Only this useEffect remains for conversation activation/deactivation ---
  // This one controls the global `activeConversationId`
  // and emits "userActiveInChat" and "markMessagesAsSeen" *once* when conversation changes
  useEffect(() => {
    setActiveConversationId(conversationId);
    // It's usually good to mark messages as seen when the user enters the chat
    // This could also be inside the new `usePrivateChatSocketEvents` or a mutation
    // For now, keeping it here for clarity, but consider where its side-effect truly belongs.
    // If it's *only* when the user *opens* the chat, this is okay.
    // If it's on *any new message received*, the socket handler in the new hook is better.
    if (socket && conversationId && currentUserId) {
      socket.emit("markMessagesAsSeen", { conversationId: conversationId });
    }
    queryClient.invalidateQueries({ queryKey: ["conversations"] }); // Update sidebar if seen status changes

    return () => {
      setActiveConversationId(null);
      // Only emit `userActiveInChat` with null here if this component controls the
      // "global" active status, otherwise, the `usePrivateChatSocketEvents` cleanup might be enough.
      // If this `userActiveInChat` is for a UI indicator (like a global "user is chatting" status), keep it.
    };
  }, [conversationId, setActiveConversationId, socket, currentUserId, queryClient]);

  // --- Call the new socket events hook here ---
  // We pass the refs and setters it needs to interact with the DOM and Zustand store.
  usePrivateChatSocketEvents(
    conversationId,
    messageListRef,
    didMessageJustLanded,
    setShowNewMessageButton,
    setIsTypingOtherUser,
    otherUser
  );

  const handleNewMessageButtonClick = () => {
    scrollToBottom();
    setShowNewMessageButton(false);
    didMessageJustLanded.current = false;
  };

  const isChatEmpty = !messages?.length && !isLoading;

  return (
    <div className="flex flex-col h-full relative md:border-r border-accent">
      <ChatHeader otherUser={otherUser} />
      {isChatEmpty && (
        <div className="flex flex-col items-center justify-end h-full text-center p-4">
          <IoChatbubblesOutline className="text-6xl text-gray-300 mb-4" />
          <p className="text-xl font-semibold  mb-2">
            You're starting a new chat with @{otherUser?.username}!
          </p>
          <p className="text-base text-gray-500 italic max-w-sm">
            Say hello and send your first message to begin your conversation.
          </p>
        </div>
      )}
      <div className="mx-auto w-full flex flex-col h-full max-w-3xl md:max-w-[585px]">
        <MessageList
          ref={messageListRef}
          isNewChat={isChatEmpty}
          error={error}
          messagesToRender={messages}
          privateChatInputRef={privateChatInputRef}
          messages={messages}
          isLoadingInitialMessages={isLoading && !isFetchingNextPage}
          isFetchingOlderMessages={isFetchingNextPage}
          hasNextPage={hasNextPage}
          isTypingOtherUser={isTypingOtherUser}
          onReactionAdded={handleReactionAdded}
          handleLoadImage={handleLoadImage}
        />

        {showNewMessageButton && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleNewMessageButtonClick}
              className="bg-primary text-sm px-3 py-1 text-white rounded-full shadow-lg flex items-center space-x-2 animate-bounce-custom"
            >
              <span>New Message</span>
              <FaCaretDown />
            </button>
          </div>
        )}

        <MessageInput
          otherUser={otherUser}
          actualConversationId={conversationId}
          currentOptimisticIdRef={currentOptimisticIdRef}
          privateChatInputRef={privateChatInputRef}
          didMessageJustLanded={didMessageJustLanded}
          // The `socket` prop below can likely be removed from MessageInput
          // if it only emits and doesn't listen. MessageInput can use `useSocket` directly.
          socket={socket}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
