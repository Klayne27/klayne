// src/components/publicChat/PublicMessageInput.jsx
import React, { useRef, useEffect, useCallback } from "react";
import { IoClose, IoImageOutline } from "react-icons/io5";
import { MdCheck, MdEdit, MdSend } from "react-icons/md";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { truncateText } from "../../utils/truncateText";
import { useState } from "react";
import { FaReply } from "react-icons/fa6";
import { FaCircle } from "react-icons/fa";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { useEditPublicMessage } from "../../hooks/publicChatHooks/publicChatHooks";
import { showAppToast } from "../../utils/showAppToast";

const PublicMessageInput = ({
  isSendingMessage,
  // isEditingMessage,
  isCurrentUserBanned,
  editingMessage,
  setEditingMessage,
  replyingToMessage,
  setReplyingToMessage,
  sendPublicMessage,
  // editPublicMessage,
  sendTypingEvent, // This function needs to be updated to emit the new event
  isSomeoneTyping, // This will now be derived from typingUsers.length > 0
  typingUsers, // This is the array of users currently typing from the server
}) => {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasSentTypingEvent = useRef(false);

  const { authUser } = useAuthUser();
  const canSendImages = authUser?.isVerified || authUser?.isGoldVerified;

  const [isAtTextareaBottom, setIsAtTextareaBottom] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const { editPublicMessage, isEditingMessage } = useEditPublicMessage();

  const getTypingMessage = (users) => {
    if (users.length === 0) return ""; // Should ideally not be called if users.length is 0

    const names = users.map((u) => u.username);
    const isEditingAny = users.some((u) => u.isEditing); // Check if *any* typing user is editing

    // Determine the verb based on whether anyone is editing
    const verb = isEditingAny ? "editing" : "typing";

    if (users.length === 1) {
      return `${names[0]} is ${verb}`;
    }
    if (users.length === 2) {
      return `${names.join(" and ")} are ${verb}`;
    }
    return "Several people are typing"; // Or "Several people are editing" if isEditingAny is true for some
  };

  useEffect(() => {
    const checkIsMobile = () => {
      // Define your breakpoint
      const mobileBreakpoint = 768; // px

      // Update state based on current window width
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };

    // Initial check when component mounts
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIsMobile);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height first
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [messageContent]);

  // Handle entering/exiting edit mode
  useEffect(() => {
    if (editingMessage) {
      setMessageContent(editingMessage.content);
      setReplyingToMessage(null);
      textareaRef.current?.focus();
      // setSelectedFile(null);
      // setPreviewImage(null);
    } else {
      setMessageContent("");
    }
  }, [editingMessage, setReplyingToMessage, setSelectedFile, setPreviewImage]);

  // Focus when replying
  useEffect(() => {
    if (replyingToMessage) {
      textareaRef.current?.focus();
    }
  }, [replyingToMessage]);

  // Cleanup effect for unmounting
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Ensure we send a stop typing event if the component unmounts
      // sendTypingEvent(false); // This call is still fine
    };
  }, []); // sendTypingEvent is not a dependency if it doesn't change on re-renders,

  const handleMessageContentChange = (e) => {
    const newValue = e.target.value;
    setMessageContent(newValue);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }

    clearTimeout(typingTimeoutRef.current); // Always clear any pending "stop" timer

    if (newValue.trim().length > 0) {
      if (!hasSentTypingEvent.current) {
        const isCurrentlyEditing = !!editingMessage;
        sendTypingEvent(true, isCurrentlyEditing);
        hasSentTypingEvent.current = true; // Mark that we've notified the server
      }

      // Set a new timer to signal "stop typing" after a pause.
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingEvent(false);
        hasSentTypingEvent.current = false; // Reset the flag
      }, 1500); // 1.5-second pause
    } else {
      // If the input is empty, immediately send a "stop typing" event.
      if (hasSentTypingEvent.current) {
        sendTypingEvent(false);
        hasSentTypingEvent.current = false;
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault(); // Prevent default paste behavior

    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();

        if (file) {
          // Basic validation for image file
          if (!file.type.startsWith("image/")) {
            showAppToast("Pasted content is not a supported image type.", "error");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
          }

          // You might want to add a size limit for message images as well
          // For example, 5MB for chat images, adjust as needed
          const MAX_IMAGE_SIZE_MB = 5;
          if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showAppToast(
              `Pasted image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit.`,
              "error"
            );
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
          }

          setSelectedFile(file);
          setPreviewImage(URL.createObjectURL(file));

          return; // Process only the first image found
        }
      }
    }

    // If no image was found, paste as plain text
    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText) {
      const inputElement = textareaRef.current;
      if (inputElement) {
        const cursorStart = inputElement.selectionStart;
        const cursorEnd = inputElement.selectionEnd;

        const newText =
          messageContent.substring(0, cursorStart) +
          pastedText +
          messageContent.substring(cursorEnd);

        setMessageContent(newText);

        // Restore cursor position after paste
        setTimeout(() => {
          if (inputElement) {
            inputElement.selectionStart = cursorStart + pastedText.length;
            inputElement.selectionEnd = cursorStart + pastedText.length;
          }
        }, 0);
      }
    }
  };

  const clearInputState = () => {
    setMessageContent("");
    setSelectedFile(null);
    setPreviewImage(null);
    setReplyingToMessage(null);
    setEditingMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleSendMessageOrEdit = async (e) => {
    e.preventDefault();
    if (isSendingMessage || isEditingMessage || isCurrentUserBanned) return;

    const contentToSend = messageContent.trim();
    if (!contentToSend && !selectedFile) {
      return;
    }

    // Immediately stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingEvent(false); // Ensure stop typing is sent when message is sent
    hasSentTypingEvent.current = false; // Reset flag after sending message

    const payload = {
      content: contentToSend,
      replyTo: replyingToMessage ? replyingToMessage._id : null,
    };

    if (editingMessage) {
      editPublicMessage({
        messageId: editingMessage._id,
        newContent: contentToSend,
      });
    } else {
      if (selectedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = () => {
          sendPublicMessage({ ...payload, imgBase64: reader.result });
        };
        reader.onerror = () => {
          showAppToast("Failed to read image file.", "error");
        };
      } else {
        sendPublicMessage({ ...payload, imgBase64: null });
      }
    }
    clearInputState();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Crucial
      textareaRef.current.rows = 1;
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showAppToast("Only image files are supported.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showAppToast("Image size cannot exceed 5MB.", "error");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    textareaRef.current?.focus();
  };

  const handleImageButtonClick = (e) => {
    e.preventDefault();
    fileInputRef.current.click();
    textareaRef.current?.focus();
  };

  const handleTouchMove = (e) => {
    const target = e.target;
    if (target.scrollHeight > target.clientHeight) {
      e.stopPropagation();
    }
  };

  const handleKeyDown = (e) => {
    if (isMobile) {
      return;
    }
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault();
        handleSendMessageOrEdit(e);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageContent("");
    // Ensure that when cancelling edit, we also send a stop typing for editing state
    sendTypingEvent(false); // Send a general stop typing event
  };

  const isSendButtonDisabled =
    isSendingMessage ||
    isEditingMessage ||
    isCurrentUserBanned ||
    (!messageContent.trim() && !selectedFile);

  const isEditingMode = !!editingMessage;

  // Derive isSomeoneTyping from the length of typingUsers array
  const showTypingIndicator = typingUsers && typingUsers.length > 0;

  return (
    <>
      {" "}
      {/* --- Image Preview Section --- */}
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
      {/* --- Conditional Rendering for Input Section (Edit Mode vs. Normal Mode) --- */}
      {isEditingMode ? (
        // EDIT MODE CONTAINER
        <div className="w-full bg-base-100 z-50 flex flex-col border-t border-accent sticky bottom-0 ">
          {/* Edit Message Indicator Bar */}
          <div className="flex items-center justify-between p-2 px-1 pt-0 text-sm">
            <span className="flex flex-col items-start p-3 ">
              <div className="flex gap-2 items-center">
                <MdEdit className="w-4 h-4 text-yellow-400" />
                <span className="text-primary font-bold">Editing message</span>
              </div>
              <span className="font-semibold text-gray-400">
                "{truncateText(editingMessage.content)}"
              </span>
            </span>

            <button
              onClick={() => {
                handleCancelEdit();
                textareaRef.current.focus();
              }}
              className="ml-2 p-1 mr-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700"
              title="Cancel Edit"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* The form for editing */}
          <form
            onSubmit={handleSendMessageOrEdit}
            className="px-2 bg-black/0 flex items-center relative z-10"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
              id="image-upload-public-chat"
            />
            <div
              className={`flex-1 relative mb-4 flex items-center rounded-xl bg-secondary border border-transparent focus-within:border-accent/99
                ${isCurrentUserBanned ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <div className="flex pl-1">
                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
                  disabled={!canSendImages}
                >
                  <IoImageOutline className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={messageContent}
                onChange={handleMessageContentChange}
                onKeyDown={handleKeyDown}
                onTouch={handleTouchMove}
                onPaste={handlePaste}
                placeholder={
                  isCurrentUserBanned
                    ? "You are banned from sending messages."
                    : "Editing message..."
                }
                className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
                rows={1}
                ref={textareaRef}
                disabled={isCurrentUserBanned}
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
                {isEditingMessage ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <MdCheck className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
          {showTypingIndicator && (
            <div className="flex justify-start px-4 left-0 p-1 absolute border-accent -top-[29px] bg-base-100 w-full items-center text-gray-400 text-sm">
              <span className="animate-pulse font-semibold">
                {getTypingMessage(typingUsers)}
              </span>
              <span className="flex ml-1 gap-0.5 mt-2.5">
                <span className="inline-block pulsing-dot pulsing-dot-1">
                  <FaCircle size={6} />
                </span>
                <span className="inline-block pulsing-dot pulsing-dot-2">
                  <FaCircle size={6} />
                </span>
                <span className="inline-block pulsing-dot pulsing-dot-3">
                  <FaCircle size={6} />
                </span>
              </span>
            </div>
          )}
        </div>
      ) : (
        // NORMAL MODE (not editing)
        <form
          onSubmit={handleSendMessageOrEdit}
          className="sticky bottom-0 bg-base-100 flex flex-col"
        >
          {replyingToMessage && (
            <div className="p-2 pt-0 border-t border-accent bg-black/0 flex items-center justify-between">
              <div className="flex-1 p-3 rounded-md flex flex-col">
                <div className="flex gap-2 items-center">
                  <FaReply className="size-3 text-blue-400" />

                  <div className="text-sm text-primary font-bold">Replying to</div>
                </div>
                <div className="text-xs text-gray-400 mt-1 italic">
                  {replyingToMessage.sender?.username && (
                    <span className="font-semibold mr-1">
                      @{replyingToMessage.sender.username}:
                    </span>
                  )}
                  {truncateText(replyingToMessage.content)}
                </div>
                {replyingToMessage.img && !replyingToMessage.content && (
                  <span className="text-xs text-gray-400 mt-1">(Image Reply)</span>
                )}
              </div>
              <button
                onClick={() => {
                  setReplyingToMessage(null);
                  textareaRef.current.focus();
                }}
                className="ml-2 p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700"
                aria-label="Cancel reply"
              >
                <IoClose size={20} />
              </button>
            </div>
          )}
          {/* Main message input for normal mode */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
            id="image-upload-public-chat"
          />

          <div
            className={`flex-1 mx-2 relative mb-4 flex items-center rounded-xl bg-secondary border border-transparent focus-within:border-accent/99
              ${isCurrentUserBanned ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <div className="flex pl-1">
              <button
                type="button"
                onClick={handleImageButtonClick}
                className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200 disabled:cursor-not-allowed cursor-pointer"
                disabled={!canSendImages}
              >
                <IoImageOutline className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={messageContent}
              onChange={handleMessageContentChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={
                isCurrentUserBanned
                  ? "You are banned from sending messages."
                  : replyingToMessage
                  ? "Send your reply..."
                  : "Type your message..."
              }
              className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
              rows={1}
              ref={textareaRef}
              disabled={isCurrentUserBanned}
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
              <MdSend className="w-5 h-5" />
            </button>
          </div>
          {showTypingIndicator && (
            <div className="flex justify-start px-4 z-20 left-0 p-1 absolute -top-7 bg-base-100 w-full items-center text-gray-400 text-sm">
              <span className="animate-pulse font-semibold">
                {getTypingMessage(typingUsers)}
              </span>
              <span className="flex ml-1 gap-0.5 mt-2.5">
                <span className="inline-block pulsing-dot pulsing-dot-1">
                  <FaCircle size={6} />
                </span>
                <span className="inline-block pulsing-dot pulsing-dot-2">
                  <FaCircle size={6} />
                </span>
                <span className="inline-block pulsing-dot pulsing-dot-3">
                  <FaCircle size={6} />
                </span>
              </span>
            </div>
          )}
        </form>
      )}
    </>
  );
};

export default PublicMessageInput;
