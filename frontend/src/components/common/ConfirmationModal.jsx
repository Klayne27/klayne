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
  children, // NEW: Prop to render custom content inside the modal body
  isConfirmDisabled = false, // NEW: Prop to control the confirm button's disabled state
  isLoading = false, // NEW: Prop to show loading state on the confirm button
}) => {
  const modalRef = useRef(null); // Ref for the modal content div

  useLockBodyScroll(isOpen)

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 cursor-default bg-gray-700 bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      // Add aria roles for accessibility
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef} // Attach ref here
        className="bg-base-100 rounded-2xl shadow-lg p-6 w-full max-w-xs mx-auto flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        tabIndex="-1" // Make the modal div focusable
      >
        <h2 id="modal-title" className="text-xl font-bold">
          {modalTitle}
        </h2>
        <p id="modal-description" className="text-gray-400 text-sm">
          {message}
        </p>

        {/* NEW: Render custom children here */}
        {children}

        <div className="flex flex-col gap-3 mt-4">
          <button
            className={`w-full py-2.5 rounded-full font-bold transition duration-200
                         ${
                           danger
                             ? "bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white" // Added disabled styles
                             : "bg-white text-black hover:bg-gray-200 disabled:bg-slate-500 disabled:text-slate-600" // Added disabled styles
                         }
                         ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
                       `}
            onClick={onConfirm}
            disabled={isConfirmDisabled || isLoading} // Use new disabled prop and isLoading
          >
            {isLoading ? "Loading..." : confirmButtonText} {/* Show loading text */}
          </button>
          <button
            className="w-full py-2.5 rounded-full font-bold border border-accent hover:bg-gray-900 transition duration-200 disabled:opacity-50 hover:text-white"
            onClick={onClose}
            disabled={isLoading} // Disable cancel button during loading
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
