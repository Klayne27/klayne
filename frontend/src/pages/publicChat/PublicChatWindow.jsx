// src/components/publicChat/PublicChatWindow.jsx
import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from "react";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useSocket } from "../../context/SocketContext";
import PublicChatHeader from "./PublicChatHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PublicChatMessage from "./PublicChatMessage";
import PublicMessageInput from "./PublicMessageInput"; // Import the new component
import { useQueryClient } from "@tanstack/react-query";

import {
  usePublicMessages,
  useSendPublicMessage,
  useDeletePublicMessage,
  useBanUserFromPublicChat,
  useUnbanUserFromPublicChat,
  useAddPublicMessageReaction,
  useEditPublicMessage,
} from "../../hooks/publicChatHooks/publicChatHooks";

const PublicChatWindow = ({ openImageModal }) => {
  const { authUser: currentUser, refetchAuthUser } = useAuthUser();
  const { socket, setActiveConversationId } = useSocket();

  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
    error: messagesError,
  } = usePublicMessages();

  const { sendPublicMessage, isPending: isSendingMessage } = useSendPublicMessage();
  const { deletePublicMessage } = useDeletePublicMessage();
  const { banUser } = useBanUserFromPublicChat();
  const { unbanUser } = useUnbanUserFromPublicChat();
  const { addReaction } = useAddPublicMessageReaction();
  const { mutate: editPublicMessage, isPending: isEditingMessage } =
    useEditPublicMessage();

  const [messageContent, setMessageContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  const queryClient = useQueryClient();

  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const messageListRef = useRef(null);
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });
  const shouldScrollToBottom = useRef(false);
  const isUserScrollingUp = useRef(false);

  // Moved to PublicMessageInput, but kept here for clarity if needed elsewhere:
  // const [isMobile, setIsMobile] = useState(false);

  const [editingMessage, setEditingMessage] = useState(null);

  const isCurrentUserBanned = currentUser?.isBannedInPublicChat;

  // --- Touch device detection ---
  useEffect(() => {
    const checkTouch = () =>
      setIsCurrentlyTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    checkTouch();
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  const isScrollAtBottom = useCallback(() => {
    if (!messageListRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
    return scrollHeight - scrollTop - clientHeight < 10;
  }, []);

  // NEW: Function to scroll to a specific message by its ID
  const handleJumpToMessage = useCallback((messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement && messageListRef.current) {
      // Scroll into view first
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center", // Adjust this to 'start', 'center', or 'end' as preferred
      });

      // Add the highlight class
      messageElement.classList.add("highlight-message");

      // Remove the highlight class after 1.5 seconds
      setTimeout(() => {
        messageElement.classList.remove("highlight-message");
      }, 1500); // 1500ms = 1.5 seconds
    }
  }, []); 

  // --- Message hover/tap handlers ---
  const handleMouseEnter = (messageId) => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(messageId);
    }
  };

  const handleMouseLeave = () => {
    if (!isCurrentlyTouchDevice) {
      setActiveMessageModalId(null);
    }
  };

  const handleMessageTap = (messageId) => {
    if (isCurrentlyTouchDevice) {
      setActiveMessageModalId(activeMessageModalId === messageId ? null : messageId);
    }
  };

  // --- Reaction Handler ---
  const handleReactionClick = (messageId, emoji) => {
    addReaction({ messageId, emoji });
  };

  // --- Handler to set message for editing ---
  const handleEdit = (messageToEdit) => {
    setEditingMessage(messageToEdit);
    setReplyingToMessage(null);
    setActiveMessageModalId(null);
  };

  // --- Admin/Self Delete Message Handler ---
  const handleDeleteMessage = (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      deletePublicMessage(messageId);
    }
  };

  // --- Ban/Unban User Handlers ---
  const handleBanUser = (userId) => {
    if (window.confirm(`Are you sure you want to ban this user from public chat?`)) {
      banUser(userId);
    }
  };

  const handleUnbanUser = (userId) => {
    if (window.confirm(`Are you sure you want to unban this user from public chat?`)) {
      unbanUser(userId);
    }
  };

  // NEW: Handler to set the message to reply to
  const handleReply = (messageToReplyTo) => {
    setReplyingToMessage(messageToReplyTo);
    setActiveMessageModalId(null);
  };

  // Handler for sending messages from PublicMessageInput
  const handleSendMessage = useCallback(
    (messagePayload) => {
      shouldScrollToBottom.current = true; // Set flag to scroll to bottom after sending
      sendPublicMessage(messagePayload, {
        onSuccess: () => {
          // You might want to invalidate queries or refetch here if needed
          // queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
        },
      });
    },
    [sendPublicMessage]
  );

  // Handler for editing messages from PublicMessageInput
  const handleEditMessage = useCallback(
    (messageId, messagePayload) => {
      shouldScrollToBottom.current = true; // Set flag to scroll to bottom after editing
      editPublicMessage(
        { messageId, ...messagePayload },
        {
          onSuccess: () => {
            // You might want to invalidate queries or refetch here if needed
            // queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
          },
        }
      );
    },
    [editPublicMessage]
  );

  useLayoutEffect(() => {
    if (!messageListRef.current || isLoadingMessages) return;

    if (
      messages.length > 0 &&
      !isUserScrollingUp.current &&
      !scrollStateBeforeFetch.current.scrollHeight
    ) {
      scrollToBottom();
      return;
    }

    if (shouldScrollToBottom.current) {
      scrollToBottom();
      shouldScrollToBottom.current = false;
    }
  }, [messages, isLoadingMessages, scrollToBottom]);

  useEffect(() => {
    if (!messageListRef.current || isLoadingMessages) return;

    if (isScrollAtBottom() && !isUserScrollingUp.current) {
      scrollToBottom();
    }
  }, [messages.length, isLoadingMessages, isScrollAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const listEl = messageListRef.current;
    if (listEl) {
      const { scrollTop, scrollHeight, clientHeight } = listEl;

      isUserScrollingUp.current = scrollHeight - scrollTop - clientHeight > 10;

      if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
        scrollStateBeforeFetch.current = {
          scrollTop: listEl.scrollTop,
          scrollHeight: listEl.scrollHeight,
        };
        fetchNextPage();
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const currentRef = messageListRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

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
  }, [isFetchingNextPage, messages]);

  // --- TYPING INDICATOR LOGIC ---
  const sendTypingEvent = useCallback(
    (isTypingActive, isEditingActive) => {
      if (socket) {
        socket.emit("publicChatTyping", {
          isTyping: isTypingActive,
          isEditing: isEditingActive,
        });
      }
    },
    [socket]
  );

  useEffect(() => {
    if (socket) {
      socket.on("publicChatTyping", ({ userId, isTyping: typingStatus }) => {
        if (userId !== currentUser._id) {
          setIsTyping(typingStatus);
        }
      });

      socket.on("bannedFromPublicChat", ({ isBanned }) => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        if (isBanned) {
          setMessageContent("");
          setSelectedFile(null);
          setPreviewImage(null);
          queryClient.setQueryData(["publicMessages"], (oldData) => ({
            pages: [[]],
            pageParams: [undefined],
          }));
        } else {
          queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
        }
      });

      return () => {
        socket.off("publicChatTyping");
        socket.off("bannedFromPublicChat");
      };
    }
  }, [socket, currentUser, refetchAuthUser, queryClient, isCurrentUserBanned]);

  // Render Logic for Loading/Error states
  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isMessagesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-lg text-error">
        Error loading messages: {messagesError.message}
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
            className="flex-grow overflow-y-auto p-4 pb-0 min-h-0"
            ref={messageListRef}
          >
            {isFetchingNextPage && (
              <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
                <LoadingSpinner size="sm" />
              </div>
            )}
            {/* {messages.length === 0 && !isLoadingMessages && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-xl font-bold mb-2">Welcome to the Public Chat!</p>
                <p className="text-sm text-center">Start by sending the first message.</p>
              </div>
            )} */}
            <div className="mx-auto w-full max-w-3xl md:max-w-[968px]">
              {messages.map((message) => (
                <div key={message._id}>
                  <PublicChatMessage
                    message={message}
                    authUser={currentUser}
                    openImageModal={openImageModal}
                    onDelete={handleDeleteMessage}
                    onBan={handleBanUser}
                    onUnban={handleUnbanUser}
                    isCurrentlyTouchDevice={isCurrentlyTouchDevice}
                    activeMessageModalId={activeMessageModalId}
                    handleMouseEnter={handleMouseEnter}
                    handleMouseLeave={handleMouseLeave}
                    handleMessageTap={handleMessageTap}
                    handleReactionClick={handleReactionClick}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onJumpToMessage={handleJumpToMessage}
                  />
                </div>
              ))}
            </div>
            {isTyping && (
              <div className="chat chat-start">
                <div className="chat-bubble bg-gray-700 text-white">
                  <span className="loading loading-dots loading-sm"></span>
                </div>
              </div>
            )}
          </div>

          {/* Render the PublicMessageInput component */}
          <PublicMessageInput
            messageContent={messageContent}
            setMessageContent={setMessageContent}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            previewImage={previewImage}
            setPreviewImage={setPreviewImage}
            isSendingMessage={isSendingMessage}
            isEditingMessage={isEditingMessage}
            isCurrentUserBanned={isCurrentUserBanned}
            editingMessage={editingMessage}
            setEditingMessage={setEditingMessage}
            replyingToMessage={replyingToMessage}
            setReplyingToMessage={setReplyingToMessage}
            sendPublicMessage={handleSendMessage}
            editPublicMessage={handleEditMessage}
            sendTypingEvent={sendTypingEvent}
          />
        </>
      )}
    </div>
  );
};

export default PublicChatWindow;
