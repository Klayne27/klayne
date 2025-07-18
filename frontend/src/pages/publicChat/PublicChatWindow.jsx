import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from "react";
import { IoSendSharp, IoClose } from "react-icons/io5"; // Import IoClose
import { FaImage } from "react-icons/fa6"; // Assuming this is FaImage
import { IoImageOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useSocket } from "../../context/SocketContext";
import PublicChatHeader from "./PublicChatHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PublicChatMessage from "./PublicChatMessage";

import {
  usePublicMessages,
  useSendPublicMessage,
  useDeletePublicMessage,
  useBanUserFromPublicChat,
  useUnbanUserFromPublicChat,
  useAddPublicMessageReaction,
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

  const [messageContent, setMessageContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  // NEW STATE: For handling replies
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollStateBeforeFetch = useRef({ scrollTop: 0, scrollHeight: 0 });

  const shouldScrollToBottom = useRef(false);
  const isUserScrollingUp = useRef(false);

  const [isMobile, setIsMobile] = useState(false);

  const [isCurrentUserBanned, setIsCurrentUserBanned] = useState(
    currentUser?.isBannedInPublicChat || false
  );

  // Helper to truncate text for reply preview
  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android|ipad|iphone|ipod/i.test(userAgent)) {
      setIsMobile(true);
    }

    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + "px";
      messageInputRef.current.scrollTop = messageInputRef.current.scrollHeight;
      // messageInputRef.current.focus(); // Removed this to prevent re-focus on every messageContent change
    }
  }, [messageContent, messageInputRef]);

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
    // setActiveMessageModalId(null); // Close the reaction picker after clicking an emoji
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
    setActiveMessageModalId(null); // Close the message modal after selecting reply
    if (messageInputRef.current) {
      messageInputRef.current.focus(); // Focus the input field
    }
  };


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
    (isTyping) => {
      if (socket) {
        socket.emit("publicChatTyping", { isTyping });
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

      socket.on("userBanned", ({ userId, username }) => {
        if (userId === currentUser._id) {
          setIsCurrentUserBanned(true);
          toast.error(`You have been banned from the public chat.`);
          setMessageContent("");
          setSelectedFile(null);
          setPreviewImage(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (messageInputRef.current) {
            messageInputRef.current.style.height = "auto";
            messageInputRef.current.rows = 1;
          }
        }
      });

      socket.on("userUnbanned", ({ userId, username }) => {
        if (userId === currentUser._id) {
          setIsCurrentUserBanned(false);
          toast.success(
            `You have been unbanned from the public chat. You can now send messages.`
          );
        }
      });

      return () => {
        socket.off("publicChatTyping");
        socket.off("userBanned");
        socket.off("userUnbanned");
      };
    }
  }, [socket, currentUser, refetchAuthUser]);

  const handleMessageContentChange = (e) => {
    setMessageContent(e.target.value);
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + "px";
    }

    if (!typingTimeoutRef.current) {
      sendTypingEvent(true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false);
      typingTimeoutRef.current = null;
    }, 1000);
  };

  // --- SEND MESSAGE LOGIC ---
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (isSendingMessage || isCurrentUserBanned) return;
    if (!messageContent.trim() && !selectedFile && !replyingToMessage) {
        toast.error("Message cannot be empty.");
        return;
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    sendTypingEvent(false);

    let imgBase64 = null;
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = async () => {
          imgBase64 = reader.result;
          await sendPublicMessage({
            content: messageContent,
            imgBase64,
            replyTo: replyingToMessage ? replyingToMessage._id : null, // Include replyTo ID
          });
          setMessageContent("");
          setSelectedFile(null);
          setPreviewImage(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (messageInputRef.current) {
            messageInputRef.current.style.height = "auto";
            messageInputRef.current.rows = 1;
          }
          setReplyingToMessage(null); // Clear reply state after sending
          shouldScrollToBottom.current = true;
        };
      } catch (error) {
        toast.error("Failed to read image file.");
      }
    } else {
      await sendPublicMessage({
        content: messageContent,
        imgBase64: null,
        replyTo: replyingToMessage ? replyingToMessage._id : null, // Include replyTo ID
      });
      setMessageContent("");
      if (messageInputRef.current) {
        messageInputRef.current.style.height = "auto";
        messageInputRef.current.rows = 1;
      }
      setReplyingToMessage(null); // Clear reply state after sending
      shouldScrollToBottom.current = true;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewImage(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (isMobile) {
        e.preventDefault();
        setMessageContent((prev) => prev + "\n");
      } else {
        if (e.shiftKey) {
          e.preventDefault();
          setMessageContent((prev) => prev + "\n");
        } else {
          e.preventDefault();
          handleSendMessage(e);
        }
      }
    }
  };

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

      <div className="flex-grow overflow-y-auto p-4 pb-0 min-h-0" ref={messageListRef}>
        {isFetchingNextPage && (
          <div className="top-24 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {messages.length === 0 && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-xl font-bold mb-2">Welcome to the Public Chat!</p>
            <p className="text-sm text-center">Start by sending the first message.</p>
          </div>
        )}
        <div className="mx-auto w-full max-w-3xl md:max-w-[968px]">
          {messages.map((message) => (
            <div key={message._id}>
              <div>
                <PublicChatMessage
                  key={message._id}
                  message={message}
                  authUser={currentUser}
                  openImageModal={openImageModal}
                  onDelete={deletePublicMessage}
                  onBan={handleBanUser}
                  onUnban={handleUnbanUser}
                  isCurrentlyTouchDevice={isCurrentlyTouchDevice}
                  activeMessageModalId={activeMessageModalId}
                  handleMouseEnter={handleMouseEnter}
                  handleMouseLeave={handleMouseLeave}
                  handleMessageTap={handleMessageTap}
                  handleReactionClick={handleReactionClick}
                  onReply={handleReply}
                />
              </div>
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

      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 bg-base-100 px-2 flex flex-col"
      >
        {/* NEW: Replying To Indicator */}
        {replyingToMessage && (
          <div className="p-2 pt-0 border-t border-accent bg-black/0 flex items-center justify-between">
            <div className="flex-1 p-3 rounded-md flex flex-col">
              <div className="text-sm text-primary font-bold">Replying to</div>
              <div className="text-xs text-gray-400 mt-1 italic">
                {replyingToMessage.sender?.username && (
                  <span className="font-semibold mr-1">
                    @{replyingToMessage.sender.username}:
                  </span>
                )}
                {truncateText(replyingToMessage.content || "[Image Message]", 40)}
              </div>
              {replyingToMessage.img && !replyingToMessage.content && (
                <span className="text-xs text-gray-400 mt-1">(Image Reply)</span>
              )}
            </div>
            <button
              onClick={() => setReplyingToMessage(null)}
              className="ml-2 p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700"
              aria-label="Cancel reply"
            >
              <IoClose size={20} />
            </button>
          </div>
        )}

        {/* Image Preview */}
        {previewImage && (
          <div className="p-2 pt-4 flex">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-accent">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -right-2 -top-2 p-1 text-white rounded-full bg-gray-500 transition duration-200 hover:bg-gray-600"
              >
                X
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          onKeyDown={handleKeyDown}
          className="hidden"
          accept="image/*"
          id="image-upload-public-chat"
        />

        <div
          className={`flex-1 relative my-4 flex items-center rounded-xl bg-secondary border border-transparent focus-within:border-accent/99
            ${isCurrentUserBanned ? "opacity-50 cursor-not-allowed" : ""}
        `}
        >
          <div className="flex pl-1">
            <button
              type="button"
              onClick={handleImageButtonClick}
              className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
              disabled={isCurrentUserBanned}
            >
              <IoImageOutline className="w-5 h-5" />
            </button>
          </div>

          <textarea
            value={messageContent}
            onChange={handleMessageContentChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isCurrentUserBanned
                ? "You are banned from sending messages."
                : replyingToMessage
                ? "Send your reply..."
                : "Type your message..."
            }
            className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-auto max-h-[140px]"
            rows={1}
            ref={messageInputRef}
            disabled={isCurrentUserBanned || isSendingMessage}
          />

          <button
            type="submit"
            disabled={
              isSendingMessage ||
              isCurrentUserBanned ||
              (!messageContent.trim() && !selectedFile && !replyingToMessage)
            }
            className={` absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
              messageContent.trim() || selectedFile || replyingToMessage
                ? "bg-primary text-white"
                : "bg-primary text-white opacity-50 cursor-not-allowed"
            } transition-colors duration-200`}
          >
            {isSendingMessage ? (
              <LoadingSpinner size="sm" />
            ) : (
              <IoSendSharp className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PublicChatWindow;