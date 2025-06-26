import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useDeleteMessage } from "../../hooks/messagesHooks/useDeleteMessage";
import { useSendMessage } from "../../hooks/messagesHooks/useSendMessage";
import { useFetchMessages } from "../../hooks/messagesHooks/useFetchMessages";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";

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

  const messageInputRef = useRef(null);
  const currentOptimisticIdRef = useRef(null);
  const messageListRef = useRef(null); // Ref for the scrollable message list
  const scrollHeightBeforeFetch = useRef(0); // Ref to store scroll height for scroll preservation
  const shouldScrollToBottomRef = useRef(true);

  const actualConversationId = selectedConversation?.isNewChat
    ? null
    : selectedConversation?._id;

  const isNewOrTemporaryChat =
    selectedConversation?.isNewChat || selectedConversation?.isTemporary;

  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  const { deleteMessage, isDeletingMessage } = useDeleteMessage(actualConversationId);
  const {
    messages, // This is now the flattened array from useInfiniteQuery
    isLoading,
    error,
    refetchMessages, // This is `refetch` from useInfiniteQuery
    fetchNextPage, // Function to load next page of messages
    hasNextPage, // Boolean: true if there are more pages
    isFetchingNextPage, // Boolean: true if a new page is being fetched
  } = useFetchMessages(selectedConversation);

  const { sendMessage, isSendingMessage } = useSendMessage({
    selectedConversation,
    isNewOrTemporaryChat,
    onNewConversationCreated,
    replyingToMessage,
    currentOptimisticIdRef,
    actualConversationId,
  });

  // --- Scroll to Bottom Logic ---
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom only when the conversation changes or a new message is added,
    // but NOT when loading older messages.
    if (!isLoading && shouldScrollToBottomRef.current) {
      // We delay this slightly to ensure images and other content have rendered
      setTimeout(() => {
        scrollToBottom();
        shouldScrollToBottomRef.current = false;
      }, 0);
    }
  }, [messages, isLoading, scrollToBottom]);

  // When a new conversation is selected, mark for scroll to bottom
  useEffect(() => {
    if (actualConversationId) {
      shouldScrollToBottomRef.current = true;
      refetchMessages(); // Re-fetch messages for the new conversation
    }
  }, [actualConversationId, refetchMessages]);

  // --- Infinite Scroll (Load More) Logic ---
  useEffect(() => {
    const handleScroll = () => {
      const listEl = messageListRef.current;
      if (listEl) {
        const { scrollTop } = listEl;
        // Load more messages when scrolled near the top
        if (scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
          // 👇 FIX: Before fetching, store the current scroll height.
          scrollHeightBeforeFetch.current = listEl.scrollHeight;
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (listEl && scrollHeightBeforeFetch.current > 0) {
      const newScrollHeight = listEl.scrollHeight;
      // Adjust scrollTop to keep the user's view stable
      listEl.scrollTop += newScrollHeight - scrollHeightBeforeFetch.current;
      // Reset the stored height
      scrollHeightBeforeFetch.current = 0;
    }
  }, [messages]); // Run this effect whenever the messages array changes

  // --- Socket and Optimistic Updates (Crucial changes here) ---
  useEffect(() => {
    setActiveConversationId(actualConversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [actualConversationId, setActiveConversationId]);

  useEffect(() => {
    if (socket && actualConversationId && currentUser?._id) {
      socket.emit("markMessagesAsSeen", { conversationId: actualConversationId });
      socket.emit("userActiveInChat", { conversationId: actualConversationId });
    } else {
      socket.emit("userActiveInChat", { conversationId: null });
    }
  }, [socket, actualConversationId, currentUser]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        const isMessageForThisChat =
          newMessage.conversationId === actualConversationId ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === otherUser?._id.toString() &&
            newMessage.recipientId?.toString() === currentUser._id.toString());

        if (isMessageForThisChat) {
          queryClient.setQueryData(
            ["messages", newMessage.conversationId || actualConversationId],
            (oldData) => {
              // oldData is now the useInfiniteQuery data object: { pages: [], pageParams: [] }
              const newPages = oldData ? [...oldData.pages] : [];
              const lastPage = newPages[newPages.length - 1] || [];

              // Check if the message already exists in the last page (e.g., optimistic update replaced by actual)
              if (
                !lastPage.some(
                  (msg) =>
                    msg._id === newMessage._id ||
                    msg._id === currentOptimisticIdRef.current
                )
              ) {
                // If it's a new message, append it to the last page
                // Or if it's the actual message replacing an optimistic one, replace it
                const updatedLastPage = lastPage.filter(
                  (msg) =>
                    msg.isOptimistic !== true ||
                    msg._id !== currentOptimisticIdRef.current
                );
                newPages[newPages.length - 1] = [...updatedLastPage, newMessage];
              } else {
                // If the message already exists (e.g., optimistic update getting its real ID),
                // find and update it. This is important if you use optimistic IDs.
                newPages[newPages.length - 1] = lastPage.map((msg) =>
                  msg._id === newMessage._id || msg._id === currentOptimisticIdRef.current
                    ? { ...newMessage, isOptimistic: undefined } // Remove optimistic flag
                    : msg
                );
              }
              shouldScrollToBottomRef.current = true; // Mark for scroll after adding new message
              return { ...oldData, pages: newPages };
            }
          );

          shouldScrollToBottomRef.current = true;


          if (newMessage.sender._id.toString() === otherUser?._id.toString()) {
            socket.emit("markMessagesAsSeen", {
              conversationId: newMessage.conversationId,
            });
          }
        }

        queryClient.invalidateQueries(["conversations", newMessage.conversationId]);
        queryClient.invalidateQueries(["conversations"]);
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
        queryClient.invalidateQueries(["conversations", seenConversationId]);
        queryClient.invalidateQueries(["conversations"]);
      };

      const handleMessageDeleted = ({
        messageId,
        conversationId: deletedConversationId,
      }) => {
        if (deletedConversationId.toString() === actualConversationId?.toString()) {
          queryClient.setQueryData(["messages", actualConversationId], (oldData) => {
            // oldData is the useInfiniteQuery data object
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.filter((msg) => msg._id !== messageId)
            );
            return { ...oldData, pages: updatedPages };
          });
        }
        queryClient.invalidateQueries(["conversations"]);
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
    otherUser,
    currentUser,
    selectedConversation,
    currentOptimisticIdRef,
    shouldScrollToBottomRef, // Add this ref to dependencies
  ]);

  const isNewChat =
    selectedConversation.isNewChat ||
    (!messages?.length && !isLoading && !error && actualConversationId);

  // `messages` from useFetchMessages is already flattened.
  // We remove the `messagesToDisplay` and `messagesToRender` useMemos
  // and directly use the `messages` array from the hook.
  // You might want to adjust the optimistic filtering if `sendMessage` is also managing it.

  const memoizedSetReplyingToMessage = useCallback((message) => {
    setReplyingToMessage(message);
  }, []);

  const memoizedDeleteMessage = useCallback(
    (messageId) => {
      deleteMessage(messageId);
    },
    [deleteMessage]
  );

  return (
    <div className="flex flex-col h-full bg-black text-white border-r border-gray-700">
      <ChatHeader onBackToConversations={onBackToConversations} otherUser={otherUser} />

      <MessageList
        ref={messageListRef} // Attach the ref here!
        error={error}
        isNewChat={isNewChat}
        messagesToRender={messages} // Use the flattened messages directly
        setReplyingToMessage={memoizedSetReplyingToMessage}
        deleteMessage={memoizedDeleteMessage}
        messageInputRef={messageInputRef}
        isDeletingMessage={isDeletingMessage}
        messages={messages} // Pass the full messages array
        openImageModal={openImageModal}
        selectedConversation={selectedConversation}
        isLoadingInitialMessages={isLoading && !isFetchingNextPage} // For initial full page load
        isFetchingOlderMessages={isFetchingNextPage} // For loading older messages
        hasNextPage={hasNextPage} // To show "load more" or "no more messages"
      />

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
