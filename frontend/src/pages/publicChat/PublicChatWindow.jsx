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
import { useQueryClient } from "@tanstack/react-query";
import { MdCheck, MdEdit } from "react-icons/md"; // Import MdCheck and MdEdit

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
    useEditPublicMessage(); // NEW: Use the edit hook

  const [messageContent, setMessageContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMessageModalId, setActiveMessageModalId] = useState(null);
  const [isCurrentlyTouchDevice, setIsCurrentlyTouchDevice] = useState(false);

  const queryClient = useQueryClient();

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

  // --- NEW STATE FOR EDITING ---
  const [editingMessage, setEditingMessage] = useState(null); // Stores the message object being edited
  // const [editContent, setEditContent] = useState(""); // No longer needed, messageContent handles this

  const [isCurrentUserBanned, setIsCurrentUserBanned] = useState(
    currentUser?.isBannedInPublicChat || false
  );

  // Helper to truncate text for reply preview and edit preview
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
    }
  }, [messageContent, messageInputRef]);

  // Handle messageInput when entering/exiting edit mode
  useEffect(() => {
    if (editingMessage) {
      setMessageContent(editingMessage.content); // Pre-fill the main input with current message content
      setReplyingToMessage(null); // Clear reply mode if entering edit mode
      setSelectedFile(null); // Clear any selected image if entering edit mode
      setPreviewImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } else {
      // Clear input when exiting edit mode, but only if it matches the edited message content
      // This prevents clearing user's new message draft if they cancel an edit
      if (
        messageInputRef.current?.value === messageContent &&
        messageContent === (editingMessage?.content || "")
      ) {
        setMessageContent("");
      }
    }
  }, [editingMessage]);

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

  // --- NEW: Handler to set message for editing ---
  const handleEdit = (messageToEdit) => {
    setEditingMessage(messageToEdit);
    setReplyingToMessage(null); // Exit reply mode if entering edit mode
    // setMessageContent(messageToEdit.content); // Handled by useEffect for editingMessage
    setActiveMessageModalId(null);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
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
    (isTypingActive) => {
      // Added isTypingActive parameter
      if (socket) {
        socket.emit("publicChatTyping", {
          isTyping: isTypingActive,
          isEditing: !!editingMessage,
        }); // Pass isEditing
      }
    },
    [socket, editingMessage] // Depend on editingMessage
  );

  // Clean up typing timeout on component unmount or chat change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTypingEvent(false); // Ensure stop typing is sent on unmount
    };
  }, [sendTypingEvent]);

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

      // socket.on("publicMessageEdited", ({ messageId, updatedMessage }) => {
      //   queryClient.setQueryData(["publicMessages"], (oldData) => {
      //     if (!oldData) return oldData;

      //     const updatedPages = oldData.pages.map((page) => ({
      //       ...page,
      //       messages: page.messages.map((message) => {
      //         if (message._id === messageId) {
      //           return updatedMessage; // Replace with the fully updated message from server
      //         }
      //         return message;
      //       }),
      //     }));
      //     return { ...oldData, pages: updatedPages };
      //   });
      // });

      return () => {
        socket.off("publicChatTyping");
        socket.off("userBanned");
        socket.off("userUnbanned");
        // socket.off("publicMessageEdited");
      };
    }
  }, [socket, currentUser, refetchAuthUser, queryClient]);

  const handleMessageContentChange = (e) => {
    const newValue = e.target.value;
    setMessageContent(newValue);

    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + "px";
    }

    const isCurrentlyEditing = !!editingMessage; // Determine if in edit mode

    if (!typingTimeoutRef.current && newValue.trim().length > 0) {
      sendTypingEvent(true, isCurrentlyEditing); // Pass true and isCurrentlyEditing
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false, isCurrentlyEditing); // Pass false and isCurrentlyEditing
      typingTimeoutRef.current = null;
    }, 1500); // Increased timeout slightly
  };

  // --- SEND/EDIT MESSAGE LOGIC ---
  const handleSendMessageOrEdit = async (e) => {
    e.preventDefault();

    if (isSendingMessage || isEditingMessage || isCurrentUserBanned) return;

    // Determine content to send/edit based on mode
    const contentToSend = messageContent.trim();

    if (!contentToSend && !selectedFile && !replyingToMessage && !editingMessage) {
      toast.error("Message cannot be empty.");
      return;
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    sendTypingEvent(false); // Ensure typing status is cleared

    if (editingMessage) {
      // Handle message edit
      if (contentToSend === editingMessage.content.trim()) {
        toast.error("No changes detected.");
        setEditingMessage(null); // Exit edit mode
        setMessageContent(""); // Clear input
        return;
      }
      if (!contentToSend) {
        toast.error("Edited message cannot be empty.");
        return;
      }
      editPublicMessage(
        {
          messageId: editingMessage._id,
          newContent: contentToSend,
        },
        {
          onSuccess: () => {
            setEditingMessage(null); // Exit edit mode after successful dispatch
            setMessageContent(""); // Clear input
            if (isMobile && messageInputRef.current) {
              messageInputRef.current.focus(); // Keep keyboard open
            }
          },
          onError: (error) => {
            toast.error(`Failed to edit message: ${error.message}`);
          },
        }
      );
    } else {
      // Handle new message or reply
      let imgBase64 = null;
      if (selectedFile) {
        try {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onloadend = async () => {
            imgBase64 = reader.result;
            await sendPublicMessage({
              content: contentToSend,
              imgBase64,
              replyTo: replyingToMessage ? replyingToMessage._id : null,
            });
            setMessageContent("");
            setSelectedFile(null);
            setPreviewImage(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (messageInputRef.current) {
              messageInputRef.current.style.height = "auto";
              messageInputRef.current.rows = 1;
            }
            setReplyingToMessage(null);
            shouldScrollToBottom.current = true;
            if (isMobile && messageInputRef.current) {
              messageInputRef.current.focus(); // Keep keyboard open
            }
          };
        } catch (error) {
          toast.error("Failed to read image file.");
        }
      } else {
        await sendPublicMessage({
          content: contentToSend,
          imgBase64: null,
          replyTo: replyingToMessage ? replyingToMessage._id : null,
        });
        setMessageContent("");
        if (messageInputRef.current) {
          messageInputRef.current.style.height = "auto";
          messageInputRef.current.rows = 1;
        }
        setReplyingToMessage(null);
        shouldScrollToBottom.current = true;
        if (isMobile && messageInputRef.current) {
          messageInputRef.current.focus(); // Keep keyboard open
        }
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Basic validation for image file
      if (!file.type.startsWith("image/")) {
        toast.error("Selected file is not a supported image type.");
        setSelectedFile(null);
        setPreviewImage(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

      const MAX_IMAGE_SIZE_MB = 5;
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit.`);
        setSelectedFile(null);
        setPreviewImage(null);
        if (fileInputRef.current) fileInputRef.current.value = null;
        return;
      }

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
    if (isMobile && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current.focus(); // Keep keyboard open
      }, 0);
    }
  };

  const handleImageButtonClick = (e) => {
    e.preventDefault(); // Prevent default button behavior that might blur
    fileInputRef.current.click();
    if (isMobile && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current.focus();
      }, 0);
    }
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
          handleSendMessageOrEdit(e); // Call unified handler
        }
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageContent("");
    sendTypingEvent(false, true); // Indicate stop typing in edit context

    if (isMobile && messageInputRef.current) {
      messageInputRef.current.focus(); // Keep keyboard open
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

  const isSendButtonDisabled =
    isSendingMessage ||
    isEditingMessage ||
    isCurrentUserBanned ||
    (!messageContent.trim() && !selectedFile); // If editing, messageContent must not be empty

  // Helper for rendering the common form content
  const renderFormContent = (isEditingMode = false) => (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
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
            disabled={isCurrentUserBanned || isEditingMode} // Disable image upload in edit mode
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
              : isEditingMode
              ? "Editing message..."
              : replyingToMessage
              ? "Send your reply..."
              : "Type your message..."
          }
          className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
          rows={1}
          ref={messageInputRef}
          disabled={isCurrentUserBanned || isSendingMessage || isEditingMessage}
        />

        <button
          type="submit"
          disabled={isSendButtonDisabled}
          className={` absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
            messageContent.trim() || selectedFile
              ? "bg-primary text-white"
              : "bg-primary text-white opacity-50 cursor-not-allowed"
          } transition-colors duration-200`}
        >
          {isEditingMode ? (
            isEditingMessage ? (
              <LoadingSpinner size="sm" />
            ) : (
              <MdCheck className="w-5 h-5" />
            )
          ) : isSendingMessage ? (
            <LoadingSpinner size="sm" />
          ) : (
            <IoSendSharp className="w-5 h-5" />
          )}
        </button>
      </div>
    </>
  );

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

      {/* --- NEW: Image Preview moved outside the form, above the input section --- */}
      {previewImage && (
        <div className="mt-4 border-t border-accent p-5 flex sticky bottom-0 z-10 bg-base-100">
          <div className="relative">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] object-contain rounded-md"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -right-2 -top-2 p-1 text-white rounded-full bg-gray-500 transition duration-200 hover:bg-gray-600"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Conditional rendering for the entire input section */}
      {editingMessage ? (
        // EDIT MODE CONTAINER
        <div className="w-full bg-base-100 flex flex-col border-t border-accent sticky bottom-0 z-10">
          {/* Edit Message Indicator Bar */}
          <div className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="flex items-center gap-2 ">
              <MdEdit className="w-4 h-4" />
              <span className="text-gray-400">Editing message</span>
              <span className="font-semibold ml-1">
                "{truncateText(editingMessage.content, 30)}"
              </span>
            </span>
            <button
              onClick={handleCancelEdit}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-200"
              title="Cancel Edit"
            >
              <IoClose className="w-4 h-4" />
            </button>
          </div>

          {/* The form, now nested inside the edit mode container */}
          <form
            onSubmit={handleSendMessageOrEdit}
            className="px-2 bg-black/0 flex items-center relative"
          >
            {renderFormContent(true)} {/* Pass true to indicate editing mode */}
          </form>
        </div>
      ) : (
        // NORMAL MODE (not editing)
        <form
          onSubmit={handleSendMessageOrEdit}
          className="sticky bottom-0 bg-base-100 px-2 flex flex-col"
        >
          {/* Only show replyingToMessage if NOT in editing mode */}
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
          {renderFormContent(false)} {/* Pass false for normal mode */}
        </form>
      )}
    </div>
  );
};

export default PublicChatWindow;
