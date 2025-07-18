// src/components/publicChat/PublicMessageInput.jsx
import React, { useRef, useEffect, useCallback } from "react";
import { IoSendSharp, IoClose, IoImageOutline } from "react-icons/io5";
import { MdCheck, MdEdit, MdSend } from "react-icons/md";
import toast from "react-hot-toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { truncateText } from "../../utils/truncateText";

const PublicMessageInput = ({
  messageContent,
  setMessageContent,
  selectedFile,
  setSelectedFile,
  previewImage,
  setPreviewImage,
  isSendingMessage,
  isEditingMessage,
  isCurrentUserBanned,
  editingMessage,
  setEditingMessage,
  replyingToMessage,
  setReplyingToMessage,
  sendPublicMessage, // This prop will be the actual send message mutation
  editPublicMessage, // This prop will be the actual edit message mutation
  sendTypingEvent, // Pass down the typing event emitter
}) => {
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null); // Local to this component

  // Adjust textarea height based on content
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + "px";
    }
  }, [messageContent]);

  // Handle messageInput when entering/exiting edit mode
  useEffect(() => {
    if (editingMessage) {
      setMessageContent(editingMessage.content);
      setReplyingToMessage(null);
      setSelectedFile(null);
      setPreviewImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } else {
      // Clear input when exiting edit mode, but only if it matches the edited message content
      if (
        messageInputRef.current?.value === messageContent &&
        messageContent === (editingMessage?.content || "")
      ) {
        setMessageContent("");
      }
    }
  }, [
    editingMessage,
    setMessageContent,
    setReplyingToMessage,
    setSelectedFile,
    setPreviewImage,
    // messageContent,
  ]);

  // Clear typing timeout on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTypingEvent(false, false); // Ensure stop typing is sent on unmount
    };
  }, [sendTypingEvent]);

  const handleMessageContentChange = (e) => {
    const newValue = e.target.value;
    setMessageContent(newValue);

    const isCurrentlyEditing = !!editingMessage;

    if (!typingTimeoutRef.current && newValue.trim().length > 0) {
      sendTypingEvent(true, isCurrentlyEditing);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(false, isCurrentlyEditing);
      typingTimeoutRef.current = null;
    }, 1500);
  };

  const handleSendMessageOrEdit = async (e) => {
    e.preventDefault();

    if (isSendingMessage || isEditingMessage || isCurrentUserBanned) return;

    const contentToSend = messageContent.trim();

    if (!contentToSend && !selectedFile && !replyingToMessage && !editingMessage) {
      toast.error("Message cannot be empty.");
      return;
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = null;
    sendTypingEvent(false); // Ensure typing status is cleared

    if (editingMessage) {
      if (contentToSend === editingMessage.content.trim()) {
        toast.error("No changes detected.");
        setEditingMessage(null);
        setMessageContent("");
        messageInputRef.current?.focus();
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
            setEditingMessage(null);
            setMessageContent("");
            messageInputRef.current?.focus();
          },
          onError: (error) => {
            toast.error(`Failed to edit message: ${error.message}`);
          },
        }
      );
    } else {
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
            messageInputRef.current.style.height = "auto";
            messageInputRef.current.rows = 1;
            setReplyingToMessage(null);
            messageInputRef.current?.focus();
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
        messageInputRef.current.style.height = "auto";
        messageInputRef.current.rows = 1;
        setReplyingToMessage(null);
        messageInputRef.current?.focus();
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
    messageInputRef.current?.focus();
  };

  const handleImageButtonClick = (e) => {
    e.preventDefault();
    fileInputRef.current.click();
    messageInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageOrEdit(e);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageContent("");
    sendTypingEvent(false, true);
    messageInputRef.current?.focus();
  };

  const isSendButtonDisabled =
    isSendingMessage ||
    isEditingMessage ||
    isCurrentUserBanned ||
    (!messageContent.trim() && !selectedFile);

  const isEditingMode = !!editingMessage;

  return (
    <>
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
        <div className="w-full bg-base-200 flex flex-col border-t border-accent sticky bottom-0 z-10">
          {/* Edit Message Indicator Bar */}
          <div className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="flex items-center gap-2 ">
              <MdEdit className="w-4 h-4" />
              <span className="text-gray-400">Editing message</span>
              <span className="font-semibold ml-1">
                "{truncateText(editingMessage.content)}"
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

          {/* The form for editing */}
          <form
            onSubmit={handleSendMessageOrEdit}
            className="px-2 bg-black/0 flex items-center relative"
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
                  disabled={isCurrentUserBanned || isEditingMode}
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
                    : "Editing message..."
                }
                className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
                rows={1}
                ref={messageInputRef}
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
                <div className="text-sm text-primary font-bold">Replying to</div>
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
                onClick={() => setReplyingToMessage(null)}
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
                className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
                disabled={isCurrentUserBanned || isEditingMode}
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
              className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
              rows={1}
              ref={messageInputRef}
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
        </form>
      )}
    </>
  );
};

export default PublicMessageInput;
