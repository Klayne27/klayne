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
import { FaCaretDown } from "react-icons/fa";

const MESSAGE_GROUP_TIME_THRESHOLD_MS = 5 * 60 * 1000;

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
    isSomeoneTyping,
    typingUsers,
  } = usePublicMessages();

  const { sendPublicMessage, isPending: isSendingMessage } = useSendPublicMessage();
  const { deletePublicMessage } = useDeletePublicMessage();
  const { banUser } = useBanUserFromPublicChat();
  const { unbanUser } = useUnbanUserFromPublicChat();
  const { addReaction } = useAddPublicMessageReaction();
  const { mutate: editPublicMessage, isPending: isEditingMessage } =
    useEditPublicMessage();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);

  const queryClient = useQueryClient();

  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messageListRef = useRef(null);
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });
  const shouldScrollToBottom = useRef(false);
  const isUserScrollingUp = useRef(false);
  const prevLastMessageId = useRef(
    messages.length > 0 ? messages[messages.length - 1]._id : null
  );

  const isCurrentUserBanned = currentUser?.isBannedInPublicChat;

  // --- Touch device detection ---
  useEffect(() => {
    const checkTouch = () =>
      setIsCurrentlyTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    checkTouch();
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, []);

  // You need a function to send typing events. This typically calls socket.emit
  const sendTypingEvent = (isTyping, isEditing) => {
    if (socket) {
      if (isTyping) {
        socket.emit("public_typing", { isEditing });
      } else {
        socket.emit("public_stop_typing");
      }
    }
  };

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

  const handleJumpToMessage = useCallback((messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement && messageListRef.current) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      messageElement.classList.add("highlight-message");

      setTimeout(() => {
        messageElement.classList.remove("highlight-message");
      }, 1500);
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
    setActiveMessageModalId(null);
  };

  // --- Handler to set message for editing ---
  const handleEdit = (messageToEdit) => {
    setEditingMessage(messageToEdit);
    setReplyingToMessage(null);
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
  };

  // Handler for sending messages from PublicMessageInput
  const handleSendMessage = useCallback(
    (messagePayload) => {
      shouldScrollToBottom.current = true;
      sendPublicMessage(messagePayload);
    },
    [sendPublicMessage]
  );

  // Handler for editing messages from PublicMessageInput
  const handleEditMessage = useCallback(
    (messageId, messagePayload) => {
      shouldScrollToBottom.current = true;
      editPublicMessage({ messageId, ...messagePayload });
    },
    [editPublicMessage]
  );

  const handleNewMessageButtonClick = useCallback(() => {
    scrollToBottom();
    setShowNewMessageButton(false);
  }, [scrollToBottom]);

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
    } else {
      return;
    }
  }, [messages.length, isLoadingMessages, isScrollAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const listEl = messageListRef.current;
    if (listEl) {
      const { scrollTop, scrollHeight, clientHeight } = listEl;
      const scrollThreshold = 50; // A small buffer

      // Determine if the user is scrolled up
      isUserScrollingUp.current =
        scrollHeight - scrollTop - clientHeight > scrollThreshold;

      // 👇 If user scrolls back down, hide the button
      if (!isUserScrollingUp.current) {
        setShowNewMessageButton(false);
      }

      // Existing logic to fetch older messages
      if (scrollTop < 1 && hasNextPage && !isFetchingNextPage) {
        scrollStateBeforeFetch.current = {
          scrollTop: listEl.scrollTop,
          scrollHeight: listEl.scrollHeight,
        };
        fetchNextPage();
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]); // No need to add setShowNewMessageButton here

  useEffect(() => {
    if (messages.length === 0) {
      prevLastMessageId.current = null;
      return;
    }

    const newLastMessage = messages[messages.length - 1];

    // Check if a truly new message was added to the end of the list
    const isNewMessageAdded = newLastMessage._id !== prevLastMessageId.current;

    if (isNewMessageAdded) {
      // Show button ONLY if user is scrolled up and the message isn't their own
      if (isUserScrollingUp.current && newLastMessage.sender?._id !== currentUser._id) {
        setShowNewMessageButton(true);
      }
    }

    // Update the ref for the next comparison
    prevLastMessageId.current = newLastMessage._id;
  }, [messages, currentUser._id]);

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

  useEffect(() => {
    if (socket) {
      socket.on("bannedFromPublicChat", ({ isBanned }) => {
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        if (isBanned) {
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
        socket.off("bannedFromPublicChat");
      };
    }
  }, [socket, currentUser, refetchAuthUser, queryClient, isCurrentUserBanned]);

  // --- Message Grouping Logic ---
  // This is where we'll preprocess messages to add grouping flags
  const getGroupedMessages = useCallback(() => {
    if (!messages || messages.length === 0) return [];

    const allMessages = messages;
    const grouped = [];

    for (let i = 0; i < allMessages.length; i++) {
      const message = { ...allMessages[i] }; // Create a mutable copy
      const prevMessage = allMessages[i - 1];

      const isSentByCurrentUser = message.sender._id === currentUser._id;
      const isPrevSentByCurrentUser = prevMessage?.sender._id === currentUser._id;

      // Determine if this is the first message in a group
      message.isFirstInGroup =
        !prevMessage ||
        message.sender._id !== prevMessage.sender._id || // Different sender
        new Date(message.createdAt).getTime() -
          new Date(prevMessage.createdAt).getTime() >
          MESSAGE_GROUP_TIME_THRESHOLD_MS; // Time threshold exceeded

      // Determine if this is the last message in a group
      const nextMessage = allMessages[i + 1];
      message.isLastInGroup =
        !nextMessage ||
        message.sender._id !== nextMessage.sender._id || // Different sender
        new Date(nextMessage.createdAt).getTime() -
          new Date(message.createdAt).getTime() >
          MESSAGE_GROUP_TIME_THRESHOLD_MS; // Time threshold exceeded

      // Apply the bubble classes based on grouping and sender
      let bubbleClasses = "";
      if (isSentByCurrentUser) {
        bubbleClasses += " bg-primary text-white";
        if (message.isFirstInGroup && message.isLastInGroup) {
          bubbleClasses += " rounded-3xl"; // Single message, or isolated message
        } else if (message.isFirstInGroup) {
          bubbleClasses +=
            " rounded-tl-3xl rounded-bl-3xl rounded-tr-3xl rounded-br-[4px]"; // First in group
        } else if (message.isLastInGroup) {
          bubbleClasses +=
            " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-3xl"; // Last in group
        } else {
          bubbleClasses +=
            " rounded-tl-3xl rounded-bl-3xl rounded-tr-[4px] rounded-br-[4px]"; // Middle message
        }
      } else {
        // Not current user
        bubbleClasses += " bg-[#2F3336] text-white";
        if (message.isFirstInGroup && message.isLastInGroup) {
          bubbleClasses += " rounded-3xl"; // Single message, or isolated message
        } else if (message.isFirstInGroup) {
          bubbleClasses +=
            " rounded-tr-3xl rounded-br-3xl rounded-tl-3xl rounded-bl-[4px]"; // First in group
        } else if (message.isLastInGroup) {
          bubbleClasses +=
            " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-3xl"; // Last in group
        } else {
          bubbleClasses +=
            " rounded-tr-3xl rounded-br-3xl rounded-tl-[4px] rounded-bl-[4px]"; // Middle message
        }
      }
      message.bubbleClasses = bubbleClasses; // Attach the computed classes

      grouped.push(message);
    }
    return grouped;
  }, [messages, currentUser]);

  const processedMessages = getGroupedMessages();

  // Render Logic for Loading/Error states
  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <LoadingSpinner size="lg" />
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
            className="flex-grow overflow-y-auto p-4 pb-2 min-h-0"
            ref={messageListRef}
          >
            {isFetchingNextPage && (
              <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
                <LoadingSpinner size="sm" />
              </div>
            )}
            <div className="mx-auto w-full max-w-3xl md:max-w-[968px] mt-16">
              {processedMessages.map((message) => (
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
                    setEditingMessage={setEditingMessage}
                    setReplyingToMessage={setReplyingToMessage}
                    // Pass grouping props
                    isFirstInGroup={message.isFirstInGroup}
                    isLastInGroup={message.isLastInGroup}
                    bubbleClasses={message.bubbleClasses} // Pass the pre-calculated classes
                  />
                </div>
              ))}
            </div>
            {showNewMessageButton && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={handleNewMessageButtonClick}
                  className="bg-primary text-sm px-3 py-1 text-white rounded-full shadow-lg flex items-center space-x-2 animate-bounce"
                >
                  <span>New Message</span>
                  <FaCaretDown />
                </button>
              </div>
            )}
          </div>
          <PublicMessageInput
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
            isSomeoneTyping={isSomeoneTyping}
            typingUsers={typingUsers}
          />
        </>
      )}
    </div>
  );
};

export default PublicChatWindow;
