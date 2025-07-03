const BlockConfirmationModal = ({ isOpen, onClose, onConfirm, username, isBlocking, isBlockedByYou }) => {
  if (!isOpen) return null;

  const modalTitle = isBlockedByYou ? `Unblock @${username}?` : `Block @${username}?`;
  const confirmButtonText = isBlockedByYou ? "Unblock" : "Block";

  let message;
  if (isBlockedByYou) {
    message = `They will be able to follow you, message you, and engage with your public posts.`;
  } else {
    message = `They will not be able to see your public posts and will no longer be able to engage with them. @${username} 
    will also not be able to follow or message you, and you will not see notifications from them.`;
  }

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-black rounded-2xl shadow-lg p-6 w-full max-w-xs mx-auto flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white">{modalTitle}</h2>
        <p className="text-gray-400 text-sm">{message}</p>

        <div className="flex flex-col gap-3 mt-4">
          <button
            className={`w-full py-2.5 rounded-full font-bold transition duration-200
                            ${
                              isBlocking
                                ? "bg-white text-black hover:bg-gray-200"
                                : "bg-red-600 hover:bg-red-700 transition duration-200"
                            }`}
            onClick={onConfirm}
            disabled={false}
          >
            {confirmButtonText}
          </button>
          <button
            className="w-full py-2.5 rounded-full font-bold text-white border border-gray-600 hover:bg-gray-900 transition duration-200"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockConfirmationModal;
