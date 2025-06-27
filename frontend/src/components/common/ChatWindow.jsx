import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
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
  const messageListRef = useRef(null);
  const scrollHeightBeforeFetch = useRef(0);
  const shouldScrollToBottomRef = useRef(true);
  const [shouldOptimisticScroll, setShouldOptimisticScroll] = useState(false); // New state for optimistic scroll

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
    messages,
    isLoading,
    error,
    refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFetchMessages(selectedConversation);

  // Callback to trigger optimistic scroll
  const handleOptimisticScroll = useCallback(() => {
    setShouldOptimisticScroll(true);
  }, []);

  const { sendMessage, isSendingMessage } = useSendMessage({
    selectedConversation,
    isNewOrTemporaryChat,
    onNewConversationCreated,
    replyingToMessage,
    currentOptimisticIdRef,
    actualConversationId,
    onMessageSentOptimistically: handleOptimisticScroll, // Pass the new callback
  });

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isLoading && shouldScrollToBottomRef.current) {
      setTimeout(() => {
        scrollToBottom();
        shouldScrollToBottomRef.current = false;
      }, 50);
    }
  }, [messages, isLoading, scrollToBottom]);

  // Effect for immediate optimistic scroll
  useEffect(() => {
    if (shouldOptimisticScroll) {
      setTimeout(() => {
        scrollToBottom();
        setShouldOptimisticScroll(false); // Reset the flag
      }, 0); // Immediate execution
    }
  }, [shouldOptimisticScroll, scrollToBottom]);

  useEffect(() => {
    if (actualConversationId) {
      shouldScrollToBottomRef.current = true;
      refetchMessages();
    }
  }, [actualConversationId, refetchMessages]);

  useEffect(() => {
    if (actualConversationId) {
      shouldScrollToBottomRef.current = true;
      refetchMessages();
    }
  }, [actualConversationId, refetchMessages]);

  useEffect(() => {
    const handleScroll = () => {
      const listEl = messageListRef.current;
      if (listEl) {
        const { scrollTop } = listEl;
        // Adjust this threshold if needed. 200px from top to trigger fetch.
        if (scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
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
      const heightDifference = newScrollHeight - scrollHeightBeforeFetch.current;

      if (heightDifference > 0) {
        listEl.scrollTop += heightDifference;
      }
      scrollHeightBeforeFetch.current = 0;
    }
  }, [messages]);

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
              const newPages = oldData ? [...oldData.pages] : [];

              // If there's no data or no pages, initialize with the new message
              if (newPages.length === 0) {
                return { pages: [[newMessage]], pageParams: [1] };
              }

              // 🔥 CRITICAL CHANGE: Add the new incoming message to the *first page* (index 0)
              // This is where new messages should always go.
              const firstPage = [...newPages[0]]; // Copy the first page
              const updatedFirstPage = firstPage.filter(
                (msg) =>
                  msg.isOptimistic !== true || msg._id !== currentOptimisticIdRef.current
              ); // Filter out any pending optimistic message with the same ID if it happens to be there
              // (though onSuccess should have handled it, this is a safeguard)

              newPages[0] = [...updatedFirstPage, newMessage]; // Add the new message to the first page

              // Ensure optimistic message (if present) is replaced by the real one
              // This logic is important to ensure the real message replaces the optimistic placeholder
              // even if the socket event arrives slightly before the mutation's onSuccess.
              // This entire mapping is a bit redundant if onSuccess handles it perfectly,
              // but it serves as a robust fallback.
              const finalPages = newPages.map((page) =>
                page.map((msg) =>
                  msg._id === currentOptimisticIdRef.current
                    ? { ...newMessage, isOptimistic: undefined } // Replace and remove optimistic flag
                    : msg
                )
              );

              shouldScrollToBottomRef.current = true; // Still set this for new incoming socket messages
              return { ...oldData, pages: finalPages };
            }
          );

          // ... rest of handleNewMessage (seen status, invalidate conversations) ...
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
