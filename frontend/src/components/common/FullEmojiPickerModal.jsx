import EmojiPicker from "emoji-picker-react";
import { IoClose } from "react-icons/io5";

const FullEmojiPickerModal = ({ isOpen, onClose, onEmojiSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-secondary p-4 rounded-lg shadow-lg relative max-w-sm w-full mx-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          <IoClose size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-white">Choose an Emoji</h2>
        <EmojiPicker
          onEmojiClick={(emojiObject) => {
            onEmojiSelect(emojiObject.emoji);
            onClose(); // Close after selection
          }}
          width="100%" // Adjust as needed, make it responsive
          height={400} // Set a fixed height for the picker itself
          theme="dark"
        />
      </div>
    </div>
  );
};

export default FullEmojiPickerModal;
