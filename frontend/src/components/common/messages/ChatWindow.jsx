import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../../context/SocketContext";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { useDeleteMessage } from "../../../hooks/messagesHooks/useDeleteMessage";
import { useSendMessage } from "../../../hooks/messagesHooks/useSendMessage";
import { useFetchMessages } from "../../../hooks/messagesHooks/useFetchMessages";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import { FaCaretDown } from "react-icons/fa";

const ChatWindow = ({
  selectedConversation,
  onBackToConversations,
  onNewConversationCreated,
  openImageModal,
}) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const { socket, setActiveConversationId } = useSocket();

  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [isTypingOtherUser, setIsTypingOtherUser] = useState(false);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);

  const messageInputRef = useRef(null);
  const currentOptimisticIdRef = useRef(null);
  const messageListRef = useRef(null);
  // This ref will now store the scrollTop *before* a fetch and its previous scrollHeight
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });

  const didMessageJustLanded = useRef(false); // Renamed for clarity: `didMessageJustArriveOrSend` -> `didMessageJustLanded`

  const resizeObserverRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const actualConversationId = selectedConversation?.isNewChat
    ? null
    : selectedConversation?._id;

  const shouldScrollOnFirstFullLoad = useRef(true);
  const prevActualConversationIdRef = useRef(actualConversationId);

  const isNewOrTemporaryChat =
    selectedConversation?.isNewChat || selectedConversation?.isTemporary;

  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  const { deleteMessage, isDeletingMessage } = useDeleteMessage(actualConversationId);
  const {
    messages,
    isLoading,
    error,
    refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useFetchMessages(selectedConversation);

  const isNewChat =
    selectedConversation.isNewChat ||
    (!messages?.length && !isLoading && !error && actualConversationId);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  const handleOptimisticScroll = useCallback(() => {
    didMessageJustLanded.current = true;
  }, []);

  const { sendMessage, isSendingMessage } = useSendMessage({
    selectedConversation,
    isNewOrTemporaryChat,
    onNewConversationCreated,
    replyingToMessage,
    currentOptimisticIdRef,
    actualConversationId,
    onMessageSentOptimistically: handleOptimisticScroll,
  });

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

          if (newScrollHeight > oldScrollHeight) {
            const scrollThreshold = 100;
            const isUserAtBottom =
              listEl.scrollHeight - listEl.scrollTop <=
              listEl.clientHeight + scrollThreshold;

            if (isUserAtBottom || didMessageJustLanded.current) {
              scrollToBottom();
              didMessageJustLanded.current = false;
              setShowNewMessageButton(false);
            }
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
  }, [scrollToBottom, actualConversationId]);

  // --- Primary scrolling logic for initial load, conversation change, and optimistic sends ---
  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const conversationChanged =
      prevActualConversationIdRef.current !== actualConversationId;

    if (conversationChanged) {
      shouldScrollOnFirstFullLoad.current = true;
      prevActualConversationIdRef.current = actualConversationId;
      // didMessageJustLanded.current = true; // Force scroll on new conversation
    }

    const isReadyForAnyScroll =
      (shouldScrollOnFirstFullLoad.current && !isLoading && messages.length > 0) ||
      didMessageJustLanded.current;

    if (isReadyForAnyScroll) {
      scrollToBottom();
      shouldScrollOnFirstFullLoad.current = false;
      didMessageJustLanded.current = false;
      setShowNewMessageButton(false);
    }
  }, [messages, isLoading, actualConversationId, scrollToBottom]);

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

        // Fetch more messages when near top
        if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
          // Store the current scroll position and scroll height BEFORE fetching new data
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

    if (
      !isFetchingNextPage &&
      scrollStateBeforeFetch.current.scrollHeight > 0 // Ensure we had a pending fetch
    ) {
      const { scrollTop: oldScrollTop, scrollHeight: oldScrollHeight } =
        scrollStateBeforeFetch.current;
      const newScrollHeight = listEl.scrollHeight;

      const heightDifference = newScrollHeight - oldScrollHeight

      listEl.scrollTop = oldScrollTop + heightDifference;


      scrollStateBeforeFetch.current = { scrollTop: 0, scrollHeight: 0 };
    }
  }, [messages, isFetchingNextPage]); 

  // --- Socket and active conversation management ---
  useEffect(() => {
    setActiveConversationId(actualConversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [actualConversationId, setActiveConversationId]);

  useEffect(() => {
    setActiveConversationId(actualConversationId);

    if (socket) {
      socket.emit("userActiveInChat", { conversationId: actualConversationId });
    }

    if (socket && actualConversationId && currentUser?._id) {
      socket.emit("markMessagesAsSeen", { conversationId: actualConversationId });
    }

    return () => {
      setActiveConversationId(null);
      if (socket) {
        socket.emit("userActiveInChat", { conversationId: null });
      }
    };
  }, [socket, actualConversationId, currentUser?._id, setActiveConversationId]);

  // --- Socket event listeners and handling new messages from others ---
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        const targetMessagesQueryKey = ["messages", newMessage.conversationId];

        const isMessageForCurrentlyActiveChat =
          newMessage.conversationId === actualConversationId ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === otherUser?._id.toString() &&
            newMessage.recipientId?.toString() === currentUser._id.toString() &&
            !actualConversationId);

        queryClient.setQueryData(targetMessagesQueryKey, (oldData) => {
          if (!oldData || !oldData.pages || oldData.pages.length === 0) {
            return { pages: [[newMessage]], pageParams: [1] };
          }
          const newData = { ...oldData };
          const firstPageMessages = newData.pages[0].filter(
            (msg) =>
              msg._id !== newMessage._id && msg._id !== currentOptimisticIdRef.current
          );

          if (
            newMessage.sender._id.toString() === currentUser._id.toString() &&
            currentOptimisticIdRef.current &&
            oldData.pages[0].some(
              (msg) => msg._id === currentOptimisticIdRef.current && msg.isOptimistic
            )
          ) {
            newData.pages[0] = [
              ...firstPageMessages,
              { ...newMessage, isOptimistic: undefined },
            ];
            currentOptimisticIdRef.current = null;
          } else {
            newData.pages[0] = [...firstPageMessages, newMessage];
          }
          return newData;
        });

        queryClient.invalidateQueries({
          queryKey: targetMessagesQueryKey,
          refetchType: "none",
        });

        if (isMessageForCurrentlyActiveChat) {
          const listEl = messageListRef.current;
          if (listEl) {
            const scrollThreshold = 100;
            const isAtBottom =
              listEl.scrollHeight - listEl.scrollTop <=
              listEl.clientHeight + scrollThreshold;

            if (
              isAtBottom ||
              newMessage.sender._id.toString() === currentUser._id.toString()
            ) {
              didMessageJustLanded.current = true;
              setShowNewMessageButton(false);
            } else {
              if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
                setShowNewMessageButton(true);
              }
            }
          }
          if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
            socket.emit("markMessagesAsSeen", {
              conversationId: newMessage.conversationId,
            });
          }
        }
      };

      const handleMessagesSeen = ({ conversationId: seenConversationId, readerId }) => {
        if (seenConversationId.toString() === actualConversationId?.toString()) {
          queryClient.setQueryData(["messages", actualConversationId], (oldData) => {
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.map((msg) =>
                msg.sender._id.toString() === currentUser._id.toString() && !msg.seen
                  ? { ...msg, seen: true }
                  : msg
              )
            );
            return { ...oldData, pages: updatedPages };
          });
        }
      };

      const handleMessageDeleted = ({
        messageId,
        conversationId: deletedConversationId,
      }) => {
        if (deletedConversationId.toString() === actualConversationId?.toString()) {
          queryClient.setQueryData(["messages", actualConversationId], (oldData) => {
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.filter((msg) => msg._id !== messageId)
            );
            return { ...oldData, pages: updatedPages };
          });
        }
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      };

      const handleTyping = ({ conversationId, userId }) => {
        if (
          conversationId === actualConversationId &&
          userId === otherUser?._id.toString()
        ) {
          setIsTypingOtherUser(true);
        }
      };

      const handleStopTyping = ({ conversationId, userId }) => {
        if (
          conversationId === actualConversationId &&
          userId === otherUser?._id.toString()
        ) {
          setIsTypingOtherUser(false);
        }
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("messageDeleted", handleMessageDeleted);
      socket.on("messagesSeen", handleMessagesSeen);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messageDeleted", handleMessageDeleted);
        socket.off("messagesSeen", handleMessagesSeen);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
      };
    }
  }, [
    socket,
    actualConversationId,
    queryClient,
    otherUser?._id,
    currentUser._id,
    currentUser.username,
    currentUser.profileImg,
    currentUser.fullName,
    selectedConversation,
    currentOptimisticIdRef,
    setShowNewMessageButton,
  ]);

  const memoizedSetReplyingToMessage = useCallback((message) => {
    setReplyingToMessage(message);
  }, []);

  const memoizedDeleteMessage = useCallback(
    (messageId) => {
      deleteMessage(messageId);
    },
    [deleteMessage]
  );

  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom();
    setShowNewMessageButton(false);
  }, [scrollToBottom]);

  return (
    <div className="flex flex-col h-full relative md:border-r border-accent">
      <ChatHeader onBackToConversations={onBackToConversations} otherUser={otherUser} />

      <MessageList
        ref={messageListRef}
        error={error}
        isNewChat={isNewChat}
        messagesToRender={messages}
        setReplyingToMessage={memoizedSetReplyingToMessage}
        deleteMessage={memoizedDeleteMessage}
        messageInputRef={messageInputRef}
        isDeletingMessage={isDeletingMessage}
        messages={messages}
        openImageModal={openImageModal}
        selectedConversation={selectedConversation}
        isLoadingInitialMessages={isLoading && !isFetchingNextPage}
        isFetchingOlderMessages={isFetchingNextPage}
        hasNextPage={hasNextPage}
        selectedConversationId={selectedConversation?._id}
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
        replyingToMessage={replyingToMessage}
        setReplyingToMessage={memoizedSetReplyingToMessage}
        actualConversationId={actualConversationId}
        currentOptimisticIdRef={currentOptimisticIdRef}
        messageInputRef={messageInputRef}
        isTypingOtherUser={isTypingOtherUser}
        sendMessage={sendMessage}
        isSendingMessage={isSendingMessage}
        selectedConversation={selectedConversation}
        socket={socket}
      />
    </div>
  );
};

export default ChatWindow;
