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
import { IoChatbubblesOutline } from "react-icons/io5";

const ChatWindow = ({
  selectedConversation,
  onBackToConversations,
  onNewMessage,
  openImageModal,
}) => {
  const queryClient = useQueryClient();
  const { authUser: currentUser } = useAuthUser();
  const currentUserId = currentUser?._id; // <--- Extract primitive ID

  const { socket, setActiveConversationId } = useSocket();

  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [isTypingOtherUser, setIsTypingOtherUser] = useState(false);

  const conversationId = selectedConversation?._id;

  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null); // State to hold the message being edited

  const messageInputRef = useRef(null);
  const currentOptimisticIdRef = useRef(null);
  const messageListRef = useRef(null);
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });

  const didMessageJustLanded = useRef(false); // Renamed for clarity: `didMessageJustArriveOrSend` -> `didMessageJustLanded`

  const resizeObserverRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const shouldScrollOnFirstFullLoad = useRef(true);
  const prevActualConversationIdRef = useRef(conversationId);

  const otherUser = selectedConversation?.participants.find(
    (p) => p?._id !== currentUser?._id
  );

  const handleOptimisticScroll = useCallback(() => {
    didMessageJustLanded.current = true;
  }, []);

  const { deleteMessage, isDeletingMessage } = useDeleteMessage(conversationId);
  const { messages, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFetchMessages(conversationId);

  const { mutate: sendMessage, isPending: isSendingMessage } = useSendMessage({
    replyingToMessage,
    onOptimisticSend: handleOptimisticScroll,
  });

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

    const scrollThreshold = 100; // Keep consistent with other checks
    const isUserAtBottom =
      listEl.scrollHeight - listEl.scrollTop <= listEl.clientHeight + scrollThreshold;

    if (isUserAtBottom) {
      setTimeout(() => {
        scrollToBottom();
        setShowNewMessageButton(false); // Hide the new message button if we scrolled
      }, 1); // Small delay to ensure DOM updates
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

          const scrollThreshold = 100; // Define how close to the bottom is "at the bottom"
          const isUserAtBottom =
            listEl.scrollHeight - listEl.scrollTop <=
            listEl.clientHeight + scrollThreshold;

          if (didMessageJustLanded.current) {
            setTimeout(() => {
              scrollToBottom();
              setShowNewMessageButton(false);
              didMessageJustLanded.current = false; // Reset after scrolling
            }, 50); // Small delay to ensure image height is registered
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
  }, [scrollToBottom, conversationId]);

  const handleLoadImage = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // --- Primary scrolling logic for initial load, conversation change, and optimistic sends ---
  useLayoutEffect(() => {
    const listEl = messageListRef.current;
    if (!listEl) return;

    const scrollThreshold = 100;

    const conversationChanged = prevActualConversationIdRef.current !== conversationId;

    if (conversationChanged) {
      shouldScrollOnFirstFullLoad.current = true;
      prevActualConversationIdRef.current = conversationId;
      didMessageJustLanded.current = true; // Force scroll on new conversation
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
  }, [messages.length, isLoading, conversationId, scrollToBottom, lastMessageId]);

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

  // --- Socket and active conversation management ---
  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
    };
  }, [conversationId, setActiveConversationId]);

  useEffect(() => {
    setActiveConversationId(conversationId);

    if (socket) {
      socket.emit("userActiveInChat", { conversationId: conversationId });
    }

    if (socket && conversationId && currentUser?._id) {
      socket.emit("markMessagesAsSeen", { conversationId: conversationId });
    }

    return () => {
      setActiveConversationId(null);
      if (socket) {
        socket.emit("userActiveInChat", { conversationId: null });
      }
    };
  }, [socket, conversationId, currentUser?._id, setActiveConversationId]);

  // --- Socket event listeners and handling new messages from others ---
  useEffect(() => {
    if (socket) {
      let prevConversationId; // To store the conversation ID before it changes

      if (conversationId) {
        socket.emit("joinConversation", conversationId);
        prevConversationId = conversationId; // Store for cleanup
      }

      const handleNewMessage = (newMessage) => {
        const targetMessagesQueryKey = ["messages", newMessage.conversationId];
        const limit = 40; // Use the same page size limit

        queryClient.setQueryData(targetMessagesQueryKey, (oldData) => {
          if (!oldData || !oldData.pages || oldData.pages.length === 0) {
            return { pages: [[newMessage]], pageParams: [1] };
          }

          const newData = {
            ...oldData,
            pages: oldData.pages.map((page) => [...page]),
          };
          // Filter out duplicates (if any) and optimistic messages that are being replaced
          const firstPage = newData.pages[0];

          firstPage.push(newMessage);

          // **THE SAME FIX**: Maintain page size integrity
          if (firstPage.length > limit) {
            firstPage.shift();
          }

          newData.pages[0] = firstPage;
          return newData;
        });

        queryClient.invalidateQueries({ queryKey: ["conversations"] });

        // Now, handle UI-specific logic ONLY if the message is for the currently active chat
        const isMessageForCurrentlyActiveChat =
          newMessage.conversationId === conversationId ||
          (newMessage.sender._id.toString() === otherUser?._id.toString() &&
            newMessage.recipientId?.toString() === currentUserId.toString() &&
            !conversationId); // If it's a new chat, match by sender/recipient until a real ID exists

        if (isMessageForCurrentlyActiveChat) {
          const listEl = messageListRef.current;
          if (listEl) {
            const scrollThreshold = 100;
            const isAtBottom =
              listEl.scrollHeight - listEl.scrollTop <=
              listEl.clientHeight + scrollThreshold;

            if (
              newMessage.sender._id.toString() === currentUserId.toString() || // Our own message
              isAtBottom // Already at bottom, so keep scrolling
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
        if (seenConversationId.toString() === conversationId?.toString()) {
          queryClient.setQueryData(["messages", conversationId], (oldData) => {
            if (!oldData) {
              return oldData;
            }

            const updatedPages = oldData.pages.map((page, pageIndex) =>
              page.map((msg) => {
                // Check if it's the current user's message AND it's currently not seen
                const shouldBeMarkedSeen =
                  msg.sender && // Ensure sender exists
                  msg.sender._id.toString() === currentUserId.toString() &&
                  !msg.seen;

                if (shouldBeMarkedSeen) {
                  return { ...msg, seen: true };
                }
                return msg;
              })
            );
            // Important: Verify the 'seen' property of your specific message here in the console
            // For example, find the message by its ID if you know it, or just inspect the last message
            if (updatedPages && updatedPages.length > 0 && updatedPages[0].length > 0) {
              const lastMessageOnFirstPage = updatedPages[0][updatedPages[0].length - 1];
            }

            return { ...oldData, pages: updatedPages };
          });
        }
      };

      const handleMessageDeleted = ({
        messageId,
        conversationId: deletedConversationId,
      }) => {
        if (deletedConversationId.toString() === conversationId?.toString()) {
          queryClient.setQueryData(["messages", conversationId], (oldData) => {
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
        if (conversationId === conversationId && userId === otherUser?._id.toString()) {
          if (!isEditing) {
            setIsTypingOtherUser(true);
          }
        }
      };

      const handleConversationUpdate = (updatedConversation) => {
        // queryClient.setQueryData(["conversations"], (oldConversations) => {
        //   if (!oldConversations) return [updatedConversation]; // Handle initial empty state
        //   const index = oldConversations.findIndex(
        //     (conv) => conv._id === updatedConversation._id
        //   );
        //   if (index !== -1) {
        //     const newConversations = [...oldConversations];
        //     newConversations[index] = updatedConversation;
        //     return newConversations;
        //   } else {
        //     return [updatedConversation, ...oldConversations]; // Add to the top
        //   }
        // });
      };

      const handleStopTyping = ({ conversationId, userId, isEditing }) => {
        if (conversationId === conversationId && userId === otherUser?._id.toString()) {
          setIsTypingOtherUser(false);
        }
      };

      const handleMessageEdited = (updatedMessage) => {
        // Ensure the update is for the currently viewed conversation
        if (updatedMessage.conversationId.toString() === conversationId?.toString()) {
          const queryKey = ["messages", conversationId];

          queryClient.setQueryData(queryKey, (oldData) => {
            if (!oldData) return oldData;

            const updatedPages = oldData.pages.map((page) =>
              page.map((msg) => {
                // Case 1: This is the message that was actually edited.
                if (msg._id === updatedMessage._id) {
                  return updatedMessage;
                }

                if (msg.repliedTo && msg.repliedTo._id === updatedMessage._id) {
                  return {
                    ...msg, // Keep the reply message itself
                    repliedTo: updatedMessage, // Update its 'repliedTo' data
                  };
                }

                return msg;
              })
            );
            return { ...oldData, pages: updatedPages };
          });

          // Invalidate conversations to update the last message in the sidebar
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
    conversationId,
    queryClient,
    otherUser?._id,
    currentUserId,
    selectedConversation,
    // currentUser.username,
    // currentUser.profileImg,
    // currentUser.fullName,
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
    didMessageJustLanded.current = false;
  }, [scrollToBottom]);

  const isChatEmpty = !messages?.length && !isLoading;

  return (
    <div className="flex flex-col h-full relative md:border-r border-accent">
      {/* <div className="absolute bottom-20 right-6 z-[9999] cursor-pointer duration-200 transition hover:bg-gray-800 rounded-full p-1 border-2 bg-base-100 border-accent">
        <IoArrowDownOutline size={22} />
      </div> */}
      <ChatHeader onBackToConversations={onBackToConversations} otherUser={otherUser} />
      {isChatEmpty && (
        <div className="flex flex-col items-center justify-end h-full text-center p-4">
          <IoChatbubblesOutline className="text-6xl text-gray-300 mb-4" />
          <p className="text-xl font-semibold  mb-2">
            You're starting a new chat with @{otherUser?.username}!
          </p>
          <p className="text-base text-gray-500 italic max-w-sm">
            Say hello and send your first message to begin your conversation.
          </p>
        </div>
      )}
      <div className="mx-auto w-full flex flex-col h-full max-w-3xl md:max-w-[585px]">
        <MessageList
          isNewChat={isChatEmpty} // Pass the simplified boolean
          ref={messageListRef}
          error={error}
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
          replyingToMessage={replyingToMessage}
          setReplyingToMessage={memoizedSetReplyingToMessage}
          actualConversationId={conversationId}
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
