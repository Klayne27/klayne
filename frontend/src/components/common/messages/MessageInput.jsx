import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { truncateText } from "../../../utils/truncateText";
import { IoClose, IoImageOutline } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";
import { MdCheck, MdEdit, MdSend } from "react-icons/md";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { FaCircle, FaSpinner } from "react-icons/fa";
import { useEditMessage } from "../../../hooks/messagesHooks/useEditMessage";
import { FaReply } from "react-icons/fa6";
import React from "react";
import { showAppToast } from "../../../utils/showAppToast";

function MessageInput({
  otherUser,
  replyingToMessage,
  setReplyingToMessage,
  actualConversationId,
  currentOptimisticIdRef,
  messageInputRef,
  isSendingMessage,
  sendMessage,
  selectedConversation,
  socket,
  isTypingOtherUser,
  editingMessage,
  setEditingMessage,
}) {
  const [messageInput, setMessageInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);
  const imageInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { authUser: currentUser } = useAuthUser();

  const { editMessage, isEditing } = useEditMessage(actualConversationId);

  const [isMobile, setIsMobile] = useState(false);

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

  // --- MODIFIED: emitTyping now accepts isEditing flag ---
  const emitTyping = useCallback(
    (isEditingActive) => {
      if (socket && actualConversationId && currentUser?._id) {
        socket.emit("typing", {
          conversationId: actualConversationId,
          userId: currentUser._id, // This should be the current user's ID
          isEditing: isEditingActive, // Pass the flag
        });
      }
    },
    [socket, actualConversationId, currentUser?._id]
  );

  // --- MODIFIED: emitStopTyping now accepts isEditing flag ---
  const emitStopTyping = useCallback(
    (isEditingActive) => {
      if (socket && actualConversationId && currentUser?._id) {
        socket.emit("stopTyping", {
          conversationId: actualConversationId,
          userId: currentUser._id, // This should be the current user's ID
          isEditing: isEditingActive, // Pass the flag
        });
      }
    },
    [socket, actualConversationId, currentUser?._id]
  );

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
            setImageFile(null);
            if (imageInputRef.current) imageInputRef.current.value = null;
            return;
          }

          const MAX_IMAGE_SIZE_MB = 5;
          if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showAppToast(
              `Pasted image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit.`,
              "error"
            );
            setImageFile(null);
            if (imageInputRef.current) imageInputRef.current.value = null;
            return;
          }

          setImageFile(file);
          return; // Process only the first image found
        }
      }
    }

    // If no image was found, paste as plain text
    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText) {
      const inputElement = messageInputRef.current;
      if (inputElement) {
        const cursorStart = inputElement.selectionStart;
        const cursorEnd = inputElement.selectionEnd;

        const newText =
          messageInput.substring(0, cursorStart) +
          pastedText +
          messageInput.substring(cursorEnd);

        setMessageInput(newText);

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

  useEffect(() => {
    if (editingMessage) {
      setMessageInput(editingMessage.text);
      messageInputRef.current?.focus();

      // NEW: Immediately adjust textarea height to fit content
      if (messageInputRef.current) {
        messageInputRef.current.style.height = "auto"; // Reset height first
        messageInputRef.current.style.height =
          messageInputRef.current.scrollHeight + "px";
      }
    } else {
      // Clear input when exiting edit mode
        setMessageInput("");
    }
    // eslint-disable-next-line
  }, [editingMessage]);

  const handleMessageInputChange = (e) => {
    const text = e.target.value;
    setMessageInput(text);

    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + "px";
    }

    const isCurrentlyEditing = !!editingMessage; // Determine if in edit mode

    if (text.trim() === "") {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitStopTyping(isCurrentlyEditing); // Pass the flag
      return;
    }

    if (!typingTimeoutRef.current) {
      emitTyping(isCurrentlyEditing); // Pass the flag
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(isCurrentlyEditing); // Pass the flag
      typingTimeoutRef.current = null;
    }, 1500);
  };

  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitStopTyping();

      if (!messageInput.trim() && !imageFile) return;

      if (!otherUser) {
        showAppToast("No recipient selected.", "error");
        return;
      }

      // const wasInputFocused = messageInputRef.current === document.activeElement;

      const repliedToId = replyingToMessage ? replyingToMessage._id : null;

      const messagePayload = {
        recipientId: otherUser._id,
        message: messageInput,
        img: null,
        conversationId: actualConversationId,
        repliedTo: repliedToId,
      };

      try {
        if (imageFile) {
          const reader = new FileReader();
          const imageDataUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          messagePayload.img = imageDataUrl;
        }

        sendMessage(messagePayload);

        setMessageInput("");
        setImageFile(null);
        setReplyingToMessage(null);
        currentOptimisticIdRef.current = null;

        if (isMobile && messageInputRef.current) {
          messageInputRef.current.focus();
        }
      } catch (error) {
        console.error("Error during message send process:", error);
        showAppToast("Failed to send message.", "error");
      }
    },
    [
      emitStopTyping,
      messageInput,
      imageFile,
      otherUser,
      replyingToMessage,
      actualConversationId,
      sendMessage,
      setMessageInput,
      setImageFile,
      setReplyingToMessage,
      currentOptimisticIdRef,
      isMobile,
      messageInputRef,
    ]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const trimmedMessage = messageInput.replace(/\s/g, "");

      if (trimmedMessage.length === 0 && !imageFile) {
        // If the input is empty or only whitespace and no image,
        // and it's a mobile device, ensure focus remains to prevent keyboard close.
        if (isMobile && messageInputRef.current) {
          messageInputRef.current.focus();
        }
        return;
      }

      if (editingMessage) {
        // Handle message editing
        editMessage({ messageId: editingMessage._id, newText: messageInput });
        setEditingMessage(null); // Exit edit mode
        setMessageInput(""); // Clear input after editing

        // Keep keyboard open after editing on mobile
        if (isMobile && messageInputRef.current) {
          messageInputRef.current.focus();
        }
      } else {
        // Handle sending new message
        handleSendMessage(e); // Your original send logic
      }
    },
    [
      messageInput,
      imageFile,
      isMobile,
      messageInputRef,
      editingMessage,
      editMessage,
      setEditingMessage,
      handleSendMessage,
      setMessageInput,
    ]
  );

  const handleKeyDown = (e) => {
    if (isMobile) {
      return;
    }
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessageInput((prevText) => prevText + emojiObject.emoji);
  };

  const handleImageButtonClick = (e) => {
    e.preventDefault(); // Prevent default button behavior that might blur
    imageInputRef.current.click();
    // Re-focus the message input after triggering file input click
    if (isMobile && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current.focus();
      }, 0);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessageInput("");
    emitStopTyping(true); // Indicate it was an edit context

    // Keep keyboard open after canceling edit on mobile
    if (isMobile && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleTouchMove = (e) => {
    // Check if the textarea content itself is overflowing
    // This is crucial: only prevent default if the textarea can actually scroll
    const target = e.target;
    if (target.scrollHeight > target.clientHeight) {
      // If the content is larger than the visible area,
      // allow the textarea to scroll by not preventing its default behavior.
      // And importantly, prevent the event from bubbling to parent scroll containers.
      e.stopPropagation();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    const handleResize = () => {
      setEmojiPickerWidth(window.innerWidth < 640 ? 250 : 350);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitStopTyping();
    };
  }, [actualConversationId, emitStopTyping]);

  const isSendButtonDisabled =
    isSendingMessage || isEditing || (!messageInput.trim() && !imageFile);

  // Helper for rendering the common form content
  const renderFormContent = (isEditingMode = false) => (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files[0])}
        ref={imageInputRef}
        className="hidden"
      />

      <div className="flex-1 relative mb-4 flex items-center rounded-xl bg-secondary border border-transparent focus-within:border-accent/99">
        <div className="flex pl-1">
          <button
            type="button"
            onClick={handleImageButtonClick} // Use the new handler
            className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
          >
            <IoImageOutline className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="hidden md:block p-2 relative text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
          >
            <PiSmiley
              className="w-5 h-5"
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            />
            {showEmojiPicker && (
              <div className="absolute bottom-full -left-40 z-10" ref={emojiPickerRef}>
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width={emojiPickerWidth}
                  theme="dark"
                />{" "}
              </div>
            )}
          </button>
        </div>

        <textarea
          value={messageInput}
          onChange={handleMessageInputChange}
          onKeyDown={handleKeyDown}
          onTouchMove={handleTouchMove} // Add this
          onPaste={handlePaste}
          placeholder={
            isEditingMode
              ? "Editing message..."
              : replyingToMessage
              ? "Send your reply..."
              : "Type your message..."
          }
          className="flex py-2 bg-secondary rounded-r-xl placeholder-gray-400 focus:outline-none pl-3 pr-14 w-full resize-none overflow-y-auto max-h-[140px]"
          ref={messageInputRef}
          rows={1}
        />

        <button
          type="submit"
          disabled={isSendButtonDisabled}
          className={` absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
            messageInput.trim() || imageFile
              ? "bg-primary text-white"
              : "bg-primary text-white opacity-50 cursor-not-allowed"
          } transition-colors duration-200`}
        >
          {isEditingMode ? (
            isEditing ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <MdCheck className="w-5 h-5" />
            )
          ) : (
            <MdSend className="w-5 h-5" />
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {imageFile && (
        <div className="mt-4 border-t border-accent p-5 flex">
          <div className="relative">
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] object-contain rounded-md"
            />
            <button
              onClick={() => setImageFile(null)}
              className="absolute -right-2 -top-2 p-1 text-white rounded-full bg-gray-500 transition duration-200 hover:bg-gray-600"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Only show replyingToMessage if NOT in editing mode */}
      {replyingToMessage && !editingMessage && (
        <div className="p-2 pt-0 border-t border-accent bg-black/0 flex items-center justify-between">
          <div className="flex-1 p-3 rounded-md flex flex-col">
            <div className="flex gap-2 items-center">
              <FaReply className="size-3" />
              <div className="text-sm text-primary font-bold">Replying to</div>
            </div>
            <div className="text-xs text-gray-400 mt-1 italic">
              {truncateText(replyingToMessage.text, 40)}
              {replyingToMessage.img && !replyingToMessage.text && " (Image)"}
            </div>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="ml-2 p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      {/* Conditional rendering for the entire input section */}
      {editingMessage ? (
        // EDIT MODE CONTAINER
        <div className="w-full bg-base-100 flex flex-col border-t border-accent">
          <div className="flex items-center justify-between py-2 px-1 pt-0 text-sm">
            <div className="flex flex-col items-start p-3 ">
              <div className="flex gap-2 items-center">
                <MdEdit className="w-4 h-4" />
                <div className="text-primary font-bold">Editing message</div>
              </div>
              <span className="font-semibold text-gray-400">
                "{truncateText(editingMessage.text, 30)}"
              </span>
            </div>
            <button
              onClick={handleCancelEdit}
              className="ml-2 mr-1 p-1 text-gray-500 hover:text-white rounded-full hover:bg-gray-700"
              title="Cancel Edit"
            >
              <IoClose size={20} />
            </button>
          </div>

          {/* The form, now nested inside the edit mode container */}
          <form
            onSubmit={handleSubmit}
            className="px-2 bg-black/0 flex items-center relative" // change back to p-2 if new typing indicator is ugly
          >
            {renderFormContent(true)}{" "}
            {/* Pass true to indicate editing mode for placeholders/icons */}
          </form>
        </div>
      ) : (
        // NORMAL MODE (not editing)
        <form
          onSubmit={handleSubmit}
          className="px-2 bg-black/0 flex items-center relative" // change back to p-2
        >
          {renderFormContent(false)} {/* Pass false for normal mode */}
        </form>
      )}
    </>
  );
}

export default React.memo(MessageInput);
