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
  const [shouldOptimisticScroll, setShouldOptimisticScroll] = useState(false);

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
    onMessageSentOptimistically: handleOptimisticScroll,
  });

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!isLoading && shouldScrollToBottomRef.current && messages.length > 0) {
      const id = setTimeout(() => {
        scrollToBottom();
        shouldScrollToBottomRef.current = false;
      }, 0);
      return () => clearTimeout(id);
    }
  }, [messages.length, isLoading, scrollToBottom]);

  useEffect(() => {
    if (shouldOptimisticScroll) {
      setTimeout(() => {
        scrollToBottom();
        setShouldOptimisticScroll(false);
      }, 0);
    }
  }, [shouldOptimisticScroll, scrollToBottom]);

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

    // We only want to adjust scroll when we've finished fetching new pages
    // AND there was a scrollHeight recorded before the fetch started.
    if (listEl && scrollHeightBeforeFetch.current > 0 && !isFetchingNextPage) {
      const newScrollHeight = listEl.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightBeforeFetch.current;

      // Check if new content was actually added (height increased)
      if (heightDifference > 0) {
        // Restore scroll position based on the new content added
        listEl.scrollTop += heightDifference;
      }

      // Reset the stored scroll height after adjustment
      scrollHeightBeforeFetch.current = 0;
    }
  }, [messages, isFetchingNextPage]); // Keep these dependencies as they are.

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

              if (newPages.length === 0) {
                return { pages: [[newMessage]], pageParams: [1] };
              }

              const firstPage = [...newPages[0]];
              const updatedFirstPage = firstPage.filter(
                (msg) =>
                  msg.isOptimistic !== true || msg._id !== currentOptimisticIdRef.current
              );

              newPages[0] = [...updatedFirstPage, newMessage];

              const finalPages = newPages.map((page) =>
                page.map((msg) =>
                  msg._id === currentOptimisticIdRef.current
                    ? { ...newMessage, isOptimistic: undefined }
                    : msg
                )
              );

              shouldScrollToBottomRef.current = true;
              return { ...oldData, pages: finalPages };
            }
          );

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
    shouldScrollToBottomRef,
  ]);

  const isNewChat =
    selectedConversation.isNewChat ||
    (!messages?.length && !isLoading && !error && actualConversationId);

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
