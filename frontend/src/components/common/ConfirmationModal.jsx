import { useEffect } from "react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  danger,
  message,
  confirmButtonText,
  modalTitle,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose();
      }}
    >
      <div
        className="bg-base-100 rounded-2xl shadow-lg p-6 w-full max-w-xs mx-auto flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{modalTitle}</h2>
        <p className="text-gray-400 text-sm">{message}</p>

        <div className="flex flex-col gap-3 mt-4">
          <button
            className={`w-full py-2.5 rounded-full font-bold transition duration-200
                            ${
                              danger
                                ? "bg-red-600 hover:bg-red-700 transition duration-200"
                                : "bg-white text-black hover:bg-gray-200"
                            }`}
            onClick={onConfirm}
            disabled={false}
          >
            {confirmButtonText}
          </button>
          <button
            className="w-full py-2.5 rounded-full font-bold border border-accent hover:bg-gray-900 transition duration-200"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
