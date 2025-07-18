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
  const currentUserId = currentUser?._id; // <--- Extract primitive ID

  const { socket, setActiveConversationId } = useSocket();

  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [isTypingOtherUser, setIsTypingOtherUser] = useState(false);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null); // State to hold the message being edited

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

  // NEW: Function to explicitly trigger scroll-to-bottom after a reaction
  const handleReactionAdded = useCallback(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 100; // Keep consistent with other checks
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    if (isUserAtBottom) {
      // Use a small timeout to ensure the DOM has rendered the reaction and updated scrollHeight
      setTimeout(() => {
        scrollToBottom();
        setShowNewMessageButton(false); // Hide the new message button if we scrolled
      }, 1); // Small delay to ensure DOM updates
    }
  }, [scrollToBottom, setShowNewMessageButton]);

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

  // Store the current scroll height BEFORE the ResizeObserver observes changes
  prevScrollHeightRef.current = listEl.scrollHeight;

  resizeObserverRef.current = new ResizeObserver((entries) => {
    for (let entry of entries) {
      if (entry.target === listEl) {
        const newScrollHeight = listEl.scrollHeight;
        const oldScrollHeight = prevScrollHeightRef.current;

        const scrollThreshold = 100; // Define how close to the bottom is "at the bottom"
        const isUserAtBottom =
          listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

        // Condition 1: A new message just landed (either sent by current user or received)
        // This is a strong signal to scroll.
        if (didMessageJustLanded.current) {
          // Add a small timeout here specifically for when content, like images,
          // might still be settling in terms of height. This is a safeguard.
          setTimeout(() => {
            scrollToBottom();
            setShowNewMessageButton(false);
            didMessageJustLanded.current = false; // Reset after scrolling
          }, 50); // Small delay to ensure image height is registered
        }
        // Condition 2: The scroll height increased AND the user was already at the bottom.
        // This covers cases where existing messages might expand (e.g., reactions, image loading in older messages)
        // or new content is added and the user is following along.
        else if (newScrollHeight > oldScrollHeight && isUserAtBottom) {
          scrollToBottom();
          setShowNewMessageButton(false);
        }
        // Condition 3: User manually scrolled up, so we don't automatically scroll them down
        // unless a new message is from *them* or they scroll back down.
        // This is already handled by the `setShowNewMessageButton` logic in `handleScroll`.

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

      const heightDifference = newScrollHeight - oldScrollHeight;

      listEl.scrollTop = oldScrollTop + heightDifference;

      scrollStateBeforeFetch.current = { scrollTop: 0, scrollHeight: 0 };
    }
  }, [messages, isFetchingNextPage]);

  useEffect(() => {
    if (isTypingOtherUser) {
      const listEl = messageListRef.current;
      if (listEl) {
        // Check if the user is already at the bottom or very close to it
        const scrollThreshold = 100; // Define a threshold, e.g., 100px from the bottom
        const isUserAtBottom =
          listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

        if (isUserAtBottom) {
          // Only scroll to bottom if the user is already at the bottom
          const timeoutId = setTimeout(() => {
            scrollToBottom();
          }, 1); // Small delay to allow DOM to update
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [isTypingOtherUser, scrollToBottom]);

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
      let prevConversationId; // To store the conversation ID before it changes

      if (actualConversationId) {
        // Only join if there's an actual conversation ID
        socket.emit("joinConversation", actualConversationId);
        prevConversationId = actualConversationId; // Store for cleanup
      }

      const handleNewMessage = (newMessage) => {
        const targetMessagesQueryKey = ["messages", newMessage.conversationId];

        const isMessageForCurrentlyActiveChat =
          newMessage.conversationId === actualConversationId ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === otherUser?._id.toString() &&
            newMessage.recipientId?.toString() === currentUserId.toString() &&
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
            newMessage.sender._id.toString() === currentUserId.toString() &&
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
              newMessage.sender._id.toString() === currentUserId.toString()
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
                msg.sender._id.toString() === currentUserId.toString() && !msg.seen
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

      // --- MODIFIED: handleTyping event listener ---
      const handleTyping = ({ conversationId, userId, isEditing }) => {
        if (
          conversationId === actualConversationId &&
          userId === otherUser?._id.toString()
        ) {
          if (!isEditing) {
            setIsTypingOtherUser(true);
          }
        }
      };

      const handleConversationUpdate = (updatedConversation) => {
        queryClient.setQueryData(["conversations", currentUserId], (oldConversations) => {
          if (!oldConversations) return [];

          // Find the index of the updated conversation
          const index = oldConversations.findIndex(
            (conv) => conv._id === updatedConversation._id
          );

          if (index !== -1) {
            // If found, replace it and potentially reorder to the top
            const newConversations = [...oldConversations];
            newConversations[index] = updatedConversation;

            // Optional: If you sort by updatedAt, re-sort the list
            // newConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            return newConversations;
          } else {
            // If not found (e.g., a new conversation was created), just add it
            // Or invalidate to refetch everything for simplicity if new conversations are rare
            return [updatedConversation, ...oldConversations];
          }
        });
      };

      // --- MODIFIED: handleStopTyping event listener ---
      const handleStopTyping = ({ conversationId, userId, isEditing }) => {
        if (
          conversationId === actualConversationId &&
          userId === otherUser?._id.toString()
        ) {
          // Always stop typing, regardless of whether they were editing or not.
          // The `isEditing` check is primarily for *starting* the typing indicator.
          setIsTypingOtherUser(false);
        }
      };

      // --- NEW: Handle messageEdited event ---
      const handleMessageEdited = (updatedMessage) => {
        // Check if the edited message belongs to the currently active chat
        if (
          updatedMessage.conversationId.toString() === actualConversationId?.toString()
        ) {
          queryClient.setQueryData(["messages", actualConversationId], (oldData) => {
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.map((msg) =>
                // Find the message by its ID and replace it with the updated version
                msg._id === updatedMessage._id ? updatedMessage : msg
              )
            );
            return { ...oldData, pages: updatedPages };
          });

          // Invalidate conversations query to update the lastMessage in the sidebar
          // This will cause a refetch of conversations, showing the updated last message.
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("messageDeleted", handleMessageDeleted);
      socket.on("messagesSeen", handleMessagesSeen);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("messageEdited", handleMessageEdited);
      socket.on("conversationUpdated", handleConversationUpdate);

      return () => {
        if (prevConversationId) {
          socket.emit("leaveConversation", prevConversationId);
        }
        socket.off("newMessage", handleNewMessage);
        socket.off("messageDeleted", handleMessageDeleted);
        socket.off("messagesSeen", handleMessagesSeen);
        socket.off("typing", handleTyping);
        socket.off("stopTyping", handleStopTyping);
        socket.off("messageEdited", handleMessageEdited);
        socket.off("conversationUpdated", handleConversationUpdate);
      };
    }
  }, [
    socket,
    actualConversationId,
    queryClient,
    otherUser?._id,
    currentUserId,
    // currentUser.username,
    // currentUser.profileImg,
    // currentUser.fullName,
    selectedConversation.isNewChat,
    // currentOptimisticIdRef,
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
      <div className="mx-auto w-full flex flex-col h-full max-w-3xl md:max-w-[585px]">
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
          setEditingMessage={setEditingMessage}
          isTypingOtherUser={isTypingOtherUser}
          onReactionAdded={handleReactionAdded}
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
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
        />
      </div>{" "}
    </div>
  );
};

export default ChatWindow;
