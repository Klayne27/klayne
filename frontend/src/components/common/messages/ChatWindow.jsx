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
import { useLocation } from "react-router-dom";

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
  // const { pathname } = useLocation();

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
    isFetching,
  } = useFetchMessages(selectedConversation);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

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

  const shouldScrollOnFirstFullLoad = useRef(true);
  const prevActualConversationIdRef = useRef(actualConversationId);

  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const conversationChanged =
      prevActualConversationIdRef.current !== actualConversationId;
    if (conversationChanged) {
      shouldScrollOnFirstFullLoad.current = true;
      prevActualConversationIdRef.current = actualConversationId;
    }

    const isReadyForInitialScroll =
      shouldScrollOnFirstFullLoad.current &&
      !isLoading &&
      // !isFetching &&
      messages.length > 0;

    const scrollThreshold = 100;
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    const isNewMessageCausedScroll =
      shouldOptimisticScroll ||
      (isUserAtBottom && messages.length > 0 && !conversationChanged);

    if (isReadyForInitialScroll || isNewMessageCausedScroll) {
      scrollToBottom();
      shouldScrollOnFirstFullLoad.current = false;
      setShouldOptimisticScroll(false);
      setShowNewMessageButton(false);
    }
  }, [
    messages,
    isLoading,
    isFetching,
    shouldOptimisticScroll,
    actualConversationId,
    scrollToBottom,
  ]);

  // useEffect(() => {
  //   if (!isLoading && shouldScrollToBottomRef.current && messages.length > 0) {
  //     const id = setTimeout(() => {
  //       scrollToBottom();
  //       shouldScrollToBottomRef.current = false;
  //     }, 0);
  //     return () => clearTimeout(id);
  //   }
  // }, [messages.length, isLoading, scrollToBottom]);

  // useEffect(() => {
  //   if (shouldOptimisticScroll) {
  //     scrollToBottom();
  //     setShouldOptimisticScroll(false);
  //   }
  // }, [shouldOptimisticScroll, scrollToBottom]);

  // useEffect(() => {
  //   if (actualConversationId) {
  //     shouldScrollToBottomRef.current = true;
  //   }
  // }, [actualConversationId]);

  useEffect(() => {
    const handleScroll = () => {
      const listEl = messageListRef.current;
      if (listEl) {
        const { scrollTop, scrollHeight, clientHeight } = listEl;
        const scrollThreshold = 100;

        if (scrollHeight - scrollTop <= clientHeight + scrollThreshold) {
          setShowNewMessageButton(false);
        }

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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, setShowNewMessageButton]);

  useLayoutEffect(() => {
    const listEl = messageListRef.current;

    const wasAtTopOrNear =
      scrollHeightBeforeFetch.current > 0 &&
      (listEl.scrollHeight - scrollHeightBeforeFetch.current <= 0 ||
        listEl.scrollTop <= 50);

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
    setActiveConversationId(actualConversationId);

    // Emit user active status
    if (socket) {
      socket.emit("userActiveInChat", { conversationId: actualConversationId });
    }

    if (socket && actualConversationId && currentUser?._id) {
      socket.emit("markMessagesAsSeen", { conversationId: actualConversationId });
    }

    return () => {
      // Clean up active conversation ID and user active status when leaving chat
      setActiveConversationId(null);
      if (socket) {
        socket.emit("userActiveInChat", { conversationId: null });
      }
    };
  }, [socket, actualConversationId, currentUser?._id, setActiveConversationId]); // Removed `messages` from dependencies

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        const targetMessagesQueryKey = ["messages", newMessage.conversationId];

        queryClient.setQueryData(targetMessagesQueryKey, (oldData) => {
          if (!oldData || !oldData.pages || oldData.pages.length === 0) {
            // If no data exists, initialize with the new message.
            return { pages: [[newMessage]], pageParams: [1] };
          }

          const newData = { ...oldData }; // Filter out existing message by _id to avoid duplicates if it's already there // and also filter out the optimistic one if this new message is its server-confirmed version.
          const firstPageMessages = newData.pages[0].filter(
            (msg) =>
              msg._id !== newMessage._id && msg._id !== currentOptimisticIdRef.current
          ); // Handle replacement of optimistic message for sender, or just appending for receiver

          if (
            newMessage.sender._id.toString() === currentUser._id.toString() &&
            currentOptimisticIdRef.current &&
            oldData.pages[0].some(
              (msg) => msg._id === currentOptimisticIdRef.current && msg.isOptimistic
            )
          ) {
            // Replace the optimistic message with the real one
            newData.pages[0] = [
              ...firstPageMessages,
              { ...newMessage, isOptimistic: undefined },
            ];
            currentOptimisticIdRef.current = null; // Clear optimistic ID
          } else {
            // For other users (receivers) or if no optimistic message to replace, just append.
            newData.pages[0] = [...firstPageMessages, newMessage];
          }

          // Make sure the pages array is always constructed correctly.
          // If you append to newData.pages[0], it means the latest messages are at the "end" of the first page.
          // Your `messages` derived state does `data.pages.reverse().flatMap((page) => page)`,
          // so `pages[0]` is indeed the latest page.
          return newData;
        }); // Mark this query as stale. If the ChatWindow is mounted and `useFetchMessages` // is enabled for this conversation, it will re-fetch in the background. // If ChatWindow is unmounted, it simply marks the cache as stale for when it mounts again.

        queryClient.invalidateQueries({
          queryKey: targetMessagesQueryKey,
          refetchType: "none", // Still correct here. We updated cache, now mark stale.
        });

        // ... rest of your handleNewMessage logic (scroll, showNewMessageButton etc.)
        // This part only applies if the message is for the *currently active* chat window
        const isMessageForCurrentlyActiveChat =
          newMessage.conversationId === actualConversationId ||
          (selectedConversation?.isNewChat &&
            newMessage.sender._id.toString() === otherUser?._id.toString() &&
            newMessage.recipientId?.toString() === currentUser._id.toString() &&
            !actualConversationId);

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
              // scrollToBottom();
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

        // // Update conversations cache (this is already good and important for sidebar
        // queryClient.setQueryData(["conversations"], (oldConversations) => {
        //   if (!oldConversations) return oldConversations;

        //   const newConversations = oldConversations.map((conv) => {
        //     if (conv._id === newMessage.conversationId) {
        //       const newSeenStatus =
        //         newMessage.sender._id.toString() !== currentUser._id.toString()
        //           ? false
        //           : newMessage.seen;
        //       return {
        //         ...conv,
        //         lastMessage: {
        //           _id: newMessage._id,
        //           text: newMessage.text,
        //           sender: newMessage.sender._id,
        //           seen: newSeenStatus,
        //           img: newMessage.img,
        //         },
        //         updatedAt: newMessage.createdAt,
        //       };
        //     }
        //     return conv;
        //   });

        //   if (
        //     !newConversations.some((c) => c._id === newMessage.conversationId) &&
        //     newMessage.conversationId
        //   ) {
        //     const otherParticipant =
        //       newMessage.sender._id.toString() === currentUser._id.toString()
        //         ? selectedConversation.participants.find(
        //             (p) => p._id.toString() !== currentUser._id.toString()
        //           )
        //         : newMessage.sender;

        //     if (otherParticipant) {
        //       const newConvEntry = {
        //         _id: newMessage.conversationId,
        //         participants: [
        //           otherParticipant,
        //           {
        //             _id: currentUser._id,
        //             username: currentUser.username,
        //             fullName: currentUser.fullName,
        //             profileImg: currentUser.profileImg,
        //           },
        //         ],
        //         lastMessage: {
        //           _id: newMessage._id,
        //           text: newMessage.text,
        //           sender: newMessage.sender._id,
        //           seen: false,
        //           img: newMessage.img,
        //         },
        //         updatedAt: newMessage.createdAt,
        //       };
        //       return [newConvEntry, ...newConversations];
        //     }
        //   }

        //   return [...newConversations].sort(
        //     (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        //   );
        // });

        // queryClient.invalidateQueries({ queryKey: ["conversations"] });
        // queryClient.invalidateQueries({
        //   queryKey: ["conversations", newMessage.conversationId],
        // });
      };

      const handleMessagesSeen = ({ conversationId: seenConversationId, readerId }) => {
        // Only update the messages in the current active chat window if it's the one that was seen
        if (seenConversationId.toString() === actualConversationId?.toString()) {
          queryClient.setQueryData(["messages", actualConversationId], (oldData) => {
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.map((msg) =>
                // Mark messages as seen only if they were sent by the *current user*
                // and are currently not seen.
                msg.sender._id.toString() === currentUser._id.toString() && !msg.seen
                  ? { ...msg, seen: true }
                  : msg
              )
            );
            return { ...oldData, pages: updatedPages };
          });
        }

        // queryClient.invalidateQueries({
        //   queryKey: ["conversations", seenConversationId],
        //   refetchType: "active", // Refetch if 'conversations/[id]' query is active
        // });
        // queryClient.invalidateQueries({
        //   queryKey: ["conversations"],
        //   refetchType: "active", // Refetch if 'conversations' query is active (e.g. conversation list)
        // });
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
    scrollToBottom,
    setShowNewMessageButton,
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
            className="bg-primary text-sm px-3 py-1 text-accent rounded-full shadow-lg flex items-center space-x-2 animate-bounce-custom" // You might need to define animate-bounce-custom in your CSS
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
