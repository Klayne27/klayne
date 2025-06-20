
const ConfirmationDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onCancel} // Close if clicking outside
    >
      <div
        className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 border border-gray-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <p className="text-lg font-semibold text-white mb-6 text-center">
          {message || "Are you sure you want to proceed?"}
        </p>
        <div className="flex justify-around gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-full bg-gray-700 text-white font-medium hover:bg-gray-600 transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-full bg-red-600 text-white font-medium hover:bg-red-700 transition duration-200"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
