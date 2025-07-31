// src/components/publicChat/PublicMessageInput.jsx
import React, { useRef, useEffect, useCallback } from "react";
import { IoClose, IoImageOutline } from "react-icons/io5";
import { MdCheck, MdEdit, MdSend } from "react-icons/md";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { truncateText } from "../../utils/truncateText";
import { useState } from "react";
import { FaReply } from "react-icons/fa6";
import { FaCircle } from "react-icons/fa";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { showAppToast } from "../../utils/showAppToast";
import { useEditPublicMessage } from "../../hooks/publicChatHooks/useEditPublicMessage";
import { usePublicChatStore } from "../../store/usePublicChatStore";
import { getTypingMessage } from "../../utils/getTypingMessage";
import { useIsMobile } from "../../hooks/useIsMobile";
import { usePasteHandler } from "../../hooks/usePasteHandler";
import { useSendPublicMessage } from "../../hooks/publicChatHooks/useSendPublicMessage";

const PublicMessageInput = ({
  // isSendingPublicMessage,
  // isEditingMessage,
  isCurrentUserBanned,
  publicChatInputRef,
  // editingMessage,
  // setEditingMessage,
  // replyingToMessage,
  // setReplyingToMessage,
  // sendPublicMessage,
  // editPublicMessage,
  sendTypingEvent, // This function needs to be updated to emit the new event
  isSomeoneTyping, // This will now be derived from typingUsers.length > 0
  typingUsers, // This is the array of users currently typing from the server
}) => {
  const { replyingToMessage, setReplyingToMessage, setEditingMessage, editingMessage } =
    usePublicChatStore();

  const typingTimeoutRef = useRef(null);
  const hasSentTypingEvent = useRef(false);

  const { authUser } = useAuthUser();
  const canSendImages = authUser?.isVerified || authUser?.isGoldVerified;

  const [publicChatInput, setPublicChatInput] = useState("");
  const [publicChatSelectedFile, setPublicChatSelectedFile] = useState(null);
  const [publicChatPreviewImage, setPublicChatPreviewImage] = useState(null);
  const publicChatFileInputRef = useRef(null);

  const isMessageDeleted =
    replyingToMessage?.isDeletedByAdmin || replyingToMessage?.isDeletedByUser;

  const { editPublicMessage, isEditingMessage } = useEditPublicMessage();
  const { sendPublicMessage, isSendingPublicMessage } = useSendPublicMessage();

  const isMobile = useIsMobile();

  useEffect(() => {
    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto"; // Reset height first
      publicChatInputRef.current.style.height =
        publicChatInputRef.current.scrollHeight + "px";
    }
    // eslint-disable-next-line
  }, [publicChatInput]);

  // Handle entering/exiting edit mode
  useEffect(() => {
    if (editingMessage) {
      setPublicChatInput(editingMessage.content);
      publicChatInputRef.current?.focus();
    }
    // eslint-disable-next-line
  }, [editingMessage]);

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
    setPublicChatInput(newValue);

    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto";
      publicChatInputRef.current.style.height =
        publicChatInputRef.current.scrollHeight + "px";
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

  const handlePaste = usePasteHandler({
    inputRef: publicChatInputRef,
    input: publicChatInput,
    setInput: setPublicChatInput,
    setSelectedFile: setPublicChatSelectedFile,
    setPreviewImage: setPublicChatPreviewImage,
    fileInputRef: publicChatFileInputRef,
    editingMessage,
  });

  const clearInputState = () => {
    setPublicChatInput("");
    setPublicChatSelectedFile(null);
    setPublicChatPreviewImage(null);
    setReplyingToMessage(null);
    setEditingMessage(null);
    if (publicChatFileInputRef.current) publicChatFileInputRef.current.value = "";
    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto";
      publicChatInputRef.current.focus();
    }
  };

  const handleSendMessageOrEdit = async (e) => {
    e.preventDefault();
    if (isSendingPublicMessage || isEditingMessage || isCurrentUserBanned) return;

    const contentToSend = publicChatInput.trim();
    if (!contentToSend && !publicChatSelectedFile) {
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
      if (publicChatSelectedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(publicChatSelectedFile);
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

    if (publicChatInputRef.current) {
      publicChatInputRef.current.style.height = "auto"; // Crucial
      publicChatInputRef.current.rows = 1;
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

    setPublicChatSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPublicChatPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPublicChatSelectedFile(null);
    setPublicChatPreviewImage(null);
    if (publicChatFileInputRef.current) publicChatFileInputRef.current.value = "";
    publicChatInputRef.current?.focus();
  };

  const handleImageButtonClick = (e) => {
    e.preventDefault();
    publicChatFileInputRef.current.click();
    publicChatInputRef.current?.focus();
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
    setPublicChatInput("");
    sendTypingEvent(false);
  };

  const isSendButtonDisabled =
    isSendingPublicMessage ||
    isEditingMessage ||
    isCurrentUserBanned ||
    (!publicChatInput.trim() && !publicChatSelectedFile);

  const isEditingMode = !!editingMessage;

  const showTypingIndicator = typingUsers && typingUsers.length > 0;

  const messageDeleted = (
    <span className="text-gray-500 italic mt-1">[Message Deleted]</span>
  );

  return (
    <>
      {publicChatPreviewImage && (
        <div className="mt-4 border-t border-accent p-5 flex sticky bottom-0 z-10 bg-base-100">
          <div className="relative">
            <img
              src={publicChatPreviewImage}
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
                publicChatInputRef.current.focus();
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
              ref={publicChatFileInputRef}
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
                ref={publicChatInputRef}
                value={publicChatInput}
                onChange={handleMessageContentChange}
                onKeyDown={handleKeyDown}
                onTouchMove={handleTouchMove}
                onPaste={handlePaste}
                placeholder={
                  isCurrentUserBanned
                    ? "You are banned from sending messages."
                    : "Editing message..."
                }
                className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
                rows={1}
                disabled={isCurrentUserBanned}
              />

              <button
                type="submit"
                disabled={isSendButtonDisabled}
                className={` absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
                  publicChatInput.trim() || publicChatSelectedFile
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
                  {isMessageDeleted
                    ? messageDeleted
                    : truncateText(replyingToMessage.content)}
                </div>
                {replyingToMessage.img && !replyingToMessage.content && (
                  <span className="text-xs text-gray-400 mt-1">(Image)</span>
                )}
              </div>
              <button
                onClick={() => {
                  setReplyingToMessage(null);
                  publicChatInputRef.current.focus();
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
            ref={publicChatFileInputRef}
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
              ref={publicChatInputRef}
              value={publicChatInput}
              onChange={handleMessageContentChange}
              onKeyDown={handleKeyDown}
              onTouchMove={handleTouchMove}
              onPaste={handlePaste}
              placeholder={
                isCurrentUserBanned
                  ? "You are banned from sending messages."
                  : replyingToMessage
                  ? "Send your reply..."
                  : "Type your message..."
              }
              className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
              rows={1}
              disabled={isCurrentUserBanned}
            />

            <button
              type="submit"
              disabled={isSendButtonDisabled}
              className={` absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
                publicChatInput.trim() || publicChatSelectedFile
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
