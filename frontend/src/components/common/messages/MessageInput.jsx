import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { truncateText } from "../../../utils/truncateText";
import { IoClose, IoImageOutline } from "react-icons/io5";
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";
import { MdSend } from "react-icons/md";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import { FaCircle } from "react-icons/fa";

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

  const emitTyping = useCallback(() => {
    if (socket && actualConversationId) {
      socket.emit("typing", { conversationId: actualConversationId });
    }
  }, [socket, actualConversationId]);

  const emitStopTyping = useCallback(() => {
    if (socket && actualConversationId) {
      socket.emit("stopTyping", { conversationId: actualConversationId });
    }
  }, [socket, actualConversationId]);

  const handleMessageInputChange = (e) => {
    const text = e.target.value;
    setMessageInput(text);

    if (text.trim() === "") {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitStopTyping();
      return;
    }

    if (!typingTimeoutRef.current) {
      emitTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping();
      typingTimeoutRef.current = null;
    }, 1500);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    emitStopTyping();

    if (!messageInput.trim() && !imageFile) return;

    if (!otherUser) {
      toast.error("No recipient selected.");
      return;
    }

    const wasInputFocused = messageInputRef.current === document.activeElement;

    const repliedToId = replyingToMessage ? replyingToMessage._id : null;

    const messagePayload = {
      recipientId: otherUser._id,
      message: messageInput.trim(),
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

      if (messageInputRef.current && wasInputFocused) {
        setTimeout(() => {
          messageInputRef.current.focus();
        }, 0);
      }
    } catch (error) {
      console.error("Error during message send process:", error);
      toast.error("Failed to send message.");
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessageInput((prevText) => prevText + emojiObject.emoji);
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

  return (
    <>
      {imageFile && (
        <div className="mt-4 border-t border-gray-700 p-5 flex">
          <div className="relative">
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Preview"
              className="max-w-[200px] max-h-[200px] object-contain rounded-md"
            />
            <button
              onClick={() => setImageFile(null)}
              className="absolute right-1 top-1 p-1 text-white rounded-full bg-black/0 hover:bg-gray-700"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {replyingToMessage && (
        <div className="p-2 pt-0 border-t border-gray-700 bg-black/0 flex items-center justify-between">
          <div className="flex-1 p-3 rounded-md flex flex-col">
            <div className="text-sm text-primary font-bold">Replying to</div>
            <div className="text-xs text-gray-400 mt-1 italic">
              {truncateText(replyingToMessage.text, 40)}
              {replyingToMessage.img && !replyingToMessage.text && " (Image)"}
            </div>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="ml-2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
          >
            <IoClose size={18} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="p-2 border-gray-700 bg-black/0 flex items-center relative"
      >
        {isTypingOtherUser && (
          <div className="flex justify-start px-4 left-0 p-1 absolute bottom-0 items-center text-gray-400  text-sm">
            <span className="animate-pulse font-semibold">
              {selectedConversation?.participants.find((p) => p?._id !== currentUser?._id)
                ?.fullName || "Other user"}{" "}
              is typing
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
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          ref={imageInputRef}
          className="hidden"
        />

        <div className="flex-1 relative mb-4 flex items-center rounded-full bg-secondary border border-transparent focus-within:border-accent">
          <div className="flex pl-1">
            <button
              type="button"
              onClick={() => imageInputRef.current.click()}
              className="p-2 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
            >
              <IoImageOutline className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2 relative text-primary rounded-full hover:bg-gray-700 transition-colors duration-200 hidden md:block"
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

          <input
            type="text"
            value={messageInput}
            onChange={handleMessageInputChange}
            placeholder="Start a new message"
            className="flex-1 py-2  bg-secondary rounded-full placeholder-gray-400 focus:outline-none pl-1 pr-10 w-1"
            ref={messageInputRef}
          />

          <button
            type="submit"
            disabled={isSendingMessage || (!messageInput.trim() && !imageFile)}
            className={`hidden md:block absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
              messageInput.trim() || imageFile
                ? "bg-primary text-white"
                : "bg-primary text-blue-200 opacity-50 cursor-not-allowed"
            } transition-colors duration-200`}
          >
            <MdSend className="w-5 h-5" />
          </button>
        </div>
      </form>
    </>
  );
}

export default MessageInput;
