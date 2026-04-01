import { useRef } from "react";
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  danger,
  message,
  confirmButtonText,
  modalTitle,
  children, 
  isConfirmDisabled = false,
  isLoading = false,
}) => {
  const modalRef = useRef(null);

  useLockBodyScroll(isOpen)

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 cursor-default bg-gray-700 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg p-6 w-full max-w-xs mx-auto flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        tabIndex="-1" 
      >
        <h2 id="modal-title" className="text-xl font-bold">
          {modalTitle}
        </h2>
        <p id="modal-description" className="text-gray-400 text-sm">
          {message}
        </p>

        {children}

        <div className="flex flex-col gap-3 mt-4">
          <button
            className={`w-full py-2.5 rounded-full font-bold transition duration-200
                         ${
                           danger
                             ? "bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white"
                             : "bg-white text-black hover:bg-gray-200 disabled:bg-slate-500 disabled:text-slate-600"
                         }
                         ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
                       `}
            onClick={onConfirm}
            disabled={isConfirmDisabled || isLoading}
          >
            {isLoading ? "Loading..." : confirmButtonText} 
          </button>
          <button
            className="w-full py-2.5 rounded-full font-bold border border-accent hover:bg-gray-900 transition duration-200 disabled:opacity-50 hover:text-white"
            onClick={onClose}
            disabled={isLoading} 
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
