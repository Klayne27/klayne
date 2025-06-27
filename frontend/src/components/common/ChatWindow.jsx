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

  // useEffect(() => {
  //   if (!isLoading && shouldScrollToBottomRef.current && messages.length > 0) {
  //     const id = setTimeout(() => {
  //       scrollToBottom();
  //       shouldScrollToBottomRef.current = false;
  //     }, 0);
  //     return () => clearTimeout(id);
  //   }
  // }, [messages.length, isLoading, scrollToBottom]);

  useEffect(() => {
    if (shouldOptimisticScroll) {
      const id = requestAnimationFrame(() => {
        scrollToBottom();
        setShouldOptimisticScroll(false);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [shouldOptimisticScroll, scrollToBottom]);

  useEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    // Define a threshold for "being at the bottom"
    const scrollThreshold = 100; // e.g., within 100px of the bottom

    // Check if the user is currently at or very near the bottom
    const isAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    // When new messages arrive (messages.length changes)
    // And the user *was* at the bottom when the new message arrived
    // Or if it's the very first load of messages for the conversation (`shouldScrollToBottomRef.current` is true)
    if (isAtBottom || shouldScrollToBottomRef.current) {
      // Use requestAnimationFrame for smoother scroll after render
      const id = requestAnimationFrame(() => {
        scrollToBottom();
        shouldScrollToBottomRef.current = false; // Reset the flag after scrolling
      });
      return () => cancelAnimationFrame(id);
    }
  }, [messages.length, scrollToBottom]); // Depend on messages.length to detect new messages

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
        const { scrollTop, scrollHeight, clientHeight } = listEl;
        const scrollThreshold = 100; // Match this with the threshold used above

        // Hide button if user manually scrolls close enough to the bottom
        if (scrollHeight - scrollTop <= clientHeight + scrollThreshold) {
          setShowNewMessageButton(false);
        }

        // ... (existing logic for fetching older messages) ...
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, setShowNewMessageButton]); // Ensure setShowNewMessageButton is also a dependency if you put it inside handleScroll

  useLayoutEffect(() => {
    const listEl = messageListRef.current;

    const wasAtTopOrNear =
      scrollHeightBeforeFetch.current > 0 &&
      (listEl.scrollHeight - scrollHeightBeforeFetch.current <= 0 || // No new content, or already handled
        listEl.scrollTop <= 50); // Or whatever small threshold defines "near the top"

    if (
      listEl &&
      scrollHeightBeforeFetch.current > 0 &&
      !isFetchingNextPage &&
      wasAtTopOrNear
    ) {
      const newScrollHeight = listEl.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightBeforeFetch.current;

      if (heightDifference > 0) {
        listEl.scrollTop += heightDifference;
      }

      scrollHeightBeforeFetch.current = 0;
    }
  }, [messages, isFetchingNextPage]);

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
              if (!oldData) {
                return { pages: [[newMessage]], pageParams: [1] };
              }

              const newData = { ...oldData };
              newData.pages = [...oldData.pages];

              if (newData.pages.length === 0) {
                newData.pages.push([]);
              }

              const firstPageMessages = newData.pages[0].filter(
                (msg) =>
                  msg._id !== newMessage._id && // Filter out if real message matches existing ID
                  (msg.isOptimistic !== true ||
                    msg._id !== currentOptimisticIdRef.current) // Filter out old optimistic
              );

              newData.pages[0] = [...firstPageMessages, newMessage];
              return newData;
            }
          );

          if (newMessage.sender._id.toString() !== currentUser._id.toString()) {
            const listEl = messageListRef.current;
            if (listEl) {
              const scrollThreshold = 100;
              const isAtBottom =
                listEl.scrollHeight - listEl.scrollTop <=
                listEl.clientHeight + scrollThreshold;

              // Logic for the new message button:
              // If the message is from the other user AND the current user is NOT at the bottom
              if (newMessage.sender._id.toString() !== currentUser._id.toString()) {
                if (!isAtBottom) {
                  setShowNewMessageButton(true); // Show the button!
                } else {
                  // If a new message from other user arrives and we are at the bottom,
                  // then automatically scroll down and ensure button is hidden.
                  shouldScrollToBottomRef.current = true; // Trigger auto-scroll for incoming messages if already at bottom
                  setShowNewMessageButton(false); // Hide button if we auto-scroll
                }
              } else {
                // If it's the current user's message (confirmation of send)
                // Ensure the button is hidden, as we're handling this with optimistic scroll
                setShowNewMessageButton(false);
                shouldScrollToBottomRef.current = true; // Still trigger auto-scroll for own messages
              }
            }
          }

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


      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);

      return () => {
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

  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom(); // Use your existing scrollToBottom function
    setShowNewMessageButton(false); // Hide the button after clicking
  }, [scrollToBottom]);

  return (
    <div className="flex flex-col h-full relative bg-black text-white border-r border-gray-700">
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

      {showNewMessageButton && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleNewMessageButtonClick}
            className="bg-primary text-sm text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-2 animate-bounce-custom" // You might need to define animate-bounce-custom in your CSS
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
