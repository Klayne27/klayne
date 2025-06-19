import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { truncateText } from "../../utils/truncateText";
import { IoClose, IoImageOutline } from "react-icons/io5";
import { HiOutlineGif } from "react-icons/hi2";
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";
import { MdSend } from "react-icons/md";

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
}) {
  const [messageInput, setMessageInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(150);
  const imageInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !imageFile) return;
    if (!otherUser) return toast.error("No recipient selected.");

    const repliedToId = replyingToMessage ? replyingToMessage._id : null;

    let imgBase64 = null;
    if (imageFile) {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onloadend = () => {
        imgBase64 = reader.result;
        sendMessage({
          recipientId: otherUser._id,
          message: messageInput.trim(),
          img: imgBase64,
          conversationId: actualConversationId,
          repliedTo: repliedToId,
        });
      };
      reader.onerror = (error) => {
        console.error("Error converting image:", error);
        toast.error("Failed to process image.");
      };
    } else {
      sendMessage({
        recipientId: otherUser._id,
        message: messageInput.trim(),
        img: null,
        conversationId: actualConversationId,
        repliedTo: repliedToId,
      });
    }
    setMessageInput("");
    currentOptimisticIdRef.current = null;
    setReplyingToMessage(null);
    setImageFile("");
  };

  const onEmojiClick = (emojiObject) => {
    setMessageInput((prevText) => prevText + emojiObject.emoji);
  };

  useEffect(() => {
    if (selectedConversation && messageInputRef) {
      messageInputRef.current.focus();
    }
  }, [selectedConversation, messageInputRef]);

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
              className="absolute right-1 top-1 p-1 text-white rounded-full bg-black hover:bg-gray-700"
            >
              <IoClose size={15} />
            </button>
          </div>
        </div>
      )}

      {replyingToMessage && (
        <div className="p-2 pt-0 border-t border-gray-700 bg-black flex items-center justify-between">
          <div className="flex-1 p-3  rounded-md flex flex-col">
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
        className="p-2 border-t border-gray-700 bg-black flex items-center"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          ref={imageInputRef}
          className="hidden"
        />

        <div className="flex-1 relative flex items-center rounded-full bg-gray-800 border border-transparent focus-within:border-primary">
          <div className="flex pl-1">
            <button
              type="button"
              onClick={() => imageInputRef.current.click()}
              className="p-1 text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
            >
              <IoImageOutline className="w-5 h-5" />
            </button>
            <button
              type="button"
              className=" text-primary rounded-full hover:bg-gray-700 transition-colors duration-200"
            >
              <HiOutlineGif className="w-5 h-5" />
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
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Start a new message"
            className="flex-1 py-2 bg-gray-800 rounded-full text-white placeholder-gray-400 focus:outline-none pl-1 pr-10 w-1"
            disabled={isSendingMessage}
            ref={messageInputRef}
          />

          <button
            type="submit"
            disabled={isSendingMessage || (!messageInput.trim() && !imageFile)}
            className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full ${
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
